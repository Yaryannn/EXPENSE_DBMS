// ═══════════════════════════════════════════
//  UI ROUTING — Page switching, tabs, toast, modal, theme
// ═══════════════════════════════════════════
function showPage(id) {
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  const e=document.getElementById('login-error');
  if (e) e.style.display='none';
}

function showTab(name) {
  document.querySelectorAll('.tab-content').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  const tabEl=document.getElementById('tab-'+name);
  if (!tabEl) return;
  tabEl.classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n=>{
    if (n.getAttribute('onclick')?.includes(`'${name}'`)) n.classList.add('active');
  });
  if (name==='dashboard') renderDashboard();
  if (name==='expenses')  { renderExpensesTable(); populateCategoryDropdowns(); }
  if (name==='budget')    renderBudgetTab();
  if (name==='reports')   renderReports();
  if (name==='dba')       renderDBAPanel();
  if (name==='sql')       renderLiveData();
  if (name==='ai')        renderAIContext();
}

function switchSQLTab(el,id) {
  ['sq1','sq2','sq3','sq4'].forEach(s=>{
    document.getElementById(s).style.display=s===id?'block':'none';
  });
  el.closest('.tab-bar').querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  el.classList.add('active');
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
}

let toastTimer;
function showToast(msg,type='success') {
  const t=document.getElementById('toast');
  t.textContent=msg;
  t.className=`show toast-${type}`;
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>{ t.className=''; },3800);
}

function setDefaultDates() {
  const ymd=TODAY.toISOString().slice(0,10);
  const ym=THIS_MONTH;
  const d=document.getElementById('exp-date'); if (d) d.value=ymd;
  const bm=document.getElementById('bud-month'); if (bm) bm.value=ym;
  const fm=document.getElementById('filter-month'); if (fm) fm.value=ym;
  const lbl=document.getElementById('current-month-label');
  if (lbl) lbl.textContent=new Date(ym+'-01').toLocaleDateString('en-IN',{month:'long',year:'numeric'});
}

// ─── THEME TOGGLE ─────────────────────────
function toggleTheme() {
  const body = document.body;
  body.classList.toggle('light-theme');
  const isLight = body.classList.contains('light-theme');
  localStorage.setItem('expenseiq_theme', isLight ? 'light' : 'dark');
  const btn = document.getElementById('theme-toggle-btn');
  if (btn) btn.textContent = isLight ? '🌙 Dark' : '☀️ Light';
}

// Apply saved theme on load
(function() {
  const saved = localStorage.getItem('expenseiq_theme');
  if (saved === 'light') {
    document.body.classList.add('light-theme');
  }
})();

// ─── KEYBOARD SHORTCUTS ───────────────────
document.addEventListener('keydown',e=>{
  if (e.key==='Escape') closeModal();
  if (e.key==='Enter'&&document.getElementById('login-page').classList.contains('active')) doLogin();
});
