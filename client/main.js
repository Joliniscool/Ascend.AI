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
}

function showDashboard(user) {
  document.getElementById('login-page').style.display = 'none';
  document.getElementById('dashboard').style.display = 'block';
  document.getElementById('user-name-display').textContent = user.name || user.email;
  document.getElementById('welcome-msg').textContent = `Welcome back, ${user.name?.split(' ')[0] || 'friend'}! 🌸`;
  document.getElementById('avatar-initial').textContent = (user.name || user.email || '?')[0].toUpperCase();
}

async function loadStats() {
  try {
    const res = await fetch(`${API}/api/users/stats`, { credentials: 'include' });
    const data = await res.json();
    document.getElementById('stat-calories').textContent = data.todaysCalories ?? '0';
    document.getElementById('stat-goal').textContent = data.dailyCalorieGoal ?? '—';
    document.getElementById('stat-streak').textContent = data.currentStreak ?? '0';
    document.getElementById('stat-meals').textContent = data.totalMeals ?? '0';
    document.getElementById('stat-weight').textContent = data.currentWeight ?? '—';
  } catch {}
}

async function loadProfile() {
  try {
    const res = await fetch(`${API}/api/users/profile`, { credentials: 'include' });
    const user = await res.json();
    if (user.age) document.getElementById('field-age').value = user.age;
    if (user.sex) document.getElementById('field-sex').value = user.sex;
    if (user.height) document.getElementById('field-height').value = user.height;
    if (user.activityLevel) document.getElementById('field-activity').value = user.activityLevel;
    if (user.goal) document.getElementById('field-goal').value = user.goal;
    if (user.weightLog?.length) document.getElementById('field-weight').value = user.weightLog.at(-1).value;
  } catch {}
}

async function saveProfile() {
  const btn = document.getElementById('profile-save-btn');
  btn.disabled = true; btn.textContent = 'Saving...';
  const weight = document.getElementById('field-weight').value;
  try {
    await fetch(`${API}/api/users/profile`, {
      method: 'PUT', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        age: Number(document.getElementById('field-age').value),
        sex: document.getElementById('field-sex').value,
        height: Number(document.getElementById('field-height').value),
        activityLevel: document.getElementById('field-activity').value,
        goal: document.getElementById('field-goal').value,
      })
    });
    if (weight) {
      await fetch(`${API}/api/users/weight`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weight: Number(weight) })
      });
    }
    showToast('Profile saved! 🌸'); loadStats();
  } catch { showToast('Something went wrong ❌'); }
  btn.disabled = false; btn.textContent = 'Save Profile 💾';
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
    const preview = document.getElementById('image-preview');
    const placeholder = document.getElementById('drop-placeholder');
    preview.src = e.target.result;
    preview.style.display = 'block';
    placeholder.style.display = 'none';
  };
  reader.readAsDataURL(file);
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
    loadMeals();
    loadStats();
  } catch { showToast('Failed to log meal ❌'); }

  btn.disabled = false; btn.textContent = 'Log Meal 🍽️';
}

async function loadMeals() {
  try {
    const res = await fetch(`${API}/api/meals/my`, { credentials: 'include' });
    const meals = await res.json();
    const grid = document.getElementById('meals-grid');
    if (!meals.length) {
      grid.innerHTML = '<div class="meals-empty">No meals logged yet — add your first one above! 🌸</div>';
      return;
    }
    grid.innerHTML = meals.slice(0, 5).map(meal => `
      <div class="meal-card">
        ${meal.imageUrl
          ? `<img class="meal-img" src="${meal.imageUrl}" alt="${meal.name}">`
          : `<div class="meal-img-placeholder">🍽️</div>`}
        <div class="meal-info">
          <div class="meal-name-text">${meal.name}</div>
          <div class="meal-macros">
            ${meal.calories ? `<span class="macro">🔥 ${meal.calories} kcal</span>` : ''}
            ${meal.protein ? `<span class="macro">💪 ${meal.protein}g protein</span>` : ''}
            ${meal.carbs ? `<span class="macro">🌾 ${meal.carbs}g carbs</span>` : ''}
            ${meal.fat ? `<span class="macro">🧈 ${meal.fat}g fat</span>` : ''}
          </div>
          <div class="meal-date">${new Date(meal.loggedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
        </div>
      </div>
    `).join('');
  } catch {}
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

  const typing = appendMsg('Platypus is thinking...', 'bot typing');

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
    appendMsg('Could not reach Platypus right now. Try again!', 'bot');
  }

  input.disabled = false;
  sendBtn.disabled = false;
  input.focus();
}

init();
