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

  const sessionId = getSessionId();
  const history = [];
  let callable = null;
  let liveMode = false;

  function getSessionId() {
    const key = 'openStreetsAgentSession';
    let value = sessionStorage.getItem(key);
    if (!value) {
      value = (crypto.randomUUID ? crypto.randomUUID() : `session-${Date.now()}-${Math.random().toString(16).slice(2)}`);
      sessionStorage.setItem(key, value);
    }
    return value;
  }

  function configIsComplete(config) {
    if (!config || typeof config !== 'object') return false;
    return ['apiKey', 'authDomain', 'projectId', 'appId'].every((key) => {
      const value = String(config[key] || '');
      return value && !value.includes('PASTE_') && !value.includes('your-');
    });
  }

  function setStatus(state, text) {
    status.className = `firebase-status ${state}`;
    status.querySelector('span').textContent = text;
  }

  function initializeAgent() {
    const config = window.OPEN_STREETS_FIREBASE_CONFIG;
    if (!window.firebase || !firebase.functions || !configIsComplete(config)) {
      setStatus('preview', 'Preview mode · connect Firebase to use OpenAI');
      return;
    }

    try {
      const app = firebase.apps.length ? firebase.app() : firebase.initializeApp(config);
      callable = app.functions().httpsCallable('openStreetsAgent');
      liveMode = true;
      setStatus('connected', 'Firebase agent connected');
    } catch (error) {
      console.error('Agent initialization error:', error);
      setStatus('error', 'Agent setup error · preview mode');
    }
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
      return `PREVIEW RESPONSE\n\nA first draft could preserve a signed local-access lane or scheduled access window for deliveries and accessible pickup. Keep emergency access clear, identify who moves barriers, and map nearby curb space before choosing hours.\n\nQuestions to verify: Which buildings need regular loading? Where can paratransit stop? Who will communicate the plan to residents and drivers?`;
    }
    if (lower.includes('outreach') || lower.includes('ask neighbor')) {
      return `PREVIEW RESPONSE\n\nStart by asking when the block is busiest, which public-space needs are missing, what access must remain, what concerns residents have, and who could help operate the street. Record disagreements rather than treating one poll result as neighborhood consensus.`;
    }
    return `PREVIEW RESPONSE\n\nPossible first draft:\n• Purpose: walking, play, seating, and low-intensity community activity\n• Trial schedule: one weekend day for four to six hours\n• Access: emergency access at all times, with a plan for deliveries and accessible pickup\n• Operations: named partner, trained barrier monitors, storage, cleanup, and neighbor communication\n\nConnect Firebase Functions and add the OpenAI secret to replace this preview with live AI responses.`;
  }

  async function sendMessage(message) {
    appendMessage('user', message);
    history.push({ role: 'user', content: message });
    const loading = appendMessage('assistant', 'Thinking through the block, schedule, access, and operations', 'loading');
    errorMessage.textContent = '';
    sendButton.disabled = true;
    input.disabled = true;

    try {
      let reply;
      if (liveMode && callable) {
        const result = await callable({
          message,
          sessionId,
          history: history.slice(0, -1).slice(-8)
        });
        reply = result.data && result.data.reply;
        if (!reply) throw new Error('The function returned no reply.');
      } else {
        await new Promise((resolve) => setTimeout(resolve, 500));
        reply = previewReply(message);
      }

      loading.remove();
      appendMessage('assistant', reply);
      history.push({ role: 'assistant', content: reply });
      while (history.length > 10) history.shift();
    } catch (error) {
      console.error('Agent request failed:', error);
      loading.remove();
      appendMessage('assistant', 'I could not reach the planning agent. Check the Firebase Function deployment and OpenAI secret, then try again.', 'error-message');
      errorMessage.textContent = 'Connection failed. Open the browser console and review README.md troubleshooting.';
      setStatus('error', 'Agent request failed');
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
