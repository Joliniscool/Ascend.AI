const API = '';

async function init() {
  try {
    const res  = await fetch(`${API}/auth/me`, { credentials: 'include' });
    const data = await res.json();
    if (!data.user) { window.location.href = '/'; return; }
    document.getElementById('user-name-display').textContent = data.user.name || data.user.email;
    document.getElementById('avatar-initial').textContent = (data.user.name || data.user.email || '?')[0].toUpperCase();
    document.getElementById('page').style.display = 'block';
    loadProfile();
    setupDrop();
  } catch { window.location.href = '/'; }
}

// ── Drop zone ──
function setupDrop() {
  const zone = document.getElementById('psl-drop');
  zone.addEventListener('dragover',  (e) => { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', ()  => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', (e) => {
    e.preventDefault(); zone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) setPhoto(file);
  });
}

function onPslPhoto(input) { if (input.files[0]) setPhoto(input.files[0]); }

function setPhoto(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    document.getElementById('psl-preview').src = e.target.result;
    document.getElementById('psl-preview').style.display = 'block';
    document.getElementById('psl-placeholder').style.display = 'none';
    document.getElementById('psl-remove').style.display = 'flex';
    document.getElementById('psl-btn').disabled = false;
  };
  reader.readAsDataURL(file);
}

function removePslPhoto(e) {
  e.stopPropagation();
  document.getElementById('psl-file').value   = '';
  document.getElementById('psl-camera').value = '';
  document.getElementById('psl-preview').style.display     = 'none';
  document.getElementById('psl-placeholder').style.display = 'flex';
  document.getElementById('psl-remove').style.display      = 'none';
  document.getElementById('psl-btn').disabled = true;
}

// ── PSL tiers ──
const PSL_TIERS = [
  { max: 3,        img: './extreme chud plat.PNG', label: '🐷 SUBHUMAN CHUD',       sub: 'ngmi. surgerymaxx or bust.',         cls: 'psl-tier-obese'  },
  { max: 4.5,      img: './chud plat.PNG',          label: '😤 FRAMEMOGGED CHUD',    sub: 'cope tier. below floor psl.',        cls: 'psl-tier-over'   },
  { max: 6.5,      img: null,                        label: '😐 NORMIE COPE',         sub: 'mew harder or stay mid forever.',    cls: 'psl-tier-normal' },
  { max: 8,        img: './prince plat.PNG',         label: '✨ CHADLITE ASCENSION',  sub: 'looksmaxxing is working. keep mewing.', cls: 'psl-tier-prince' },
  { max: Infinity, img: './king plat.PNG',           label: '👑 MOGGING EVERYONE',    sub: 'chad genetics confirmed. you mog.',  cls: 'psl-tier-king'   },
];

function tierForScore(score) {
  return PSL_TIERS.find(t => score < t.max);
}

// ── Run analysis ──
async function runPsl() {
  const fileInput   = document.getElementById('psl-file');
  const cameraInput = document.getElementById('psl-camera');
  const file        = fileInput.files[0] || cameraInput.files[0];
  if (!file) return;

  document.getElementById('upload-card').style.display    = 'none';
  document.getElementById('analyzing-card').style.display = 'block';
  document.getElementById('results-card').style.display   = 'none';

  const formData = new FormData();
  formData.append('photo', file);

  try {
    const res  = await fetch(`${API}/api/psl`, { method: 'POST', credentials: 'include', body: formData });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    showResults(data);
  } catch (err) {
    document.getElementById('analyzing-card').style.display = 'none';
    document.getElementById('upload-card').style.display    = 'block';
    showToast(err.message || 'Analysis failed. Try a clearer photo. ❌');
  }
}

function showResults(data) {
  document.getElementById('analyzing-card').style.display = 'none';
  document.getElementById('results-card').style.display   = 'block';

  const score = parseFloat(data.score) || 5;
  const tier  = tierForScore(score);

  // Verdict stamp
  document.getElementById('psl-verdict').textContent = data.verdict || tier.label;

  // Score number + color
  const scoreEl = document.getElementById('psl-score');
  scoreEl.textContent = score.toFixed(1);
  const color = score >= 8 ? '#fde047' : score >= 6.5 ? '#c4b5fd' : score >= 4.5 ? '#6ee7b7' : score >= 3 ? '#fde68a' : '#fca5a5';
  scoreEl.style.background = `linear-gradient(135deg, ${color}, var(--accent2))`;
  scoreEl.style.webkitBackgroundClip = 'text';
  scoreEl.style.webkitTextFillColor  = 'transparent';
  scoreEl.style.backgroundClip       = 'text';

  // Tier badge + sub
  const badge = document.getElementById('psl-tier-badge');
  badge.textContent = tier.label;
  badge.className   = `psl-tier-badge ${tier.cls}`;
  document.getElementById('psl-tier-sub').textContent = tier.sub;

  // Stat chips
  const statsEl = document.getElementById('psl-stats');
  statsEl.innerHTML = (data.stats || []).map(s => `<div class="psl-stat-chip">${escHtml(s)}</div>`).join('');

  // Headline
  document.getElementById('psl-headline').textContent = data.headline || '';

  // Platypus
  const imgEl = document.getElementById('psl-platy-img');
  const svgEl = document.getElementById('psl-platy-svg');
  if (tier.img) {
    imgEl.src = tier.img; imgEl.style.display = 'block'; svgEl.style.display = 'none';
  } else {
    imgEl.style.display = 'none'; svgEl.style.display = 'block';
  }

  // Speech bubble — verdict in the bubble
  document.getElementById('psl-bubble').textContent = data.verdict || data.headline?.split('.')[0] || '';

  // Positives / negatives
  const pos = document.getElementById('psl-positives');
  const neg = document.getElementById('psl-negatives');
  pos.innerHTML = (data.positives || []).map(p => `<li>${escHtml(p)}</li>`).join('');
  neg.innerHTML = (data.negatives || []).map(n => `<li>${escHtml(n)}</li>`).join('');

  // Roast + advice
  document.getElementById('psl-roast').textContent  = data.roast   || '';
  document.getElementById('psl-advice').textContent = data.advice  || '';
}

function resetPsl() {
  document.getElementById('psl-file').value   = '';
  document.getElementById('psl-camera').value = '';
  document.getElementById('psl-preview').style.display     = 'none';
  document.getElementById('psl-placeholder').style.display = 'flex';
  document.getElementById('psl-remove').style.display      = 'none';
  document.getElementById('psl-btn').disabled = true;
  document.getElementById('results-card').style.display   = 'none';
  document.getElementById('analyzing-card').style.display = 'none';
  document.getElementById('upload-card').style.display    = 'block';
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function logout() {
  fetch(`${API}/auth/logout`, { credentials: 'include' }).then(() => { window.location.href = '/'; });
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3500);
}

init();
