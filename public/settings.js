// ─── Session check ────────────────────────────────────────────────
async function checkSession() {
  try {
    const res = await fetch('/api/session');
    if (!res.ok) { window.location.href = '/login.html'; return null; }
    const data = await res.json();
    if (!data.success) { window.location.href = '/login.html'; return null; }
    return data.user;
  } catch (e) {
    window.location.href = '/login.html';
    return null;
  }
}

// ─── Toast ────────────────────────────────────────────────────────
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = 'toast ' + type;
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.add('hidden'), 3500);
}

// ─── Toggle buttons ───────────────────────────────────────────────
document.querySelectorAll('.toggle').forEach(function(btn) {
  btn.addEventListener('click', function() {
    if (btn.classList.contains('on')) {
      btn.textContent = 'OFF';
      btn.classList.replace('on', 'off');
    } else {
      btn.textContent = 'ON';
      btn.classList.replace('off', 'on');
    }
    if (btn.id === 'darkModeBtn') {
      document.body.classList.toggle('dark-mode');
    }
  });
});

// ─── Load user data ───────────────────────────────────────────────
async function loadSettings() {
  const user = await checkSession();
  if (!user) return;

  const icon = document.getElementById('profileIcon');
  icon.textContent = user.name ? user.name[0].toUpperCase() : '👤';

  try {
    const res  = await fetch('/api/settings');
    const data = await res.json();
    if (data.success) {
      const u = data.user;
      document.getElementById('name').value   = u.name   || '';
      document.getElementById('email').value  = u.email  || '';
      document.getElementById('age').value    = u.age    || '';
      document.getElementById('height').value = u.height || '';
      document.getElementById('weight').value = u.weight || '';
      if (u.goal) document.getElementById('goal').value = u.goal;
    }
  } catch (e) {
    showToast('Could not load profile data.', 'error');
  }

  try {
    const res  = await fetch('/api/goals');
    const data = await res.json();
    if (data.success && data.goals) {
      const g = data.goals;
      document.getElementById('targetCalories').value = g.target_calories || '';
      document.getElementById('targetWeight').value   = g.target_weight   || '';
      document.getElementById('targetWorkouts').value = g.target_workouts || '';
    }
  } catch (e) {
    // goals remain blank — not a critical error
  }
}

// ─── Save settings ────────────────────────────────────────────────
document.getElementById('saveBtn').addEventListener('click', async function() {
  const btn = this;
  btn.disabled = true;
  btn.textContent = 'Saving…';

  try {
    const profileRes = await fetch('/api/settings', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name:   document.getElementById('name').value.trim(),
        age:    document.getElementById('age').value    || null,
        height: document.getElementById('height').value.trim(),
        weight: document.getElementById('weight').value || null,
        goal:   document.getElementById('goal').value
      })
    });
    const profileData = await profileRes.json();
    if (!profileData.success) throw new Error(profileData.message);

    const goalsRes = await fetch('/api/goals', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        target_calories: document.getElementById('targetCalories').value || null,
        target_weight:   document.getElementById('targetWeight').value   || null,
        target_workouts: document.getElementById('targetWorkouts').value || null
      })
    });
    const goalsData = await goalsRes.json();
    if (!goalsData.success) throw new Error(goalsData.message);

    showToast('Settings saved successfully!');
  } catch (e) {
    showToast(e.message || 'Could not save settings. Please try again.', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Save Changes';
  }
});

// ─── Password modal ───────────────────────────────────────────────
const overlay = document.getElementById('modalOverlay');

document.getElementById('changePasswordBtn').addEventListener('click', function() {
  document.getElementById('currentPassword').value = '';
  document.getElementById('newPassword').value     = '';
  document.getElementById('confirmPassword').value = '';
  overlay.classList.remove('hidden');
  document.getElementById('currentPassword').focus();
});

document.getElementById('cancelPasswordBtn').addEventListener('click', function() {
  overlay.classList.add('hidden');
});

overlay.addEventListener('click', function(e) {
  if (e.target === overlay) overlay.classList.add('hidden');
});

document.getElementById('submitPasswordBtn').addEventListener('click', async function() {
  const current = document.getElementById('currentPassword').value;
  const newPass = document.getElementById('newPassword').value;
  const confirm = document.getElementById('confirmPassword').value;

  if (!current)           { showToast('Please enter your current password.', 'error'); return; }
  if (newPass.length < 6) { showToast('New password must be at least 6 characters.', 'error'); return; }
  if (newPass !== confirm) { showToast('Passwords do not match.', 'error'); return; }

  const btn = this;
  btn.disabled = true;
  btn.textContent = 'Changing…';

  try {
    const res = await fetch('/api/settings/password', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: current, newPassword: newPass })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    overlay.classList.add('hidden');
    showToast('Password changed successfully!');
  } catch (e) {
    showToast(e.message || 'Could not change password.', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Change Password';
  }
});

// ─── Logout ───────────────────────────────────────────────────────
function doLogout() {
  fetch('/logout', { method: 'POST' })
    .finally(() => { window.location.href = '/login.html'; });
}

document.getElementById('logoutBtn').addEventListener('click', doLogout);
document.getElementById('logoutNav').addEventListener('click', function(e) {
  e.preventDefault();
  doLogout();
});

// ─── Init ─────────────────────────────────────────────────────────
loadSettings();
