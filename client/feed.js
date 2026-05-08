const API = '';

async function init() {
  try {
    const res = await fetch(`${API}/auth/me`, { credentials: 'include' });
    const data = await res.json();
    if (!data.user) { window.location.href = '/'; return; }
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
    const initial = (user.name || '?')[0].toUpperCase();
    const avatarHtml = user.avatar
      ? `<img src="${user.avatar}" class="feed-avatar-img" alt="${user.name}" />`
      : `<div class="feed-avatar-initials">${initial}</div>`;

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
      <div class="feed-card">
        <div class="feed-user-row">
          ${avatarHtml}
          <div class="feed-user-info">
            <div class="feed-username">${user.name || 'Unknown'}</div>
            <div class="feed-time">${timeAgo(meal.loggedAt)}</div>
          </div>
        </div>
        ${imageHtml}
        <div class="feed-meal-name">${meal.name}</div>
        ${macros ? `<div class="meal-macros" style="margin-top:0.5rem">${macros}</div>` : ''}
      </div>
    `;
  }).join('');
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 1)   return 'just now';
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7)   return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

async function logout() {
  await fetch(`${API}/auth/logout`, { credentials: 'include' });
  window.location.href = '/';
}

init();
