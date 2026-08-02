(() => {
  'use strict';

  const root = document.getElementById('openStreetsAgent');
  if (!root) return;

  const form = document.getElementById('agentForm');
  const input = document.getElementById('agentInput');
  const sendButton = document.getElementById('agentSend');
  const clearButton = document.getElementById('agentClear');
  const messages = document.getElementById('agentMessages');
  const characterCount = document.getElementById('agentCharacterCount');
  const errorMessage = document.getElementById('agentError');
  const connectionStatus = document.getElementById('agentConnectionStatus');

  const REGION = 'us-central1';
  const STORAGE_KEY = 'openStreetsAgentHistoryFinal';
  const sessionId = getSessionId();
  let history = loadHistory();
  let database = null;
  let functionUrl = '';
  let agentReady = false;

  function getSessionId() {
    const key = 'openStreetsAgentSessionId';
    let value = localStorage.getItem(key);
    if (!value) {
      value = `session_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem(key, value);
    }
    return value;
  }

  function loadHistory() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(value) ? value.slice(-10) : [];
    } catch (_) {
      return [];
    }
  }

  function saveHistory() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(-10)));
  }

  function configIsComplete(config) {
    if (!config || typeof config !== 'object') return false;
    const required = ['apiKey', 'authDomain', 'projectId', 'appId'];
    return required.every((key) => {
      const value = String(config[key] || '');
      return value && !value.includes('PASTE_');
    });
  }

  function setStatus(state, text) {
    connectionStatus.className = `firebase-status ${state}`;
    const label = connectionStatus.querySelector('span');
    if (label) label.textContent = text;
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

  async function saveMessageToFirebase(role, text) {
    if (!database) return;
    try {
      await database.ref(`openStreetsAgent/messages/${sessionId}`).push({
        role,
        text: String(text).slice(0, 5000),
        createdAt: Date.now()
      });
    } catch (error) {
      // The agent remains usable even if Realtime Database has not been enabled.
      console.warn('Firebase message storage unavailable; continuing with local history.', error);
    }
  }

  async function checkAgent() {
    try {
      const response = await fetch(functionUrl, { method: 'GET', cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json();
      if (!result.ok) throw new Error('Agent health check failed.');
      agentReady = true;
      setStatus('connected', 'Firebase + OpenAI agent ready');
    } catch (error) {
      agentReady = false;
      console.error('Agent health check failed:', error);
      setStatus('error', 'Backend not deployed yet');
      errorMessage.textContent = 'Run DEPLOY_BACKEND.command once, then refresh this page.';
    }
  }

  function initialize() {
    const config = window.OPEN_STREETS_FIREBASE_CONFIG;
    if (!window.firebase || !configIsComplete(config)) {
      setStatus('error', 'Add Firebase web config');
      errorMessage.textContent = 'Replace the placeholder values in firebase-config.js.';
      return;
    }

    try {
      const app = firebase.apps.length ? firebase.app() : firebase.initializeApp(config);
      if (config.databaseURL && firebase.database) {
        database = app.database();
      }
      functionUrl = `https://${REGION}-${config.projectId}.cloudfunctions.net/openStreetsAgent`;
      checkAgent();
    } catch (error) {
      console.error('Firebase initialization error:', error);
      setStatus('error', 'Firebase configuration error');
      errorMessage.textContent = error.message;
    }
  }

  async function requestAgent(message) {
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        history: history.slice(-8)
      })
    });

    let data = null;
    try {
      data = await response.json();
    } catch (_) {
      data = {};
    }

    if (!response.ok) {
      throw new Error(data.error || `Agent request failed with HTTP ${response.status}.`);
    }
    if (!data.reply) throw new Error('The agent returned no reply.');
    return data.reply;
  }

  async function sendMessage(message) {
    appendMessage('user', message);
    history.push({ role: 'user', content: message });
    saveHistory();
    saveMessageToFirebase('user', message);

    const loading = appendMessage('assistant', 'Thinking through the block, schedule, access, and operations…', 'loading');
    errorMessage.textContent = '';
    sendButton.disabled = true;
    input.disabled = true;

    try {
      if (!agentReady) {
        await checkAgent();
      }
      if (!agentReady) throw new Error('The Firebase backend is not reachable.');

      const reply = await requestAgent(message);
      loading.remove();
      appendMessage('assistant', reply);
      history.push({ role: 'assistant', content: reply });
      history = history.slice(-10);
      saveHistory();
      saveMessageToFirebase('assistant', reply);
    } catch (error) {
      console.error('Agent request failed:', error);
      loading.remove();
      appendMessage('assistant', `I could not reach the planning agent. ${error.message}`, 'error-message');
      errorMessage.textContent = error.message;
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
    history = [];
    saveHistory();
    messages.innerHTML = '';
    appendMessage('assistant', 'Chat cleared. Describe a block, schedule, goal, or concern to begin a new first-draft concept.');
    errorMessage.textContent = '';
  });

  initialize();
})();
