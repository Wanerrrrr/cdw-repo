const menuToggle = document.querySelector('.menu-toggle');
const siteNav = document.querySelector('.site-nav');
const navLinks = [...(siteNav?.querySelectorAll('a') || [])];

function setMenuOpen(open){
  siteNav?.classList.toggle('open', open);
  menuToggle?.setAttribute('aria-expanded', String(open));
  if(menuToggle) menuToggle.textContent = open ? 'CLOSE' : 'MENU';
  document.body.classList.toggle('menu-open', open);
}

menuToggle?.addEventListener('click', () => {
  setMenuOpen(!siteNav.classList.contains('open'));
});
navLinks.forEach(a => a.addEventListener('click', () => setMenuOpen(false)));

// Keep the long side navigation oriented by highlighting the section in view.
const observedSections = navLinks
  .map(link => document.querySelector(link.getAttribute('href')))
  .filter(Boolean);
const sectionObserver = new IntersectionObserver(entries => {
  const visible = entries
    .filter(entry => entry.isIntersecting)
    .sort((a,b) => b.intersectionRatio - a.intersectionRatio)[0];
  if(!visible) return;
  const id = `#${visible.target.id}`;
  navLinks.forEach(link => {
    const active = link.getAttribute('href') === id;
    link.classList.toggle('active', active);
    if(active) link.setAttribute('aria-current','location');
    else link.removeAttribute('aria-current');
  });
}, {rootMargin:'-18% 0px -62% 0px', threshold:[0,.15,.35,.6]});
observedSections.forEach(section => sectionObserver.observe(section));

// -----------------------------------------------------------------------------
// 01 / Equity Explorer — illustrative prototype data, clearly labeled in UI.
// -----------------------------------------------------------------------------
const candidates = {
  'Mott Haven': { borough:'Bronx', parks:92, children:86, heat:88, safety:72, presence:'Low', partners:'Schools + CBOs' },
  'Brownsville': { borough:'Brooklyn', parks:80, children:91, heat:79, safety:85, presence:'Low', partners:'Schools + nonprofits' },
  'Jamaica': { borough:'Queens', parks:67, children:74, heat:72, safety:76, presence:'Medium', partners:'BID + merchants' },
  'Jackson Heights': { borough:'Queens', parks:78, children:90, heat:83, safety:81, presence:'High', partners:'Open Street networks' },
  'Lower East Side': { borough:'Manhattan', parks:46, children:55, heat:57, safety:63, presence:'High', partners:'BIDs + CBOs' },
  'St. George': { borough:'Staten Island', parks:58, children:63, heat:52, safety:69, presence:'Low', partners:'Cultural + civic groups' }
};
let selectedCandidate = 'Mott Haven';
let activeBorough = 'All';
const weightInputs = [...document.querySelectorAll('[data-weight]')];
const mapPins = [...document.querySelectorAll('.map-pin')];

function getGapScore(name){
  const item = candidates[name];
  const active = weightInputs.filter(input => input.checked).map(input => input.dataset.weight);
  if(!active.length) return 0;
  const need = active.reduce((sum,key) => sum + item[key],0) / active.length;
  const presencePenalty = item.presence === 'High' ? 28 : item.presence === 'Medium' ? 14 : 0;
  return Math.max(0, Math.min(99, Math.round(need - presencePenalty)));
}

function updateCandidateResult(){
  const item = candidates[selectedCandidate];
  const score = getGapScore(selectedCandidate);
  document.getElementById('candidateName').textContent = selectedCandidate.toUpperCase();
  document.getElementById('gapScore').textContent = score;
  document.getElementById('presenceValue').textContent = item.presence;
  document.getElementById('needValue').textContent = score >= 75 ? 'High' : score >= 55 ? 'Medium' : 'Lower';
  document.getElementById('partnerValue').textContent = item.partners;
  mapPins.forEach(pin => pin.classList.toggle('active', pin.dataset.place === selectedCandidate));
}
weightInputs.forEach(input => input.addEventListener('change', updateCandidateResult));
mapPins.forEach(pin => pin.addEventListener('click', () => { selectedCandidate = pin.dataset.place; updateCandidateResult(); }));
document.querySelectorAll('#boroughFilter button').forEach(button => button.addEventListener('click', () => {
  activeBorough = button.dataset.borough;
  document.querySelectorAll('#boroughFilter button').forEach(b => b.classList.toggle('active', b === button));
  mapPins.forEach(pin => pin.classList.toggle('hidden', activeBorough !== 'All' && candidates[pin.dataset.place].borough !== activeBorough));
  const firstVisible = mapPins.find(pin => !pin.classList.contains('hidden'));
  if(firstVisible){ selectedCandidate = firstVisible.dataset.place; updateCandidateResult(); }
}));

document.querySelector('.select-candidate')?.addEventListener('click', () => {
  const streetInput = document.getElementById('streetInput');
  if(streetInput) streetInput.value = `${selectedCandidate} candidate block`;
  updateBrief();
  document.getElementById('builder')?.scrollIntoView({behavior:'smooth'});
});

// -----------------------------------------------------------------------------
// 02 / Scenario Builder
// -----------------------------------------------------------------------------
const builderState = {
  type:'limited',
  programs:new Set(['play','seating','trees','bike']),
  days:3,
  hours:6
};
const typeNotes = {
  limited:'A flexible shared street creates public space while preserving local access, but requires clear barriers and active management.',
  closure:'A full closure maximizes public space and reduces vehicle conflict, while increasing delivery, access, and outreach demands.',
  school:'A school street concentrates benefits around arrival, dismissal, recess, and outdoor learning, with a more limited schedule.'
};
function calculateBuilder(){
  const count = builderState.programs.size;
  const basePublic = builderState.type === 'closure' ? 78 : builderState.type === 'school' ? 68 : 58;
  const publicScore = Math.min(98, basePublic + count * 5 + builderState.days * 1.5);
  let accessScore = builderState.type === 'limited' ? 82 : builderState.type === 'school' ? 70 : 58;
  if(builderState.programs.has('loading')) accessScore += 8;
  if(builderState.programs.has('market')) accessScore -= 6;
  if(builderState.programs.has('bike')) accessScore += 3;
  accessScore = Math.max(25,Math.min(98,accessScore));
  let laborScore = 25 + count * 7 + builderState.days * 4 + builderState.hours * 1.8;
  if(builderState.type === 'closure') laborScore += 8;
  if(builderState.programs.has('market')) laborScore += 10;
  laborScore = Math.min(99,Math.round(laborScore));
  const values = {public:Math.round(publicScore),access:Math.round(accessScore),labor:laborScore};
  document.getElementById('publicScore').textContent = values.public;
  document.getElementById('accessScore').textContent = values.access;
  document.getElementById('laborScore').textContent = values.labor;
  document.getElementById('publicBar').style.width = `${values.public}%`;
  document.getElementById('accessBar').style.width = `${values.access}%`;
  document.getElementById('laborBar').style.width = `${values.labor}%`;
  document.getElementById('tradeoffNote').textContent = typeNotes[builderState.type];
  return values;
}
document.querySelectorAll('#typeSwitch button').forEach(button => button.addEventListener('click', () => {
  builderState.type = button.dataset.type;
  document.querySelectorAll('#typeSwitch button').forEach(b => b.classList.toggle('active', b === button));
  const typeInput = document.getElementById('typeInput');
  if(typeInput){
    typeInput.value = builderState.type === 'limited' ? 'Limited Local Access' : builderState.type === 'closure' ? 'Full Closure' : 'Full Closure — Schools';
  }
  calculateBuilder(); updateBrief();
}));
document.querySelectorAll('.program-button').forEach(button => button.addEventListener('click', () => {
  const program = button.dataset.program;
  if(builderState.programs.has(program)) builderState.programs.delete(program); else builderState.programs.add(program);
  button.classList.toggle('active');
  document.querySelector(`.element-${program}`)?.classList.toggle('active');
  calculateBuilder();
}));
const daysSlider = document.getElementById('daysSlider');
const hoursSlider = document.getElementById('hoursSlider');
daysSlider?.addEventListener('input', e => { builderState.days = Number(e.target.value); document.getElementById('daysValue').textContent = e.target.value; calculateBuilder(); });
hoursSlider?.addEventListener('input', e => { builderState.hours = Number(e.target.value); document.getElementById('hoursValue').textContent = e.target.value; calculateBuilder(); });
document.querySelector('.send-to-application')?.addEventListener('click', () => {
  const schedule = document.getElementById('scheduleInput');
  if(schedule) schedule.value = `${builderState.days} days per week, ${builderState.hours} hours per day`;
  updateBrief();
  document.getElementById('assistant')?.scrollIntoView({behavior:'smooth'});
});

// -----------------------------------------------------------------------------
// 03 / Application Assistant
// -----------------------------------------------------------------------------
let currentStep = 1;
const stepButtons = [...document.querySelectorAll('.step-tabs button')];
const stepPanels = [...document.querySelectorAll('.form-step')];
const prevStep = document.getElementById('prevStep');
const nextStep = document.getElementById('nextStep');
function showStep(step){
  currentStep = Math.max(1,Math.min(4,step));
  stepButtons.forEach(button => button.classList.toggle('active', Number(button.dataset.step) === currentStep));
  stepPanels.forEach(panel => panel.classList.toggle('active', Number(panel.dataset.stepPanel) === currentStep));
  prevStep.disabled = currentStep === 1;
  nextStep.textContent = currentStep === 4 ? 'UPDATE BRIEF ✓' : 'NEXT →';
  updateBrief();
}
stepButtons.forEach(button => button.addEventListener('click', () => showStep(Number(button.dataset.step))));
prevStep?.addEventListener('click', () => showStep(currentStep - 1));
nextStep?.addEventListener('click', () => { if(currentStep < 4) showStep(currentStep + 1); else updateBrief(); });

const fieldIds = ['streetInput','typeInput','purposeInput','orgInput','supportInput','lettersInput','scheduleInput','storageInput','accessInput'];
fieldIds.forEach(id => document.getElementById(id)?.addEventListener('input', updateBrief));
fieldIds.forEach(id => document.getElementById(id)?.addEventListener('change', updateBrief));

function shortText(text, fallback){
  const clean = String(text || '').trim();
  return clean ? clean.replace(/\.$/,'') : fallback;
}
function updateBrief(){
  const street = document.getElementById('streetInput')?.value || '';
  const type = document.getElementById('typeInput')?.value || '';
  const purpose = document.getElementById('purposeInput')?.value || '';
  const org = document.getElementById('orgInput')?.value || '';
  const support = document.getElementById('supportInput')?.value || '';
  const letters = document.getElementById('lettersInput')?.checked;
  const schedule = document.getElementById('scheduleInput')?.value || '';
  const storage = document.getElementById('storageInput')?.value || '';
  const access = document.getElementById('accessInput')?.value || '';
  document.getElementById('briefStreet').textContent = shortText(street,'Candidate street');
  document.getElementById('briefType').textContent = shortText(type,'Type not selected');
  document.getElementById('briefPurpose').textContent = shortText(purpose,'Purpose not described');
  document.getElementById('briefSchedule').textContent = shortText(schedule,'Schedule not proposed');
  document.getElementById('briefOrg').textContent = shortText(org,'Partner not yet confirmed');
  const checks = {site:street.length>4, partner:org.length>2, support:letters || support.length>12, ops:storage.length>12, access:access.length>12};
  document.getElementById('siteCheck').textContent = checks.site ? '✓':'○';
  document.getElementById('partnerCheck').textContent = checks.partner ? '✓':'○';
  document.getElementById('supportCheck').textContent = checks.support ? '✓':'○';
  document.getElementById('opsCheck').textContent = checks.ops ? '✓':'○';
  document.getElementById('accessCheck').textContent = checks.access ? '✓':'○';
  const complete = Object.values(checks).filter(Boolean).length;
  const base = purpose.length>10 && schedule.length>5 ? 10 : 0;
  const readiness = Math.min(100, base + complete * 18);
  document.getElementById('readinessScore').textContent = `${readiness}%`;
  document.getElementById('readinessBar').style.width = `${readiness}%`;
}
document.getElementById('printBrief')?.addEventListener('click', () => window.print());

updateCandidateResult();
calculateBuilder();
showStep(1);
