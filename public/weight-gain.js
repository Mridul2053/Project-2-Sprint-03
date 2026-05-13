// weight-gain.js — FIXED VERSION
//
// What was broken:
//  1. No auth check — any visitor could open the page
//  2. addWorkout() only added items to the DOM, never called the API
//  3. Delete button only removed the DOM element — nothing persisted
//  4. clearAll() wiped the visible list but the DB was untouched
//  5. No feedback except alert() popups
//  6. After page reload all logged workouts disappeared

let currentExercise = "";
let currentDay      = "";
let allWorkouts     = [];  // cache from backend

// ── AUTH CHECK ────────────────────────────────────────────────
// FIX: was completely missing
async function checkSession() {
  try {
    const r = await fetch('/api/session');
    if (!r.ok) { window.location.href = '/login.html'; return false; }
    const d = await r.json();
    const el = document.getElementById('userName');
    if (el) el.textContent = d.user.name || d.user.email;
    return true;
  } catch {
    window.location.href = '/login.html';
    return false;
  }
}

// ── MODAL OPEN / CLOSE ────────────────────────────────────────
function openModal(exerciseName, dayName) {
  currentExercise = exerciseName;
  currentDay      = dayName || '';

  document.getElementById('exerciseTitle').textContent = exerciseName;
  document.getElementById('dayLabel').textContent      = dayName || '';
  document.getElementById('workoutModal').style.display = 'flex';

  clearForm();
  hideStatus();
  loadRecentEntries(exerciseName);
}

function closeModal() {
  document.getElementById('workoutModal').style.display = 'none';
}

// Close when clicking outside the modal box
window.addEventListener('click', function(e) {
  const modal = document.getElementById('workoutModal');
  if (e.target === modal) closeModal();
});

// ── FORM HELPERS ──────────────────────────────────────────────
function clearForm() {
  document.getElementById('weightInput').value = '';
  document.getElementById('repsInput').value   = '';
  document.getElementById('setsInput').value   = '';
  document.getElementById('notesInput').value  = '';
  hideStatus();
}

function showStatus(msg, type) {
  const el = document.getElementById('modalStatus');
  el.textContent = msg;
  el.style.display = 'block';
  el.style.background = type === 'ok'  ? '#e6f9f0' : '#fdecea';
  el.style.color      = type === 'ok'  ? '#1a7a4a' : '#c0392b';
  el.style.border     = `1px solid ${type === 'ok' ? '#a8e6c8' : '#f5b7b1'}`;
}

function hideStatus() {
  document.getElementById('modalStatus').style.display = 'none';
}

// ── SAVE EXERCISE TO BACKEND ──────────────────────────────────
// FIX: was addWorkout() — only touched the DOM, never hit the API
async function saveExercise() {
  const weight = document.getElementById('weightInput').value.trim();
  const reps   = parseInt(document.getElementById('repsInput').value)   || 0;
  const sets   = parseInt(document.getElementById('setsInput').value)   || 0;
  const notes  = document.getElementById('notesInput').value.trim();

  if (!weight && !reps && !sets) {
    showStatus('Please fill in at least one field.', 'err');
    return;
  }

  const btn     = document.getElementById('saveExerciseBtn');
  const btnText = document.getElementById('saveBtnText');
  btn.disabled  = true;
  btnText.textContent = 'Saving…';
  hideStatus();

  try {
    const r = await fetch('/api/workouts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name:   currentExercise,
        sets:   sets,
        reps:   reps,
        weight: weight ? weight + (isNaN(weight) ? '' : 'kg') : '',
        notes:  notes || (currentDay ? `From: ${currentDay}` : '')
      })
    });

    const d = await r.json();
    if (!d.success) throw new Error(d.message);

    showStatus('✓ Saved to your workout log!', 'ok');
    clearForm();

    // Refresh the recent entries list in the modal
    await loadRecentEntries(currentExercise);

  } catch (e) {
    showStatus(e.message || 'Could not save. Please try again.', 'err');
  } finally {
    btn.disabled = false;
    btnText.textContent = 'Save to Log';
  }
}

// ── LOAD RECENT ENTRIES FOR THIS EXERCISE ─────────────────────
// FIX: was not implemented at all
async function loadRecentEntries(exerciseName) {
  const container = document.getElementById('recentEntries');
  container.innerHTML = '<p style="color:#aaa;font-size:13px">Loading recent entries…</p>';

  try {
    const r = await fetch('/api/workouts');
    if (!r.ok) { container.innerHTML = ''; return; }
    const d = await r.json();

    // Filter to just this exercise, most recent 5
    const entries = (d.workouts || [])
      .filter(w => w.name.toLowerCase() === exerciseName.toLowerCase())
      .slice(0, 5);

    if (!entries.length) {
      container.innerHTML = '<p style="color:#aaa;font-size:13px;margin-top:8px">No previous entries for this exercise.</p>';
      return;
    }

    container.innerHTML = `
      <p style="font-size:13px;font-weight:600;color:#555;margin-bottom:8px">Recent entries for ${escHtml(exerciseName)}:</p>
      ${entries.map(e => `
        <div style="
          display:flex;justify-content:space-between;align-items:center;
          border:1px solid #eee;border-radius:8px;
          padding:10px 14px;margin-bottom:6px;font-size:14px;
          background:#fafafa;
        ">
          <span>
            ${e.sets ? `<b>${e.sets}</b> sets` : ''}
            ${e.reps ? ` × <b>${e.reps}</b> reps` : ''}
            ${e.weight ? ` @ <b>${escHtml(e.weight)}</b>` : ''}
            ${e.notes ? `<br><span style="color:#999;font-size:12px">${escHtml(e.notes)}</span>` : ''}
          </span>
          <span style="display:flex;align-items:center;gap:10px">
            <span style="color:#bbb;font-size:12px">${fmtDate(e.date)}</span>
            <button onclick="deleteEntry(${e.id}, this)" style="
              background:none;border:none;color:#ccc;cursor:pointer;
              font-size:16px;padding:2px 6px;border-radius:4px;
              transition:color .15s;
            " onmouseover="this.style.color='#e53935'" onmouseout="this.style.color='#ccc'"
              title="Delete this entry">✕</button>
          </span>
        </div>
      `).join('')}
    `;

  } catch {
    container.innerHTML = '';
  }
}

// ── DELETE SINGLE ENTRY ───────────────────────────────────────
// FIX: was just item.remove() — now calls DELETE /api/workouts/:id
async function deleteEntry(id, btn) {
  const row = btn.closest('div[style]');
  if (row) { row.style.opacity = '.4'; row.style.pointerEvents = 'none'; }

  try {
    const r = await fetch(`/api/workouts/${id}`, { method: 'DELETE' });
    const d = await r.json();
    if (!d.success) throw new Error(d.message);
    if (row) row.remove();
  } catch (e) {
    if (row) { row.style.opacity = ''; row.style.pointerEvents = ''; }
    showStatus(e.message || 'Could not delete', 'err');
  }
}

// ── UTILITIES ─────────────────────────────────────────────────
function fmtDate(iso) {
  if (!iso) return '';
  const d    = new Date(iso);
  const now  = new Date();
  const mins = Math.floor((now - d) / 60000);
  if (mins < 1)  return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
}

function escHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── LOGOUT ────────────────────────────────────────────────────
const logoutEl = document.getElementById('logout-link');
if (logoutEl) {
  logoutEl.addEventListener('click', async (e) => {
    e.preventDefault();
    await fetch('/logout', { method: 'POST' }).catch(() => {});
    window.location.href = '/login.html';
  });
}

// ── INIT ──────────────────────────────────────────────────────
checkSession();