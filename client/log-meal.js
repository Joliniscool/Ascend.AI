const API = '';

let analyzeData = null;
let reviewItems = [];
let elapsedTimer = null;
let searchDebounce = null;
let lastSearchResults = [];

async function init() {
  try {
    const res = await fetch(`${API}/auth/me`, { credentials: 'include' });
    const data = await res.json();
    if (!data.user) { window.location.href = '/'; return; }
    document.getElementById('user-name-display').textContent = data.user.name || data.user.email;
    document.getElementById('avatar-initial').textContent = (data.user.name || data.user.email || '?')[0].toUpperCase();
    document.getElementById('page').style.display = 'block';
    loadProfile();
    setupDropZone();
    if (new URLSearchParams(location.search).get('mode') === 'manual') {
      startManualMode();
    }
  } catch { window.location.href = '/'; }
}

function setupDropZone() {
  const zone = document.getElementById('drop-zone');
  zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const dt = new DataTransfer();
      dt.items.add(file);
      const input = document.getElementById('food-image');
      input.files = dt.files;
      onPhotoSelected(input);
    }
  });
}

function onPhotoSelected(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    document.getElementById('image-preview').src = e.target.result;
    document.getElementById('image-preview').style.display = 'block';
    document.getElementById('drop-placeholder').style.display = 'none';
    document.getElementById('remove-photo').style.display = 'flex';
    document.getElementById('analyze-btn').disabled = false;
  };
  reader.readAsDataURL(file);
}

function removePhoto(event) {
  event.stopPropagation();
  document.getElementById('food-image').value = '';
  document.getElementById('camera-input').value = '';
  document.getElementById('image-preview').style.display = 'none';
  document.getElementById('drop-placeholder').style.display = 'flex';
  document.getElementById('remove-photo').style.display = 'none';
  document.getElementById('analyze-btn').disabled = true;
}

function showState(stateId) {
  ['upload-state', 'analyzing-state', 'review-state', 'empty-state'].forEach(id => {
    document.getElementById(id).style.display = id === stateId ? 'block' : 'none';
  });
}

function startManualMode() {
  analyzeData = {
    suggestedName: 'Meal',
    imageUrl: null,
    items: [],
    healthScore: null,
    healthReasoning: null,
  };
  reviewItems = [];

  // Reskin the review screen for manual logging.
  const pageTitle = document.querySelector('.page-title');
  const pageSub = document.querySelector('.page-subtitle');
  if (pageTitle) pageTitle.textContent = '🔍 Build a Meal';
  if (pageSub)   pageSub.textContent   = 'Search USDA ingredients and build your meal piece by piece';
  const reviewTitle = document.getElementById('review-title');
  if (reviewTitle) reviewTitle.textContent = '🥗 Build Your Meal';
  const addLabel = document.getElementById('add-food-label');
  if (addLabel) addLabel.textContent = 'Add Food';

  renderReview();
  showState('review-state');
  // Auto-open the search panel so the user can start adding ingredients immediately.
  setTimeout(() => {
    if (typeof toggleAddFood === 'function') {
      const panel = document.getElementById('add-food-panel');
      if (panel && panel.style.display !== 'block') toggleAddFood();
    }
  }, 50);
}

async function startAnalyze() {
  const file = document.getElementById('food-image').files[0]
    || document.getElementById('camera-input').files[0];
  if (!file) { showToast('Please select a photo first ❌'); return; }

  showState('analyzing-state');
  startElapsedTimer();

  const formData = new FormData();
  formData.append('image', file);

  try {
    const res = await fetch(`${API}/api/meals/analyze`, {
      method: 'POST', credentials: 'include', body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Server returned ${res.status}`);
    }
    const data = await res.json();
    stopElapsedTimer();

    if (!data.items || data.items.length === 0) {
      showState('empty-state');
      return;
    }

    analyzeData = data;
    reviewItems = data.items.map((item) => ({
      detected: item.detected,
      source: 'ai',
      candidates: item.candidates || [],
      selectedFdcIdx: 0,
      grams: Math.max(0, Math.min(500, Math.round(item.estimatedGrams || 100))),
      removed: false,
    }));

    renderReview();
    showState('review-state');
  } catch (err) {
    stopElapsedTimer();
    showToast(`Analysis failed: ${err.message} ❌`);
    showState('upload-state');
  }
}

function startElapsedTimer() {
  let secs = 0;
  document.getElementById('elapsed-time').textContent = '0';
  elapsedTimer = setInterval(() => {
    secs += 1;
    document.getElementById('elapsed-time').textContent = secs;
  }, 1000);
}

function stopElapsedTimer() {
  if (elapsedTimer) { clearInterval(elapsedTimer); elapsedTimer = null; }
}

function renderReview() {
  document.getElementById('meal-name-input').value = analyzeData.suggestedName || 'Meal';
  const imgEl = document.getElementById('review-image');
  if (analyzeData.imageUrl) {
    imgEl.src = analyzeData.imageUrl;
    imgEl.style.display = '';
  } else {
    imgEl.removeAttribute('src');
    imgEl.style.display = 'none';
  }

  const container = document.getElementById('detected-items');
  container.innerHTML = reviewItems.map((item, idx) => {
    if (item.removed) return '';
    const sourceLabel = item.source === 'manual' ? 'Manually added' : 'AI detected';
    if (item.candidates.length === 0) {
      return `
        <div class="detected-item" id="item-row-${idx}">
          <div class="detected-item-header">
            <span class="detected-label">${sourceLabel}: <em>${escapeHtml(item.detected)}</em></span>
            <button class="item-remove-btn" onclick="removeItem(${idx})" title="Remove">✕</button>
          </div>
          <p style="color:var(--danger); font-size:0.85rem">No matches found in food database. This item will be skipped.</p>
        </div>
      `;
    }

    const optionsHtml = item.candidates.map((c, i) => {
      const cals = c.per100g?.calories ?? 0;
      const label = `${c.shortName || c.name} — ${cals} kcal/100g`;
      return `<option value="${i}" ${i === item.selectedFdcIdx ? 'selected' : ''}>${escapeHtml(label)}</option>`;
    }).join('');

    return `
      <div class="detected-item" id="item-row-${idx}">
        <div class="detected-item-header">
          <span class="detected-label">${sourceLabel}: <em>${escapeHtml(item.detected)}</em></span>
          <button class="item-remove-btn" onclick="removeItem(${idx})" title="Remove">✕</button>
        </div>
        <div class="field" style="margin-top:0.5rem">
          <label>Choose food</label>
          <select onchange="updateItemFood(${idx}, this.value)">
            ${optionsHtml}
          </select>
        </div>
        <div class="field" style="margin-top:0.75rem">
          <label>Grams: <span id="grams-display-${idx}">${item.grams}</span>g</label>
          <input type="range" min="0" max="500" step="5" value="${item.grams}"
                 oninput="updateItemGrams(${idx}, this.value)" />
        </div>
        <div class="item-macros" id="item-macros-${idx}"></div>
      </div>
    `;
  }).join('');

  reviewItems.forEach((_, idx) => updateItemMacrosDisplay(idx));
  updateTotalsDisplay();
}

function updateItemFood(idx, fdcIdxStr) {
  reviewItems[idx].selectedFdcIdx = parseInt(fdcIdxStr, 10) || 0;
  updateItemMacrosDisplay(idx);
  updateTotalsDisplay();
}

function updateItemGrams(idx, gramsStr) {
  reviewItems[idx].grams = parseInt(gramsStr, 10) || 0;
  document.getElementById(`grams-display-${idx}`).textContent = reviewItems[idx].grams;
  updateItemMacrosDisplay(idx);
  updateTotalsDisplay();
}

function removeItem(idx) {
  reviewItems[idx].removed = true;
  const row = document.getElementById(`item-row-${idx}`);
  if (row) row.style.display = 'none';
  updateTotalsDisplay();
}

function toggleAddFood() {
  const panel = document.getElementById('add-food-panel');
  const icon = document.getElementById('add-food-icon');
  const isOpen = panel.style.display === 'block';
  panel.style.display = isOpen ? 'none' : 'block';
  icon.textContent = isOpen ? '+' : '×';
  if (!isOpen) {
    document.getElementById('add-food-search').value = '';
    document.getElementById('add-food-results').innerHTML = '';
    document.getElementById('add-food-search').focus();
  }
}

function onSearchTyping() {
  const q = document.getElementById('add-food-search').value.trim();
  if (searchDebounce) clearTimeout(searchDebounce);
  if (q.length < 2) {
    document.getElementById('add-food-results').innerHTML = '';
    return;
  }
  searchDebounce = setTimeout(() => doFoodSearch(q), 220);
}

async function doFoodSearch(q) {
  const container = document.getElementById('add-food-results');
  container.innerHTML = '<div class="search-loading">Searching...</div>';
  try {
    const res = await fetch(`${API}/api/foods/search?q=${encodeURIComponent(q)}&limit=8`, { credentials: 'include' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    lastSearchResults = data.results || [];
    if (lastSearchResults.length === 0) {
      container.innerHTML = '<div class="search-empty">No matches in USDA database. Try a different term.</div>';
      return;
    }
    container.innerHTML = lastSearchResults.map((r, i) => `
      <div class="search-result-item" onclick="addFoodFromSearch(${r.fdcId})">
        <div class="search-result-name">${escapeHtml(r.shortName || r.name)}</div>
        <div class="search-result-meta">${r.per100g?.calories ?? 0} kcal · ${r.per100g?.protein ?? 0}g protein per 100g</div>
      </div>
    `).join('');
  } catch (err) {
    container.innerHTML = `<div class="search-empty">Search failed: ${escapeHtml(err.message)}</div>`;
  }
}

function addFoodFromSearch(fdcId) {
  const idx = lastSearchResults.findIndex(r => r.fdcId === fdcId);
  if (idx < 0) return;
  const food = lastSearchResults[idx];
  reviewItems.push({
    detected: food.shortName || food.name,
    source: 'manual',
    candidates: lastSearchResults.slice(0, 5),
    selectedFdcIdx: Math.min(idx, 4),
    grams: 100,
    removed: false,
  });
  toggleAddFood();
  renderReview();
  showToast('Food added 🌸');
}

function computeMacros(item) {
  if (item.removed || !item.candidates[item.selectedFdcIdx]) {
    return { calories: 0, protein: 0, carbs: 0, fat: 0 };
  }
  const per = item.candidates[item.selectedFdcIdx].per100g || {};
  const factor = item.grams / 100;
  return {
    calories: Math.round((per.calories || 0) * factor),
    protein:  Math.round((per.protein  || 0) * factor * 10) / 10,
    carbs:    Math.round((per.carbs    || 0) * factor * 10) / 10,
    fat:      Math.round((per.fat      || 0) * factor * 10) / 10,
  };
}

function updateItemMacrosDisplay(idx) {
  const el = document.getElementById(`item-macros-${idx}`);
  if (!el) return;
  const m = computeMacros(reviewItems[idx]);
  el.innerHTML = `🔥 ${m.calories} kcal · 💪 ${m.protein}g protein · 🌾 ${m.carbs}g carbs · 🧈 ${m.fat}g fat`;
}

function updateTotalsDisplay() {
  let cals = 0, prot = 0, carb = 0, fat = 0;
  reviewItems.forEach(item => {
    const m = computeMacros(item);
    cals += m.calories; prot += m.protein; carb += m.carbs; fat += m.fat;
  });
  document.getElementById('total-cals').textContent = Math.round(cals);
  document.getElementById('total-protein').textContent = Math.round(prot * 10) / 10;
  document.getElementById('total-carbs').textContent = Math.round(carb * 10) / 10;
  document.getElementById('total-fat').textContent = Math.round(fat * 10) / 10;
}

async function saveMeal() {
  const name = document.getElementById('meal-name-input').value.trim();
  if (!name) { showToast('Please enter a meal name ❌'); return; }

  const itemsToSave = reviewItems
    .filter(i => !i.removed && i.candidates[i.selectedFdcIdx] && i.grams > 0)
    .map(i => ({
      fdcId: i.candidates[i.selectedFdcIdx].fdcId,
      grams: i.grams,
    }));

  if (itemsToSave.length === 0) {
    showToast('Please keep at least one food with grams > 0 ❌');
    return;
  }

  const btn = document.getElementById('save-btn');
  btn.disabled = true;
  btn.textContent = 'Saving...';

  try {
    const res = await fetch(`${API}/api/meals/confirm`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        imageUrl: analyzeData.imageUrl,
        items: itemsToSave,
        isPublic: document.getElementById('is-public-input').checked,
        healthScore: analyzeData.healthScore,
        healthReasoning: analyzeData.healthReasoning,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Server returned ${res.status}`);
    }
    showToast('Meal logged! 🍽️');
    setTimeout(() => { window.location.href = '/'; }, 800);
  } catch (err) {
    showToast(`Save failed: ${err.message} ❌`);
    btn.disabled = false;
    btn.textContent = '💾 Save Meal';
  }
}

function resetToUpload() {
  analyzeData = null;
  reviewItems = [];
  removePhoto({ stopPropagation: () => {} });
  showState('upload-state');
}

async function logout() {
  await fetch(`${API}/auth/logout`, { credentials: 'include' });
  window.location.href = '/';
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

init();
