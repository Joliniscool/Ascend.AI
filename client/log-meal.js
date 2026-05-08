const API = '';

let analyzeData = null;
let reviewItems = [];
let elapsedTimer = null;

async function init() {
  try {
    const res = await fetch(`${API}/auth/me`, { credentials: 'include' });
    const data = await res.json();
    if (!data.user) { window.location.href = '/'; return; }
    document.getElementById('user-name-display').textContent = data.user.name || data.user.email;
    document.getElementById('avatar-initial').textContent = (data.user.name || data.user.email || '?')[0].toUpperCase();
    document.getElementById('page').style.display = 'block';
    setupDropZone();
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
  document.getElementById('review-image').src = analyzeData.imageUrl;

  const container = document.getElementById('detected-items');
  container.innerHTML = reviewItems.map((item, idx) => {
    if (item.candidates.length === 0) {
      return `
        <div class="detected-item">
          <div class="detected-item-header">
            <span class="detected-label">AI detected: <em>${escapeHtml(item.detected)}</em></span>
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
          <span class="detected-label">AI detected: <em>${escapeHtml(item.detected)}</em></span>
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
