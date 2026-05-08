const API = '';

let currentTopic = 'hot';
let currentSub   = 'Looksmaxxing';

async function init() {
  try {
    const res  = await fetch(`${API}/auth/me`, { credentials: 'include' });
    const data = await res.json();
    if (!data.user) { window.location.href = '/'; return; }
    document.getElementById('user-name-display').textContent = data.user.name || data.user.email;
    document.getElementById('avatar-initial').textContent = (data.user.name || data.user.email || '?')[0].toUpperCase();
    document.getElementById('page').style.display = 'block';
    loadProfile();
    loadNews();
  } catch { window.location.href = '/'; }
}

function setTopic(btn) {
  document.querySelectorAll('.news-topic-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  currentTopic = btn.dataset.topic;
  loadNews();
}

function setSub(btn) {
  document.querySelectorAll('.news-sub-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  currentSub = btn.dataset.sub;
  loadNews();
}

async function loadNews() {
  const grid = document.getElementById('news-grid');
  grid.innerHTML = `<div class="news-loading"><div class="spinner"></div><p>Loading the blackpill feed…</p></div>`;

  try {
    const res  = await fetch(`${API}/api/news?topic=${currentTopic}&sub=${currentSub}`, { credentials: 'include' });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    renderPosts(data.posts || []);
  } catch (err) {
    grid.innerHTML = `<div class="news-empty">⚠️ ${escHtml(err.message || 'Could not load posts.')}</div>`;
  }
}

function timeAgo(utc) {
  const diff = Date.now() / 1000 - utc;
  if (diff < 3600)   return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)  return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function fmtScore(n) {
  return n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n);
}

function renderPosts(posts) {
  const grid = document.getElementById('news-grid');
  if (!posts.length) {
    grid.innerHTML = `<div class="news-empty">No posts found. Try a different topic or subreddit.</div>`;
    return;
  }

  grid.innerHTML = posts.map(p => {
    const img = p.preview || p.thumbnail;
    const imgHtml = img
      ? `<div class="news-card-img" style="background-image:url('${escAttr(img)}')"></div>`
      : '';
    const flairHtml = p.flair
      ? `<span class="news-flair">${escHtml(p.flair)}</span>`
      : '';
    const previewHtml = p.selftext
      ? `<p class="news-card-preview">${escHtml(p.selftext)}${p.selftext.length >= 220 ? '…' : ''}</p>`
      : '';

    return `
      <a class="news-card" href="${escAttr(p.url)}" target="_blank" rel="noopener">
        ${imgHtml}
        <div class="news-card-body">
          <div class="news-card-meta-top">
            <span class="news-sub-badge">r/${escHtml(p.subreddit)}</span>
            ${flairHtml}
          </div>
          <div class="news-card-title">${escHtml(p.title)}</div>
          ${previewHtml}
          <div class="news-card-meta">
            <span>⬆️ ${fmtScore(p.score)}</span>
            <span>💬 ${fmtScore(p.comments)}</span>
            <span>u/${escHtml(p.author)}</span>
            <span>${timeAgo(p.created)}</span>
          </div>
        </div>
      </a>`;
  }).join('');
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
