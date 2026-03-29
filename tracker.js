const $=(s)=>document.querySelector(s); const $$=(s)=>document.querySelectorAll(s);
function todayISO(){const d=new Date();d.setHours(0,0,0,0);return d.toISOString().slice(0,10);}
const di=document.getElementById('log-date'); document.getElementById('prev-day').onclick=()=>shift(-1);
document.getElementById('next-day').onclick=()=>shift(1); di.onchange=refresh; di.value=todayISO();
function shift(n){const d=new Date(di.value||todayISO()); d.setDate(d.getDate()+n); di.value=d.toISOString().slice(0,10); refresh();}
function goals(){try{return JSON.parse(localStorage.getItem('ft_goals'))||{kcal:2200,carbs:250,protein:150,fat:70};}catch{return {kcal:2200,carbs:250,protein:150,fat:70};}}
function saveGoals(g){localStorage.setItem('ft_goals',JSON.stringify(g));}
function logs(){try{return JSON.parse(localStorage.getItem('ft_logs'))||{};}catch{return {};}}
function saveLogs(x){localStorage.setItem('ft_logs',JSON.stringify(x));}
function day(){return logs()[di.value]||[]} function setDay(list){const L=logs();L[di.value]=list;saveLogs(L);}
function uid(){return Math.random().toString(36).slice(2,10);}
function renderMeals(){['breakfast','lunch','dinner','snacks'].forEach(m=>{const ul=document.getElementById('list-'+m); ul.innerHTML='';
  day().filter(x=>x.meal===m).forEach(it=>{const li=document.createElement('li'); li.className='item';
    li.innerHTML='<div class="meta"><strong>'+it.name+'</strong> <span>'+it.kcal+' kcal</span> <span>C:'+it.carbs+'g</span> <span>P:'+it.protein+'g</span> <span>F:'+it.fat+'g</span></div>'+
                 '<div class="actions"><button class="icon-btn" data-a="e" data-id="'+it.id+'">✎</button><button class="icon-btn" data-a="d" data-id="'+it.id+'">🗑</button></div>'; ul.appendChild(li);});
  ul.onclick=(e)=>{const b=e.target.closest('button'); if(!b) return; const id=b.dataset.id, list=day(); if(b.dataset.a==='d'){setDay(list.filter(x=>x.id!==id)); refresh();} if(b.dataset.a==='e'){const it=list.find(x=>x.id===id); if(it) openModal(it);}};});}
$$('.add-btn').forEach(b=>b.onclick=()=>openModal({meal:b.dataset.meal}));
const tEl={kcal:$('#kcal-total'),carbs:$('#carb-total'),protein:$('#protein-total'),fat:$('#fat-total')};
const bars={kcal:$('#kcal-bar'),carbs:$('#carb-bar'),protein:$('#protein-bar'),fat:$('#fat-bar')};
const rem={kcal:$('#kcal-remaining'),carbs:$('#carb-remaining'),protein:$('#protein-remaining'),fat:$('#fat-remaining')};
let chart; function sums(){return day().reduce((a,x)=>{a.kcal+=+x.kcal||0;a.carbs+=+x.carbs||0;a.protein+=+x.protein||0;a.fat+=+x.fat||0;return a;},{kcal:0,carbs:0,protein:0,fat:0});}
function draw(){const s=sums(), g=goals(); tEl.kcal.textContent=s.kcal; tEl.carbs.textContent=s.carbs.toFixed(1); tEl.protein.textContent=s.protein.toFixed(1); tEl.fat.textContent=s.fat.toFixed(1);
  const pct=(v,t)=>Math.min(100,t?Math.round(v/t*100):0); bars.kcal.style.width=pct(s.kcal,g.kcal)+'%'; bars.carbs.style.width=pct(s.carbs,g.carbs)+'%'; bars.protein.style.width=pct(s.protein,g.protein)+'%'; bars.fat.style.width=pct(s.fat,g.fat)+'%';
  rem.kcal.textContent=(Math.max(0,g.kcal-s.kcal))+' kcal remaining';
  rem.carbs.textContent=(Math.max(0,g.carbs-s.carbs)).toFixed(1)+' g remaining';
  rem.protein.textContent=(Math.max(0,g.protein-s.protein)).toFixed(1)+' g remaining';
  rem.fat.textContent=(Math.max(0,g.fat-s.fat)).toFixed(1)+' g remaining';
  const ctx=document.getElementById('macroChart'); if(chart) chart.destroy();
  chart=new Chart(ctx,{type:'bar',data:{labels:['Calories','Carbs','Protein','Fat'],datasets:[{label:'Consumed',data:[s.kcal,s.carbs,s.protein,s.fat]},{label:'Goal',data:[g.kcal,g.carbs,g.protein,g.fat]}]},options:{responsive:true,plugins:{legend:{position:'bottom'}},scales:{y:{beginAtZero:true}}});}
function refresh(){renderMeals(); draw();}
document.getElementById('goals-form').onsubmit=e=>{e.preventDefault(); saveGoals({kcal:+document.getElementById('goal-kcal').value||0,carbs:+document.getElementById('goal-carbs').value||0,protein:+document.getElementById('goal-protein').value||0,fat:+document.getElementById('goal-fat').value||0}); refresh();};
const bmiForm=document.getElementById('bmi-form'); bmiForm.addEventListener('submit',(e)=>{e.preventDefault();
  const h_cm=+document.getElementById('height').value, w_kg=+document.getElementById('weight').value, wtGoal=+document.getElementById('target-weight').value, act=+document.getElementById('activity').value;
  if(!h_cm||!w_kg||!wtGoal||!act) return; const h_m=h_cm/100; const bmiCurrent=w_kg/(h_m*h_m);
  const tdee=Math.round(22*wtGoal*act); const kcalTarget=Math.round(tdee + (w_kg>wtGoal?-500:300));
  const proteinG=Math.round(wtGoal*1.6); const kcalAfterProtein=kcalTarget - proteinG*4;
  const carbsG=Math.max(0,Math.round((kcalAfterProtein*0.60)/4)); const fatG=Math.max(0,Math.round((kcalAfterProtein*0.40)/9));
  document.getElementById('out-bmi').textContent=bmiCurrent.toFixed(1); document.getElementById('out-tdee').textContent=tdee;
  document.getElementById('out-kcal').textContent=kcalTarget; document.getElementById('out-protein').textContent=proteinG;
  document.getElementById('out-carbs').textContent=carbsG; document.getElementById('out-fat').textContent=fatG; document.getElementById('bmi-results').hidden=false;
  bmiForm.dataset.kcal=kcalTarget; bmiForm.dataset.carbs=carbsG; bmiForm.dataset.protein=proteinG; bmiForm.dataset.fat=fatG;});
document.getElementById('apply-targets').addEventListener('click',()=>{const kcal=+bmiForm.dataset.kcal||0; if(!kcal) return;
  document.getElementById('goal-kcal').value=+bmiForm.dataset.kcal||0; document.getElementById('goal-carbs').value=+bmiForm.dataset.carbs||0;
  document.getElementById('goal-protein').value=+bmiForm.dataset.protein||0; document.getElementById('goal-fat').value=+bmiForm.dataset.fat||0;
  document.getElementById('goals-form').dispatchEvent(new Event('submit'));});
const modal=document.getElementById('modal'), form=document.getElementById('food-form');
function openModal(it){it=it||{meal:'breakfast'}; modal.classList.add('show'); modal.setAttribute('aria-hidden','false');
  document.getElementById('edit-id').value=it.id||''; document.getElementById('food-name').value=it.name||''; document.getElementById('food-meal').value=it.meal||'breakfast';
  document.getElementById('food-kcal').value=it.kcal||''; document.getElementById('food-carbs').value=it.carbs||''; document.getElementById('food-protein').value=it.protein||''; document.getElementById('food-fat').value=it.fat||'';
  document.getElementById('modal-title').textContent=it.id?'Edit Food':'Add Food';}
function closeModal(){modal.classList.remove('show'); modal.setAttribute('aria-hidden','true'); form.reset(); document.getElementById('edit-id').value='';}
document.getElementById('modal-close').onclick=closeModal; document.getElementById('cancel-food').onclick=closeModal;
form.onsubmit=e=>{e.preventDefault(); const p={id:document.getElementById('edit-id').value||uid(),name:(document.getElementById('food-name').value||'').trim(),meal:document.getElementById('food-meal').value,kcal:+document.getElementById('food-kcal').value||0,carbs:+document.getElementById('food-carbs').value||0,protein:+document.getElementById('food-protein').value||0,fat:+document.getElementById('food-fat').value||0};
  if(!p.name)return; const list=day(); const i=list.findIndex(x=>x.id===p.id); if(i>=0) list[i]=p; else list.push(p); setDay(list); closeModal(); refresh();};
document.getElementById('logout').onclick=e=>{e.preventDefault(); localStorage.removeItem('ft_token'); location.href='index.html';};
refresh();
