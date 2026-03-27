document.addEventListener("DOMContentLoaded", () => {

const $ = s => document.querySelector(s);

// ---------------- STORAGE ----------------
function getMeals(){
  return JSON.parse(localStorage.getItem('meals')) || [];
}

function saveMeals(m){
  localStorage.setItem('meals', JSON.stringify(m));
}

// ---------------- ADD MEAL ----------------
$('#add-meal').onclick = () => {
  const name = $('#food-name').value;

  if(!name){
    alert("Enter food");
    return;
  }

  const meal = {
    type: $('#meal-type').value,
    name,
    kcal: +$('#food-kcal').value || 0,
    carbs: +$('#food-carbs').value || 0,
    protein: +$('#food-protein').value || 0,
    fat: +$('#food-fat').value || 0
  };

  const meals = getMeals();
  meals.push(meal);
  saveMeals(meals);

  clearInputs();
  renderMeals();
  updateTotals();
};

// ---------------- RESET ----------------
$('#reset-meal').onclick = clearInputs;

function clearInputs(){
  $('#food-name').value = '';
  $('#food-kcal').value = '';
  $('#food-carbs').value = '';
  $('#food-protein').value = '';
  $('#food-fat').value = '';
}

// ---------------- CLEAR ALL ----------------
$('#clear-all').onclick = () => {
  if(confirm("Clear all meals?")){
    localStorage.removeItem('meals');
    renderMeals();
    updateTotals();
  }
};

// ---------------- RENDER ----------------
function renderMeals(){
  const container = $('#meal-list');
  container.innerHTML = '';

  const grouped = {
    breakfast: [],
    lunch: [],
    dinner: [],
    snacks: []
  };

  getMeals().forEach(m => grouped[m.type].push(m));

  for(let t in grouped){

    if(grouped[t].length === 0) continue;

    const section = document.createElement('div');

    section.innerHTML = `<h4>${t.charAt(0).toUpperCase() + t.slice(1)}</h4>`;

    grouped[t].forEach(m => {
      section.innerHTML += `
        <div class="meal-item">
          <strong>${m.name}</strong>
          <div class="macro-line">
            ${m.kcal} kcal | C: ${m.carbs}g | P: ${m.protein}g | F: ${m.fat}g
          </div>
        </div>
      `;
    });

    container.appendChild(section);
  }
}

// ---------------- TOTALS ----------------
function updateTotals(){
  let k = 0, c = 0, p = 0, f = 0;

  getMeals().forEach(m => {
    k += m.kcal;
    c += m.carbs;
    p += m.protein;
    f += m.fat;
  });

  $('#kcal-total').textContent = k + " kcal";
  $('#carb-total').textContent = c + " g";
  $('#protein-total').textContent = p + " g";
  $('#fat-total').textContent = f + " g";

  updateChart(k, c, p, f);
}

// ---------------- CHART ----------------
let chart;

function updateChart(k, c, p, f){
  const ctx = document.getElementById('macroChart');
  if(!ctx) return;

  const gk = +$('#goal-kcal').value || 0;
  const gc = +$('#goal-carbs').value || 0;
  const gp = +$('#goal-protein').value || 0;
  const gf = +$('#goal-fat').value || 0;

  if(chart) chart.destroy();

  chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Calories','Carbs','Protein','Fat'],
      datasets: [
        {
          label: 'Consumed',
          data: [k,c,p,f],
          backgroundColor: '#690500'
        },
        {
          label: 'Required',
          data: [gk,gc,gp,gf],
          backgroundColor: '#aaa'
        }
      ]
    }
  });
}

// ---------------- TARGET CALCULATOR ----------------

$('#calculate-target').onclick = () => {

  const h = +$('#height').value;
  const w = +$('#current-weight').value;
  const t = +$('#target-weight').value;
  const a = +$('#activity').value;

  if(!h || !w || !t){
    alert("Fill all fields");
    return;
  }

  // BMR + TDEE
  const bmr = 10*w + 6.25*h - 5*25 + 5;
  const tdee = bmr * a;

  // Calories goal
  const kcal = t < w ? tdee - 500 : tdee + 300;

  // ✅ MACROS
  const protein = t * 2;
  const fat = t * 0.8;

  const usedCalories = (protein * 4) + (fat * 9);
  const carbs = (kcal - usedCalories) / 4;

  // OUTPUT
  $('#out-kcal').textContent = Math.round(kcal);
  $('#out-protein').textContent = Math.round(protein);
  $('#out-carbs').textContent = Math.round(carbs);
  $('#out-fat').textContent = Math.round(fat);
};

$('#apply-targets').onclick = () => {

  const kcal = $('#out-kcal').textContent;
  const protein = $('#out-protein').textContent;
  const carbs = $('#out-carbs').textContent;
  const fat = $('#out-fat').textContent;

  if(!kcal){
    alert("Calculate first");
    return;
  }

  $('#goal-kcal').value = kcal;
  $('#goal-protein').value = protein;
  $('#goal-carbs').value = carbs;
  $('#goal-fat').value = fat;

  updateTotals();
};

// ---------------- LIVE GOAL UPDATE ----------------
$('#goals-form').addEventListener('input', updateTotals);

// ---------------- INIT ----------------
renderMeals();
updateTotals();

});