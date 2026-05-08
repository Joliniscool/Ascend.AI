const API = '';
let allMeals = [];

async function init() {
  try {
    const res = await fetch(`${API}/auth/me`, { credentials: 'include' });
    const data = await res.json();
    if (!data.user) { window.location.href = '/'; return; }
    document.getElementById('user-name-display').textContent = data.user.name || data.user.email;
    document.getElementById('avatar-initial').textContent = (data.user.name || data.user.email || '?')[0].toUpperCase();
    document.getElementById('page').style.display = 'block';
    loadProfile();
    loadMeals();
    loadProfile();
  } catch { window.location.href = '/'; }
}

async function loadMeals() {
  try {
    const res = await fetch(`${API}/api/meals/my`, { credentials: 'include' });
    allMeals = await res.json();
    if (typeof setMealSource === 'function') setMealSource(allMeals);
    filterMeals();
  } catch {
    document.getElementById('meals-grid').innerHTML = '<div class="meals-empty">Failed to load meals.</div>';
  }
}

function filterMeals() {
  const query = document.getElementById('search-input').value.toLowerCase();
  const sort  = document.getElementById('sort-select').value;
  const range = document.getElementById('range-select')?.value || 'all';

  const now = Date.now();
  const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
  const cutoffs = {
    today: startOfDay.getTime(),
    week:  now - 7 * 86400000,
    month: now - 30 * 86400000,
  };
  const cutoff = cutoffs[range];

  let meals = allMeals.filter(m => m.name.toLowerCase().includes(query));
  if (cutoff != null) meals = meals.filter(m => new Date(m.loggedAt).getTime() >= cutoff);

  if (sort === 'newest') meals.sort((a, b) => new Date(b.loggedAt) - new Date(a.loggedAt));
  else if (sort === 'oldest') meals.sort((a, b) => new Date(a.loggedAt) - new Date(b.loggedAt));
  else if (sort === 'calories-high') meals.sort((a, b) => (b.calories || 0) - (a.calories || 0));
  else if (sort === 'calories-low') meals.sort((a, b) => (a.calories || 0) - (b.calories || 0));

  renderMeals(meals);
  renderSummary(meals, range);
}

function renderMeals(meals) {
  const grid = document.getElementById('meals-grid');
  if (!meals.length) {
    grid.innerHTML = '<div class="meals-empty">No meals found. 🌸</div>';
    return;
  }
  const fmt = window.NUTRITION?.fmt1 || (n => String(n));
  const highlights = window.NUTRITION?.mealHighlights;
  grid.innerHTML = meals.map(meal => {
    const hl = highlights ? highlights(meal) : { highProtein: false, highMicros: [] };
    const chipsHtml = (hl.highProtein || hl.highMicros.length)
      ? `<div class="meal-highlight-chips">
           ${hl.highProtein ? `<span class="meal-highlight-chip protein">💪 High protein</span>` : ''}
           ${hl.highMicros.map(h => `<span class="meal-highlight-chip">High ${h.label}</span>`).join('')}
         </div>`
      : '';
    return `
    <div class="meal-card-full ${hl.highProtein ? 'meal-card-highlight-protein' : ''}">
      ${meal.imageUrl
        ? `<img class="meal-img-lg" src="${meal.imageUrl}" alt="${meal.name}">`
        : `<div class="meal-img-lg meal-img-placeholder" style="font-size:2rem">🍽️</div>`}
      <div class="meal-info">
        <div class="meal-name-text">${meal.name}</div>
        <div class="meal-macros" style="margin-top:0.4rem">
          ${meal.calories ? `<span class="macro">🔥 ${fmt(meal.calories)} kcal</span>` : ''}
          ${meal.protein  ? `<span class="macro" ${hl.highProtein ? 'style="color:#86efac;font-weight:800"' : ''}>💪 ${fmt(meal.protein)}g protein</span>` : ''}
          ${meal.carbs    ? `<span class="macro">🌾 ${fmt(meal.carbs)}g carbs</span>` : ''}
          ${meal.fat      ? `<span class="macro">🧈 ${fmt(meal.fat)}g fat</span>` : ''}
        </div>
        ${chipsHtml}
        <div class="meal-date" style="margin-top:0.4rem">
          ${new Date(meal.loggedAt).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
      <div style="display:flex; gap:0.4rem">
        <button class="meal-view-btn" onclick="openMealById('${meal._id}')" title="View details">👁️</button>
        <button class="meal-delete-btn" onclick="deleteMeal('${meal._id}')" title="Delete meal">✕</button>
      </div>
    </div>
  `;
  }).join('');
}

async function deleteMeal(id) {
  try {
    const res = await fetch(`${API}/api/meals/${id}`, { method: 'DELETE', credentials: 'include' });
    if (!res.ok) throw new Error();
    showToast('Meal deleted');
    loadMeals();
  } catch { showToast('Could not delete meal ❌'); }
}

function renderSummary(meals, range = 'all') {
  const bar = document.getElementById('summary-bar');
  if (!meals.length) { bar.style.display = 'none'; return; }
  const fmt = window.NUTRITION?.fmt1 || (n => String(n));
  const totalCals    = meals.reduce((sum, m) => sum + (m.calories || 0), 0);
  const totalProtein = meals.reduce((sum, m) => sum + (m.protein  || 0), 0);
  const scopeLabel = {
    all:   'All time',
    today: 'Today',
    week:  'Last 7 days',
    month: 'Last 30 days',
  }[range] || 'All time';
  document.getElementById('summary-scope').textContent   = `${scopeLabel} ·`;
  document.getElementById('summary-count').textContent   = `${meals.length} meal${meals.length !== 1 ? 's' : ''}`;
  document.getElementById('summary-cals').textContent    = `🔥 ${fmt(totalCals)} kcal`;
  document.getElementById('summary-protein').textContent = `💪 ${fmt(totalProtein)}g protein`;
  bar.style.display = 'flex';
}

async function logout() {
  await fetch(`${API}/auth/logout`, { credentials: 'include' });
  window.location.href = '/';
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

init();
