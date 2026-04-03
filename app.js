const DEMO_EMAIL='demo@fittracker.app', DEMO_PASS='Passw0rd!';
const form=document.getElementById('login-form'); const email=document.getElementById('email');
const password=document.getElementById('password'); const btn=document.getElementById('login-btn');
const err=document.getElementById('error');
form.addEventListener('submit',ev=>{ ev.preventDefault(); err.hidden=true;
  if(!/\S+@\S+\.\S+/.test(email.value)) return show('Enter a valid email.');
  if(!password.value) return show('Enter your password.');
  btn.disabled=true; btn.textContent='Signing in…';
  setTimeout(()=>{ if(email.value.toLowerCase()===DEMO_EMAIL && password.value===DEMO_PASS){
      localStorage.setItem('ft_token','demo'); location.href='tracker.html';
    }else{ show('Invalid credentials.'); btn.disabled=false; btn.textContent='Log in'; } },350);
});
function show(m){err.textContent=m;err.hidden=false;}
