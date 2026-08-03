const menuButton = document.querySelector('.mobile-menu');
const navLinks = [...document.querySelectorAll('.side-nav a')];
const sections = [...document.querySelectorAll('main section[id]')];

menuButton?.addEventListener('click', () => {
  const isOpen = document.body.classList.toggle('nav-open');
  menuButton.setAttribute('aria-expanded', String(isOpen));
});

navLinks.forEach((link) => {
  link.addEventListener('click', () => {
    document.body.classList.remove('nav-open');
    menuButton?.setAttribute('aria-expanded', 'false');
  });
});

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) entry.target.classList.add('visible');
    });
  },
  { threshold: 0.12 }
);

document.querySelectorAll('.reveal').forEach((element) => revealObserver.observe(element));

const sectionObserver = new IntersectionObserver(
  (entries) => {
    const visible = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

    if (!visible) return;
    navLinks.forEach((link) => {
      link.classList.toggle('active', link.getAttribute('href') === `#${visible.target.id}`);
    });
  },
  { rootMargin: '-25% 0px -60% 0px', threshold: [0.08, 0.2, 0.4] }
);

sections.forEach((section) => sectionObserver.observe(section));

const prompts = [
  'Follow the first sound that interrupts your rhythm.',
  'Turn when the ground material changes.',
  'Continue until the street becomes quieter.',
  'Look for a reflection and walk toward it.',
  'Pause where you can feel the wind.',
  'Choose the path with the least familiar color.'
];

function hashText(text) {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function seeded(seed) {
  let value = seed % 2147483647;
  if (value <= 0) value += 2147483646;
  return () => (value = (value * 16807) % 2147483647) / 2147483647;
}

function generateConceptRoute() {
  const input = document.querySelector('#route-word');
  const path = document.querySelector('#demo-path');
  const prompt = document.querySelector('#route-prompt');
  if (!input || !path || !prompt) return;

  const seedText = input.value.trim() || 'wander';
  const seed = hashText(seedText);
  const random = seeded(seed);
  const points = [{ x: 42, y: 312 }];

  for (let i = 1; i < 6; i += 1) {
    points.push({
      x: 42 + i * 50 + Math.round((random() - 0.5) * 34),
      y: 312 - i * 48 + Math.round((random() - 0.5) * 62)
    });
  }
  points.push({ x: 295, y: 56 });

  let d = `M${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i += 1) {
    const previous = points[i - 1];
    const current = points[i];
    const midX = (previous.x + current.x) / 2;
    d += ` C${midX} ${previous.y}, ${midX} ${current.y}, ${current.x} ${current.y}`;
  }

  path.setAttribute('d', d);
  prompt.textContent = prompts[seed % prompts.length];
  path.animate(
    [
      { strokeDasharray: '0 1000', opacity: 0.25 },
      { strokeDasharray: '1000 0', opacity: 1 }
    ],
    { duration: 900, easing: 'ease-out' }
  );
}

document.querySelector('#generate-route')?.addEventListener('click', generateConceptRoute);
document.querySelector('#route-word')?.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') generateConceptRoute();
});
