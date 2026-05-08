// Shared profile dropdown — included on every page
(function () {
  const api = () => window.API ?? '';

  window.toggleProfileDropdown = function () {
    const dropdown = document.getElementById('profile-dropdown');
    const chevron  = document.getElementById('profile-chevron');
    if (!dropdown) return;
    const isOpen = dropdown.classList.toggle('open');
    if (chevron) chevron.textContent = isOpen ? '▴' : '▾';
  };

  window.loadProfile = async function () {
    try {
      const res  = await fetch(`${api()}/api/users/profile`, { credentials: 'include' });
      const user = await res.json();
      const set  = (id, val) => { const el = document.getElementById(id); if (el && val != null) el.value = val; };
      set('field-age',      user.age);
      set('field-sex',      user.sex);
      set('field-height',   user.height);
      set('field-activity', user.activityLevel);
      set('field-goal',     user.goal);
      if (user.weightLog?.length) set('field-weight', user.weightLog.at(-1).value);
    } catch {}
  };

  window.saveProfile = async function () {
    const btn = document.getElementById('profile-save-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }

    const get = (id) => document.getElementById(id)?.value ?? '';
    try {
      await fetch(`${api()}/api/users/profile`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          age:           Number(get('field-age'))    || undefined,
          sex:           get('field-sex')            || undefined,
          height:        Number(get('field-height')) || undefined,
          activityLevel: get('field-activity')       || undefined,
          goal:          get('field-goal')           || undefined,
          weight:        get('field-weight') ? Number(get('field-weight')) : undefined,
        }),
      });
      if (typeof showToast === 'function') showToast('Profile saved! 🌸');
      if (typeof loadStats === 'function') loadStats();
      // Refresh trainer rings if on that page
      if (typeof loadTrainer === 'function') loadTrainer();
      const dropdown = document.getElementById('profile-dropdown');
      const chevron  = document.getElementById('profile-chevron');
      if (dropdown) dropdown.classList.remove('open');
      if (chevron)  chevron.textContent = '▾';
    } catch {
      if (typeof showToast === 'function') showToast('Something went wrong ❌');
    }
    if (btn) { btn.disabled = false; btn.textContent = 'Save Profile 💾'; }
  };

  // Close on outside click
  document.addEventListener('click', (e) => {
    const wrap = document.getElementById('user-info-wrap');
    if (wrap && !wrap.contains(e.target)) {
      const dropdown = document.getElementById('profile-dropdown');
      const chevron  = document.getElementById('profile-chevron');
      if (dropdown) dropdown.classList.remove('open');
      if (chevron)  chevron.textContent = '▾';
    }
  });
})();
