// Shared meal-details modal — auto-injects on script load, exposes globals.

(function injectMealDetailsModal() {
  if (document.getElementById('meal-details-modal')) return;
  const html = `
    <div id="meal-details-modal" class="meal-details-modal" style="display:none">
      <div class="meal-details-backdrop" onclick="closeMealDetails()"></div>
      <div class="meal-details-content">
        <button class="meal-details-close" onclick="closeMealDetails()" title="Close">✕</button>
        <h3 class="meal-details-title" id="meal-details-title">Meal</h3>
        <div id="meal-details-image-wrap"></div>
        <div class="meal-details-totals" id="meal-details-totals"></div>
        <div id="meal-details-items"></div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', html);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMealDetails();
  });
})();

let _mealDetailsSource = [];

function setMealSource(meals) {
  _mealDetailsSource = Array.isArray(meals) ? meals : [];
}

function openMealById(id) {
  const meal = _mealDetailsSource.find(m => String(m._id) === String(id));
  if (meal) openMealDetails(meal);
}

function openMealDetails(meal) {
  const modal = document.getElementById('meal-details-modal');
  document.getElementById('meal-details-title').textContent = meal.name || 'Meal';

  const imgWrap = document.getElementById('meal-details-image-wrap');
  imgWrap.innerHTML = meal.imageUrl
    ? `<img class="meal-details-img" src="${meal.imageUrl}" alt="${escMd(meal.name)}" />`
    : '';

  const totalsEl = document.getElementById('meal-details-totals');
  const macroBits = [
    meal.calories ? `🔥 <strong>${meal.calories}</strong> kcal` : '',
    meal.protein  ? `💪 <strong>${meal.protein}</strong>g protein` : '',
    meal.carbs    ? `🌾 <strong>${meal.carbs}</strong>g carbs` : '',
    meal.fat      ? `🧈 <strong>${meal.fat}</strong>g fat` : '',
  ].filter(Boolean);
  totalsEl.innerHTML = macroBits.length
    ? `<div class="meal-details-macros-row">${macroBits.map(b => `<span>${b}</span>`).join('')}</div>`
    : '';

  const items = Array.isArray(meal.items) ? meal.items : [];
  const itemsContainer = document.getElementById('meal-details-items');

  if (items.length === 0) {
    itemsContainer.innerHTML = `
      <div class="meal-details-funny">
        <div class="meal-details-funny-emoji">🦆</div>
        <div class="meal-details-funny-text">
          No ingredient breakdown — manually entered.<br>
          <em>Estimated macros, I'm a fat chud.</em>
        </div>
      </div>
    `;
  } else {
    itemsContainer.innerHTML = `
      <h4 class="meal-details-section-title">🥗 Ingredients (${items.length})</h4>
      <ul class="meal-details-ingredient-list">
        ${items.map(i => `
          <li class="meal-details-ingredient">
            <div class="ingredient-row-1">
              <span class="ingredient-name">${escMd(i.name || '?')}</span>
              <span class="ingredient-grams">${i.grams ?? 0}g</span>
            </div>
            <div class="ingredient-row-2">
              ${i.calories ? `<span>🔥 ${i.calories} kcal</span>` : ''}
              ${i.protein  ? `<span>💪 ${i.protein}g</span>` : ''}
              ${i.carbs    ? `<span>🌾 ${i.carbs}g</span>` : ''}
              ${i.fat      ? `<span>🧈 ${i.fat}g</span>` : ''}
            </div>
          </li>
        `).join('')}
      </ul>
    `;
  }

  modal.style.display = 'flex';
}

function closeMealDetails() {
  const modal = document.getElementById('meal-details-modal');
  if (modal) modal.style.display = 'none';
}

function escMd(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}
