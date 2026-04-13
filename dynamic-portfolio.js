let SUPABASE_URL = "";
let SUPABASE_KEY = "";

async function loadEnv() {
  try {
    const res = await fetch("/api/env");
    const data = await res.json();

    SUPABASE_URL = data.SUPABASE_URL;
    SUPABASE_KEY = data.SUPABASE_ANON_KEY;

    if (!SUPABASE_URL || !SUPABASE_KEY) {
      throw new Error("Missing ENV from API");
    }
  } catch (err) {
    console.error("ENV load failed:", err);
    throw err;
  }
}


const portfolioRoot = document.getElementById('portfolioRoot');
const portfolioStatus = document.getElementById('portfolioStatus');

function createSupabaseClient() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error('Supabase environment variables are missing.');
  }

  if (!window.supabase || !window.supabase.createClient) {
    console.error("Supabase not loaded yet:", window.supabase);
    throw new Error('Supabase client SDK is unavailable.');
  }

  return window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}

function setStatus(type, title, message) {
  if (!portfolioStatus) return;
  portfolioStatus.className = `zoom-section portfolio-state state-${type}`;
  portfolioStatus.classList.add('in-view');
  portfolioStatus.innerHTML = `<h1>${title}</h1><p class="lead">${message}</p>`;
}

function getUsernameFromUrl() {
  return new URLSearchParams(window.location.search).get('username')?.trim() || '';
}

async function fetchUserIdByUsername(client, username) {
  const { data, error } = await client
    .from('users')
    .select('id')
    .eq('username', username)
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data?.id || null;
}

async function fetchPortfolioData(client, userId) {
  const tableFetchers = [
    client.from('profiles').select('*').eq('user_id', userId).limit(1).maybeSingle(),
    client.from('skills').select('*').eq('user_id', userId),
    client.from('focus_areas').select('*').eq('user_id', userId),
    client.from('projects').select('*').eq('user_id', userId),
    client.from('experience').select('*').eq('user_id', userId),
    client.from('certifications').select('*').eq('user_id', userId),
    client.from('socials').select('*').eq('user_id', userId).limit(1).maybeSingle(),
    client.from('settings').select('*').eq('user_id', userId).limit(1).maybeSingle(),
    client.from('section_order').select('*').eq('user_id', userId)
  ];

  const [
    profileRes,
    skillsRes,
    focusAreasRes,
    projectsRes,
    experienceRes,
    certificationsRes,
    socialsRes,
    settingsRes,
    sectionOrderRes
  ] = await Promise.all(tableFetchers);

  [
    profileRes,
    skillsRes,
    focusAreasRes,
    projectsRes,
    experienceRes,
    certificationsRes,
    socialsRes,
    settingsRes,
    sectionOrderRes
  ].forEach((result) => {
    if (result.error) throw result.error;
  });

  return {
    profile: profileRes.data || null,
    skills: skillsRes.data || [],
    focusAreas: focusAreasRes.data || [],
    projects: projectsRes.data || [],
    experience: experienceRes.data || [],
    certifications: certificationsRes.data || [],
    socials: socialsRes.data || null,
    settings: settingsRes.data || null,
    sectionOrder: sectionOrderRes.data || []
  };
}

function normalizeSectionKey(value = '') {
  return String(value).replace(/[_\s-]+/g, '').toLowerCase();
}

function extractGitHubUsername(profileUrl = '') {
  const raw = String(profileUrl || '').trim();
  if (!raw) return '';

  const normalizedUrl = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;

  try {
    const parsed = new URL(normalizedUrl);
    if (!/^(www\.)?github\.com$/i.test(parsed.hostname)) return '';
    const [username] = parsed.pathname.split('/').filter(Boolean);
    return username || '';
  } catch {
    return '';
  }
}

async function getPublicRepoCountFromGitHubUrl(profileUrl = '') {
  const username = extractGitHubUsername(profileUrl);
  if (!username) return 0;

  try {
    const response = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}`);
    if (!response.ok) return 0;

    const payload = await response.json();
    const repoCount = Number(payload?.public_repos);
    return Number.isFinite(repoCount) ? repoCount : 0;
  } catch {
    return 0;
  }
}

function transformPortfolioData(raw) {
  const safeOrder = (raw.sectionOrder || [])
    .filter((item) => item && typeof item === 'object')
    .sort((a, b) => (a.position ?? Number.MAX_SAFE_INTEGER) - (b.position ?? Number.MAX_SAFE_INTEGER));

  return {
    profile: raw.profile || null,
    skills: Array.isArray(raw.skills) ? raw.skills.filter((x) => x?.name) : [],
    focusAreas: Array.isArray(raw.focusAreas) ? raw.focusAreas.filter((x) => x?.title) : [],
    projects: Array.isArray(raw.projects) ? raw.projects.filter((x) => x?.title) : [],
    experience: Array.isArray(raw.experience) ? raw.experience.filter((x) => x?.role || x?.company) : [],
    certifications: Array.isArray(raw.certifications) ? raw.certifications.filter((x) => x?.title) : [],
    socials: raw.socials || {},
    settings: raw.settings || {},
    sectionOrder: safeOrder,
    githubRepoCount: 0
  };
}

function createSection(title, sectionClass = '') {
  const section = document.createElement('section');
  section.className = `zoom-section ${sectionClass}`.trim();
  section.classList.add('in-view');

  const heading = document.createElement('h2');
  heading.textContent = title;
  section.appendChild(heading);
  return section;
}

function isRenderableSection(sectionKey, data) {
  const key = normalizeSectionKey(sectionKey);
  if (key === 'hero' || key === 'profile') return Boolean(data.profile);
  if (key === 'stats') return true;
  if (key === 'skills') return data.skills.length > 0;
  if (key === 'focusareas') return data.focusAreas.length > 0;
  if (key === 'projects') return data.projects.length > 0;
  if (key === 'experience') return data.experience.length > 0;
  if (key === 'certifications') return data.certifications.length > 0;
  if (key === 'socials') return Object.values(data.socials || {}).some(Boolean);
  return false;
}

function renderHero(data) {
  if (!data.profile) return null;
  const hero = document.createElement('section');
  hero.className = 'hero zoom-section portfolio-generated';
  hero.classList.add('in-view');

  const textWrap = document.createElement('div');
  textWrap.innerHTML = `
    <p class="eyebrow">${data.profile.status || 'Portfolio'}</p>
    <h1>${data.profile.name || 'Portfolio User'}</h1>
    <p class="lead">${data.profile.tagline || ''}</p>
    <p>${data.profile.about || ''}</p>
    <p class="meta">${data.profile.role || ''}${data.profile.location ? ` · ${data.profile.location}` : ''}</p>
  `;

  hero.appendChild(textWrap);

  if (data.profile.profile_photo_url) {
    const image = document.createElement('img');
    image.src = data.profile.profile_photo_url;
    image.alt = `${data.profile.name || 'Profile'} photo`;
    image.className = 'profile';
    hero.appendChild(image);
  }

  return hero;
}

function renderSkills(data) {
  const section = createSection('Skills', 'skills portfolio-generated');
  const grid = document.createElement('div');
  grid.className = 'skills-grid';

  data.skills.forEach((skill) => {
    const card = document.createElement('article');
    card.className = 'skill-block';
    card.innerHTML = `<h3>${skill.name}</h3><p>${skill.level || 'Not specified'}</p>`;
    grid.appendChild(card);
  });

  section.appendChild(grid);
  return section;
}

function renderStats(data) {
  const section = document.createElement('section');
  section.className = 'stats zoom-section portfolio-generated in-view';

  const metrics = [
    { value: `${data.projects.length}+`, label: 'Major Projects' },
    { value: `${data.skills.length}+`, label: 'Technologies Explored' },
    { value: String(data.focusAreas.length), label: 'Core Focus Areas' },
    { value: `${data.githubRepoCount}+`, label: 'GitHub Repos' }
  ];

  metrics.forEach((metric) => {
    const card = document.createElement('article');
    card.className = 'stat';
    card.innerHTML = `<strong>${metric.value}</strong><span>${metric.label}</span>`;
    section.appendChild(card);
  });

  return section;
}

function renderFocusAreas(data) {
  const section = createSection('Focus Areas', 'about portfolio-generated');
  const chipWrap = document.createElement('div');
  chipWrap.className = 'chips';

  data.focusAreas.forEach((area) => {
    const chip = document.createElement('span');
    chip.className = 'chip';
    chip.textContent = area.title;
    chipWrap.appendChild(chip);
  });

  section.appendChild(chipWrap);
  return section;
}

function renderProjects(data) {
  const section = createSection('Projects', 'featured portfolio-generated');
  const cards = document.createElement('div');
  cards.className = 'cards';

  data.projects.forEach((project) => {
    const card = document.createElement('article');
    card.className = 'card';

    const stack = Array.isArray(project.tech_stack) ? project.tech_stack.join(', ') : '';
    card.innerHTML = `
      <h3>${project.title || 'Untitled project'}</h3>
      <p>${project.description || ''}</p>
      ${stack ? `<p class="meta"><strong>Tech:</strong> ${stack}</p>` : ''}
    `;

    cards.appendChild(card);
  });

  section.appendChild(cards);
  return section;
}

function renderExperience(data) {
  const section = createSection('Experience', 'featured portfolio-generated');
  const cards = document.createElement('div');
  cards.className = 'cards';

  data.experience.forEach((item) => {
    const card = document.createElement('article');
    card.className = 'card';
    card.innerHTML = `
      <h3>${item.role || 'Role not specified'}</h3>
      <p class="meta">${item.company || ''}${item.type ? ` · ${item.type}` : ''}</p>
      <p>${item.description || ''}</p>
    `;
    cards.appendChild(card);
  });

  section.appendChild(cards);
  return section;
}

function renderCertifications(data) {
  const section = createSection('Certifications', 'certs portfolio-generated');
  const cards = document.createElement('div');
  cards.className = 'cards';

  data.certifications.forEach((cert) => {
    const card = document.createElement('article');
    card.className = 'card';

    const urlMarkup = cert.credential_url
      ? `<a class="cert-link" href="${cert.credential_url}" target="_blank" rel="noreferrer">View credential ↗</a>`
      : '';

    card.innerHTML = `
      <h3 class="cert-provider">${cert.issuer || 'Certification'}</h3>
      <p>${cert.title}</p>
      ${urlMarkup}
    `;

    cards.appendChild(card);
  });

  section.appendChild(cards);
  return section;
}

function renderSocials(data) {
  const section = createSection('Socials', 'contact portfolio-generated');
  const wrap = document.createElement('div');
  wrap.className = 'socials';

  const links = {
    GitHub: data.socials.github,
    LinkedIn: data.socials.linkedin,
    Twitter: data.socials.twitter,
    Portfolio: data.socials.portfolio
  };

  Object.entries(links).forEach(([label, url]) => {
    if (!url) return;
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noreferrer';
    link.textContent = label;
    wrap.appendChild(link);
  });

  section.appendChild(wrap);
  return section;
}

function renderPortfolio(data) {
  if (!portfolioRoot) return;
  if (portfolioStatus) portfolioStatus.remove();

  const rendererMap = {
    hero: renderHero,
    profile: renderHero,
    stats: renderStats,
    skills: renderSkills,
    focusareas: renderFocusAreas,
    projects: renderProjects,
    experience: renderExperience,
    certifications: renderCertifications,
    socials: renderSocials
  };

  const sectionsFromOrder = data.sectionOrder.length
    ? data.sectionOrder.map((item) => normalizeSectionKey(item.section_key || item.section || item.name))
    : ['hero', 'stats', 'skills', 'focusareas', 'projects', 'experience', 'certifications', 'socials'];

  if (!sectionsFromOrder.includes('stats')) {
    const heroIndex = sectionsFromOrder.findIndex((key) => key === 'hero' || key === 'profile');
    if (heroIndex >= 0) sectionsFromOrder.splice(heroIndex + 1, 0, 'stats');
    else sectionsFromOrder.unshift('stats');
  }

  const rendered = new Set();

  sectionsFromOrder.forEach((sectionKey) => {
    if (rendered.has(sectionKey) || !isRenderableSection(sectionKey, data)) return;
    const renderFn = rendererMap[sectionKey];
    if (!renderFn) return;

    const node = renderFn(data);
    if (node) {
      rendered.add(sectionKey);
      portfolioRoot.appendChild(node);
    }
  });

  if (rendered.size === 0) {
    const emptyState = document.createElement('section');
    emptyState.className = 'zoom-section portfolio-state state-empty';
    emptyState.classList.add('in-view');
    emptyState.innerHTML = '<h1>No portfolio data available</h1><p class="lead">This user has no renderable sections yet.</p>';
    portfolioRoot.appendChild(emptyState);
  }

  if (typeof assignRevealItems === 'function') assignRevealItems(portfolioRoot);
  if (typeof observeRevealItems === 'function') observeRevealItems(portfolioRoot);
}

async function initializeDynamicPortfolio() {
  const username = getUsernameFromUrl();

  if (!username) {
    setStatus('empty', 'Portfolio Viewer', 'Add a username in the URL query to load a portfolio.');
    return;
  }

  setStatus('loading', 'Loading portfolio...', `Fetching data for @${username}.`);

  try {
    const supabaseClient = createSupabaseClient();
    const userId = await fetchUserIdByUsername(supabaseClient, username);

    if (!userId) {
      setStatus('empty', 'User not found', `No user found for username "${username}".`);
      return;
    }

    const raw = await fetchPortfolioData(supabaseClient, userId);
    const transformed = transformPortfolioData(raw);
    transformed.githubRepoCount = await getPublicRepoCountFromGitHubUrl(transformed.socials?.github);
    renderPortfolio(transformed);
  } catch (error) {
    console.error('Failed to load dynamic portfolio', error);
    setStatus('error', 'Failed to load portfolio', error.message || 'Something went wrong while rendering this portfolio.');
  }
}

async function startApp() {
  try {
    await loadEnv();
    initializeDynamicPortfolio();
  } catch (err) {
    console.error("App init failed:", err);
    setStatus("error", "Config Error", "Failed to load environment variables.");
  }
}

startApp();
