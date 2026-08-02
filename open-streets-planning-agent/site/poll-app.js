(() => {
  'use strict';

  const pollRoot = document.getElementById('openStreetsPoll');
  if (!pollRoot) return;

  const screens = [...pollRoot.querySelectorAll('[data-poll-screen]')];
  const questions = [...pollRoot.querySelectorAll('.poll-question')];
  const form = document.getElementById('communityPollForm');
  const backButton = document.getElementById('pollBack');
  const nextButton = document.getElementById('pollNext');
  const restartButton = document.getElementById('pollRestart');
  const progress = document.getElementById('pollProgress');
  const progressBar = document.getElementById('pollProgressBar');
  const progressText = document.getElementById('pollProgressText');
  const validationMessage = document.getElementById('pollValidation');
  const connectionStatus = document.getElementById('pollConnectionStatus');
  const explainer = document.getElementById('openStreetExplainer');

  const labels = {
    support: {
      yes: 'Yes',
      maybe: 'Maybe, depending on the design',
      no: 'No',
      'not-sure': 'Not sure what an Open Street is'
    },
    needs: {
      'safe-walking': 'Safe walking',
      'children-play': "Children's play",
      'trees-shade': 'Trees and shade',
      'seating-social': 'Seating and social space',
      cycling: 'Cycling space',
      'community-events': 'Community events',
      'markets-business': 'Markets and local business',
      'no-lack': 'Nothing major'
    },
    concerns: {
      parking: 'Loss of parking',
      loading: 'Delivery and loading',
      'accessible-access': 'Accessible pickup and drop-off',
      emergency: 'Emergency access',
      'traffic-diversion': 'Traffic diversion',
      noise: 'Noise and crowding',
      maintenance: 'Maintenance and cleanliness',
      management: 'Community management capacity',
      'no-concern': 'No major concern'
    },
    schedule: {
      weekend: 'Weekend daytime',
      'weekday-evening': 'Weekday evenings',
      'school-hours': 'Before and after school',
      'daily-daytime': 'Every day during daytime',
      seasonal: 'Seasonal or special events only',
      'time-sharing': 'Different uses at different times',
      'no-support': 'I would not support an Open Street'
    },
    priority: {
      'children-play': "Children's play",
      'trees-shade': 'Trees and shade',
      'seating-social': 'Seating and social space',
      'walking-cycling': 'Safe walking and cycling',
      'markets-business': 'Local markets and businesses',
      'arts-events': 'Arts and community events',
      'accessible-access': 'Accessible local access',
      balanced: 'A balanced mix of uses'
    }
  };

  const priorityOrder = Object.keys(labels.priority);
  let currentQuestion = 1;
  let latestResponse = null;
  let liveResponses = [];
  let database = null;
  let firebaseReady = false;
  let previewMode = false;

  function setScreen(name) {
    screens.forEach((screen) => {
      const active = screen.dataset.pollScreen === name;
      screen.classList.toggle('active', active);
      screen.hidden = !active;
    });
    progress.hidden = name !== 'questions';
  }

  function showQuestion(number) {
    currentQuestion = Math.max(1, Math.min(5, number));
    questions.forEach((question) => {
      question.classList.toggle('active', Number(question.dataset.question) === currentQuestion);
    });
    progressText.textContent = `QUESTION ${currentQuestion} OF 5`;
    progressBar.style.width = `${currentQuestion * 20}%`;
    backButton.textContent = '← BACK';
    backButton.hidden = currentQuestion === 1;
    nextButton.textContent = currentQuestion === 5 ? 'SUBMIT RESPONSE →' : 'CONTINUE →';
    nextButton.disabled = false;
    validationMessage.textContent = '';
    pollRoot.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function selectedRadio(name) {
    return form.querySelector(`input[name="${name}"]:checked`)?.value || '';
  }

  function selectedChecks(name) {
    return [...form.querySelectorAll(`input[name="${name}"]:checked`)].map((input) => input.value);
  }

  function validateCurrentQuestion() {
    let valid = false;
    if (currentQuestion === 1) valid = Boolean(selectedRadio('support'));
    if (currentQuestion === 2) valid = selectedChecks('needs').length > 0;
    if (currentQuestion === 3) valid = selectedChecks('concerns').length > 0;
    if (currentQuestion === 4) valid = Boolean(selectedRadio('schedule'));
    if (currentQuestion === 5) valid = Boolean(selectedRadio('priority'));

    validationMessage.textContent = valid
      ? ''
      : currentQuestion === 2 || currentQuestion === 3
        ? 'Select at least one option before continuing.'
        : 'Choose one option before continuing.';
    return valid;
  }

  function collectResponse() {
    return {
      support: selectedRadio('support'),
      needs: selectedChecks('needs'),
      concerns: selectedChecks('concerns'),
      schedule: selectedRadio('schedule'),
      priority: selectedRadio('priority'),
      schemaVersion: 1,
      createdAt: firebaseReady && window.firebase
        ? firebase.database.ServerValue.TIMESTAMP
        : Date.now()
    };
  }

  function toArray(value) {
    if (Array.isArray(value)) return value.filter(Boolean);
    if (value && typeof value === 'object') return Object.values(value).filter(Boolean);
    if (typeof value === 'string' && value) return [value];
    return [];
  }

  function normalizeResponse(response) {
    return {
      ...response,
      needs: toArray(response.needs),
      concerns: toArray(response.concerns)
    };
  }

  function countField(responses, field, isMulti = false) {
    const counts = {};
    responses.forEach((response) => {
      const values = isMulti ? toArray(response[field]) : [response[field]];
      values.filter(Boolean).forEach((value) => {
        counts[value] = (counts[value] || 0) + 1;
      });
    });
    return counts;
  }

  function topValue(counts, category) {
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return entries.length ? (labels[category][entries[0][0]] || entries[0][0]) : 'No responses yet';
  }

  function renderAggregate(responses) {
    liveResponses = responses.map(normalizeResponse).filter((response) => response.support && response.priority);
    const total = liveResponses.length;
    document.getElementById('pollTotalResponses').textContent = String(total);

    const supportCounts = countField(liveResponses, 'support');
    const supportive = (supportCounts.yes || 0) + (supportCounts.maybe || 0);
    document.getElementById('pollSupportPercent').textContent = total
      ? `${Math.round((supportive / total) * 100)}%`
      : '—';

    const needCounts = countField(liveResponses, 'needs', true);
    const concernCounts = countField(liveResponses, 'concerns', true);
    const priorityCounts = countField(liveResponses, 'priority');

    document.getElementById('pollTopNeed').textContent = topValue(needCounts, 'needs');
    document.getElementById('pollTopConcern').textContent = topValue(concernCounts, 'concerns');
    document.getElementById('pollTopPriority').textContent = topValue(priorityCounts, 'priority');

    const bars = document.getElementById('pollPriorityBars');
    bars.innerHTML = '';
    priorityOrder.forEach((key) => {
      const count = priorityCounts[key] || 0;
      const percentage = total ? Math.round((count / total) * 100) : 0;
      const row = document.createElement('div');
      row.className = 'poll-bar-row';
      row.innerHTML = `
        <div class="poll-bar-label"><span>${labels.priority[key]}</span><b>${percentage}%</b></div>
        <i><b style="width:${percentage}%"></b></i>
        <small>${count} ${count === 1 ? 'response' : 'responses'}</small>
      `;
      bars.appendChild(row);
    });
  }

  function renderResponseSummary(response) {
    const summary = document.getElementById('responseSummary');
    const entries = [
      ['Support', labels.support[response.support]],
      ['Neighborhood need', response.needs.map((key) => labels.needs[key]).join(' · ')],
      ['Main concern', response.concerns.map((key) => labels.concerns[key]).join(' · ')],
      ['Preferred schedule', labels.schedule[response.schedule]],
      ['Top priority', labels.priority[response.priority]]
    ];
    summary.innerHTML = entries.map(([term, value]) => `
      <div><span>${term}</span><b>${value}</b></div>
    `).join('');
  }

  function setConnectionState(state, message) {
    connectionStatus.className = `firebase-status ${state}`;
    connectionStatus.querySelector('span').textContent = message;
  }

  function configIsComplete(config) {
    if (!config || typeof config !== 'object') return false;
    const required = ['apiKey', 'authDomain', 'databaseURL', 'projectId', 'appId'];
    return required.every((key) => {
      const value = String(config[key] || '');
      return value && !value.includes('PASTE_') && !value.includes('your-');
    });
  }

  function loadPreviewResponses() {
    try {
      return JSON.parse(localStorage.getItem('openStreetsPollPreviewResponses') || '[]');
    } catch (error) {
      console.warn('Could not read preview responses:', error);
      return [];
    }
  }

  function savePreviewResponse(response) {
    const stored = loadPreviewResponses();
    stored.push({ ...response, createdAt: Date.now() });
    localStorage.setItem('openStreetsPollPreviewResponses', JSON.stringify(stored.slice(-100)));
    renderAggregate(stored);
  }

  function initializeFirebase() {
    const config = window.OPEN_STREETS_FIREBASE_CONFIG;
    if (!window.firebase || !configIsComplete(config)) {
      previewMode = true;
      setConnectionState('preview', 'Preview mode · add Firebase config');
      renderAggregate(loadPreviewResponses());
      return;
    }

    try {
      const app = firebase.apps.length ? firebase.app() : firebase.initializeApp(config);
      database = app.database();
      firebaseReady = true;

      database.ref('.info/connected').on('value', (snapshot) => {
        const connected = snapshot.val() === true;
        setConnectionState(
          connected ? 'connected' : 'disconnected',
          connected ? 'Firebase connected · live results' : 'Firebase reconnecting…'
        );
      });

      database.ref('openStreetsPoll/responses').on(
        'value',
        (snapshot) => {
          const data = snapshot.val() || {};
          renderAggregate(Object.values(data));
        },
        (error) => {
          console.error('Firebase read error:', error);
          setConnectionState('error', 'Firebase read blocked · check rules');
        }
      );
    } catch (error) {
      console.error('Firebase initialization error:', error);
      previewMode = true;
      setConnectionState('error', 'Firebase setup error · using local preview');
      renderAggregate(loadPreviewResponses());
    }
  }

  async function submitResponse() {
    if (!validateCurrentQuestion()) return;
    const response = collectResponse();
    latestResponse = normalizeResponse(response);
    nextButton.disabled = true;
    nextButton.textContent = 'SAVING…';
    validationMessage.textContent = '';

    try {
      if (firebaseReady && database) {
        await database.ref('openStreetsPoll/responses').push(response);
      } else {
        savePreviewResponse(response);
      }
      renderResponseSummary(latestResponse);
      setScreen('results');
      if (previewMode) {
        validationMessage.textContent = 'Saved in this browser only. Add your Firebase config before submission.';
      }
    } catch (error) {
      console.error('Could not save poll response:', error);
      validationMessage.textContent = 'The response could not be saved. Check Firebase Database Rules and try again.';
      setConnectionState('error', 'Firebase write blocked · check rules');
    } finally {
      nextButton.disabled = false;
      nextButton.textContent = 'SUBMIT RESPONSE →';
    }
  }

  pollRoot.querySelectorAll('.multi-options').forEach((group) => {
    const max = Number(group.dataset.max || 2);
    const feedback = group.parentElement.querySelector('.selection-feedback');
    group.querySelectorAll('input[type="checkbox"]').forEach((input) => {
      input.addEventListener('change', () => {
        const exclusiveValues = new Set(['no-lack', 'no-concern']);
        if (input.checked && exclusiveValues.has(input.value)) {
          group.querySelectorAll('input').forEach((other) => {
            if (other !== input) other.checked = false;
          });
        } else if (input.checked) {
          group.querySelectorAll('input').forEach((other) => {
            if (exclusiveValues.has(other.value)) other.checked = false;
          });
        }

        const checked = [...group.querySelectorAll('input:checked')];
        if (checked.length > max) {
          input.checked = false;
          feedback.textContent = `Choose no more than ${max} options.`;
        } else {
          feedback.textContent = `${checked.length} of ${max} selected`;
        }
      });
    });
  });

  form.querySelectorAll('input[name="support"]').forEach((input) => {
    input.addEventListener('change', () => {
      explainer.hidden = input.value !== 'not-sure' || !input.checked;
      validationMessage.textContent = '';
    });
  });
  form.querySelectorAll('input').forEach((input) => {
    input.addEventListener('change', () => {
      validationMessage.textContent = '';
    });
  });

  backButton.addEventListener('click', () => {
    if (currentQuestion > 1) showQuestion(currentQuestion - 1);
  });

  nextButton.addEventListener('click', () => {
    if (!validateCurrentQuestion()) return;
    if (currentQuestion < 5) showQuestion(currentQuestion + 1);
    else submitResponse();
  });

  restartButton.addEventListener('click', () => {
    form.reset();
    explainer.hidden = true;
    pollRoot.querySelectorAll('.selection-feedback').forEach((el) => { el.textContent = ''; });
    setScreen('questions');
    showQuestion(1);
  });

  setScreen('questions');
  showQuestion(1);
  initializeFirebase();
})();
