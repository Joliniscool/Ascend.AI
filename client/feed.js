const API = '';
let currentUser = null;
let _mealsCache = [];

async function init() {
  try {
    const res = await fetch(`${API}/auth/me`, { credentials: 'include' });
    const data = await res.json();
    if (!data.user) { window.location.href = '/'; return; }
    currentUser = data.user;
    document.getElementById('user-name-display').textContent = data.user.name || data.user.email;
    document.getElementById('avatar-initial').textContent = (data.user.name || data.user.email || '?')[0].toUpperCase();
    document.getElementById('page').style.display = 'block';
    loadProfile();
    loadFeed();
    loadProfile();
  } catch { window.location.href = '/'; }
}

async function loadFeed() {
  try {
    const res = await fetch(`${API}/api/meals/feed`, { credentials: 'include' });
    const meals = await res.json();
    _mealsCache = meals;
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
  // Wire up the meal-details modal so the View More button can find meals by id.
  if (typeof setMealSource === 'function') setMealSource(meals);

  const highlights = window.NUTRITION?.mealHighlights;
  const macroTags  = window.NUTRITION?.macroTagsHtml;
  list.innerHTML = meals.map(meal => {
    const user = meal.user || {};
    const hl = highlights ? highlights(meal) : { highProtein: false, highMicros: [] };
    const imageHtml = meal.imageUrl
      ? `<img src="${meal.imageUrl}" class="feed-meal-img" alt="${meal.name}" />`
      : '';
    const macros = macroTags ? macroTags(meal) : '';
    const hasChips = hl.highProtein || hl.highMicros.length || hl.badMicros?.length;
    const chipsHtml = hasChips
      ? `<div class="meal-highlight-chips">
           ${hl.highProtein ? `<span class="meal-highlight-chip protein">💪 High protein</span>` : ''}
           ${hl.highMicros.map(h => `<span class="meal-highlight-chip">High ${h.label}</span>`).join('')}
           ${(hl.badMicros || []).map(h => `<span class="meal-highlight-chip bad">⚠ High ${h.label}</span>`).join('')}
         </div>`
      : '';

    return `
      <div class="feed-card ${hl.highProtein ? 'meal-card-highlight-protein' : ''}" id="card-${meal._id}">
        <div class="feed-user-row">
          ${userAvatarHtml(user)}
          <div class="feed-user-info">
            <div class="feed-username">${user.name || 'Unknown'}</div>
            <div class="feed-time">${timeAgo(meal.loggedAt)}</div>
          </div>
          <button class="meal-view-btn feed-view-btn" onclick="openMealById('${meal._id}')" title="View details">View more →</button>
        </div>
        ${imageHtml}
        <div class="feed-meal-name">${meal.name}</div>
        ${macros ? `<div class="meal-macros" style="margin-top:0.5rem">${macros}</div>` : ''}
        ${chipsHtml}
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

// Comments are capped at this many top-level threads on first render so the
// feed card doesn't get monstrously tall. Clicking "View more" expands.
const COMMENTS_VISIBLE_LIMIT = 3;
const _expandedComments = new Set();  // mealIds for which the user clicked "View more"

function renderComments(mealId, comments) {
  const list = document.getElementById(`comments-list-${mealId}`);
  if (!comments.length) {
    list.innerHTML = '<div class="comments-loading" style="padding:0.5rem 0">No comments yet.</div>';
    return;
  }
  const expanded = _expandedComments.has(String(mealId));
  const showAll = expanded || comments.length <= COMMENTS_VISIBLE_LIMIT;
  const visible = showAll ? comments : comments.slice(0, COMMENTS_VISIBLE_LIMIT);
  const hidden = comments.length - visible.length;

  const visibleHtml = visible.map(c => commentHtml(mealId, c)).join('');
  const moreBtnHtml = hidden > 0
    ? `<button class="comments-more-btn" onclick="expandComments('${mealId}')">
         View ${hidden} more comment${hidden !== 1 ? 's' : ''} ↓
       </button>`
    : '';
  list.innerHTML = visibleHtml + moreBtnHtml;
}

function expandComments(mealId) {
  _expandedComments.add(String(mealId));
  loadComments(mealId);  // re-fetch + re-render with the limit lifted
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

// USDA category → health bias. Positive = ascend, negative = chud.
const CATEGORY_HEALTH = {
  'Vegetables and Vegetable Products': +5,
  'Fruits and Fruit Juices': +4,
  'Legumes and Legume Products': +4,
  'Finfish and Shellfish Products': +3,
  'Nut and Seed Products': +2,
  'Cereal Grains and Pasta': +1,
  'Poultry Products': +1,
  'Spices and Herbs': +1,
  'Dairy and Egg Products': 0,
  'Beef Products': 0,
  'Beverages': 0,
  'Lamb, Veal, and Game Products': 0,
  'Pork Products': -1,
  'Soups, Sauces, and Gravies': -1,
  'Baked Products': -2,
  'Fats and Oils': -2,
  'Snacks': -3,
  'Sausages and Luncheon Meats': -4,
  'Sweets': -5,
  'Fast Foods': -5,
  'Meals, Entrees, and Side Dishes': -2,
};

function calcHealthScore(meal) {
  if (typeof meal.healthScore === 'number') {
    return Math.max(5, Math.min(95, Math.round(meal.healthScore)));
  }
  const { calories, protein = 0, fat = 0 } = meal;
  if (!calories) return null;

  const proteinPct = (protein * 4) / calories;
  const fatPct     = (fat * 9)     / calories;

  let score = 50;
  score += Math.min(proteinPct * 90, 35);

  if      (calories > 1100) score -= 30;
  else if (calories > 850)  score -= 18;
  else if (calories > 650)  score -= 8;

  if      (fatPct > 0.55) score -= 20;
  else if (fatPct > 0.40) score -= 12;
  else if (fatPct > 0.30) score -= 5;

  // Ingredient-aware bonuses if items[] is populated (new meals only).
  // Weighted by each item's gram contribution so a 5g sprig of parsley doesn't
  // move the meter as much as a 200g serving of fries.
  if (Array.isArray(meal.items) && meal.items.length > 0) {
    const totalGrams = meal.items.reduce((s, i) => s + (i.grams || 0), 0) || 1;
    let categoryBias = 0;
    let micrBias = 0;
    for (const item of meal.items) {
      const weight = (item.grams || 0) / totalGrams;
      const catScore = CATEGORY_HEALTH[item.category] || 0;
      categoryBias += catScore * weight;

      // Sugar density (g per 100kcal): >12 is a strong chud signal.
      if (item.calories > 0 && item.sugar) {
        const sugarPer100 = (item.sugar / item.calories) * 100;
        if (sugarPer100 > 18) micrBias -= 3 * weight;
        else if (sugarPer100 > 12) micrBias -= 2 * weight;
      }
      // Saturated fat density (g per 100kcal): >5 = chud.
      if (item.calories > 0 && item.saturatedFat) {
        const satPer100 = (item.saturatedFat / item.calories) * 100;
        if (satPer100 > 5) micrBias -= 2 * weight;
      }
      // Fiber density (g per 100kcal): >3 = ascend.
      if (item.calories > 0 && item.fiber) {
        const fibPer100 = (item.fiber / item.calories) * 100;
        if (fibPer100 > 3) micrBias += 2 * weight;
      }
    }
    score += categoryBias * 2.5;  // category is the strongest signal
    score += micrBias;
  }

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

// ── Drag-to-rate ascension bar ────────────────────────────────────────────────
// Two markers on the same gradient track:
//   - PLATYPUS  (large, draggable) = THIS user's own rating. Starts at the
//     algorithmic baseline if the user hasn't rated yet, so dragging the
//     platypus is how you cast or update your vote.
//   - SMALL DOT (visible only when ratingCount > 0) = the COMMUNITY display
//     score, i.e. algo + every user rating averaged together.
// Tier labels (Chudding / Larping / Ascending / etc.) are surfaced in the meta
// row instead of raw numbers — the user explicitly didn't want numeric scores.
function ascensionBarHtml(meal) {
  // algoScore comes from the server (calcHealthScore + Qwen healthScore).
  // For meals that haven't been enriched (legacy paths), fall back to client heuristic.
  const algo = (typeof meal.algoScore === 'number')
    ? meal.algoScore
    : calcHealthScore(meal);
  if (algo === null) return '';

  const myRating    = (typeof meal.myRating === 'number') ? meal.myRating : null;
  const community   = (typeof meal.displayScore === 'number') ? meal.displayScore : algo;
  const ratingCount = meal.ratingCount || 0;

  // The platypus position represents your current vote (defaults to the
  // algorithmic baseline so users have a meaningful starting point to nudge).
  const yourScore = myRating != null ? myRating : algo;
  const yourTier      = getTier(yourScore);
  const communityTier = getTier(community);

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

  // The rating-count chip is clickable when ratings > 0 — opens a modal
  // listing every user who rated, their score, and when. Suppressed entirely
  // when zero ratings exist (nothing to show).
  const ratingCountChip = ratingCount > 0
    ? `<button class="ascension-rating-count" onclick="openRatingsList('${meal._id}')" title="See who rated">
         ${ratingCount} rating${ratingCount !== 1 ? 's' : ''}
       </button>`
    : '';

  // Meta string: tier labels only — never raw numbers. Color-codes each tier.
  const metaText = ratingCount > 0 && myRating != null
    ? `You think: <strong style="color:${yourTier.color}">${yourTier.label}</strong>
       <span class="ascension-sep">·</span>
       Community: <strong style="color:${communityTier.color}">${communityTier.label}</strong>
       <span class="ascension-sep">·</span>
       ${ratingCountChip}`
    : ratingCount > 0
    ? `Community: <strong style="color:${communityTier.color}">${communityTier.label}</strong>
       <span class="ascension-sep">·</span>
       ${ratingCountChip}`
    : myRating != null
    ? `You think: <strong style="color:${yourTier.color}">${yourTier.label}</strong>`
    : `Starting tier: <strong style="color:${yourTier.color}">${yourTier.label}</strong>`;

  const hintText = myRating != null
    ? 'Drag the platypus to update your rating'
    : 'Drag the platypus to rate this meal';

  // Community dot only renders if at least one user has rated, so an unrated
  // meal isn't visually cluttered with two markers stacked on the same spot.
  const communityDotHtml = ratingCount > 0
    ? `<div class="ascension-icon ascension-icon-community" style="left:${community}%" title="Community average"></div>`
    : '';

  return `
    <div class="ascension-wrap">
      <div class="ascension-bar-row">
        <span class="ascension-end-label">Chud</span>
        <div class="ascension-track" data-meal-id="${meal._id}" data-algo="${algo}" onpointerdown="onAscensionPointerDown(event)">
          ${communityDotHtml}
          <div class="ascension-icon ascension-icon-mine" style="left:${yourScore}%" title="Your rating">${platypusSvg}</div>
        </div>
        <span class="ascension-end-label">Ascend</span>
      </div>
      <div class="ascension-meta-row">
        <span class="ascension-meta">${metaText}</span>
        <span class="ascension-badge" style="background:${yourTier.color}22; color:${yourTier.color}; border-color:${yourTier.color}55">${yourTier.label}</span>
      </div>
      <div class="ascension-hint">${hintText}</div>
    </div>`;
}

// ── Drag-to-rate ──────────────────────────────────────────────────────
let _ratingDragState = null;

function onAscensionPointerDown(e) {
  const track = e.currentTarget;
  const mealId = track.dataset.mealId;
  if (!mealId) return;
  _ratingDragState = { track, mealId, committed: false };
  track.setPointerCapture?.(e.pointerId);
  track.classList.add('ascension-track-dragging');
  updateRatingPreview(e);
  window.addEventListener('pointermove', onAscensionPointerMove);
  window.addEventListener('pointerup', onAscensionPointerUp, { once: true });
  e.preventDefault();
}

function onAscensionPointerMove(e) {
  if (!_ratingDragState) return;
  updateRatingPreview(e);
}

async function onAscensionPointerUp(e) {
  if (!_ratingDragState) return;
  window.removeEventListener('pointermove', onAscensionPointerMove);
  const score = computeRatingFromPointer(_ratingDragState.track, e);
  const { track, mealId } = _ratingDragState;
  track.classList.remove('ascension-track-dragging');
  _ratingDragState = null;
  await commitRating(mealId, score);
}

function computeRatingFromPointer(track, e) {
  const rect = track.getBoundingClientRect();
  const x = Math.max(0, Math.min(rect.width, (e.clientX || 0) - rect.left));
  return Math.round((x / rect.width) * 100);
}

function updateRatingPreview(e) {
  if (!_ratingDragState) return;
  const score = computeRatingFromPointer(_ratingDragState.track, e);
  // The platypus IS the user's rating marker now — move it directly so the
  // user sees their vote land in real time without any flicker / dot creation.
  const mine = _ratingDragState.track.querySelector('.ascension-icon-mine');
  if (mine) mine.style.left = `${score}%`;
}

async function commitRating(mealId, score) {
  try {
    const res = await fetch(`${API}/api/meals/${mealId}/rate`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ score }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Server returned ${res.status}`);
    }
    const data = await res.json();
    // Patch the meal in our cached source list and re-render just that card.
    const meal = _mealsCache?.find(m => String(m._id) === String(mealId));
    if (meal) {
      meal.myRating     = data.myRating;
      meal.ratingCount  = data.ratingCount;
      meal.userAvgScore = data.userAvgScore;
      meal.displayScore = data.displayScore;
      rerenderCard(meal);
    }
    showToast('Rating saved 🌸');
  } catch (err) {
    showToast(`Rating failed: ${err.message} ❌`);
  }
}

function rerenderCard(meal) {
  const card = document.getElementById(`card-${meal._id}`);
  if (!card) return;
  // Swap just the ascension-wrap inside the card so we don't blow away the
  // open comments thread.
  const oldBar = card.querySelector('.ascension-wrap');
  if (!oldBar) return;
  const tmp = document.createElement('div');
  tmp.innerHTML = ascensionBarHtml(meal);
  const newBar = tmp.firstElementChild;
  oldBar.replaceWith(newBar);
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

// ── Ratings-list modal ────────────────────────────────────────────────────
// Clicking "X ratings" in any feed card opens a modal listing every rater +
// their score (as a tier label) + a "X ago" timestamp. Modal HTML injected
// once on script load — same IIFE pattern as meal-details.js.

(function injectRatingsListModal() {
  if (document.getElementById('ratings-list-modal')) return;
  const html = `
    <div id="ratings-list-modal" class="ratings-list-modal" style="display:none">
      <div class="ratings-list-backdrop" onclick="closeRatingsList()"></div>
      <div class="ratings-list-content">
        <button class="ratings-list-close" onclick="closeRatingsList()" title="Close">✕</button>
        <h3 class="ratings-list-title" id="ratings-list-title">Ratings</h3>
        <div class="ratings-list-items" id="ratings-list-items">
          <div class="ratings-list-loading">Loading…</div>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', html);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' &&
        document.getElementById('ratings-list-modal').style.display === 'flex') {
      closeRatingsList();
    }
  });
})();

async function openRatingsList(mealId) {
  const modal = document.getElementById('ratings-list-modal');
  const items = document.getElementById('ratings-list-items');
  const title = document.getElementById('ratings-list-title');

  // Set the title from cached meal so the user sees context immediately.
  const meal = _mealsCache?.find(m => String(m._id) === String(mealId));
  title.textContent = meal?.name ? `Ratings · ${meal.name}` : 'Ratings';

  items.innerHTML = '<div class="ratings-list-loading">Loading…</div>';
  modal.style.display = 'flex';

  try {
    const res = await fetch(`${API}/api/meals/${mealId}/ratings`, { credentials: 'include' });
    if (!res.ok) throw new Error(`Server returned ${res.status}`);
    const { ratings } = await res.json();
    renderRatingsList(ratings || []);
  } catch (err) {
    items.innerHTML = `<div class="ratings-list-loading">Couldn't load ratings: ${escHtml(err.message)}</div>`;
  }
}

function renderRatingsList(ratings) {
  const items = document.getElementById('ratings-list-items');
  if (!ratings.length) {
    items.innerHTML = '<div class="ratings-list-loading">No ratings yet.</div>';
    return;
  }
  items.innerHTML = ratings.map(r => {
    const tier = getTier(r.score);
    const u = r.user || {};
    return `
      <div class="ratings-list-row">
        ${userAvatarHtml(u, 32)}
        <div class="ratings-list-meta">
          <div class="ratings-list-name">${escHtml(u.name || 'Unknown')}</div>
          <div class="ratings-list-time">${timeAgo(r.updatedAt || r.createdAt)}</div>
        </div>
        <div class="ratings-list-tier" style="background:${tier.color}22; color:${tier.color}; border-color:${tier.color}55">
          ${tier.label}
        </div>
      </div>
    `;
  }).join('');
}

function closeRatingsList() {
  document.getElementById('ratings-list-modal').style.display = 'none';
}

init();
