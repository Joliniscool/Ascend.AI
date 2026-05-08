const API = '';

async function init() {
  try {
    const res = await fetch(`${API}/auth/me`, { credentials: 'include' });
    const data = await res.json();
    if (data.user) { showDashboard(data.user); loadStats(); loadProfile(); loadMeals(); }
    else showLogin();
  } catch { showLogin(); }
}

function showLogin() {
  document.getElementById('login-page').style.display = 'flex';
  document.getElementById('dashboard').style.display = 'none';
  // Hide chat UI so it doesn't linger on the login screen
  const chatBtn   = document.querySelector('.chat-bubble');
  const chatPanel = document.getElementById('chat-panel');
  const chatNotif = document.getElementById('chud-notif');
  if (chatBtn)   chatBtn.style.display   = 'none';
  if (chatPanel) chatPanel.style.display = 'none';
  if (chatNotif) chatNotif.classList.remove('show');
  if (typeof destroyChasePlatypus === 'function') destroyChasePlatypus();
}

function showDashboard(user) {
  document.getElementById('login-page').style.display = 'none';
  document.getElementById('dashboard').style.display = 'block';
  // Restore chat UI
  const chatBtn = document.querySelector('.chat-bubble');
  if (chatBtn) chatBtn.style.display = 'flex';
  if (typeof initChasePlatypus === 'function') initChasePlatypus(user.name || user.email);
  document.getElementById('user-name-display').textContent = user.name || user.email;
  document.getElementById('welcome-msg').textContent = `Welcome back, ${user.name?.split(' ')[0] || 'friend'}! 🌸`;
  document.getElementById('avatar-initial').textContent = (user.name || user.email || '?')[0].toUpperCase();
  loadJudge();
  setupDropZone();
}

function setupDropZone() {
  const zone = document.getElementById('drop-zone');
  if (!zone) return;
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
      previewImage(input);
    }
  });
}

async function loadStats() {
  try {
    const res = await fetch(`${API}/api/users/stats`, { credentials: 'include' });
    const data = await res.json();
    renderNutritionPanel(data);
    document.getElementById('stat-streak').textContent = data.currentStreak ?? '0';
    document.getElementById('stat-meals').textContent = data.totalMeals ?? '0';
    document.getElementById('stat-weight').textContent = data.currentWeight ?? '—';
  } catch {}
}

function renderNutritionPanel(data) {
  const { fmt1, fmtPct, macroPctOfCalories } = window.NUTRITION;
  const tCal = data.todaysCalories || 0;
  const tP   = data.todaysProtein  || 0;
  const tC   = data.todaysCarbs    || 0;
  const tF   = data.todaysFat      || 0;
  const goal = data.dailyCalorieGoal || 0;
  const split = data.macroSplit || { protein: 30, carbs: 45, fat: 25 };

  document.getElementById('stat-calories').textContent = fmt1(tCal);
  document.getElementById('stat-goal').textContent = goal || '—';
  document.getElementById('stat-cal-pct').textContent = goal ? `${fmtPct(tCal, goal)}% of goal` : '';

  const todayPcts = macroPctOfCalories(tP, tC, tF);
  const macros = [
    { key: 'protein', label: 'Protein', goal: data.dailyProteinGoal, today: tP, pctToday: todayPcts.protein, pctGoal: split.protein, color: '#ff4d8f', unit: 'g' },
    { key: 'carbs',   label: 'Carbs',   goal: data.dailyCarbsGoal,   today: tC, pctToday: todayPcts.carbs,   pctGoal: split.carbs,   color: '#a78bfa', unit: 'g' },
    { key: 'fat',     label: 'Fat',     goal: data.dailyFatGoal,     today: tF, pctToday: todayPcts.fat,     pctGoal: split.fat,     color: '#fbbf24', unit: 'g' },
  ];
  document.getElementById('macro-bars-col').innerHTML = macros.map(m => {
    const fillPct = m.goal ? Math.min(100, Math.round((m.today / m.goal) * 100)) : 0;
    return `
      <div class="macro-bar-row">
        <div class="macro-bar-label" style="color:${m.color}">${m.label}<br><span style="color:var(--muted); font-size:0.7rem; font-weight:600">${m.pctToday}% of cals</span></div>
        <div class="macro-bar-track"><div class="macro-bar-fill" style="width:${fillPct}%; background:${m.color}"></div></div>
        <div class="macro-bar-meta"><strong>${fmt1(m.today)}${m.unit}</strong> / ${m.goal || '—'}${m.unit}<br><span style="font-size:0.7rem">goal: ${m.pctGoal}%</span></div>
      </div>
    `;
  }).join('');

  document.getElementById('micros-grid').innerHTML = window.NUTRITION.microCellsHtml(data.todaysMicros || {});
}

function toggleMicros() {
  const grid = document.getElementById('micros-grid');
  const chevron = document.getElementById('micros-toggle-chevron');
  const isOpen = grid.style.display !== 'none';
  grid.style.display = isOpen ? 'none' : 'grid';
  if (chevron) chevron.textContent = isOpen ? '▾' : '▴';
}

async function logout() {
  await fetch(`${API}/auth/logout`, { credentials: 'include' });
  showLogin();
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

function previewImage(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    document.getElementById('image-preview').src = e.target.result;
    document.getElementById('image-preview').style.display = 'block';
    document.getElementById('drop-placeholder').style.display = 'none';
    document.getElementById('remove-photo').style.display = 'flex';
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
}

async function logMeal() {
  const name = document.getElementById('meal-name').value.trim();
  if (!name) { showToast('Please enter a meal name ❌'); return; }

  const btn = document.getElementById('log-btn');
  btn.disabled = true; btn.textContent = 'Logging...';

  const formData = new FormData();
  formData.append('name', name);
  formData.append('calories', document.getElementById('meal-calories').value || 0);
  formData.append('protein', document.getElementById('meal-protein').value || 0);
  formData.append('carbs', document.getElementById('meal-carbs').value || 0);
  formData.append('fat', document.getElementById('meal-fat').value || 0);

  const imageFile = document.getElementById('food-image').files[0]
    || document.getElementById('camera-input').files[0];
  if (imageFile) formData.append('image', imageFile);

  try {
    const res = await fetch(`${API}/api/meals`, { method: 'POST', credentials: 'include', body: formData });
    if (!res.ok) throw new Error();
    showToast('Meal logged! 🍽️');
    document.getElementById('meal-name').value = '';
    document.getElementById('meal-calories').value = '';
    document.getElementById('meal-protein').value = '';
    document.getElementById('meal-carbs').value = '';
    document.getElementById('meal-fat').value = '';
    document.getElementById('food-image').value = '';
    document.getElementById('camera-input').value = '';
    document.getElementById('image-preview').style.display = 'none';
    document.getElementById('drop-placeholder').style.display = 'flex';
    document.getElementById('remove-photo').style.display = 'none';
    loadMeals();
    loadStats();
  } catch { showToast('Failed to log meal ❌'); }

  btn.disabled = false; btn.textContent = 'Log Meal 🍽️';
}

async function loadMeals() {
  try {
    const res = await fetch(`${API}/api/meals/my`, { credentials: 'include' });
    const meals = await res.json();
    if (typeof setMealSource === 'function') setMealSource(meals);
    const grid = document.getElementById('meals-grid');
    if (!meals.length) {
      grid.innerHTML = '<div class="meals-empty">No meals logged yet — add your first one above! 🌸</div>';
      return;
    }
    const highlights = window.NUTRITION?.mealHighlights;
    const macroTags  = window.NUTRITION?.macroTagsHtml;
    grid.innerHTML = meals.slice(0, 5).map(meal => {
      const hl = highlights ? highlights(meal) : { highProtein: false, highMicros: [] };
      const hasChips = hl.highProtein || hl.highMicros.length || hl.badMicros?.length;
      const chipsHtml = hasChips
        ? `<div class="meal-highlight-chips">
             ${hl.highProtein ? `<span class="meal-highlight-chip protein">💪 High protein</span>` : ''}
             ${hl.highMicros.map(h => `<span class="meal-highlight-chip">High ${h.label}</span>`).join('')}
             ${(hl.badMicros || []).map(h => `<span class="meal-highlight-chip bad">⚠ High ${h.label}</span>`).join('')}
           </div>`
        : '';
      return `
      <div class="meal-card ${hl.highProtein ? 'meal-card-highlight-protein' : ''}">
        ${meal.imageUrl
          ? `<img class="meal-img" src="${meal.imageUrl}" alt="${meal.name}">`
          : `<div class="meal-img-placeholder">🍽️</div>`}
        <div class="meal-info">
          <div class="meal-name-text">${meal.name}</div>
          <div class="meal-macros">${macroTags ? macroTags(meal) : ''}</div>
          ${chipsHtml}
          <div class="meal-date">${new Date(meal.loggedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
        </div>
        <div class="meal-card-actions" style="display:flex; gap:0.4rem; align-items:center">
          <button class="meal-view-btn" onclick="openMealById('${meal._id}')" title="View details">View more →</button>
          <button class="meal-delete-btn" onclick="deleteMeal('${meal._id}')" title="Delete meal">✕</button>
        </div>
      </div>
    `;
    }).join('');
  } catch {}
}

async function deleteMeal(id) {
  try {
    const res = await fetch(`${API}/api/meals/${id}`, { method: 'DELETE', credentials: 'include' });
    if (!res.ok) throw new Error();
    showToast('Meal deleted');
    loadMeals();
    loadStats();
  } catch { showToast('Could not delete meal ❌'); }
}

// ── Chat ──
const chatHistory = [];

function toggleChat() {
  document.getElementById('chat-panel').classList.toggle('open');
  if (document.getElementById('chat-panel').classList.contains('open')) {
    document.getElementById('chat-input').focus();
  }
}

function appendMsg(text, role) {
  const messages = document.getElementById('chat-messages');
  const div = document.createElement('div');
  div.className = `chat-msg ${role}`;
  div.textContent = text;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
  return div;
}

async function sendChat() {
  const input = document.getElementById('chat-input');
  const sendBtn = document.getElementById('chat-send');
  const message = input.value.trim();
  if (!message) return;

  input.value = '';
  input.disabled = true;
  sendBtn.disabled = true;

  appendMsg(message, 'user');
  chatHistory.push({ role: 'user', content: message });

  const typing = appendMsg('Chud Assist is judging you...', 'bot typing');

  try {
    const res = await fetch(`${API}/api/chat`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, history: chatHistory.slice(-10) }),
    });
    const data = await res.json();
    const reply = data.reply || data.error || 'Something went wrong.';
    typing.remove();
    appendMsg(reply, 'bot');
    chatHistory.push({ role: 'assistant', content: reply });
  } catch {
    typing.remove();
    appendMsg('Chud Assist is unreachable. Probably embarrassed for you.', 'bot');
  }

  input.disabled = false;
  sendBtn.disabled = false;
  input.focus();
}

async function loadJudge() {
  try {
    const res = await fetch(`${API}/api/judge`, { credentials: 'include' });
    const data = await res.json();
    const bubble = document.getElementById('platypus-bubble');
    if (bubble) bubble.textContent = data.message;
  } catch {}
}

// ── Chud Assist random pings ──
const CHUD_PINGS = [
  "Stop larping as someone who has their diet together and actually log your meals.",
  "Your clavicular width is genetic. Your body fat percentage is not. Log something.",
  "Blackpill cope won't save you. Protein and discipline will. Get moving.",
  "Are you mewing right now? Tongue on the roof of your mouth. You're welcome.",
  "Every chud thinks they'll start tomorrow. Tomorrow never comes. Log today.",
  "You're one missed protein goal away from being permanently framemogged by everyone around you.",
  "The difference between a chad and a chud is about 150g of protein per day. Do the math.",
  "Jestermaxxing is a cope. Looksmaxxing is the way. Start with your diet.",
  "Even chadlites track their macros. Stop incel-posting on your own nutrition.",
  "Big backs don't ascend. Log your food or stay a chud forever.",
  "Your androgenic potential is being wasted by your diet. Fix it.",
  "Mogging starts in the kitchen. What are you eating today?",
  "You could be ascending right now. Instead you're doing... this.",
  "Drink water. Hit protein. Stop chumming on junk food. That's literally it.",
  "BIMAX won't fix a bad diet. Start with the basics, chud.",
  "The foids aren't going to start noticing you until your macros do.",
];

function openChatFromNotif() {
  const notif = document.getElementById('chud-notif');
  if (notif) notif.classList.remove('show');
  const panel = document.getElementById('chat-panel');
  if (!panel.classList.contains('open')) toggleChat();
}

function fireChudPing() {
  const msg = CHUD_PINGS[Math.floor(Math.random() * CHUD_PINGS.length)];

  // Always inject into chat history (visible when user opens)
  appendMsg(msg, 'bot');
  chatHistory.push({ role: 'assistant', content: msg });

  // If chat is closed, also show the floating notif
  const panel = document.getElementById('chat-panel');
  if (!panel.classList.contains('open')) {
    const notif = document.getElementById('chud-notif');
    if (notif) {
      notif.textContent = msg;
      notif.classList.add('show');
      // Bounce the chad button
      const btn = document.querySelector('.chat-bubble');
      if (btn) { btn.classList.add('ping'); setTimeout(() => btn.classList.remove('ping'), 1000); }
      setTimeout(() => notif.classList.remove('show'), 9000);
    }
  }
}

function scheduleChudPing() {
  // Random interval between 30s and 2 minutes
  const delay = 30000 + Math.random() * 90000;
  setTimeout(() => {
    fireChudPing();
    scheduleChudPing();
  }, delay);
}

init();
scheduleChudPing();
