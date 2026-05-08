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
    loadMeals();
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
  const sort = document.getElementById('sort-select').value;

  let meals = allMeals.filter(m => m.name.toLowerCase().includes(query));

  if (sort === 'newest') meals.sort((a, b) => new Date(b.loggedAt) - new Date(a.loggedAt));
  else if (sort === 'oldest') meals.sort((a, b) => new Date(a.loggedAt) - new Date(b.loggedAt));
  else if (sort === 'calories-high') meals.sort((a, b) => (b.calories || 0) - (a.calories || 0));
  else if (sort === 'calories-low') meals.sort((a, b) => (a.calories || 0) - (b.calories || 0));

  renderMeals(meals);
  renderSummary(meals);
}

function renderMeals(meals) {
  const grid = document.getElementById('meals-grid');
  if (!meals.length) {
    grid.innerHTML = '<div class="meals-empty">No meals found. 🌸</div>';
    return;
  }
  grid.innerHTML = meals.map(meal => `
    <div class="meal-card-full">
      ${meal.imageUrl
        ? `<img class="meal-img-lg" src="${meal.imageUrl}" alt="${meal.name}">`
        : `<div class="meal-img-lg meal-img-placeholder" style="font-size:2rem">🍽️</div>`}
      <div class="meal-info">
        <div class="meal-name-text">${meal.name}</div>
        <div class="meal-macros" style="margin-top:0.4rem">
          ${meal.calories ? `<span class="macro">🔥 ${meal.calories} kcal</span>` : ''}
          ${meal.protein  ? `<span class="macro">💪 ${meal.protein}g protein</span>` : ''}
          ${meal.carbs    ? `<span class="macro">🌾 ${meal.carbs}g carbs</span>` : ''}
          ${meal.fat      ? `<span class="macro">🧈 ${meal.fat}g fat</span>` : ''}
        </div>
        <div class="meal-date" style="margin-top:0.4rem">
          ${new Date(meal.loggedAt).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
      <div style="display:flex; gap:0.4rem">
        <button class="meal-view-btn" onclick="openMealById('${meal._id}')" title="View details">👁️</button>
        <button class="meal-delete-btn" onclick="deleteMeal('${meal._id}')" title="Delete meal">✕</button>
      </div>
    </div>
  `).join('');
}

async function deleteMeal(id) {
  try {
    const res = await fetch(`${API}/api/meals/${id}`, { method: 'DELETE', credentials: 'include' });
    if (!res.ok) throw new Error();
    showToast('Meal deleted');
    loadMeals();
  } catch { showToast('Could not delete meal ❌'); }
}

function renderSummary(meals) {
  const bar = document.getElementById('summary-bar');
  if (!meals.length) { bar.style.display = 'none'; return; }
  const totalCals = meals.reduce((sum, m) => sum + (m.calories || 0), 0);
  const totalProtein = meals.reduce((sum, m) => sum + (m.protein || 0), 0);
  document.getElementById('summary-count').textContent = `${meals.length} meal${meals.length !== 1 ? 's' : ''}`;
  document.getElementById('summary-cals').textContent = `🔥 ${totalCals} kcal total`;
  document.getElementById('summary-protein').textContent = `💪 ${totalProtein}g protein total`;
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
