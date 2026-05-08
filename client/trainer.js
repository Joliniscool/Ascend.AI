const API = '';

async function init() {
  try {
    const res = await fetch(`${API}/auth/me`, { credentials: 'include' });
    const data = await res.json();
    if (data.user) {
      document.getElementById('user-name-display').textContent = data.user.name || data.user.email;
      document.getElementById('avatar-initial').textContent = (data.user.name || data.user.email || '?')[0].toUpperCase();
      document.getElementById('page').style.display = 'block';
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
  const R = 70;
  const circ = 2 * Math.PI * R;
  const pct  = goal > 0 ? Math.min(1, current / goal) : 0;
  const fill  = circ * (1 - pct);

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
            <div class="ring-big-val">${current}</div>
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
  const R = 38;
  const circ = 2 * Math.PI * R;
  const pct  = goal > 0 ? Math.min(1, current / goal) : 0;
  const fill  = circ * (1 - pct);
  const id = label.toLowerCase();

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
        <text x="46" y="43" text-anchor="middle" fill="white" font-size="13" font-family="Nunito" font-weight="800">${current}</text>
        <text x="46" y="56" text-anchor="middle" fill="rgba(255,255,255,0.5)" font-size="9" font-family="DM Sans">${unit}</text>
      </svg>
      <div class="ring-small-label">${label}</div>
      <div class="ring-small-goal">${goal}${unit}</div>
    </div>
  `;
}

function renderTargets(stats) {
  const grid = document.getElementById('targets-grid');
  const {
    dailyCalorieGoal = 0,
    dailyProteinGoal = 0,
    dailyFatGoal     = 0,
    dailyCarbsGoal   = 0,
  } = stats;

  if (!dailyCalorieGoal) {
    grid.innerHTML = '<div class="rings-loading">Set up your profile to get personalized targets.</div>';
    return;
  }

  const items = [
    { icon: '🔥', label: 'Calories',  value: dailyCalorieGoal, unit: 'kcal / day', color: '#ff7c4a' },
    { icon: '💪', label: 'Protein',   value: dailyProteinGoal, unit: 'g / day',    color: '#ff4d8f' },
    { icon: '🌾', label: 'Carbs',     value: dailyCarbsGoal,   unit: 'g / day',    color: '#a78bfa' },
    { icon: '🧈', label: 'Fat',       value: dailyFatGoal,     unit: 'g / day',    color: '#fbbf24' },
  ];

  grid.innerHTML = items.map(item => `
    <div class="target-item">
      <div class="target-icon">${item.icon}</div>
      <div class="target-body">
        <div class="target-label">${item.label}</div>
        <div class="target-value" style="color:${item.color}">${item.value} <span class="target-unit">${item.unit}</span></div>
      </div>
    </div>
  `).join('');
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
