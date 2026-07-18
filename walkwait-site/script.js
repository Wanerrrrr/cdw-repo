const menuToggle = document.querySelector('.menu-toggle');
const siteNav = document.querySelector('.site-nav');

menuToggle?.addEventListener('click', () => {
  const isOpen = siteNav.classList.toggle('open');
  menuToggle.setAttribute('aria-expanded', String(isOpen));
});

siteNav?.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    siteNav.classList.remove('open');
    menuToggle?.setAttribute('aria-expanded', 'false');
  });
});

const intersection = document.querySelector('.intersection');
const signalHand = document.querySelector('.signal-hand');
const signalWalk = document.querySelector('.signal-walk');
const outcomeTitle = document.getElementById('outcomeTitle');
const outcomeText = document.getElementById('outcomeText');
const simTimer = document.getElementById('simTimer');
const revealButton = document.getElementById('revealButton');
const choiceButtons = [...document.querySelectorAll('.choice-button')];
const physicalButton = document.getElementById('physicalButton');

let scenarioTimer = null;
let elapsed = 0;

const scenarios = {
  'press-wait': {
    title: 'WALK AFTER 64 SECONDS',
    text: 'You waited safely, but the interface never told you whether pressing the button changed the cycle.',
    walk: true,
    crossing: true,
    danger: false
  },
  'wait-only': {
    title: 'WALK APPEARED ANYWAY',
    text: 'The signal changed after the same wait. Did the button matter—or was WALK already part of the fixed cycle?',
    walk: true,
    crossing: true,
    danger: false
  },
  'press-cross': {
    title: 'A TURNING VEHICLE APPEARED',
    text: 'The road looked empty. You crossed before WALK and experienced a near miss with traffic outside your immediate view.',
    walk: false,
    crossing: true,
    danger: true
  },
  'cross-now': {
    title: 'THE SYSTEM KNEW MORE THAN YOU',
    text: 'You crossed immediately. A vehicle entered the intersection from a direction the interface never explained.',
    walk: false,
    crossing: true,
    danger: true
  }
};

function setSignal(isWalk) {
  signalHand.classList.toggle('active', !isWalk);
  signalWalk.classList.toggle('active', isWalk);
  document.getElementById('pedSignal')?.setAttribute('aria-label', isWalk ? 'Pedestrian signal showing walk' : 'Pedestrian signal showing stop');
}

function resetSimulation() {
  window.clearInterval(scenarioTimer);
  elapsed = 0;
  simTimer.textContent = '00:00';
  intersection.classList.remove('crossing', 'near-miss');
  setSignal(false);
  revealButton.disabled = true;
  choiceButtons.forEach(button => button.classList.remove('active'));
}

function formatTimer(value) {
  return `00:${String(value).padStart(2, '0')}`;
}

function runScenario(key, button) {
  resetSimulation();
  button.classList.add('active');
  const scenario = scenarios[key];
  outcomeTitle.textContent = key.includes('press') ? 'REQUEST SENT?' : 'NO BUTTON INPUT';
  outcomeText.textContent = 'The system provides no visible explanation. Time begins to pass.';

  const target = scenario.walk ? 10 : 6;
  scenarioTimer = window.setInterval(() => {
    elapsed += 1;
    simTimer.textContent = formatTimer(elapsed * 6);

    if (elapsed === target) {
      window.clearInterval(scenarioTimer);
      setSignal(scenario.walk);
      if (scenario.crossing) intersection.classList.add('crossing');
      if (scenario.danger) intersection.classList.add('near-miss');
      outcomeTitle.textContent = scenario.title;
      outcomeText.textContent = scenario.text;
      revealButton.disabled = false;
    }
  }, 450);
}

choiceButtons.forEach(button => {
  button.addEventListener('click', () => runScenario(button.dataset.scenario, button));
});

physicalButton?.addEventListener('click', () => {
  physicalButton.animate([
    { transform: 'scale(1)' },
    { transform: 'scale(.88)' },
    { transform: 'scale(1)' }
  ], { duration: 220 });
  outcomeTitle.textContent = 'BUTTON PRESSED';
  outcomeText.textContent = 'There is still no visible confirmation that the crossing request has been registered.';
});

revealButton?.addEventListener('click', () => {
  document.getElementById('reveal')?.scrollIntoView({ behavior: 'smooth' });
});
