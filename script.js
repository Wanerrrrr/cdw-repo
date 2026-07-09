const cards = document.querySelectorAll('.gallery-card');
const ring = document.getElementById('galleryRing');
const captionLabel = document.getElementById('captionLabel');
const captionTitle = document.getElementById('captionTitle');
const total = cards.length;
let active = 0;

cards.forEach((card, i) => {
  const angle = i * (360 / total);
  card.style.setProperty('--angle', angle + 'deg');

  card.addEventListener('mouseenter', () => focusCard(i));
  card.addEventListener('focus', () => focusCard(i));
});

function focusCard(index){
  active = index;
  const rotation = -active * (360 / total);
  ring.style.transform = `rotateY(${rotation}deg)`;

  cards.forEach((card, i) => card.classList.toggle('is-active', i === active));
  captionLabel.textContent = cards[active].dataset.label;
  captionTitle.textContent = cards[active].dataset.title;
}

focusCard(0);

window.addEventListener('mousemove', (e) => {
  const archive = document.querySelector('.archive');
  if(!archive.matches(':hover')) return;
  const x = (e.clientX / window.innerWidth - 0.5) * 10;
  const y = (e.clientY / window.innerHeight - 0.5) * -6;
  ring.style.transform = `rotateY(${-active * (360 / total) + x}deg) rotateX(${y}deg)`;
});

window.addEventListener('mouseleave', () => focusCard(active));
