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
  const fmt = window.NUTRITION?.fmt1 || (n => String(n));
  const macroBits = [
    meal.calories ? `🔥 <strong>${fmt(meal.calories)}</strong> kcal` : '',
    meal.protein  ? `💪 <strong>${fmt(meal.protein)}</strong>g protein` : '',
    meal.carbs    ? `🌾 <strong>${fmt(meal.carbs)}</strong>g carbs` : '',
    meal.fat      ? `🧈 <strong>${fmt(meal.fat)}</strong>g fat` : '',
  ].filter(Boolean);
  totalsEl.innerHTML = macroBits.length
    ? `<div class="meal-details-macros-row">${macroBits.map(b => `<span>${b}</span>`).join('')}</div>`
    : '';

  // Micronutrient grid with %DV — collapsible
  if (window.NUTRITION) {
    const { DV, DASHBOARD_MICROS, dvPct } = window.NUTRITION;
    const microBits = DASHBOARD_MICROS.map(m => {
      const amount = meal[m.key];
      if (!amount) return '';
      const pct = dvPct(m.key, amount);
      const isLimit = DV[m.key]?.limit;
      // Three render states per micro card:
      //   good micro ≥30% DV   → .high (green tint, full background)
      //   limit micro ≥30% DV  → .bad  (red tint, full background)  ← NEW
      //   limit micro <30% DV  → .limit (just red %DV color, no tint)
      const isHigh = !isLimit && pct >= 30;
      const isBad  =  isLimit && pct >= 30;
      const cls = [
        'meal-detail-micro',
        isHigh ? 'high' : '',
        isBad  ? 'bad'  : '',
        isLimit && !isBad ? 'limit' : '',
      ].filter(Boolean).join(' ');
      return `
        <div class="${cls}">
          <div class="meal-detail-micro-row1">
            <span>${m.icon} ${m.label}</span>
            <span class="pct">${pct}% DV</span>
          </div>
          <div class="meal-detail-micro-row2">${fmt(amount)}${DV[m.key]?.unit || ''}</div>
        </div>
      `;
    }).filter(Boolean).join('');
    if (microBits) {
      totalsEl.innerHTML += `
        <button class="micros-toggle" onclick="toggleDetailMicros(this)" type="button">
          <span>🧪 Micronutrient Breakdown</span>
          <span class="micros-toggle-chevron">▾</span>
        </button>
        <div class="meal-details-micros" style="display:none">${microBits}</div>
      `;
    }
  }

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
              <span class="ingredient-grams">${fmt(i.grams ?? 0)}g</span>
            </div>
            <div class="ingredient-row-2">
              ${i.calories ? `<span>🔥 ${fmt(i.calories)} kcal</span>` : ''}
              ${i.protein  ? `<span>💪 ${fmt(i.protein)}g</span>` : ''}
              ${i.carbs    ? `<span>🌾 ${fmt(i.carbs)}g</span>` : ''}
              ${i.fat      ? `<span>🧈 ${fmt(i.fat)}g</span>` : ''}
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

function toggleDetailMicros(btn) {
  const grid = btn.nextElementSibling;
  const chevron = btn.querySelector('.micros-toggle-chevron');
  const isOpen = grid.style.display !== 'none';
  grid.style.display = isOpen ? 'none' : 'grid';
  if (chevron) chevron.textContent = isOpen ? '▾' : '▴';
}

function escMd(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}
