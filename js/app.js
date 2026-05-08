/* ═══════════════════════════════════════════════════
   FitTracker — Full SQLite API client
   All data persisted via Express + SQLite backend
═══════════════════════════════════════════════════ */

/* ── SESSION ─────────────────────────────────────── */
function getSession()  { try { return JSON.parse(localStorage.getItem('ft_session')||'null'); } catch(e) { return null; } }
function setSession(d) { localStorage.setItem('ft_session', JSON.stringify(d)); }
function clearSession(){ localStorage.removeItem('ft_session'); }

/* ── API HELPER ──────────────────────────────────── */
async function api(method, path, body) {
  try {
    const opts = { method, headers:{'Content-Type':'application/json'}, credentials:'same-origin' };
    if (body) opts.body = JSON.stringify(body);
    const r = await fetch(path, opts);
    return await r.json();
  } catch(e) { console.error('API:', e); return {status:'error'}; }
}

/* ── TOAST ───────────────────────────────────────── */
var _tt = null;
function toast(m) {
  var el = document.getElementById('toast');
  el.textContent = m; el.classList.add('show');
  if (_tt) clearTimeout(_tt);
  _tt = setTimeout(() => el.classList.remove('show'), 2600);
}

/* ── MODALS ──────────────────────────────────────── */
function openMo(id)  { document.getElementById(id).classList.add('show');    }
function closeMo(id) { document.getElementById(id).classList.remove('show'); }
document.addEventListener('click', e => {
  if (e.target.classList.contains('mo')) e.target.classList.remove('show');
});

/* ── PAGE ROUTER ─────────────────────────────────── */
var PROTECTED = ['home','dashboard','tracker','workout','workout-detail','profile','admin'];

function showPage(id) {
  var s = getSession();
  if (PROTECTED.indexOf(id) >= 0 && !s) { showPage('login'); return; }

  document.querySelectorAll('.page').forEach(p => { p.classList.remove('active'); p.style.display='none'; });
  var el = document.getElementById('page-'+id);
  if (!el) { console.warn('No page: page-'+id); return; }
  el.style.display = (id==='signup') ? 'flex' : 'block';
  el.classList.add('active');
  el.scrollTop = 0;

  if (id==='dashboard')    initDash();
  if (id==='tracker')      initTracker();
  if (id==='profile')      initProfile();
  if (id==='admin')        initAdmin();
  if (id==='workout-detail') { /* handled by showWorkout() */ }
}

/* ── AUTH ────────────────────────────────────────── */
function togglePwd(id, btn) {
  var inp = document.getElementById(id);
  inp.type = inp.type==='password' ? 'text' : 'password';
  btn.textContent = inp.type==='password' ? 'Show' : 'Hide';
}

async function doLogin() {
  var email = document.getElementById('li-email').value.trim();
  var pass  = document.getElementById('li-pass').value.trim();
  var err   = document.getElementById('li-err');
  err.textContent = '';
  if (!email||!pass) { err.textContent='Please enter email and password.'; return; }
  var btn = document.querySelector('#page-login .btn-main');
  btn.textContent='Logging in...'; btn.disabled=true;
  var d = await api('POST','/api/login',{email,password:pass});
  btn.textContent='Log In'; btn.disabled=false;
  if (d.status!=='ok') { err.textContent=d.message||'Invalid email or password.'; return; }
  setSession({userId:d.user.id, name:d.user.name, email:d.user.email});
  showPage('home');
  toast('Welcome back, '+d.user.name+'!');
}

async function doSignup() {
  var name  = document.getElementById('su-name').value.trim();
  var email = document.getElementById('su-email').value.trim();
  var pass  = document.getElementById('su-pass').value.trim();
  var conf  = document.getElementById('su-conf').value.trim();
  var terms = document.getElementById('su-terms').checked;
  var ne=document.getElementById('su-ne'), ee=document.getElementById('su-ee'),
      pe=document.getElementById('su-pe'), ce=document.getElementById('su-ce'),
      te=document.getElementById('su-te');
  ne.textContent=ee.textContent=pe.textContent=ce.textContent=te.textContent='';
  var ok=true;
  if(!name)                              { ne.textContent='Full name is required.'; ok=false; }
  if(!email||!/\S+@\S+\.\S+/.test(email)){ ee.textContent='Enter a valid email.'; ok=false; }
  if(!pass||pass.length<6)               { pe.textContent='Password must be at least 6 characters.'; ok=false; }
  if(pass!==conf)                        { ce.textContent='Passwords do not match.'; ok=false; }
  if(!terms)                             { te.textContent='You must agree to the terms.'; ok=false; }
  if(!ok) return;
  var btn = document.querySelector('#page-signup .btn-main');
  btn.textContent='Creating...'; btn.disabled=true;
  var d = await api('POST','/api/register',{name,email,password:pass});
  btn.textContent='Create Account'; btn.disabled=false;
  if (d.status!=='ok') { ee.textContent=d.message||'Registration failed.'; return; }
  var ld = await api('POST','/api/login',{email,password:pass});
  if (ld.status==='ok') {
    setSession({userId:ld.user.id, name:ld.user.name, email:ld.user.email});
    showPage('home'); toast('Account created! Welcome, '+name+'!');
  }
}

function doLogout() {
  api('POST','/api/logout');
  clearSession(); showPage('login'); toast('Logged out. See you soon!');
}

/* ── DASHBOARD ───────────────────────────────────── */
var dChart = null;

async function initDash() {
  var s = getSession(); if (!s) return;
  document.getElementById('d-uname').textContent = s.name;
  var today = todayISO();

  var [stats, meals, user] = await Promise.all([
    api('GET', `/api/daily/${s.userId}/${today}`),
    api('GET', `/api/meals/${s.userId}/${today}`),
    api('GET', `/api/user/${s.userId}`)
  ]);

  // Daily stats
  document.getElementById('d-workout').textContent = (stats.workout_mins||0)+' mins';
  document.getElementById('d-steps').textContent   = Number(stats.steps||0).toLocaleString();
  document.getElementById('d-water').textContent   = (stats.water||0)+' L';
  document.getElementById('di-wo').value = stats.workout_mins||0;
  document.getElementById('di-st').value = stats.steps||0;
  document.getElementById('di-wa').value = stats.water||0;

  // Calories
  var tKcal = meals.reduce((a,x)=>a+(+x.kcal||0), 0);
  document.getElementById('d-kcal').textContent = tKcal+' kcal';

  // Goal progress
  var calGoal = user.cal_goal||2200;
  var pct = Math.min(100, calGoal ? Math.round(tKcal/calGoal*100) : 0);
  document.getElementById('d-gpct').textContent = pct+'%';
  document.getElementById('d-gtxt').textContent = tKcal+' / '+calGoal+' kcal';
  document.getElementById('d-gbar').style.width = pct+'%';

  // Weight
  var w = user.weight||72, t = user.target_weight||68;
  document.getElementById('d-cw').textContent = w+' kg';
  document.getElementById('d-tw').textContent = t+' kg';
  var diff = (w-t).toFixed(1);
  document.getElementById('d-wst').textContent = diff>0 ? diff+' kg to go' : diff<0 ? 'Exceeded target!' : 'Target reached! 🎉';

  // Chart
  var tot = meals.reduce((a,x)=>({carbs:a.carbs+(+x.carbs||0),prot:a.prot+(+x.prot||0),fat:a.fat+(+x.fat||0)}),{carbs:0,prot:0,fat:0});
  if (dChart) dChart.destroy();
  dChart = new Chart(document.getElementById('dash-chart'), {
    type:'bar',
    data:{labels:['Calories','Carbs','Protein','Fat'],
      datasets:[
        {label:'Consumed',data:[tKcal,tot.carbs,tot.prot,tot.fat],backgroundColor:'rgba(105,5,0,.75)'},
        {label:'Goal',data:[calGoal,user.carb_goal||250,user.prot_goal||150,user.fat_goal||70],backgroundColor:'rgba(105,5,0,.2)'}
      ]},
    options:{responsive:true,plugins:{legend:{position:'bottom'}},scales:{y:{beginAtZero:true}}}
  });

  // Activity
  var acts = [
    meals.length ? 'Meals logged: '+meals.length+' ('+tKcal+' kcal)' : 'No meals logged yet',
    (stats.workout_mins||0)>0 ? (stats.workout_mins)+' mins workout logged' : 'No workout updated yet',
    (stats.water||0)>0 ? (stats.water)+' L water intake' : 'No water intake updated yet',
    (stats.steps||0)>0 ? Number(stats.steps).toLocaleString()+' steps today' : 'No step count updated yet'
  ];
  document.getElementById('d-act').innerHTML = acts.map(a=>'<li>'+a+'</li>').join('');
}

async function saveDailyData() {
  var s = getSession(); if (!s) return;
  await api('POST','/api/daily',{
    user_id:s.userId, date:todayISO(),
    workout_mins:+document.getElementById('di-wo').value||0,
    steps:+document.getElementById('di-st').value||0,
    water:+document.getElementById('di-wa').value||0
  });
  initDash(); toast('Daily data saved!');
}

async function loadWtModal() {
  var s = getSession(); if (!s) return;
  var u = await api('GET',`/api/user/${s.userId}`);
  document.getElementById('wt-cur').value = u.weight||72;
  document.getElementById('wt-tgt').value = u.target_weight||68;
}
async function saveWeight() {
  var s = getSession(); if (!s) return;
  var weight = +document.getElementById('wt-cur').value||72;
  var target_weight = +document.getElementById('wt-tgt').value||68;
  await api('POST','/api/weight',{user_id:s.userId,weight,target_weight});
  closeMo('mo-wt'); initDash(); toast('Weight updated!');
}

/* ── TRACKER ─────────────────────────────────────── */
var mChart = null;
var _dayMeals = [];

function todayISO() { return new Date().toISOString().slice(0,10); }
function curDate()  { return document.getElementById('log-date').value || todayISO(); }

function shiftDay(n) {
  var d = new Date(curDate()); d.setDate(d.getDate()+n);
  document.getElementById('log-date').value = d.toISOString().slice(0,10);
  refreshTracker();
}

async function initTracker() {
  if (!document.getElementById('log-date').value)
    document.getElementById('log-date').value = todayISO();
  var s = getSession(); if (!s) return;
  var u = await api('GET',`/api/user/${s.userId}`);
  document.getElementById('g-kcal').value  = u.cal_goal||2200;
  document.getElementById('g-carbs').value = u.carb_goal||250;
  document.getElementById('g-prot').value  = u.prot_goal||150;
  document.getElementById('g-fat').value   = u.fat_goal||70;
  refreshTracker();
}

async function refreshTracker() {
  var d=curDate(), today=todayISO();
  var yst = new Date(Date.now()-86400000).toISOString().slice(0,10);
  document.getElementById('day-lbl').textContent =
    d===today ? 'Today' : d===yst ? 'Yesterday' :
    new Date(d+'T12:00:00').toLocaleDateString('en-AU',{weekday:'long',day:'numeric',month:'short'});
  var s = getSession(); if (!s) return;
  _dayMeals = await api('GET',`/api/meals/${s.userId}/${d}`);
  renderMeals();
  drawMacros();
}

function renderMeals() {
  ['breakfast','lunch','dinner','snacks'].forEach(m => {
    var ul = document.getElementById('ml-'+m); ul.innerHTML='';
    (_dayMeals||[]).filter(x=>x.meal_type===m).forEach(it => {
      var li = document.createElement('li'); li.className='mi';
      li.innerHTML = '<div class="mi-info"><strong>'+esc(it.name)+'</strong>'
        +'<span>'+it.kcal+' kcal &middot; C:'+it.carbs+'g &middot; P:'+it.prot+'g &middot; F:'+it.fat+'g</span></div>'
        +'<div class="mi-btns">'
        +'<button class="ico" onclick="editFood('+it.id+')">✎</button>'
        +'<button class="ico" onclick="delFood('+it.id+')">🗑</button></div>';
      ul.appendChild(li);
    });
  });
}

async function drawMacros() {
  var s = getSession(); if (!s) return;
  var u = await api('GET',`/api/user/${s.userId}`);
  var g = {kcal:u.cal_goal||2200, carbs:u.carb_goal||250, prot:u.prot_goal||150, fat:u.fat_goal||70};
  var meals = _dayMeals||[];
  var sm = meals.reduce((a,x)=>({kcal:a.kcal+(+x.kcal||0),carbs:a.carbs+(+x.carbs||0),prot:a.prot+(+x.prot||0),fat:a.fat+(+x.fat||0)}),{kcal:0,carbs:0,prot:0,fat:0});
  document.getElementById('t-kcal').textContent  = sm.kcal;
  document.getElementById('t-carbs').textContent = sm.carbs.toFixed(1);
  document.getElementById('t-prot').textContent  = sm.prot.toFixed(1);
  document.getElementById('t-fat').textContent   = sm.fat.toFixed(1);
  function p(v,t){return Math.min(100,t?Math.round(v/t*100):0)+'%';}
  document.getElementById('t-kb').style.width  = p(sm.kcal,g.kcal);
  document.getElementById('t-cbb').style.width = p(sm.carbs,g.carbs);
  document.getElementById('t-pbb').style.width = p(sm.prot,g.prot);
  document.getElementById('t-fbb').style.width = p(sm.fat,g.fat);
  document.getElementById('t-kr').textContent  = Math.max(0,g.kcal-sm.kcal)+' kcal remaining';
  document.getElementById('t-cbr').textContent = Math.max(0,g.carbs-sm.carbs).toFixed(1)+'g remaining';
  document.getElementById('t-pbr').textContent = Math.max(0,g.prot-sm.prot).toFixed(1)+'g remaining';
  document.getElementById('t-fbr').textContent = Math.max(0,g.fat-sm.fat).toFixed(1)+'g remaining';
  if (mChart) mChart.destroy();
  mChart = new Chart(document.getElementById('macro-chart'),{
    type:'bar',
    data:{labels:['Calories','Carbs (g)','Protein (g)','Fat (g)'],
      datasets:[
        {label:'Consumed',data:[sm.kcal,sm.carbs,sm.prot,sm.fat],backgroundColor:'rgba(105,5,0,.75)'},
        {label:'Goal',   data:[g.kcal,g.carbs,g.prot,g.fat],    backgroundColor:'rgba(105,5,0,.2)'}
      ]},
    options:{responsive:true,plugins:{legend:{position:'bottom'}},scales:{y:{beginAtZero:true}}}
  });
}

async function saveGoals() {
  var s = getSession(); if (!s) return;
  var u = await api('GET',`/api/user/${s.userId}`);
  u.cal_goal  = +document.getElementById('g-kcal').value||2200;
  u.carb_goal = +document.getElementById('g-carbs').value||250;
  u.prot_goal = +document.getElementById('g-prot').value||150;
  u.fat_goal  = +document.getElementById('g-fat').value||70;
  await api('PUT',`/api/user/${s.userId}`,u);
  drawMacros(); toast('Goals saved!');
}

var _bmiT = null;
function calcBMI() {
  var h=+document.getElementById('b-h').value, w=+document.getElementById('b-w').value,
      t=+document.getElementById('b-t').value, a=+document.getElementById('b-act').value;
  if(!h||!w||!t){toast('Please fill all BMI fields');return;}
  var bmi=w/((h/100)*(h/100)), bmr=10*t+6.25*h-5*25, tdee=bmr*a;
  var deficit=w>t?-500:w<t?500:0, kcal=Math.round(tdee+deficit);
  var prot=Math.round(t*1.8), fat=Math.round(kcal*0.25/9), carbs=Math.round((kcal-prot*4-fat*9)/4);
  document.getElementById('r-bmi').textContent=bmi.toFixed(1);
  document.getElementById('r-tdee').textContent=Math.round(tdee);
  document.getElementById('r-kcal').textContent=kcal;
  document.getElementById('r-prot').textContent=prot;
  document.getElementById('r-carbs').textContent=carbs;
  document.getElementById('r-fat').textContent=fat;
  document.getElementById('bmi-res').style.display='block';
  document.getElementById('apply-btn').style.display='inline-block';
  _bmiT={kcal,carbs,prot,fat};
}
function applyTargets() {
  if(!_bmiT)return;
  document.getElementById('g-kcal').value=_bmiT.kcal;
  document.getElementById('g-carbs').value=_bmiT.carbs;
  document.getElementById('g-prot').value=_bmiT.prot;
  document.getElementById('g-fat').value=_bmiT.fat;
  saveGoals(); toast('Targets applied!');
}

// Food modal
var _editFoodId = null;
function openFoodModal(meal, item) {
  _editFoodId = item ? item.id : null;
  document.getElementById('food-title').textContent = item ? 'Edit Food' : 'Add Food';
  document.getElementById('food-eid').value   = item ? item.id : '';
  document.getElementById('food-name').value  = item ? item.name : '';
  document.getElementById('food-meal').value  = item ? item.meal_type : (meal||'breakfast');
  document.getElementById('food-kcal').value  = item ? item.kcal : '';
  document.getElementById('food-carbs').value = item ? item.carbs : '';
  document.getElementById('food-prot').value  = item ? item.prot : '';
  document.getElementById('food-fat').value   = item ? item.fat : '';
  document.getElementById('food-err').textContent = '';
  openMo('mo-food');
}
async function editFood(id) {
  var it = (_dayMeals||[]).find(m=>m.id==id);
  if (it) openFoodModal(it.meal_type, it);
}
async function saveFood() {
  var s = getSession(); if (!s) return;
  var name      = document.getElementById('food-name').value.trim();
  var meal_type = document.getElementById('food-meal').value;
  var kcal      = +document.getElementById('food-kcal').value||0;
  var carbs     = +document.getElementById('food-carbs').value||0;
  var prot      = +document.getElementById('food-prot').value||0;
  var fat       = +document.getElementById('food-fat').value||0;
  if (!name||!kcal) { document.getElementById('food-err').textContent='Name and calories are required.'; return; }
  var eid = document.getElementById('food-eid').value;
  if (eid) {
    await api('PUT',`/api/meals/${eid}`,{meal_type,name,kcal,carbs,prot,fat});
    toast('Food updated!');
  } else {
    await api('POST','/api/meals',{user_id:s.userId,date:curDate(),meal_type,name,kcal,carbs,prot,fat});
    toast('Food added!');
  }
  closeMo('mo-food'); await refreshTracker();
}
async function delFood(id) {
  await api('DELETE',`/api/meals/${id}`);
  await refreshTracker(); toast('Removed.');
}

/* ── WORKOUTS ────────────────────────────────────── */
var PLANS = {
  general:{title:'General Fitness',color:'#145a32',days:[
    {t:'Day 1 - Light Cardio',      e:'Running',  ex:['Brisk Walking','Jumping Jacks','Light Jogging']},
    {t:'Day 2 - Full Body Basics',  e:'Weights',  ex:['Bodyweight Squats','Wall Push-Ups','Lunges']},
    {t:'Day 3 - Flexibility',       e:'Yoga',     ex:['Hamstring Stretch','Shoulder Stretch','Child Pose']},
    {t:'Day 4 - Core & Stability',  e:'Core',     ex:['Bird Dog','Glute Bridge','Side Plank']},
    {t:'Day 5 - Active Recovery',   e:'Cycle',    ex:['Walking','Light Cycling','Deep Breathing']}
  ]},
  weightloss:{title:'Weight Loss',color:'#154360',days:[
    {t:'Day 1 - Cardio & Core',     e:'Cardio',   ex:['Jump Rope','Mountain Climbers','Plank']},
    {t:'Day 2 - Lower Body',        e:'Legs',     ex:['Squats','Lunges','Step-Ups']},
    {t:'Day 3 - HIIT Training',     e:'HIIT',     ex:['Burpees','High Knees','Jump Squats']},
    {t:'Day 4 - Upper Body',        e:'Upper',    ex:['Push-Ups','Bicycle Crunches','Russian Twists']},
    {t:'Day 5 - Full Body',         e:'Full',     ex:['Jumping Jacks','Bodyweight Squats','Plank Shoulder Taps']}
  ]},
  muscle:{title:'Muscle Gain',color:'#4a235a',days:[
    {t:'Day 1 - Chest & Triceps',   e:'Chest',    ex:['Bench Press','Incline Dumbbell Press','Triceps Dips']},
    {t:'Day 2 - Back & Biceps',     e:'Back',     ex:['Pull-Ups','Bent Over Rows','Biceps Curl']},
    {t:'Day 3 - Legs',              e:'Legs',     ex:['Squats','Leg Press','Calf Raises']},
    {t:'Day 4 - Shoulders',         e:'Shoulders',ex:['Overhead Press','Lateral Raises','Rear Delt Flys']},
    {t:'Day 5 - Full Body',         e:'Full',     ex:['Deadlift','Pull-Ups','Dumbbell Lunges']}
  ]}
};

var EXERCISE_IMAGES = {
  'Brisk Walking':'/assets/cardio.webp','Jumping Jacks':'/assets/Jumping jacks.webp',
  'Light Jogging':'/assets/cardio.webp','Bodyweight Squats':'/assets/squat.webp',
  'Wall Push-Ups':'/assets/wall pushup.webp','Lunges':'/assets/leg.webp',
  'Hamstring Stretch':'/assets/cardio.webp','Shoulder Stretch':'/assets/shoulder.webp',
  'Child Pose':'/assets/Child pose.webp','Bird Dog':'/assets/cardio.webp',
  'Glute Bridge':'/assets/leg.webp','Side Plank':'/assets/side plank 1.webp',
  'Walking':'/assets/cardio.webp','Light Cycling':'/assets/cycling.webp',
  'Deep Breathing':'/assets/cardio.webp','Jump Rope':'/assets/cardio.webp',
  'Mountain Climbers':'/assets/cardio.webp','Plank':'/assets/Plank shoulder.webp',
  'Squats':'/assets/squat.webp','Step-Ups':'/assets/leg.webp',
  'Burpees':'/assets/cardio.webp','High Knees':'/assets/cardio.webp',
  'Jump Squats':'/assets/jump squat.webp','Push-Ups':'/assets/pushup.webp',
  'Bicycle Crunches':'/assets/cardio.webp','Russian Twists':'/assets/cardio.webp',
  'Plank Shoulder Taps':'/assets/Plank shoulder.webp',
  'Bench Press':'/assets/pushup.webp','Incline Dumbbell Press':'/assets/pushup.webp',
  'Triceps Dips':'/assets/triceps.webp','Pull-Ups':'/assets/pullups.webp',
  'Bent Over Rows':'/assets/Back.webp','Biceps Curl':'/assets/Back.webp',
  'Leg Press':'/assets/leg.webp','Calf Raises':'/assets/leg.webp',
  'Overhead Press':'/assets/shoulder.webp','Lateral Raises':'/assets/shoulder.webp',
  'Rear Delt Flys':'/assets/shoulder.webp','Deadlift':'/assets/Back.webp',
  'Dumbbell Lunges':'/assets/leg.webp'
};
function exImg(name){ return EXERCISE_IMAGES[name]||'/assets/Workout.webp'; }

var _pk=null, _cex=null, _cdi=null, _adi=null;
var _dbExercises=[], _dbSets={};

async function showWorkout(key) {
  _pk = key;
  var s = getSession(); if (!s) return;
  var plan = PLANS[key];
  document.getElementById('det-title').textContent = plan.title;
  document.getElementById('det-hero').style.background = `linear-gradient(135deg,${plan.color},${plan.color}99)`;

  // Load custom exercises from DB
  var allEx = await api('GET',`/api/exercises/${s.userId}`);
  _dbExercises = allEx;

  var container = document.getElementById('det-days');
  container.innerHTML='';
  plan.days.forEach((day,di) => {
    var extras = allEx.filter(e=>e.plan===key && e.day_index==di).map(e=>e.exercise_name);
    var allExercises = day.ex.concat(extras);
    var sec = document.createElement('div'); sec.className='ws';
    var firstImg = exImg(day.ex[0]);
    var exHtml = allExercises.map(ex =>
      `<button class="ex-btn" onclick="openExModal('${ex.replace(/'/g,"\\'")}',${di})">${ex}</button>`
    ).join('');
    sec.innerHTML = `<div class="ws-title">${day.t}</div>`
      +`<div class="ws-body"><div class="ex-list">${exHtml}</div>`
      +`<div class="ws-side">`
      +`<img src="${firstImg}" id="ws-img-${di}" style="width:130px;height:110px;object-fit:cover;border-radius:8px;border:1px solid #ccc;display:block;margin:0 auto 8px">`
      +`<button class="add-ex-btn" onclick="openAddExModal(${di},'${day.t.replace(/'/g,"\\'")}')">+ Add Exercise</button></div></div>`;
    container.appendChild(sec);
  });
  showPage('workout-detail');
}

async function openExModal(name, di) {
  _cex=name; _cdi=di;
  document.getElementById('ex-title').textContent = name;
  // Update side image
  document.querySelectorAll('[id^="ws-img-"]').forEach(img=>{ img.src=exImg(name); });
  document.getElementById('ex-w').value='';
  document.getElementById('ex-r').value='';
  document.getElementById('ex-s').value='';
  await renderSets();
  openMo('mo-ex');
}
function doneEx(){ closeMo('mo-ex'); if(_pk) showWorkout(_pk); }

async function getSetsFromDB() {
  var s = getSession(); if (!s) return [];
  var rows = await api('GET',`/api/sets/${s.userId}/${_pk}/${_cdi}`);
  return (rows||[]).filter(r=>r.exercise_name===_cex);
}
async function renderSets() {
  var sets = await getSetsFromDB();
  var ul = document.getElementById('ex-list');
  if (!sets.length) { ul.innerHTML='<p style="color:var(--muted);font-size:13px;margin-top:6px">No sets logged yet.</p>'; return; }
  ul.innerHTML = sets.map((s,i)=>
    `<div class="set-item"><span>${i+1}. ${s.weight_kg}kg × ${s.reps} reps × ${s.sets} sets</span>`
    +`<button class="set-del" onclick="delSet(${s.id})">×</button></div>`
  ).join('');
}
async function addSet() {
  var s = getSession(); if (!s) return;
  var w=document.getElementById('ex-w').value, r=document.getElementById('ex-r').value, sv=document.getElementById('ex-s').value;
  if(!w||!r||!sv){toast('Fill weight, reps and sets');return;}
  await api('POST','/api/sets',{user_id:s.userId,plan:_pk,day_index:_cdi,exercise_name:_cex,weight_kg:+w,reps:+r,sets:+sv});
  document.getElementById('ex-w').value=''; document.getElementById('ex-r').value=''; document.getElementById('ex-s').value='';
  await renderSets(); toast('Set logged!');
}
async function delSet(id) {
  await api('DELETE',`/api/sets/${id}`);
  await renderSets();
}
async function clearSets() {
  var sets = await getSetsFromDB();
  await Promise.all(sets.map(s=>api('DELETE',`/api/sets/${s.id}`)));
  await renderSets(); toast('Sets cleared.');
}

function openAddExModal(di,t) {
  _adi=di;
  document.getElementById('addex-title').textContent='Add Exercise';
  document.getElementById('new-ex').value='';
  openMo('mo-addex');
}
async function confirmAddEx() {
  var s = getSession(); if (!s) return;
  var name = document.getElementById('new-ex').value.trim();
  if(!name){toast('Enter exercise name');return;}
  await api('POST','/api/exercises',{user_id:s.userId,plan:_pk,day_index:_adi,exercise_name:name});
  closeMo('mo-addex'); showWorkout(_pk); toast('Exercise added!');
}

/* ── PROFILE ─────────────────────────────────────── */
async function initProfile() {
  var s = getSession(); if (!s) return;
  var u = await api('GET',`/api/user/${s.userId}`);
  document.getElementById('p-name-disp').textContent  = u.name||s.name;
  document.getElementById('p-email-disp').textContent = u.email||s.email;
  document.getElementById('p-avatar').textContent     = (u.name||s.name).charAt(0).toUpperCase();
  document.getElementById('p-name').value   = u.name||'';
  document.getElementById('p-email').value  = u.email||'';
  document.getElementById('p-dob').value    = u.dob||'';
  document.getElementById('p-height').value = u.height||'';
  document.getElementById('p-weight').value = u.weight||'';
  document.getElementById('p-target').value = u.target_weight||'';
  document.getElementById('p-goal').value   = u.fitness_goal||'General Fitness';
  // Premium status
  var sub = await api('GET',`/api/subscription/${s.userId}`);
  var freeEl = document.getElementById('premium-status-free');
  var activeEl = document.getElementById('premium-status-active');
  if (sub && sub.is_premium) {
    activeEl.style.display = 'block';
    freeEl.style.display = 'none';
    if (sub.subscription && sub.subscription.next_billing_time) {
      document.getElementById('premium-next-billing').textContent =
        'Next billing: ' + new Date(sub.subscription.next_billing_time).toLocaleDateString();
    }
  } else {
    freeEl.style.display = 'block';
    activeEl.style.display = 'none';
  }
}
async function saveProfile() {
  var s = getSession(); if (!s) return;
  var u = await api('GET',`/api/user/${s.userId}`);
  u.name = document.getElementById('p-name').value.trim()||s.name;
  u.email= document.getElementById('p-email').value.trim()||s.email;
  u.dob  = document.getElementById('p-dob').value;
  await api('PUT',`/api/user/${s.userId}`,u);
  var ns=getSession(); ns.name=u.name; setSession(ns);
  initProfile(); toast('Profile saved!');
}
async function saveMetrics() {
  var s = getSession(); if (!s) return;
  var u = await api('GET',`/api/user/${s.userId}`);
  u.height        = +document.getElementById('p-height').value||0;
  u.weight        = +document.getElementById('p-weight').value||72;
  u.target_weight = +document.getElementById('p-target').value||68;
  u.fitness_goal  = document.getElementById('p-goal').value;
  await api('PUT',`/api/user/${s.userId}`,u);
  toast('Metrics saved!');
}

/* ── ADMIN ───────────────────────────────────────── */
var _adminData = {};
var _adminCharts = {};

function adminTab(name) {
  var tabs=['users','meals','exercises','progress','analytics'];
  document.querySelectorAll('.atab').forEach((t,i)=>t.classList.toggle('active',tabs[i]===name));
  document.querySelectorAll('.apanel').forEach(p=>p.classList.remove('active'));
  document.getElementById('apanel-'+name).classList.add('active');
  if(name==='analytics') renderAdminCharts();
}

async function initAdmin() {
  var [stats,users,meals,exercises,progress] = await Promise.all([
    api('GET','/api/admin/stats'),
    api('GET','/api/admin/users'),
    api('GET','/api/admin/meals'),
    api('GET','/api/admin/exercises'),
    api('GET','/api/admin/progress')
  ]);
  _adminData={stats,users,meals,exercises,progress};
  document.getElementById('as-users').textContent    = stats.users||0;
  document.getElementById('as-meals').textContent    = stats.meals||0;
  document.getElementById('as-exercises').textContent= stats.exercises||0;
  document.getElementById('as-weight').textContent   = stats.weight_entries||0;
  renderAdminUsers(); renderAdminMeals(); renderAdminExercises(); renderAdminProgress();
}

function renderAdminUsers() {
  var q=(document.getElementById('asearch-users').value||'').toLowerCase();
  var rows=(_adminData.users||[]).filter(u=>!q||u.name.toLowerCase().includes(q)||u.email.toLowerCase().includes(q));
  var tbody=document.getElementById('atbody-users');
  if(!rows.length){tbody.innerHTML='<tr><td colspan="8" class="aempty">No users found</td></tr>';return;}
  var GC={'General Fitness':'bg-blue','Weight Loss':'bg-orange','Muscle Gain':'bg-purple','Endurance':'bg-green'};
  tbody.innerHTML=rows.map((u,i)=>`<tr>
    <td><strong>#${u.id}</strong></td>
    <td><strong>${esc(u.name)}</strong></td>
    <td style="color:var(--muted)">${esc(u.email)}</td>
    <td><span class="abadge ${GC[u.fitness_goal]||'bg-blue'}">${esc(u.fitness_goal||'General Fitness')}</span></td>
    <td>${u.height?u.height+' cm':'—'}</td>
    <td>${u.weight?u.weight+' kg':'—'}</td>
    <td>${u.target_weight?u.target_weight+' kg':'—'}</td>
    <td>${(u.created_at||'').split('T')[0]||'—'}</td>
  </tr>`).join('');
}

function renderAdminMeals() {
  var q=(document.getElementById('asearch-meals').value||'').toLowerCase();
  var mt=document.getElementById('afilter-meal').value;
  var rows=(_adminData.meals||[]).filter(m=>(!mt||m.meal_type===mt)&&(!q||m.name.toLowerCase().includes(q)));
  var tbody=document.getElementById('atbody-meals');
  if(!rows.length){tbody.innerHTML='<tr><td colspan="9" class="aempty">No meals found</td></tr>';return;}
  var MC={breakfast:'bg-orange',lunch:'bg-blue',dinner:'bg-purple',snacks:'bg-green'};
  var ML={breakfast:'Breakfast',lunch:'Lunch',dinner:'Dinner',snacks:'Snacks'};
  tbody.innerHTML=rows.map((m,i)=>`<tr>
    <td>${i+1}</td>
    <td><strong>${esc(m.user_name||'—')}</strong></td>
    <td>${esc(m.date)}</td>
    <td><span class="abadge ${MC[m.meal_type]||'bg-blue'}">${ML[m.meal_type]||m.meal_type}</span></td>
    <td><strong>${esc(m.name)}</strong></td>
    <td><strong style="color:var(--primary)">${m.kcal}</strong></td>
    <td>${m.carbs}g</td><td>${m.prot}g</td><td>${m.fat}g</td>
  </tr>`).join('');
}

function renderAdminExercises() {
  var rows=_adminData.exercises||[];
  var tbody=document.getElementById('atbody-exercises');
  if(!rows.length){tbody.innerHTML='<tr><td colspan="6" class="aempty">No custom exercises added yet</td></tr>';return;}
  var PL={general:'General Fitness',weightloss:'Weight Loss',muscle:'Muscle Gain'};
  tbody.innerHTML=rows.map((e,i)=>`<tr>
    <td>${i+1}</td>
    <td><strong>${esc(e.user_name||'—')}</strong></td>
    <td><span class="abadge bg-blue">${PL[e.plan]||e.plan}</span></td>
    <td>Day ${e.day_index+1}</td>
    <td><strong>${esc(e.exercise_name)}</strong></td>
    <td style="color:var(--muted)">${(e.added_at||'').split('T')[0]||'—'}</td>
  </tr>`).join('');
}

function renderAdminProgress() {
  var rows=_adminData.progress||[];
  var tbody=document.getElementById('atbody-progress');
  if(!rows.length){tbody.innerHTML='<tr><td colspan="6" class="aempty">No daily stats yet</td></tr>';return;}
  tbody.innerHTML=rows.map((p,i)=>`<tr>
    <td>${i+1}</td>
    <td><strong>${esc(p.user_name||'—')}</strong></td>
    <td>${esc(p.date)}</td>
    <td><strong>${p.workout_mins||0} mins</strong></td>
    <td>${Number(p.steps||0).toLocaleString()}</td>
    <td>${p.water||0} L</td>
  </tr>`).join('');
}

async function renderAdminCharts() {
  Object.values(_adminCharts).forEach(c=>{ try{c.destroy();}catch(e){} });
  var meals=_adminData.meals||[];
  var exercises=_adminData.exercises||[];

  // Calories by meal type
  var mt={breakfast:0,lunch:0,dinner:0,snacks:0};
  meals.forEach(m=>{mt[m.meal_type]=(mt[m.meal_type]||0)+(+m.kcal||0);});
  _adminCharts.meals=new Chart(document.getElementById('ac-meals'),{
    type:'doughnut',
    data:{labels:['Breakfast','Lunch','Dinner','Snacks'],
      datasets:[{data:[mt.breakfast,mt.lunch,mt.dinner,mt.snacks],
        backgroundColor:['#f59e0b','#3b82f6','#8b5cf6','#10b981'],borderWidth:2}]},
    options:{responsive:true,plugins:{legend:{position:'bottom'}}}
  });

  // Weight over time
  var s=getSession();
  var wRows=s ? await api('GET',`/api/weight/${s.userId}`) : [];
  var wArr=(wRows||[]).slice(0,14).reverse();
  _adminCharts.weight=new Chart(document.getElementById('ac-weight'),{
    type:'line',
    data:{labels:wArr.map(r=>(r.logged_at||'').split('T')[0]),
      datasets:[
        {label:'Weight (kg)',data:wArr.map(r=>r.weight),borderColor:'#690500',backgroundColor:'rgba(105,5,0,.1)',tension:.4,fill:true},
        {label:'Target (kg)',data:wArr.map(r=>r.target_weight),borderColor:'#10b981',borderDash:[5,5],tension:.4}
      ]},
    options:{responsive:true,plugins:{legend:{position:'bottom'}},scales:{y:{beginAtZero:false}}}
  });

  // Macro totals
  var tot={carbs:0,prot:0,fat:0};
  meals.forEach(m=>{tot.carbs+=(+m.carbs||0);tot.prot+=(+m.prot||0);tot.fat+=(+m.fat||0);});
  _adminCharts.macros=new Chart(document.getElementById('ac-macros'),{
    type:'bar',
    data:{labels:['Carbs (g)','Protein (g)','Fat (g)'],
      datasets:[{label:'Total',data:[tot.carbs,tot.prot,tot.fat],backgroundColor:['#3b82f6','#10b981','#f59e0b'],borderRadius:8}]},
    options:{responsive:true,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true}}}
  });

  // Plan popularity
  var pc={general:0,weightloss:0,muscle:0};
  exercises.forEach(e=>{pc[e.plan]=(pc[e.plan]||0)+1;});
  _adminCharts.plans=new Chart(document.getElementById('ac-plans'),{
    type:'pie',
    data:{labels:['General Fitness','Weight Loss','Muscle Gain'],
      datasets:[{data:[pc.general,pc.weightloss,pc.muscle],backgroundColor:['#10b981','#f59e0b','#8b5cf6'],borderWidth:2}]},
    options:{responsive:true,plugins:{legend:{position:'bottom'}}}
  });
}

/* ── UTILITY ─────────────────────────────────────── */
function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

/* ── BOOT ────────────────────────────────────────── */
(async function(){
  document.querySelectorAll('.page').forEach(p=>{ p.style.display='none'; p.classList.remove('active'); });
  // If localStorage suggests we're logged in, verify with server (the cookie
  // may have expired). If verification fails, clear the stale session.
  if (getSession()) {
    var d = await api('GET','/api/me');
    if (d && d.status === 'ok') {
      showPage('home');
      return;
    }
    clearSession();
  }
  showPage('login');
})();
