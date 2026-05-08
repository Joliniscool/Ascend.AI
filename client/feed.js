const API = '';
let currentUser = null;

async function init() {
  try {
    const res = await fetch(`${API}/auth/me`, { credentials: 'include' });
    const data = await res.json();
    if (!data.user) { window.location.href = '/'; return; }
    currentUser = data.user;
    document.getElementById('user-name-display').textContent = data.user.name || data.user.email;
    document.getElementById('avatar-initial').textContent = (data.user.name || data.user.email || '?')[0].toUpperCase();
    document.getElementById('page').style.display = 'block';
    loadFeed();
  } catch { window.location.href = '/'; }
}

async function loadFeed() {
  try {
    const res = await fetch(`${API}/api/meals/feed`, { credentials: 'include' });
    const meals = await res.json();
    renderFeed(meals);
    meals.forEach(meal => loadComments(meal._id));
  } catch {
    document.getElementById('feed-list').innerHTML = '<div class="meals-empty">Failed to load feed.</div>';
  }
}

function renderFeed(meals) {
  const list = document.getElementById('feed-list');
  if (!meals.length) {
    list.innerHTML = '<div class="meals-empty">No meals in the feed yet. Be the first! 🌸</div>';
    return;
  }
  list.innerHTML = meals.map(meal => {
    const user = meal.user || {};
    const imageHtml = meal.imageUrl
      ? `<img src="${meal.imageUrl}" class="feed-meal-img" alt="${meal.name}" />`
      : '';
    const macros = [
      meal.calories ? `<span class="macro">🔥 ${meal.calories} kcal</span>` : '',
      meal.protein  ? `<span class="macro">💪 ${meal.protein}g protein</span>` : '',
      meal.carbs    ? `<span class="macro">🌾 ${meal.carbs}g carbs</span>` : '',
      meal.fat      ? `<span class="macro">🧈 ${meal.fat}g fat</span>` : '',
    ].filter(Boolean).join('');

    return `
      <div class="feed-card" id="card-${meal._id}">
        <div class="feed-user-row">
          ${userAvatarHtml(user)}
          <div class="feed-user-info">
            <div class="feed-username">${user.name || 'Unknown'}</div>
            <div class="feed-time">${timeAgo(meal.loggedAt)}</div>
          </div>
        </div>
        ${imageHtml}
        <div class="feed-meal-name">${meal.name}</div>
        ${macros ? `<div class="meal-macros" style="margin-top:0.5rem">${macros}</div>` : ''}
        ${ascensionBarHtml(meal)}
        <div class="feed-card-footer">
          <button class="comment-toggle-btn" onclick="toggleComments('${meal._id}')">
            💬 <span id="comment-count-${meal._id}">Comments</span>
          </button>
        </div>
        <div class="comments-section" id="comments-section-${meal._id}">
          <div class="comments-list" id="comments-list-${meal._id}"></div>
          <div class="comment-compose">
            ${userAvatarHtml(currentUser, 28)}
            <input
              class="comment-input"
              id="new-comment-${meal._id}"
              placeholder="Add a comment…"
              onkeydown="if(event.key==='Enter') submitComment('${meal._id}')"
            />
            <button class="comment-submit-btn" onclick="submitComment('${meal._id}')">Post</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// ── Toggle & load ──────────────────────────────────────────────

async function toggleComments(mealId) {
  const section = document.getElementById(`comments-section-${mealId}`);
  if (section.style.display === 'none') {
    section.style.display = 'block';
    await loadComments(mealId);
  } else {
    section.style.display = 'none';
  }
}

async function loadComments(mealId) {
  const list = document.getElementById(`comments-list-${mealId}`);
  list.innerHTML = '<div class="comments-loading">Loading…</div>';
  try {
    const res = await fetch(`${API}/api/comments/${mealId}`, { credentials: 'include' });
    const comments = await res.json();
    renderComments(mealId, comments);
    const total = comments.reduce((n, c) => n + 1 + (c.replies?.length || 0), 0);
    document.getElementById(`comment-count-${mealId}`).textContent =
      total ? `${total} comment${total !== 1 ? 's' : ''}` : 'Comments';
  } catch {
    list.innerHTML = '<div class="comments-loading">Could not load comments.</div>';
  }
}

function renderComments(mealId, comments) {
  const list = document.getElementById(`comments-list-${mealId}`);
  if (!comments.length) {
    list.innerHTML = '<div class="comments-loading" style="padding:0.5rem 0">No comments yet.</div>';
    return;
  }
  list.innerHTML = comments.map(c => commentHtml(mealId, c)).join('');
}

function commentHtml(mealId, c) {
  const mine = isMine(c.user?._id || c.user?.id);
  const repliesHtml = c.replies?.length
    ? `<div class="replies">${c.replies.map(r => replyHtml(mealId, r)).join('')}</div>`
    : '';
  return `
    <div class="comment" id="comment-${c._id}">
      <div class="comment-row">
        ${userAvatarHtml(c.user, 30)}
        <div class="comment-body">
          <div class="comment-meta">
            <span class="comment-username">${c.user?.name || 'Unknown'}</span>
            <span class="comment-time">${timeAgo(c.createdAt)}</span>
          </div>
          <div class="comment-text">${escHtml(c.text)}</div>
          <div class="comment-actions">
            <button class="comment-action-btn" onclick="showReplyInput('${mealId}','${c._id}')">Reply</button>
            ${mine ? `<button class="comment-action-btn delete-btn" onclick="deleteComment('${c._id}','${mealId}')">Delete</button>` : ''}
          </div>
          <div id="reply-form-${c._id}"></div>
          ${repliesHtml}
        </div>
      </div>
    </div>`;
}

function replyHtml(mealId, r) {
  const mine = isMine(r.user?._id || r.user?.id);
  return `
    <div class="comment reply" id="comment-${r._id}">
      <div class="comment-row">
        ${userAvatarHtml(r.user, 26)}
        <div class="comment-body">
          <div class="comment-meta">
            <span class="comment-username">${r.user?.name || 'Unknown'}</span>
            <span class="comment-time">${timeAgo(r.createdAt)}</span>
          </div>
          <div class="comment-text">${escHtml(r.text)}</div>
          ${mine ? `
            <div class="comment-actions">
              <button class="comment-action-btn delete-btn" onclick="deleteComment('${r._id}','${mealId}')">Delete</button>
            </div>` : ''}
        </div>
      </div>
    </div>`;
}

// ── Actions ────────────────────────────────────────────────────

async function submitComment(mealId) {
  const input = document.getElementById(`new-comment-${mealId}`);
  const text = input.value.trim();
  if (!text) return;
  input.disabled = true;
  try {
    const res = await fetch(`${API}/api/comments/${mealId}`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) throw new Error();
    input.value = '';
    await loadComments(mealId);
  } catch { showToast('Could not post comment ❌'); }
  input.disabled = false;
  input.focus();
}

function showReplyInput(mealId, commentId) {
  document.querySelectorAll('.reply-form-row').forEach(el => el.remove());
  const container = document.getElementById(`reply-form-${commentId}`);
  container.innerHTML = `
    <div class="reply-form-row">
      <input class="comment-input reply-input" id="reply-input-${commentId}"
        placeholder="Write a reply…"
        onkeydown="if(event.key==='Enter') submitReply('${mealId}','${commentId}')" />
      <button class="comment-submit-btn" onclick="submitReply('${mealId}','${commentId}')">Reply</button>
      <button class="reply-cancel-btn" onclick="document.getElementById('reply-form-${commentId}').innerHTML=''">✕</button>
    </div>`;
  document.getElementById(`reply-input-${commentId}`).focus();
}

async function submitReply(mealId, parentId) {
  const input = document.getElementById(`reply-input-${parentId}`);
  const text = input.value.trim();
  if (!text) return;
  input.disabled = true;
  try {
    const res = await fetch(`${API}/api/comments/${mealId}`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, parentComment: parentId }),
    });
    if (!res.ok) throw new Error();
    await loadComments(mealId);
  } catch { showToast('Could not post reply ❌'); }
}

async function deleteComment(commentId, mealId) {
  try {
    const res = await fetch(`${API}/api/comments/${commentId}`, { method: 'DELETE', credentials: 'include' });
    if (!res.ok) throw new Error();
    await loadComments(mealId);
  } catch { showToast('Could not delete comment ❌'); }
}

// ── Helpers ────────────────────────────────────────────────────

// ── Ascension rating ──────────────────────────────────────────

function calcHealthScore(meal) {
  const { calories, protein = 0, fat = 0 } = meal;
  if (!calories) return null;

  const proteinPct = (protein * 4) / calories;
  const fatPct     = (fat * 9)     / calories;

  let score = 50;
  score += Math.min(proteinPct * 90, 35);  // high protein % = good

  if      (calories > 1100) score -= 30;
  else if (calories > 850)  score -= 18;
  else if (calories > 650)  score -= 8;

  if      (fatPct > 0.55) score -= 20;
  else if (fatPct > 0.40) score -= 12;
  else if (fatPct > 0.30) score -= 5;

  return Math.max(5, Math.min(95, Math.round(score)));
}

const TIERS = [
  { min: 0,  label: 'Big Back',    color: '#ff4444' },
  { min: 23, label: 'Chudding',    color: '#ff7c4a' },
  { min: 42, label: 'Larping',     color: '#f5c542' },
  { min: 58, label: 'Ascending',   color: '#7fdd6f' },
  { min: 75, label: 'Full Ascend', color: '#4ade80' },
];

function getTier(score) {
  return [...TIERS].reverse().find(t => score >= t.min) || TIERS[0];
}

function ascensionBarHtml(meal) {
  const score = calcHealthScore(meal);
  if (score === null) return '';
  const tier = getTier(score);
  const platypusSvg = `<svg width="22" height="22" viewBox="0 0 140 140" fill="none" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="70" cy="86" rx="42" ry="31" fill="#ff7c4a"/>
    <ellipse cx="70" cy="91" rx="26" ry="19" fill="#ffb89e"/>
    <ellipse cx="70" cy="54" rx="28" ry="26" fill="#ff7c4a"/>
    <ellipse cx="95" cy="60" rx="19" ry="9" fill="#ff4d8f"/>
    <circle cx="80" cy="49" r="7" fill="white"/>
    <circle cx="80" cy="49" r="4" fill="#1a0a0a"/>
    <circle cx="82" cy="47" r="1.5" fill="white"/>
    <ellipse cx="54" cy="116" rx="15" ry="6" fill="#ff4d8f" transform="rotate(-8 54 116)"/>
    <ellipse cx="86" cy="116" rx="15" ry="6" fill="#ff4d8f" transform="rotate(8 86 116)"/>
  </svg>`;

  return `
    <div class="ascension-wrap">
      <div class="ascension-bar-row">
        <span class="ascension-end-label">Chud</span>
        <div class="ascension-track">
          <div class="ascension-icon" style="left:${score}%">${platypusSvg}</div>
        </div>
        <span class="ascension-end-label">Ascend</span>
      </div>
      <div class="ascension-badge" style="background:${tier.color}22; color:${tier.color}; border-color:${tier.color}55">
        ${tier.label}
      </div>
    </div>`;
}

function userAvatarHtml(user, size = 36) {
  const initial = (user?.name || '?')[0].toUpperCase();
  if (user?.avatar) {
    return `<img src="${user.avatar}" class="comment-avatar" style="width:${size}px;height:${size}px;min-width:${size}px" alt="${user.name}" />`;
  }
  return `<div class="comment-avatar comment-avatar-initials" style="width:${size}px;height:${size}px;min-width:${size}px;font-size:${Math.round(size*0.38)}px">${initial}</div>`;
}

function isMine(userId) {
  if (!currentUser || !userId) return false;
  return userId.toString() === (currentUser._id || currentUser.id)?.toString();
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1)   return 'just now';
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7)   return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

async function logout() {
  await fetch(`${API}/auth/logout`, { credentials: 'include' });
  window.location.href = '/';
}

init();
