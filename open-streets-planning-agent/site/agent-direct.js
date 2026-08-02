(() => {
  'use strict';

  const root = document.getElementById('openStreetsAgent');
  if (!root) return;

  const form = document.getElementById('agentForm');
  const input = document.getElementById('agentInput');
  const sendButton = document.getElementById('agentSend');
  const clearButton = document.getElementById('agentClear');
  const messages = document.getElementById('agentMessages');
  const errorMessage = document.getElementById('agentError');
  const status = document.getElementById('agentConnectionStatus');
  const characterCount = document.getElementById('agentCharacterCount');

  const history = [];
  let liveMode = false;
  let apiKey = '';
  let model = 'gpt-4o-mini';
  let lastRequestAt = 0;

  const SYSTEM_PROMPT = `You are the Open Streets Planning Assistant for a classroom civic-design prototype about NYC Open Streets.
Help residents and organizers turn a hypothetical block idea into a concise first-draft concept.
Focus on: purpose, possible schedule, street activities, emergency access, deliveries, accessible pickup and drop-off, staffing, barriers, storage, maintenance, outreach, and trade-offs.
Do not claim that a proposal is officially approved. Do not invent current NYC regulations, program availability, or site-specific facts. Tell the user to verify official requirements with NYC DOT and local stakeholders.
Avoid asking for a precise home address. Prefer neighborhood-scale or hypothetical descriptions.
Use clear headings and short bullet points. Keep most answers under 250 words.`;

  function configIsComplete(config) {
    if (!config || typeof config !== 'object') return false;
    const value = String(config.apiKey || '').trim();
    return value.length > 20 && !value.includes('PASTE_') && !value.includes('your-openai');
  }

  function setStatus(state, text) {
    status.className = `firebase-status ${state}`;
    status.querySelector('span').textContent = text;
  }

  function initializeAgent() {
    const config = window.OPEN_STREETS_OPENAI_CONFIG;
    if (!configIsComplete(config)) {
      setStatus('preview', 'Preview mode · add key in openai-config.js');
      return;
    }

    apiKey = String(config.apiKey).trim();
    model = String(config.model || 'gpt-4o-mini').trim();
    liveMode = true;
    setStatus('connected', 'OpenAI direct mode ready · v3');
  }

  function appendMessage(role, text, extraClass = '') {
    const article = document.createElement('article');
    article.className = `agent-message ${role === 'user' ? 'user-message' : 'assistant-message'} ${extraClass}`.trim();

    const label = document.createElement('span');
    label.className = 'message-label';
    label.textContent = role === 'user' ? 'YOU' : 'PLANNING AGENT';

    const paragraph = document.createElement('p');
    paragraph.textContent = text;

    article.append(label, paragraph);
    messages.appendChild(article);
    messages.scrollTop = messages.scrollHeight;
    return article;
  }

  function previewReply(message) {
    const lower = message.toLowerCase();
    if (lower.includes('deliver') || lower.includes('access') || lower.includes('pickup')) {
      return `PREVIEW RESPONSE\n\nACCESS PLAN\n• Preserve emergency access at all times.\n• Test a signed local-access or scheduled delivery window.\n• Identify a nearby accessible pickup and drop-off point.\n• Map which buildings need regular loading before setting hours.\n\nOPERATIONS TO VERIFY\n• Who moves barriers?\n• How will residents and drivers receive updates?\n• Where can delivery and paratransit vehicles safely stop?`;
    }

    if (lower.includes('outreach') || lower.includes('neighbor')) {
      return `PREVIEW RESPONSE\n\nQUESTIONS FOR OUTREACH\n• When is the block busiest?\n• What public-space use is currently missing?\n• Which deliveries and accessible trips must remain possible?\n• What concerns do residents and businesses have?\n• Who could help operate, clean, and store equipment?\n\nRecord disagreement instead of treating one poll result as neighborhood consensus.`;
    }

    return `PREVIEW RESPONSE\n\nFIRST-DRAFT CONCEPT\n• Purpose: walking, play, seating, and low-intensity community activity.\n• Trial schedule: one weekend day for four to six hours.\n• Access: emergency access at all times, with planned delivery and accessible pickup windows.\n• Operations: named partner, barrier monitors, storage, cleanup, and neighbor communication.\n\nAdd your temporary API key in openai-config.js to replace this preview with a live AI response.`;
  }

  async function callOpenAI(message) {
    const now = Date.now();
    const minimumInterval = 1800;
    const remaining = minimumInterval - (now - lastRequestAt);
    if (remaining > 0) {
      await new Promise((resolve) => setTimeout(resolve, remaining));
    }
    lastRequestAt = Date.now();

    const recentHistory = history.slice(-8).map((item) => ({
      role: item.role,
      content: item.content
    }));

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...recentHistory,
          { role: 'user', content: message }
        ],
        max_tokens: 420,
        temperature: 0.5
      })
    });

    const rawText = await response.text();
    let data;
    try {
      data = JSON.parse(rawText);
    } catch (_error) {
      data = null;
    }

    if (!response.ok) {
      const apiMessage = data && data.error && data.error.message;
      if (response.status === 401) throw new Error('The OpenAI API key is invalid or inactive.');
      if (response.status === 429) throw new Error('The API limit or available credit has been reached.');
      throw new Error(apiMessage || `OpenAI request failed with status ${response.status}.`);
    }

    const reply = data?.choices?.[0]?.message?.content?.trim();
    if (!reply) throw new Error('OpenAI returned an empty response.');
    return reply;
  }

  async function sendMessage(message) {
    appendMessage('user', message);
    const loading = appendMessage('assistant', 'Thinking through the block, schedule, access, and operations…', 'loading');
    errorMessage.textContent = '';
    sendButton.disabled = true;
    input.disabled = true;

    try {
      let reply;
      if (liveMode) {
        reply = await callOpenAI(message);
      } else {
        await new Promise((resolve) => setTimeout(resolve, 450));
        reply = previewReply(message);
      }

      loading.remove();
      appendMessage('assistant', reply);
      history.push({ role: 'user', content: message });
      history.push({ role: 'assistant', content: reply });
      while (history.length > 10) history.shift();
    } catch (error) {
      console.error('Agent request failed:', error);
      loading.remove();
      appendMessage('assistant', `I could not reach the planning agent. ${error.message}`, 'error-message');
      errorMessage.textContent = 'Check the API key, available credit, and browser console, then try again.';
      setStatus('error', 'OpenAI direct request failed · v3');
    } finally {
      sendButton.disabled = false;
      input.disabled = false;
      input.focus();
    }
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const message = input.value.trim();
    if (!message) {
      errorMessage.textContent = 'Write a question or scenario first.';
      return;
    }
    input.value = '';
    characterCount.textContent = '0 / 600';
    sendMessage(message);
  });

  input.addEventListener('input', () => {
    characterCount.textContent = `${input.value.length} / 600`;
    errorMessage.textContent = '';
  });

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      form.requestSubmit();
    }
  });

  root.querySelectorAll('[data-agent-prompt]').forEach((button) => {
    button.addEventListener('click', () => {
      input.value = button.dataset.agentPrompt;
      characterCount.textContent = `${input.value.length} / 600`;
      input.focus();
    });
  });

  clearButton.addEventListener('click', () => {
    history.length = 0;
    messages.innerHTML = '';
    appendMessage('assistant', 'Chat cleared. Describe a block, schedule, goal, or concern to begin a new first-draft concept.');
    errorMessage.textContent = '';
  });

  initializeAgent();
})();
