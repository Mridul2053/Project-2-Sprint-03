const $=(s)=>document.querySelector(s); 
const $$=(s)=>document.querySelectorAll(s);

function todayISO(){
  const d=new Date();
  d.setHours(0,0,0,0);
  return d.toISOString().slice(0,10);
}

const di=document.getElementById('log-date');
document.getElementById('prev-day').onclick=()=>shift(-1);
document.getElementById('next-day').onclick=()=>shift(1);
di.onchange=refresh;
di.value=todayISO();

function shift(n){
  const d=new Date(di.value||todayISO());
  d.setDate(d.getDate()+n);
  di.value=d.toISOString().slice(0,10);
  refresh();
}

function goals(){
  try{return JSON.parse(localStorage.getItem('ft_goals'))||{kcal:2200,carbs:250,protein:150,fat:70};}
  catch{return {kcal:2200,carbs:250,protein:150,fat:70};}
}

function saveGoals(g){localStorage.setItem('ft_goals',JSON.stringify(g));}

function logs(){
  try{return JSON.parse(localStorage.getItem('ft_logs'))||{};}
  catch{return {};}
}

function saveLogs(x){localStorage.setItem('ft_logs',JSON.stringify(x));}

function day(){return logs()[di.value]||[]}
function setDay(list){
  const L=logs();
  L[di.value]=list;
  saveLogs(L);
}

function uid(){return Math.random().toString(36).slice(2,10);}

function renderMeals(){
  ['breakfast','lunch','dinner','snacks'].forEach(m=>{
    const ul=document.getElementById('list-'+m);
    ul.innerHTML='';

    day().filter(x=>x.meal===m).forEach(it=>{
      const li=document.createElement('li');
      li.className='item';

      li.innerHTML=
      '<div class="meta"><strong>'+it.name+'</strong> <span>'+it.kcal+' kcal</span> <span>C:'+it.carbs+'g</span> <span>P:'+it.protein+'g</span> <span>F:'+it.fat+'g</span></div>'+
      '<div class="actions"><button class="icon-btn" data-a="e" data-id="'+it.id+'">✎</button><button class="icon-btn" data-a="d" data-id="'+it.id+'">🗑</button></div>';

      ul.appendChild(li);
    });

    ul.onclick=(e)=>{
      const b=e.target.closest('button');
      if(!b) return;

      const id=b.dataset.id;
      const list=day();

      if(b.dataset.a==='d'){
        setDay(list.filter(x=>x.id!==id));
        refresh();
      }

      if(b.dataset.a==='e'){
        const it=list.find(x=>x.id===id);
        if(it) openModal(it);
      }
    };
  });
}

$$('.add-btn').forEach(b=>b.onclick=()=>openModal({meal:b.dataset.meal}));

const tEl={
  kcal:$('#kcal-total'),
  carbs:$('#carb-total'),
  protein:$('#protein-total'),
  fat:$('#fat-total')
};

const bars={
  kcal:$('#kcal-bar'),
  carbs:$('#carb-bar'),
  protein:$('#protein-bar'),
  fat:$('#fat-bar')
};

const rem={
  kcal:$('#kcal-remaining'),
  carbs:$('#carb-remaining'),
  protein:$('#protein-remaining'),
  fat:$('#fat-remaining')
};

let chart;

function sums(){
  return day().reduce((a,x)=>{
    a.kcal+=+x.kcal||0;
    a.carbs+=+x.carbs||0;
    a.protein+=+x.protein||0;
    a.fat+=+x.fat||0;
    return a;
  },{kcal:0,carbs:0,protein:0,fat:0});
}

function draw(){
  const s=sums();
  const g=goals();

  tEl.kcal.textContent=s.kcal;
  tEl.carbs.textContent=s.carbs.toFixed(1);
  tEl.protein.textContent=s.protein.toFixed(1);
  tEl.fat.textContent=s.fat.toFixed(1);

  const pct=(v,t)=>Math.min(100,t?Math.round(v/t*100):0);

  bars.kcal.style.width=pct(s.kcal,g.kcal)+'%';
  bars.carbs.style.width=pct(s.carbs,g.carbs)+'%';
  bars.protein.style.width=pct(s.protein,g.protein)+'%';
  bars.fat.style.width=pct(s.fat,g.fat)+'%';

  rem.kcal.textContent=(Math.max(0,g.kcal-s.kcal))+' kcal remaining';
  rem.carbs.textContent=(Math.max(0,g.carbs-s.carbs)).toFixed(1)+' g remaining';
  rem.protein.textContent=(Math.max(0,g.protein-s.protein)).toFixed(1)+' g remaining';
  rem.fat.textContent=(Math.max(0,g.fat-s.fat)).toFixed(1)+' g remaining';

  const ctx=document.getElementById('macroChart');
  if(chart) chart.destroy();

  chart=new Chart(ctx,{
    type:'bar',
    data:{
      labels:['Calories','Carbs','Protein','Fat'],
      datasets:[
        {label:'Consumed',data:[s.kcal,s.carbs,s.protein,s.fat]},
        {label:'Goal',data:[g.kcal,g.carbs,g.protein,g.fat]}
      ]
    },
    options:{
      responsive:true,
      plugins:{legend:{position:'bottom'}},
      scales:{y:{beginAtZero:true}}
    }
  });   // ✅ FIXED HERE
}

function refresh(){
  renderMeals();
  draw();
}