const API = '';

const PEPTIDES = [
  {
    id: 'retatrutide',
    name: 'Retatrutide',
    aliases: ['Reta', 'LY3437943'],
    emoji: '🔥',
    category: 'Weight Loss',
    categoryColor: '#fde047',
    description: 'Triple agonist of GLP-1, GIP, and glucagon receptors — the most powerful weight loss peptide in development. Clinical trials show 20–30% body weight reduction. The most hyped peptide in the community right now.',
    effects: ['Fat Loss', 'Appetite Suppression', 'Blood Sugar', 'Metabolic'],
    dosing: '0.5–12 mg/week subcutaneous',
    redditQuery: 'retatrutide',
    vendors: [
      { name: 'Peptaura', url: 'https://peptaura.com', primary: true },
      { name: 'Peptide Sciences', url: 'https://www.peptidesciences.com' },
    ],
  },
  {
    id: 'ghkcu',
    name: 'GHK-Cu',
    aliases: ['Copper Peptide', 'GHK-Copper'],
    emoji: '✨',
    category: 'Skin & Hair',
    categoryColor: '#c4b5fd',
    description: 'Naturally occurring copper complex found in human plasma. Stimulates collagen and elastin synthesis, promotes wound healing, and activates hair follicles. One of the most studied anti-aging and looksmaxxing peptides.',
    effects: ['Collagen', 'Hair Growth', 'Anti-Aging', 'Wound Healing', 'Skin Repair'],
    dosing: 'Topical or 1–2 mg/day subcut',
    redditQuery: 'GHK-Cu copper peptide',
    vendors: [
      { name: 'Peptaura', url: 'https://peptaura.com', primary: true },
      { name: 'Peptide Sciences', url: 'https://www.peptidesciences.com' },
    ],
  },
  {
    id: 'mt2',
    name: 'Melanotan II',
    aliases: ['MT2', 'MT-II', 'Barbie Drug'],
    emoji: '☀️',
    category: 'Tanning & Libido',
    categoryColor: '#fb923c',
    description: 'Synthetic analog of alpha-MSH (melanocyte-stimulating hormone). Darkens skin pigmentation without UV, suppresses appetite, and dramatically increases libido. Wildly popular in looksmaxxing circles for the tan + leanness combo.',
    effects: ['Tanning', 'Libido', 'Appetite Suppression', 'Erections'],
    dosing: '0.5–1 mg subcut (loading), then maintenance',
    redditQuery: 'Melanotan 2 MT2',
    vendors: [
      { name: 'Peptaura', url: 'https://peptaura.com', primary: true },
      { name: 'Peptide Sciences', url: 'https://www.peptidesciences.com' },
    ],
  },
  {
    id: 'bpc157',
    name: 'BPC-157',
    aliases: ['Body Protection Compound', 'PL 14736'],
    emoji: '🩹',
    category: 'Healing & Recovery',
    categoryColor: '#6ee7b7',
    description: 'Pentadecapeptide derived from a protective stomach protein. Accelerates healing of tendons, ligaments, muscles, and gut lining. Used by athletes worldwide for injury recovery and chronic pain.',
    effects: ['Tendon Repair', 'Gut Health', 'Anti-Inflammatory', 'Recovery', 'Angiogenesis'],
    dosing: '250–500 mcg/day subcut or oral',
    redditQuery: 'BPC-157',
    vendors: [
      { name: 'Peptaura', url: 'https://peptaura.com', primary: true },
      { name: 'Peptide Sciences', url: 'https://www.peptidesciences.com' },
    ],
  },
  {
    id: 'tb500',
    name: 'TB-500',
    aliases: ['Thymosin Beta-4 fragment', 'TB4 Frag'],
    emoji: '💪',
    category: 'Healing & Recovery',
    categoryColor: '#6ee7b7',
    description: 'Synthetic fragment of Thymosin Beta-4 that reduces inflammation and accelerates repair of muscles, tendons, and connective tissue. Commonly stacked with BPC-157 for a powerful healing protocol.',
    effects: ['Muscle Repair', 'Anti-Inflammatory', 'Flexibility', 'Cardio Recovery'],
    dosing: '2–2.5 mg twice/week subcut',
    redditQuery: 'TB-500 thymosin beta',
    vendors: [
      { name: 'Peptaura', url: 'https://peptaura.com', primary: true },
      { name: 'Peptide Sciences', url: 'https://www.peptidesciences.com' },
    ],
  },
  {
    id: 'ipamorelin',
    name: 'Ipamorelin / CJC-1295',
    aliases: ['Ipa', 'GHRP-2 alternative', 'Ipamorelin CJC stack'],
    emoji: '📈',
    category: 'Growth Hormone',
    categoryColor: '#38bdf8',
    description: 'Ipamorelin is a selective GHRP that triggers GH release with minimal cortisol or prolactin spikes. Stacked with CJC-1295 for a sustained GH pulse. One of the most popular protocols for body recomp, fat loss, and sleep quality.',
    effects: ['GH Release', 'Fat Loss', 'Muscle', 'Sleep Quality', 'Recovery'],
    dosing: '200–300 mcg each, 2–3×/day subcut',
    redditQuery: 'Ipamorelin CJC-1295',
    vendors: [
      { name: 'Peptaura', url: 'https://peptaura.com', primary: true },
      { name: 'Peptide Sciences', url: 'https://www.peptidesciences.com' },
    ],
  },
  {
    id: 'pt141',
    name: 'PT-141',
    aliases: ['Bremelanotide', 'PT141'],
    emoji: '💊',
    category: 'Libido',
    categoryColor: '#f472b6',
    description: 'Melanocortin receptor agonist that acts centrally (in the brain) to increase sexual arousal in both men and women. Unlike Viagra it works through desire, not just blood flow. Popular for both ED and female libido.',
    effects: ['Libido', 'Sexual Arousal', 'Erections', 'Female Desire'],
    dosing: '1–2 mg subcut 1–4h before activity',
    redditQuery: 'PT-141 bremelanotide',
    vendors: [
      { name: 'Peptaura', url: 'https://peptaura.com', primary: true },
      { name: 'Peptide Sciences', url: 'https://www.peptidesciences.com' },
    ],
  },
  {
    id: 'epithalon',
    name: 'Epithalon',
    aliases: ['Epitalon', 'Epithalone', 'Tetrapeptide-33'],
    emoji: '⏳',
    category: 'Anti-Aging',
    categoryColor: '#a78bfa',
    description: 'Tetrapeptide that activates telomerase and lengthens telomeres — the biological aging clock. Studied for longevity, improved sleep cycles, and pineal gland regulation. Taken in cycles.',
    effects: ['Telomere Length', 'Anti-Aging', 'Sleep', 'Longevity', 'Melatonin'],
    dosing: '5–10 mg/day for 10–20 day cycle',
    redditQuery: 'Epithalon epitalon',
    vendors: [
      { name: 'Peptaura', url: 'https://peptaura.com', primary: true },
      { name: 'Peptide Sciences', url: 'https://www.peptidesciences.com' },
    ],
  },
  {
    id: 'semax',
    name: 'Semax',
    aliases: ['ACTH(4-7)PGP', 'N-Acetyl Semax'],
    emoji: '🧠',
    category: 'Nootropic',
    categoryColor: '#fbbf24',
    description: 'Russian-developed neuropeptide derived from ACTH. Boosts BDNF (brain-derived neurotrophic factor), improves cognitive function, memory, focus, and mood. Used clinically in Russia for stroke recovery.',
    effects: ['Cognitive', 'BDNF', 'Focus', 'Memory', 'Neuroprotection', 'Mood'],
    dosing: '200–900 mcg/day intranasal',
    redditQuery: 'Semax nootropic',
    vendors: [
      { name: 'Peptaura', url: 'https://peptaura.com', primary: true },
      { name: 'Peptide Sciences', url: 'https://www.peptidesciences.com' },
    ],
  },
  {
    id: 'semaglutide',
    name: 'Semaglutide',
    aliases: ['Ozempic', 'Wegovy', 'Rybelsus'],
    emoji: '💉',
    category: 'Weight Loss',
    categoryColor: '#fde047',
    description: 'GLP-1 receptor agonist and the original "Ozempic" weight loss drug. Reduces appetite dramatically, slows gastric emptying, and lowers blood sugar. Still widely used before Reta took the crown.',
    effects: ['Fat Loss', 'Appetite Suppression', 'Blood Sugar', 'Cardiovascular'],
    dosing: '0.25–2.4 mg/week subcut',
    redditQuery: 'semaglutide ozempic',
    vendors: [
      { name: 'Peptaura', url: 'https://peptaura.com', primary: true },
      { name: 'Peptide Sciences', url: 'https://www.peptidesciences.com' },
    ],
  },
];

// Track open discussion panels
const openPanels = new Set();

async function init() {
  try {
    const res  = await fetch(`${API}/auth/me`, { credentials: 'include' });
    const data = await res.json();
    if (!data.user) { window.location.href = '/'; return; }
    document.getElementById('user-name-display').textContent = data.user.name || data.user.email;
    document.getElementById('avatar-initial').textContent = (data.user.name || data.user.email || '?')[0].toUpperCase();
    document.getElementById('page').style.display = 'block';
    loadProfile();
    renderPeptides();
  } catch { window.location.href = '/'; }
}

function renderPeptides() {
  const grid = document.getElementById('peptide-grid');
  grid.innerHTML = PEPTIDES.map(p => `
    <div class="peptide-card" id="card-${p.id}">
      <div class="peptide-card-top">
        <div class="peptide-header">
          <span class="peptide-emoji">${p.emoji}</span>
          <div>
            <div class="peptide-name">${escHtml(p.name)}</div>
            <div class="peptide-aliases">${p.aliases.map(a => `<span>${escHtml(a)}</span>`).join('')}</div>
          </div>
          <span class="peptide-category" style="color:${p.categoryColor};background:${p.categoryColor}22">${escHtml(p.category)}</span>
        </div>
        <p class="peptide-description">${escHtml(p.description)}</p>
        <div class="peptide-effects">
          ${p.effects.map(e => `<span class="peptide-effect-chip">${escHtml(e)}</span>`).join('')}
        </div>
        <div class="peptide-dosing">💉 <strong>Dosing:</strong> ${escHtml(p.dosing)}</div>
      </div>
      <div class="peptide-card-actions">
        <div class="peptide-vendors">
          ${p.vendors.map(v => `
            <a href="${escAttr(v.url)}" target="_blank" rel="noopener"
               class="peptide-vendor-btn ${v.primary ? 'vendor-primary' : 'vendor-secondary'}">
              🛒 ${escHtml(v.name)}
            </a>`).join('')}
        </div>
        <button class="peptide-reddit-btn" id="reddit-btn-${p.id}" onclick="toggleDiscussions('${p.id}')">
          💬 Reddit Discussions
        </button>
      </div>
      <div class="peptide-discussions" id="disc-${p.id}" style="display:none">
        <div class="peptide-disc-loading"><div class="spinner" style="width:28px;height:28px"></div></div>
      </div>
    </div>
  `).join('');
}

async function toggleDiscussions(id) {
  const panel = document.getElementById(`disc-${id}`);
  const btn   = document.getElementById(`reddit-btn-${id}`);

  if (openPanels.has(id)) {
    panel.style.display = 'none';
    btn.textContent = '💬 Reddit Discussions';
    openPanels.delete(id);
    return;
  }

  panel.style.display = 'block';
  btn.textContent = '✕ Hide Discussions';
  openPanels.add(id);

  // Only fetch once
  if (panel.dataset.loaded) return;
  panel.dataset.loaded = '1';

  const p = PEPTIDES.find(x => x.id === id);
  try {
    const res  = await fetch(`${API}/api/peptides/reddit?q=${encodeURIComponent(p.redditQuery)}`, { credentials: 'include' });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    renderDiscussions(panel, data.posts || []);
  } catch (err) {
    panel.innerHTML = `<p class="peptide-disc-error">⚠️ ${escHtml(err.message)}</p>`;
  }
}

function timeAgo(utc) {
  const diff = Date.now() / 1000 - utc;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function renderDiscussions(panel, posts) {
  if (!posts.length) {
    panel.innerHTML = `<p class="peptide-disc-error">No discussions found.</p>`;
    return;
  }
  panel.innerHTML = `<div class="peptide-disc-list">` +
    posts.map(p => `
      <a class="peptide-disc-item" href="${escAttr(p.url)}" target="_blank" rel="noopener">
        <div class="peptide-disc-title">${escHtml(p.title)}</div>
        ${p.selftext ? `<div class="peptide-disc-preview">${escHtml(p.selftext)}…</div>` : ''}
        <div class="peptide-disc-meta">
          <span>r/${escHtml(p.subreddit)}</span>
          <span>⬆️ ${p.score}</span>
          <span>💬 ${p.comments}</span>
          <span>${timeAgo(p.created)}</span>
        </div>
      </a>`).join('') +
  `</div>`;
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function escAttr(s) {
  return String(s).replace(/"/g,'&quot;').replace(/'/g,'&#39;');
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
