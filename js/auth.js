// ═══════════════════════════════════════════
//  AUTH — Login, Register, Role Permissions
// ═══════════════════════════════════════════
let currentUser = null;

function doLogin() {
  const u = document.getElementById('login-user').value.trim();
  const p = document.getElementById('login-pass').value;
  const user = DB.users.find(x => x.username === u && x.password_hash === p);
  const err = document.getElementById('login-error');
  if (!user) { err.textContent='❌ Invalid username or password.'; err.style.display='block'; return; }
  err.style.display='none';
  currentUser = user;
  logAudit('LOGIN', 'user', `User "${u}" logged in (role: ${user.role})`);
  initDashboard();
  showPage('dashboard-page');
}

function doRegister() {
  const u   = document.getElementById('reg-user').value.trim();
  const e   = document.getElementById('reg-email').value.trim();
  const p   = document.getElementById('reg-pass').value;
  const err = document.getElementById('reg-error');
  const suc = document.getElementById('reg-success');
  err.style.display='none'; suc.style.display='none';
  if (!u||!e||!p) { err.textContent='All fields are required.'; err.style.display='block'; return; }
  if (p.length<6) { err.textContent='Password must be at least 6 characters.'; err.style.display='block'; return; }
  if (DB.users.find(x=>x.username===u)) { err.textContent='Username already exists — UNIQUE constraint violation.'; err.style.display='block'; return; }
  if (DB.users.find(x=>x.email===e)) { err.textContent='Email already registered — UNIQUE constraint violation.'; err.style.display='block'; return; }
  const newUser = { user_id:DB.nextUserId++, username:u, email:e, password_hash:p, role:'viewer' };
  DB.users.push(newUser);
  logAudit('INSERT', 'user', `New user "${u}" registered (role: viewer)`);
  suc.textContent='✅ Account created! Signing you in... (Default role: viewer)';
  suc.style.display='block';
  setTimeout(() => showPage('login-page'), 1800);
}

function doLogout() {
  if (currentUser) logAudit('LOGOUT', 'user', `User "${currentUser.username}" logged out`);
  currentUser = null;
  showPage('login-page');
}

function initDashboard() {
  const perm = getPermissions(currentUser.role);
  document.getElementById('sb-avatar').textContent = currentUser.username[0].toUpperCase();
  document.getElementById('sb-name').textContent   = currentUser.username;
  const rb = document.getElementById('sb-role-badge');
  rb.textContent = currentUser.role==='dba' ? 'DBA' : currentUser.role==='editor' ? 'Editor' : 'Viewer';
  rb.className   = 'user-role ' + (currentUser.role==='dba' ? 'badge-dba' : currentUser.role==='editor' ? 'badge-rw' : 'badge-ro');
  document.getElementById('readonly-notice').style.display = perm.canWrite ? 'none' : 'flex';
  const addCard = document.getElementById('add-expense-card');
  if (!perm.canWrite) {
    addCard.querySelectorAll('input,select,button').forEach(el => el.disabled=true);
    document.getElementById('set-budget-card').querySelectorAll('input,select,button').forEach(el => el.disabled=true);
  }
  document.getElementById('nav-dba').style.display = perm.canCreateUser ? 'flex' : 'none';
  populateCategoryDropdowns();
  setDefaultDates();
  renderDashboard();
}
