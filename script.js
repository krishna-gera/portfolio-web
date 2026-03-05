const html = document.documentElement;
const themeToggles = document.querySelectorAll('.theme-toggle');
const scrollProgress = document.getElementById('scrollProgress');
const toTopBtn = document.getElementById('toTop');
const menuToggle = document.getElementById('menuToggle');
const sidebar = document.getElementById('mobileSidebar');
const sidebarClose = document.getElementById('sidebarClose');
const sidebarBackdrop = document.getElementById('sidebarBackdrop');

function setTheme(theme) {
  html.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
  themeToggles.forEach((btn) => {
    const base = theme === 'dark' ? '☀️' : '🌙';
    btn.textContent = btn.classList.contains('sidebar-theme') ? `${base} Toggle theme` : base;
  });
}

setTheme(localStorage.getItem('theme') || 'light');

themeToggles.forEach((btn) => {
  btn.addEventListener('click', () => {
    const current = html.getAttribute('data-theme') || 'light';
    setTheme(current === 'light' ? 'dark' : 'light');
  });
});

function openSidebar() {
  if (!sidebar) return;
  sidebar.classList.add('open');
  sidebar.setAttribute('aria-hidden', 'false');
  sidebarBackdrop?.removeAttribute('hidden');
  menuToggle?.setAttribute('aria-expanded', 'true');
}

function closeSidebar() {
  if (!sidebar) return;
  sidebar.classList.remove('open');
  sidebar.setAttribute('aria-hidden', 'true');
  sidebarBackdrop?.setAttribute('hidden', '');
  menuToggle?.setAttribute('aria-expanded', 'false');
}

menuToggle?.addEventListener('click', openSidebar);
sidebarClose?.addEventListener('click', closeSidebar);
sidebarBackdrop?.addEventListener('click', closeSidebar);
document.querySelectorAll('.mobile-nav a').forEach((a) => a.addEventListener('click', closeSidebar));

function handleScrollFx() {
  const scrollTop = window.scrollY;
  const docHeight = document.documentElement.scrollHeight - window.innerHeight;
  const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;

  if (scrollProgress) scrollProgress.style.width = `${progress}%`;
  if (toTopBtn) toTopBtn.classList.toggle('show', scrollTop > 380);
}
window.addEventListener('scroll', handleScrollFx, { passive: true });
handleScrollFx();

if (toTopBtn) {
  toTopBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

const sectionObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) entry.target.classList.add('in-view');
  });
}, { threshold: 0.12 });

document.querySelectorAll('.zoom-section').forEach((el) => sectionObserver.observe(el));
document.getElementById('year')?.append(new Date().getFullYear());

function assignRevealItems(root = document) {
  const selectors = [
    '.hero > *', '.stat', '.chip', '.skill-block', '.card', '.contact-card',
    '.section-head > *', '.project-toolbar > *', '.form > *', '.cta-row > *',
    'footer > *', '.typing-line', '.lead', 'h1', 'h2', '.eyebrow'
  ];

  const seen = new Set();
  selectors.forEach((sel) => {
    root.querySelectorAll(sel).forEach((el, idx) => {
      if (!seen.has(el)) {
        seen.add(el);
        el.classList.add('reveal-item');
        el.style.setProperty('--reveal-delay', `${Math.min(idx * 60, 360)}ms`);
      }
    });
  });
}

const appearObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('reveal-in');
      appearObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.18, rootMargin: '0px 0px -8% 0px' });

function observeRevealItems(root = document) {
  root.querySelectorAll('.reveal-item').forEach((item) => appearObserver.observe(item));
}

function enableCardTilt() {
  if (!window.matchMedia('(pointer:fine)').matches) return;
  document.querySelectorAll('.card').forEach((card) => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const rotateY = ((x / rect.width) - 0.5) * 8;
      const rotateX = ((y / rect.height) - 0.5) * -8;
      card.style.transform = `translateY(-5px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });
}

function animateCounter(element, target, suffix = '') {
  const duration = 1200;
  const start = performance.now();
  function update(now) {
    const progress = Math.min((now - start) / duration, 1);
    element.textContent = `${Math.floor(progress * target)}${suffix}`;
    if (progress < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

function startTyping(words) {
  const el = document.getElementById('typedRole');
  if (!el || !words?.length) return;

  let wordIndex = 0;
  let charIndex = 0;
  let deleting = false;

  function tick() {
    const currentWord = words[wordIndex];
    charIndex += deleting ? -1 : 1;
    el.textContent = currentWord.slice(0, charIndex);

    let delay = deleting ? 45 : 90;
    if (!deleting && charIndex === currentWord.length) {
      deleting = true;
      delay = 1100;
    } else if (deleting && charIndex === 0) {
      deleting = false;
      wordIndex = (wordIndex + 1) % words.length;
      delay = 280;
    }
    setTimeout(tick, delay);
  }
  tick();
}

function setupProjectFilters() {
  const filterButtons = document.querySelectorAll('.filter-btn');
  const searchInput = document.getElementById('projectSearch');
  const cards = document.querySelectorAll('#allProjects .card');
  if (!filterButtons.length || !cards.length) return;

  const applyFilter = () => {
    const active = document.querySelector('.filter-btn.active')?.dataset.filter || 'all';
    const query = (searchInput?.value || '').toLowerCase().trim();

    cards.forEach((card) => {
      const category = card.dataset.category || '';
      const hay = `${card.dataset.name || ''} ${card.dataset.stack || ''}`.toLowerCase();
      card.style.display = ((active === 'all' || category === active) && (!query || hay.includes(query))) ? '' : 'none';
    });
  };

  filterButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      filterButtons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      applyFilter();
    });
  });
  searchInput?.addEventListener('input', applyFilter);
}

function setupCopyEmail() {
  const copyBtn = document.getElementById('copyEmail');
  const status = document.getElementById('copyStatus');
  if (!copyBtn || !navigator.clipboard) return;

  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(copyBtn.dataset.email || '');
      if (status) status.textContent = 'Email copied to clipboard.';
      setTimeout(() => status && (status.textContent = ''), 1800);
    } catch {
      if (status) status.textContent = 'Copy failed. Please copy manually.';
    }
  });
}

function renderProjects(container, projects) {
  projects.forEach((project) => {
    const card = document.createElement('article');
    card.className = 'card';
    card.dataset.category = project.category || 'all';
    card.dataset.name = project.name || '';
    card.dataset.stack = (project.stack || []).join(' ');

    const links = [];
    if (project.live) links.push(`<a href="${project.live}" target="_blank" rel="noreferrer">Live Demo</a>`);
    if (project.github) links.push(`<a href="${project.github}" target="_blank" rel="noreferrer">GitHub</a>`);

    card.innerHTML = `
      ${project.category ? `<span class="tag">${project.category.toUpperCase()}</span>` : ''}
      <h3>${project.name}</h3>
      <p>${project.summary}</p>
      <p class="meta"><strong>Stack:</strong> ${(project.stack || []).join(', ')}</p>
      <p class="meta">${project.role}</p>
      ${links.length ? `<div class="links">${links.join('')}</div>` : '<p class="meta">Links coming soon.</p>'}
    `;
    container.appendChild(card);
  });
}

async function loadContent() {
  try {
    const res = await fetch('content.json');
    if (!res.ok) return;
    const data = await res.json();

    startTyping(data.typingRoles);

    const statsEl = document.getElementById('stats');
    if (statsEl && Array.isArray(data.stats)) {
      data.stats.forEach((item) => {
        const stat = document.createElement('article');
        stat.className = 'stat';
        stat.innerHTML = `<strong class="counter" data-target="${item.value}" data-suffix="${item.suffix || ''}">0</strong><span>${item.label}</span>`;
        statsEl.appendChild(stat);
      });

      const counterObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !entry.target.dataset.animated) {
            entry.target.dataset.animated = '1';
            animateCounter(entry.target, Number(entry.target.dataset.target || 0), entry.target.dataset.suffix || '');
          }
        });
      }, { threshold: 0.6 });

      statsEl.querySelectorAll('.counter').forEach((counter) => counterObserver.observe(counter));
    }

    const highlightsEl = document.getElementById('highlights');
    if (highlightsEl) data.highlights.forEach((h) => {
      const chip = document.createElement('span');
      chip.className = 'chip';
      chip.textContent = h;
      highlightsEl.appendChild(chip);
    });

    const skillsGrid = document.getElementById('skillsGrid');
    if (skillsGrid) Object.entries(data.skills).forEach(([category, items]) => {
      const block = document.createElement('article');
      block.className = 'skill-block';
      block.innerHTML = `<h3>${category}</h3><p>${items.join(' · ')}</p>`;
      skillsGrid.appendChild(block);
    });

    const certEl = document.getElementById('certifications');
    if (certEl && Array.isArray(data.certifications)) data.certifications.forEach((cert) => {
      const card = document.createElement('article');
      card.className = 'card';
      const provider = typeof cert === 'string' ? 'Certification' : cert.provider;
      const name = typeof cert === 'string' ? cert : cert.name;
      const link = typeof cert === 'string' ? 'https://www.credly.com/' : (cert.credentialUrl || 'https://www.credly.com/');
      card.innerHTML = `<h3 class="cert-provider">${provider}</h3><p>${name}</p><a class="cert-link" href="${link}" target="_blank" rel="noreferrer">View credential ↗</a>`;
      certEl.appendChild(card);
    });

    const featured = document.getElementById('featuredProjects');
    if (featured) renderProjects(featured, data.projects.slice(0, 2));

    const allProjects = document.getElementById('allProjects');
    if (allProjects) renderProjects(allProjects, data.projects);

    setupProjectFilters();
    setupCopyEmail();
    assignRevealItems();
    observeRevealItems();
    enableCardTilt();
  } catch (e) {
    console.error('Failed to load content', e);
  }
}

assignRevealItems();
observeRevealItems();
loadContent();
