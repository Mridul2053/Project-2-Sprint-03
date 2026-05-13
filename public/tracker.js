// ─── State ────────────────────────────────────────────────────────
let allMeals = [];
let editingId = null;
let bmiTargets = null;

// ─── Date nav ─────────────────────────────────────────────────────
function todayISO() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

const di = document.getElementById('log-date');
di.value = todayISO();
document.getElementById('prev-day').onclick = () => shift(-1);
document.getElementById('next-day').onclick = () => shift(1);
di.onchange = refresh;

function shift(n) {
  const d = new Date(di.value || todayISO());
  d.setDate(d.getDate() + n);
  di.value = d.toISOString().slice(0, 10);
  refresh();
}

// ─── Macro goals (localStorage — server only stores calorie target) ──
function goals() {
  try { return JSON.parse(localStorage.getItem('ft_goals')) || { kcal: 2200, carbs: 250, protein: 150, fat: 70 }; }
  catch { return { kcal: 2200, carbs: 250, protein: 150, fat: 70 }; }
}
function saveGoals(g) { localStorage.setItem('ft_goals', JSON.stringify(g)); }

// ─── Server helpers ───────────────────────────────────────────────
async function fetchMeals(date) {
  const res  = await fetch(`/api/meals?date=${date}`);
  const data = await res.json();
  if (!data.success) throw new Error(data.message);
  return data.meals;
}

async function apiAddMeal(payload) {
  const res  = await fetch('/api/meals', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.message);
}

async function apiUpdateMeal(id, payload) {
  const res  = await fetch(`/api/meals/${id}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.message);
}

async function apiDeleteMeal(id) {
  const res  = await fetch(`/api/meals/${id}`, { method: 'DELETE' });
  const data = await res.json();
  if (!data.success) throw new Error(data.message);
}

// ─── Render meals ─────────────────────────────────────────────────
function renderMeals() {
  ['breakfast', 'lunch', 'dinner', 'snacks'].forEach(type => {
    const ul = document.getElementById('list-' + type);
    ul.innerHTML = '';

    allMeals
      .filter(m => (m.meal_type || 'other') === type)
      .forEach(m => {
        const li = document.createElement('li');
        li.className = 'item';
        li.innerHTML =
          `<div class="meta"><strong>${m.meal_name}</strong> ` +
          `<span>${Math.round(m.calories)} kcal</span> ` +
          `<span>C:${(+m.carbs).toFixed(1)}g</span> ` +
          `<span>P:${(+m.protein).toFixed(1)}g</span> ` +
          `<span>F:${(+m.fats).toFixed(1)}g</span></div>` +
          `<div class="actions">` +
          `<button class="icon-btn" data-a="e" data-id="${m.id}">✎</button>` +
          `<button class="icon-btn" data-a="d" data-id="${m.id}">🗑</button>` +
          `</div>`;
        ul.appendChild(li);
      });

    ul.onclick = async (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      const id = parseInt(btn.dataset.id);
      if (btn.dataset.a === 'd') {
        try { await apiDeleteMeal(id); refresh(); }
        catch (err) { alert('Could not delete meal: ' + err.message); }
      }
      if (btn.dataset.a === 'e') {
        const meal = allMeals.find(m => m.id === id);
        if (meal) openModal(meal);
      }
    };
  });
}

// ─── Totals + chart ───────────────────────────────────────────────
let chart;

function draw() {
  const g = goals();
  const s = allMeals.reduce((acc, m) => ({
    kcal:    acc.kcal    + +(m.calories || 0),
    carbs:   acc.carbs   + +(m.carbs    || 0),
    protein: acc.protein + +(m.protein  || 0),
    fat:     acc.fat     + +(m.fats     || 0)
  }), { kcal: 0, carbs: 0, protein: 0, fat: 0 });

  document.getElementById('kcal-total').textContent    = Math.round(s.kcal);
  document.getElementById('carb-total').textContent    = s.carbs.toFixed(1);
  document.getElementById('protein-total').textContent = s.protein.toFixed(1);
  document.getElementById('fat-total').textContent     = s.fat.toFixed(1);

  const pct = (v, t) => Math.min(100, t ? Math.round(v / t * 100) : 0);
  document.getElementById('kcal-bar').style.width    = pct(s.kcal,    g.kcal)    + '%';
  document.getElementById('carb-bar').style.width    = pct(s.carbs,   g.carbs)   + '%';
  document.getElementById('protein-bar').style.width = pct(s.protein, g.protein) + '%';
  document.getElementById('fat-bar').style.width     = pct(s.fat,     g.fat)     + '%';

  document.getElementById('kcal-remaining').textContent    = Math.max(0, g.kcal    - s.kcal).toFixed(0)    + ' kcal remaining';
  document.getElementById('carb-remaining').textContent    = Math.max(0, g.carbs   - s.carbs).toFixed(1)   + ' g remaining';
  document.getElementById('protein-remaining').textContent = Math.max(0, g.protein - s.protein).toFixed(1) + ' g remaining';
  document.getElementById('fat-remaining').textContent     = Math.max(0, g.fat     - s.fat).toFixed(1)     + ' g remaining';

  // Pre-fill goal inputs from saved goals
  document.getElementById('goal-kcal').value    = g.kcal;
  document.getElementById('goal-carbs').value   = g.carbs;
  document.getElementById('goal-protein').value = g.protein;
  document.getElementById('goal-fat').value     = g.fat;

  const ctx = document.getElementById('macroChart');
  if (chart) chart.destroy();
  chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Calories', 'Carbs (g)', 'Protein (g)', 'Fat (g)'],
      datasets: [
        { label: 'Consumed', data: [Math.round(s.kcal), +s.carbs.toFixed(1), +s.protein.toFixed(1), +s.fat.toFixed(1)], backgroundColor: 'rgba(105,5,0,0.75)' },
        { label: 'Goal',     data: [g.kcal, g.carbs, g.protein, g.fat], backgroundColor: 'rgba(105,5,0,0.2)' }
      ]
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'bottom' } },
      scales: { y: { beginAtZero: true } }
    }
  });
}

async function refresh() {
  try {
    allMeals = await fetchMeals(di.value || todayISO());
  } catch (e) {
    console.error('Failed to load meals:', e);
    allMeals = [];
  }
  renderMeals();
  draw();
}

// ─── Modal ────────────────────────────────────────────────────────
const modal    = document.getElementById('modal');
const foodForm = document.getElementById('food-form');

document.getElementById('modal-close').onclick = closeModal;
document.getElementById('cancel-food').onclick  = closeModal;

function openModal(item = {}) {
  editingId = item.id || null;
  modal.style.display = 'flex';
  document.getElementById('edit-id').value      = item.id       || '';
  document.getElementById('food-name').value    = item.meal_name || '';
  document.getElementById('food-meal').value    = item.meal_type || 'breakfast';
  document.getElementById('food-kcal').value    = item.calories  || '';
  document.getElementById('food-carbs').value   = item.carbs     || '';
  document.getElementById('food-protein').value = item.protein   || '';
  document.getElementById('food-fat').value     = item.fats      || '';
}

function closeModal() {
  modal.style.display = 'none';
  editingId = null;
  foodForm.reset();
}

foodForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const payload = {
    meal_name: document.getElementById('food-name').value.trim(),
    meal_type: document.getElementById('food-meal').value,
    calories:  Number(document.getElementById('food-kcal').value),
    carbs:     Number(document.getElementById('food-carbs').value),
    protein:   Number(document.getElementById('food-protein').value),
    fats:      Number(document.getElementById('food-fat').value)
  };
  try {
    if (editingId) {
      await apiUpdateMeal(editingId, payload);
    } else {
      await apiAddMeal(payload);
    }
    closeModal();
    refresh();
  } catch (err) {
    alert('Could not save meal: ' + err.message);
  }
});

// ─── Add-meal buttons ─────────────────────────────────────────────
document.querySelectorAll('.add-btn').forEach(btn => {
  btn.onclick = () => openModal({ meal_type: btn.dataset.meal });
});

// ─── Goals form ───────────────────────────────────────────────────
document.getElementById('goals-form').addEventListener('submit', (e) => {
  e.preventDefault();
  saveGoals({
    kcal:    Number(document.getElementById('goal-kcal').value),
    carbs:   Number(document.getElementById('goal-carbs').value),
    protein: Number(document.getElementById('goal-protein').value),
    fat:     Number(document.getElementById('goal-fat').value)
  });
  draw();
  alert('Goals saved!');
});

// ─── BMI / Target Calculator ──────────────────────────────────────
document.getElementById('bmi-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const h      = parseFloat(document.getElementById('height').value);
  const w      = parseFloat(document.getElementById('weight').value);
  const tw     = parseFloat(document.getElementById('target-weight').value);
  const act    = parseFloat(document.getElementById('activity').value);

  if (!h || !w || !tw) return;

  const bmi    = (w / ((h / 100) ** 2)).toFixed(1);
  // BMR using simplified Mifflin-St Jeor (age 30 neutral)
  const bmr    = 10 * tw + 6.25 * h - 5 * 30;
  const tdee   = Math.round(bmr * act);

  const protein = Math.round(tw * 2.0);          // 2g per kg target weight
  const fat     = Math.round(tw * 0.8);          // 0.8g per kg
  const fatKcal = fat * 9;
  const proKcal = protein * 4;
  const carbs   = Math.round((tdee - fatKcal - proKcal) / 4);

  document.getElementById('out-bmi').textContent    = bmi;
  document.getElementById('out-tdee').textContent   = tdee;
  document.getElementById('out-kcal').textContent   = tdee;
  document.getElementById('out-protein').textContent = protein;
  document.getElementById('out-carbs').textContent  = Math.max(0, carbs);
  document.getElementById('out-fat').textContent    = fat;
  document.getElementById('bmi-results').hidden     = false;

  bmiTargets = { kcal: tdee, carbs: Math.max(0, carbs), protein, fat };
});

document.getElementById('apply-targets').addEventListener('click', () => {
  if (!bmiTargets) { alert('Calculate your targets first.'); return; }
  saveGoals(bmiTargets);
  draw();
  alert('Targets applied to your goals!');
});

// ─── Logout ───────────────────────────────────────────────────────
document.getElementById('logout').addEventListener('click', async (e) => {
  e.preventDefault();
  localStorage.removeItem('ft_token');
  await fetch('/logout', { method: 'POST' }).catch(() => {});
  window.location.href = '/login.html';
});

// ─── Init ─────────────────────────────────────────────────────────
refresh();
