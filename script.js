const html = document.documentElement;
const toggle = document.getElementById('themeToggle');

function setTheme(theme) {
  html.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
  if (toggle) toggle.textContent = theme === 'dark' ? '☀️' : '🌙';
}

const savedTheme = localStorage.getItem('theme');
if (savedTheme) setTheme(savedTheme);

if (toggle) {
  toggle.addEventListener('click', () => {
    const current = html.getAttribute('data-theme') || 'light';
    setTheme(current === 'light' ? 'dark' : 'light');
  });
}

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) entry.target.classList.add('in-view');
  });
}, { threshold: 0.15 });

document.querySelectorAll('.zoom-section').forEach((el) => observer.observe(el));

document.getElementById('year')?.append(new Date().getFullYear());

async function loadContent() {
  try {
    const res = await fetch('content.json');
    if (!res.ok) return;
    const data = await res.json();

    const highlightsEl = document.getElementById('highlights');
    if (highlightsEl) {
      data.highlights.forEach((h) => {
        const chip = document.createElement('span');
        chip.className = 'chip';
        chip.textContent = h;
        highlightsEl.appendChild(chip);
      });
    }

    const skillsGrid = document.getElementById('skillsGrid');
    if (skillsGrid) {
      Object.entries(data.skills).forEach(([category, items]) => {
        const block = document.createElement('article');
        block.className = 'skill-block';
        block.innerHTML = `<h3>${category}</h3><p>${items.join(' · ')}</p>`;
        skillsGrid.appendChild(block);
      });
    }

    const featured = document.getElementById('featuredProjects');
    if (featured) renderProjects(featured, data.projects.slice(0, 2));

    const allProjects = document.getElementById('allProjects');
    if (allProjects) renderProjects(allProjects, data.projects);
  } catch (e) {
    console.error('Failed to load content', e);
  }
}

function renderProjects(container, projects) {
  projects.forEach((project) => {
    const card = document.createElement('article');
    card.className = 'card';
    const links = [];
    if (project.live) links.push(`<a href="${project.live}" target="_blank" rel="noreferrer">Live Demo</a>`);
    if (project.github) links.push(`<a href="${project.github}" target="_blank" rel="noreferrer">GitHub</a>`);

    card.innerHTML = `
      <h3>${project.name}</h3>
      <p>${project.summary}</p>
      <p class="meta"><strong>Stack:</strong> ${project.stack.join(', ')}</p>
      <p class="meta">${project.role}</p>
      ${links.length ? `<div class="links">${links.join('')}</div>` : '<p class="meta">Links coming soon.</p>'}
    `;
    container.appendChild(card);
  });
}

loadContent();
