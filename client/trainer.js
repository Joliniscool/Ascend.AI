const API = '';

async function init() {
  try {
    const res = await fetch(`${API}/auth/me`, { credentials: 'include' });
    const data = await res.json();
    if (data.user) {
      document.getElementById('user-name-display').textContent = data.user.name || data.user.email;
      document.getElementById('avatar-initial').textContent = (data.user.name || data.user.email || '?')[0].toUpperCase();
      document.getElementById('page').style.display = 'block';
      loadProfile();
      loadTrainer();
      loadProfile();
    } else {
      window.location.href = '/';
    }
  } catch {
    window.location.href = '/';
  }
}

async function loadTrainer() {
  const [statsRes, profileRes] = await Promise.all([
    fetch(`${API}/api/users/stats`, { credentials: 'include' }),
    fetch(`${API}/api/users/profile`, { credentials: 'include' }),
  ]);
  const stats   = await statsRes.json();
  const profile = await profileRes.json();

  renderBMI(stats, profile);
  renderRings(stats);
  renderTargets(stats);
  renderTrainerMicros(stats);
}

function renderTrainerMicros(stats) {
  const grid = document.getElementById('trainer-micros-grid');
  const label = document.getElementById('trainer-micros-label');
  if (!window.NUTRITION) return;
  const micros = stats.todaysMicros || {};
  grid.innerHTML = window.NUTRITION.microCellsHtml(micros);
  if (label) label.style.display = 'block';
}

function renderBMI(stats, profile) {
  const weight = stats.currentWeight;
  const height = profile.height;

  if (!weight || !height) {
    document.getElementById('bmi-incomplete').style.display = 'block';
    document.getElementById('bmi-platypus').src = './platy-normal.png';
    return;
  }

  const h = height / 100;
  const bmi = weight / (h * h);
  const bmiRounded = Math.round(bmi * 10) / 10;

  // Set platypus image
  let img;
  if (bmi > 25)      img = './platy-superfat.png';
  else if (bmi >= 23) img = './platy-fat.png';
  else if (bmi >= 22) img = './platy-normal.png';
  else if (bmi >= 21) img = './platy-ascending.png';
  else                img = './platy-chad.png';

  document.getElementById('bmi-platypus').src = img;
  document.getElementById('bmi-value').textContent = bmiRounded;
  document.getElementById('bmi-weight-val').textContent = `${weight} kg`;
  document.getElementById('bmi-height-val').textContent = `${height} cm`;

  // Badge
  const badge = document.getElementById('bmi-badge');
  let label, badgeClass;
  if (bmi < 18.5)      { label = 'Underweight'; badgeClass = 'bmi-badge-under'; }
  else if (bmi < 25)   { label = 'Normal';       badgeClass = 'bmi-badge-normal'; }
  else if (bmi < 30)   { label = 'Overweight';   badgeClass = 'bmi-badge-over'; }
  else                 { label = 'Obese';         badgeClass = 'bmi-badge-obese'; }
  badge.textContent = label;
  badge.className = `bmi-badge ${badgeClass}`;

  // Meter: map BMI 15-35 → 0-100%
  const pct = Math.min(100, Math.max(0, ((bmi - 15) / 20) * 100));
  document.getElementById('bmi-meter-fill').style.width = `${pct}%`;
  document.getElementById('bmi-meter-dot').style.left   = `${pct}%`;
}

function renderRings(stats) {
  const {
    todaysCalories = 0, dailyCalorieGoal = 0,
    todaysProtein  = 0, dailyProteinGoal = 0,
    todaysFat      = 0, dailyFatGoal     = 0,
    todaysCarbs    = 0, dailyCarbsGoal   = 0,
  } = stats;

  const container = document.getElementById('rings-container');

  if (!dailyCalorieGoal) {
    container.innerHTML = '<div class="rings-empty">Complete your profile to see nutrition targets.</div>';
    return;
  }

  container.innerHTML = `
    <div class="rings-row-inner">
      ${bigRingHtml('calories', todaysCalories, dailyCalorieGoal, 'kcal', '#ff7c4a', '#ff4d8f')}
      <div class="rings-macros">
        ${smallRingHtml('Protein', todaysProtein, dailyProteinGoal, 'g', '#ff4d8f', '#ff7c4a')}
        ${smallRingHtml('Carbs',   todaysCarbs,   dailyCarbsGoal,   'g', '#a78bfa', '#7c3aed')}
        ${smallRingHtml('Fat',     todaysFat,     dailyFatGoal,     'g', '#fbbf24', '#f59e0b')}
      </div>
    </div>
  `;

  // Animate rings after they're in the DOM
  requestAnimationFrame(() => {
    document.querySelectorAll('.ring-progress').forEach(circle => {
      const target = parseFloat(circle.dataset.target);
      circle.style.strokeDashoffset = target;
    });
  });
}

function bigRingHtml(id, current, goal, unit, colorA, colorB) {
  const fmt = window.NUTRITION?.fmt1 || (n => String(n));
  const R = 70;
  const circ = 2 * Math.PI * R;
  const pct  = goal > 0 ? Math.min(1, current / goal) : 0;
  const fill  = circ * (1 - pct);
  const display = fmt(current);

  return `
    <div class="ring-big-wrap">
      <svg class="ring-svg-big" viewBox="0 0 160 160" width="160" height="160">
        <defs>
          <linearGradient id="grad-${id}" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="${colorA}"/>
            <stop offset="100%" stop-color="${colorB}"/>
          </linearGradient>
        </defs>
        <circle cx="80" cy="80" r="${R}" fill="none" stroke="rgba(255,255,255,0.07)" stroke-width="12"/>
        <circle cx="80" cy="80" r="${R}" fill="none"
          stroke="url(#grad-${id})" stroke-width="12"
          stroke-linecap="round"
          stroke-dasharray="${circ}"
          stroke-dashoffset="${circ}"
          class="ring-progress"
          data-target="${fill}"
          transform="rotate(-90 80 80)"
          style="transition: stroke-dashoffset 1.1s cubic-bezier(0.34,1.2,0.64,1)"/>
        <foreignObject x="30" y="30" width="100" height="100">
          <div xmlns="http://www.w3.org/1999/xhtml" class="ring-center-big">
            <svg width="36" height="36" viewBox="0 0 140 140" fill="none">
              <ellipse cx="70" cy="86" rx="42" ry="31" fill="#ff7c4a"/>
              <ellipse cx="70" cy="91" rx="26" ry="19" fill="#ffb89e"/>
              <ellipse cx="70" cy="54" rx="28" ry="26" fill="#ff7c4a"/>
              <ellipse cx="95" cy="60" rx="19" ry="9" fill="#ff4d8f"/>
              <circle cx="80" cy="49" r="7" fill="white"/>
              <circle cx="80" cy="49" r="4" fill="#1a0a0a"/>
              <circle cx="82" cy="47" r="1.5" fill="white"/>
              <ellipse cx="54" cy="116" rx="15" ry="6" fill="#ff4d8f" transform="rotate(-8 54 116)"/>
              <ellipse cx="86" cy="116" rx="15" ry="6" fill="#ff4d8f" transform="rotate(8 86 116)"/>
            </svg>
            <div class="ring-big-val">${display}</div>
            <div class="ring-big-unit">${unit}</div>
          </div>
        </foreignObject>
      </svg>
      <div class="ring-big-label">Calories</div>
      <div class="ring-big-goal">Goal: ${goal} ${unit}</div>
    </div>
  `;
}

function smallRingHtml(label, current, goal, unit, colorA, colorB) {
  const fmt = window.NUTRITION?.fmt1 || (n => String(n));
  const R = 38;
  const circ = 2 * Math.PI * R;
  const pct  = goal > 0 ? Math.min(1, current / goal) : 0;
  const fill  = circ * (1 - pct);
  const id = label.toLowerCase();
  const display = fmt(current);

  return `
    <div class="ring-small-wrap">
      <svg class="ring-svg-small" viewBox="0 0 92 92" width="92" height="92">
        <defs>
          <linearGradient id="grad-${id}" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="${colorA}"/>
            <stop offset="100%" stop-color="${colorB}"/>
          </linearGradient>
        </defs>
        <circle cx="46" cy="46" r="${R}" fill="none" stroke="rgba(255,255,255,0.07)" stroke-width="8"/>
        <circle cx="46" cy="46" r="${R}" fill="none"
          stroke="url(#grad-${id})" stroke-width="8"
          stroke-linecap="round"
          stroke-dasharray="${circ}"
          stroke-dashoffset="${circ}"
          class="ring-progress"
          data-target="${fill}"
          transform="rotate(-90 46 46)"
          style="transition: stroke-dashoffset 1.1s cubic-bezier(0.34,1.2,0.64,1)"/>
        <text x="46" y="43" text-anchor="middle" fill="white" font-size="13" font-family="Nunito" font-weight="800">${display}</text>
        <text x="46" y="56" text-anchor="middle" fill="rgba(255,255,255,0.5)" font-size="9" font-family="DM Sans">${unit}</text>
      </svg>
      <div class="ring-small-label">${label}</div>
      <div class="ring-small-goal">${goal}${unit}</div>
    </div>
  `;
}

let _statsCache = null;
let _editing = false;

function renderTargets(stats) {
  _statsCache = stats;
  const grid = document.getElementById('targets-grid');
  const {
    dailyCalorieGoal = 0,
    dailyProteinGoal = 0,
    dailyFatGoal     = 0,
    dailyCarbsGoal   = 0,
    macroSplit       = { protein: 30, carbs: 45, fat: 25 },
    customTargets    = false,
  } = stats;

  if (!dailyCalorieGoal) {
    grid.innerHTML = '<div class="rings-loading">Set up your profile to get personalized targets.</div>';
    document.getElementById('target-formula').style.display = 'none';
    return;
  }

  const items = [
    { icon: '🔥', label: 'Calories',  value: dailyCalorieGoal, unit: 'kcal / day', color: '#ff7c4a', pct: null },
    { icon: '💪', label: 'Protein',   value: dailyProteinGoal, unit: 'g / day',    color: '#ff4d8f', pct: macroSplit.protein },
    { icon: '🌾', label: 'Carbs',     value: dailyCarbsGoal,   unit: 'g / day',    color: '#a78bfa', pct: macroSplit.carbs },
    { icon: '🧈', label: 'Fat',       value: dailyFatGoal,     unit: 'g / day',    color: '#fbbf24', pct: macroSplit.fat },
  ];

  grid.innerHTML = items.map(item => `
    <div class="target-item">
      <div class="target-icon">${item.icon}</div>
      <div class="target-body">
        <div class="target-label">${item.label}${item.pct != null ? ` <span style="color:${item.color}; font-weight:700; font-size:0.78rem">· ${item.pct}%</span>` : ''}</div>
        <div class="target-value" style="color:${item.color}">${item.value} <span class="target-unit">${item.unit}</span></div>
      </div>
    </div>
  `).join('');

  document.getElementById('targets-status').innerHTML = customTargets
    ? `<strong>Custom targets</strong> — you set these manually.`
    : `Auto-calculated from your profile.`;

  renderFormula(stats);
}

function renderFormula(stats) {
  const wrap = document.getElementById('target-formula');
  const body = document.getElementById('target-formula-body');
  const tb = stats.targetBreakdown;
  if (!tb) { wrap.style.display = 'none'; return; }

  const goalAdjStr = tb.goalAdjust > 0 ? `+${tb.goalAdjust}`
                   : tb.goalAdjust < 0 ? `${tb.goalAdjust}`
                   : '+0';
  const goalLabel = tb.goal === 'lose' ? '500 kcal cut' : tb.goal === 'gain' ? '300 kcal surplus' : 'maintenance';
  wrap.style.display = _editing ? 'none' : 'block';
  body.innerHTML = `
    <div><b>BMR</b> (Mifflin-St Jeor): ${tb.sex === 'male' ? '<code>10·w + 6.25·h − 5·a + 5</code>' : '<code>10·w + 6.25·h − 5·a − 161</code>'}<br>
      → <code>10·${tb.weight} + 6.25·${tb.height} − 5·${tb.age} ${tb.sex === 'male' ? '+ 5' : '− 161'}</code> = <b>${tb.bmr} kcal</b></div>
    <div><b>TDEE</b> = BMR × activity (${tb.activityLevel || '—'} → ×${tb.activityMult}) = <b>${tb.tdee} kcal</b></div>
    <div><b>Goal adjustment</b> (${goalLabel}): ${goalAdjStr} kcal → <b>${tb.autoCalories} kcal/day</b></div>
    <div style="margin-top: 0.4rem; color: var(--muted); font-size: 0.78rem">Macros are split by % of calories: protein/carbs at 4 kcal/g, fat at 9 kcal/g.</div>
  `;
}

function toggleFormula() {
  const body = document.getElementById('target-formula-body');
  const chevron = document.getElementById('target-formula-chevron');
  const isOpen = body.style.display === 'block';
  body.style.display = isOpen ? 'none' : 'block';
  if (chevron) chevron.textContent = isOpen ? '▾' : '▴';
}

function toggleTargetsEdit() {
  _editing = !_editing;
  document.getElementById('targets-editor').style.display = _editing ? 'block' : 'none';
  document.getElementById('target-formula').style.display = _editing ? 'none' : (_statsCache?.targetBreakdown ? 'block' : 'none');
  document.getElementById('targets-edit-btn').textContent = _editing ? '✕ Cancel' : '✏️ Edit';
  if (_editing && _statsCache) {
    document.getElementById('edit-calories').value = _statsCache.dailyCalorieGoal || 2000;
    setSplit(_statsCache.macroSplit || { protein: 30, carbs: 45, fat: 25 });
    updateSplitSummary();
  }
}

function setSplit(s) {
  for (const k of ['protein', 'carbs', 'fat']) {
    document.getElementById(`slider-${k}`).value = s[k];
    document.getElementById(`pct-${k}`).value = s[k];
  }
}

function getSplit() {
  return {
    protein: Number(document.getElementById('pct-protein').value) || 0,
    carbs:   Number(document.getElementById('pct-carbs').value)   || 0,
    fat:     Number(document.getElementById('pct-fat').value)     || 0,
  };
}

function onSplitChange(which, val) {
  const v = Math.max(0, Math.min(100, Number(val) || 0));
  document.getElementById(`slider-${which}`).value = v;
  document.getElementById(`pct-${which}`).value    = v;
  updateSplitSummary();
}

function updateSplitSummary() {
  const s = getSplit();
  const total = s.protein + s.carbs + s.fat;
  const cal = Number(document.getElementById('edit-calories').value) || 0;
  const summary = document.getElementById('split-summary');
  const gP = Math.round((cal * s.protein / 100) / 4);
  const gC = Math.round((cal * s.carbs   / 100) / 4);
  const gF = Math.round((cal * s.fat     / 100) / 9);
  summary.classList.toggle('invalid', total !== 100);
  summary.innerHTML = total === 100
    ? `<span>Total: <strong>${total}%</strong> ✓</span><span style="color:var(--muted)">${gP}g P · ${gC}g C · ${gF}g F</span>`
    : `<span>Total: <strong>${total}%</strong> — must equal 100</span><span style="color:var(--muted)">${gP}g P · ${gC}g C · ${gF}g F</span>`;
}

document.addEventListener('input', (e) => {
  if (e.target?.id === 'edit-calories') updateSplitSummary();
});

async function saveTargets() {
  const s = getSplit();
  const total = s.protein + s.carbs + s.fat;
  if (total !== 100) { showToast('Macro percentages must sum to 100 ❌'); return; }
  const calories = Number(document.getElementById('edit-calories').value);
  if (!calories || calories < 500 || calories > 6000) {
    showToast('Calories must be 500–6000 ❌'); return;
  }
  const btn = document.getElementById('targets-save-btn');
  btn.disabled = true; btn.textContent = 'Saving...';
  try {
    const res = await fetch(`${API}/api/users/targets`, {
      method: 'PUT', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ calories, proteinPct: s.protein, carbsPct: s.carbs, fatPct: s.fat }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Save failed');
    }
    showToast('Targets saved! 🎯');
    _editing = false;
    document.getElementById('targets-editor').style.display = 'none';
    document.getElementById('targets-edit-btn').textContent = '✏️ Edit';
    loadTrainer();
  } catch (err) {
    showToast(`Save failed: ${err.message} ❌`);
  }
  btn.disabled = false; btn.textContent = '💾 Save Targets';
}

async function resetTargets() {
  try {
    await fetch(`${API}/api/users/targets`, {
      method: 'PUT', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reset: true }),
    });
    showToast('Reset to auto-calculated 🔄');
    _editing = false;
    document.getElementById('targets-editor').style.display = 'none';
    document.getElementById('targets-edit-btn').textContent = '✏️ Edit';
    // Trigger profile re-save so auto formula recomputes targets
    await fetch(`${API}/api/users/profile`, {
      method: 'PUT', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    loadTrainer();
  } catch { showToast('Reset failed ❌'); }
}

function logout() {
  fetch(`${API}/auth/logout`, { credentials: 'include' }).then(() => window.location.href = '/');
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

init();
