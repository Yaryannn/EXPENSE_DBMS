// ═══════════════════════════════════════════
//  DBA PANEL — Create users, Show privileges, Audit Log
// ═══════════════════════════════════════════
function renderDBAPanel() {
  if (!currentUser) return;
  const isDBA=currentUser.role==='dba';
  document.getElementById('dba-restricted').style.display=isDBA?'none':'block';
  document.getElementById('dba-content').style.display=isDBA?'block':'none';
  if (!isDBA) return;

  // Users grid
  const grid=document.getElementById('dba-users-grid');
  grid.innerHTML=DB.users.map(u=>{
    const perm=getPermissions(u.role);
    const perms=[
      {name:'SELECT (Read)', on:perm.canRead},
      {name:'INSERT (Write)',on:perm.canWrite},
      {name:'UPDATE',        on:perm.canUpdate},
      {name:'DELETE',        on:perm.canDelete},
      {name:'CREATE USER',   on:perm.canCreateUser},
      {name:'GRANT OPTION',  on:perm.canCreateUser},
    ];
    const roleColor=u.role==='dba'?'var(--accent)':u.role==='editor'?'var(--accent3)':'var(--warn)';
    return `<div class="dba-user-card">
      <div class="dbu-name">👤 ${u.username}</div>
      <div class="dbu-role" style="color:${roleColor}">${u.role.toUpperCase()} · ${u.email}</div>
      <div class="perms-list">${perms.map(p=>`<span class="perm-tag ${p.on?'perm-on':'perm-off'}">${p.on?'✓':'✗'} ${p.name}</span>`).join('')}</div>
    </div>`;
  }).join('');

  // Audit log
  renderAuditLog();
}

function renderAuditLog() {
  const area = document.getElementById('audit-log-area');
  if (!area) return;
  const logs = [...DB.auditLog].reverse();
  if (!logs.length) {
    area.innerHTML='<div class="empty-state"><div class="empty-icon">📜</div><p>No audit entries yet. Actions will be logged here.</p></div>';
    return;
  }
  const actionColors = {
    INSERT:'var(--success)', UPDATE:'var(--accent)', DELETE:'var(--danger)',
    LOGIN:'var(--accent4)', LOGOUT:'var(--text-dim)', EXPORT:'#38f9d7'
  };
  area.innerHTML=`<table class="data-table">
    <thead><tr><th>Time</th><th>User</th><th>Action</th><th>Table</th><th>Details</th></tr></thead>
    <tbody>${logs.slice(0,20).map(l=>`<tr>
      <td style="font-size:.72rem;color:var(--text-muted);white-space:nowrap">${new Date(l.timestamp).toLocaleString('en-IN',{hour:'2-digit',minute:'2-digit',day:'2-digit',month:'short'})}</td>
      <td>${l.user}</td>
      <td><span style="color:${actionColors[l.action]||'var(--text)'};font-weight:600;font-size:.78rem">${l.action}</span></td>
      <td style="color:var(--text-dim)">${l.table}</td>
      <td style="font-size:.78rem;max-width:250px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${l.detail}</td>
    </tr>`).join('')}</tbody></table>`;
}

function createDBUser() {
  const perm=getPermissions(currentUser.role);
  if (!perm.canCreateUser) { showToast('❌ Only DBA can create users','error'); return; }
  const uname=document.getElementById('dba-uname').value.trim();
  const upass=document.getElementById('dba-upass').value.trim();
  const urole=document.getElementById('dba-urole').value;
  const uemail=document.getElementById('dba-uemail').value.trim()||`${uname}@expenseiq.com`;
  const msgEl=document.getElementById('dba-create-msg');

  if (!uname) { showMsg(msgEl,'❌ Username is required','error'); return; }
  if (!upass) { showMsg(msgEl,'❌ Password is required','error'); return; }
  if (upass.length<4) { showMsg(msgEl,'❌ Password must be at least 4 characters','error'); return; }
  if (DB.users.find(u=>u.username===uname)) { showMsg(msgEl,'❌ Username already exists — UNIQUE constraint violation','error'); return; }
  if (DB.users.find(u=>u.email===uemail)) { showMsg(msgEl,'❌ Email already registered — UNIQUE constraint violation','error'); return; }

  DB.users.push({ user_id:DB.nextUserId++, username:uname, email:uemail, password_hash:upass, role:urole });
  logAudit('INSERT', 'user', `DBA created user "${uname}" with role: ${urole}`);

  document.getElementById('dba-uname').value='';
  document.getElementById('dba-upass').value='';
  document.getElementById('dba-uemail').value='';
  document.getElementById('dba-urole').value='editor';

  showMsg(msgEl,`✅ User '${uname}' created with role: ${urole.toUpperCase()}. SQL: CREATE USER '${uname}'@'localhost' IDENTIFIED BY '***'; GRANT ...;`,'success');
  showToast(`✅ User '${uname}' created (GRANT executed)`,'success');
  renderDBAPanel();
}

function showMsg(el, msg, type) {
  el.textContent=msg;
  el.style.display='block';
  el.style.color=type==='success'?'var(--success)':'var(--danger)';
  el.style.fontSize='.8rem';
  el.style.marginTop='8px';
  el.style.padding='8px 12px';
  el.style.borderRadius='8px';
  el.style.background=type==='success'?'rgba(67,233,123,.1)':'rgba(255,77,109,.1)';
  el.style.border=`1px solid ${type==='success'?'rgba(67,233,123,.3)':'rgba(255,77,109,.3)'}`;
}

function renderLiveData() {
  const area=document.getElementById('live-data-area');
  area.innerHTML=`<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
    <div><div class="section-title" style="font-size:.85rem">📋 USER table (${DB.users.length} rows)</div>
      <table class="data-table"><thead><tr><th>user_id</th><th>username</th><th>role</th><th>email</th></tr></thead>
      <tbody>${DB.users.map(u=>`<tr><td>${u.user_id}</td><td>${u.username}</td><td>${u.role}</td><td style="font-size:.75rem;color:var(--text-muted)">${u.email}</td></tr>`).join('')}</tbody></table>
    </div>
    <div><div class="section-title" style="font-size:.85rem">🏷️ CATEGORY table (${DB.categories.length} rows)</div>
      <table class="data-table"><thead><tr><th>id</th><th>name</th></tr></thead>
      <tbody>${DB.categories.map(c=>`<tr><td>${c.category_id}</td><td>${c.icon} ${c.category_name}</td></tr>`).join('')}</tbody></table>
    </div>
    <div style="grid-column:1/-1"><div class="section-title" style="font-size:.85rem">💸 EXPENSE table (${DB.expenses.length} rows)</div>
      <table class="data-table"><thead><tr><th>id</th><th>amount</th><th>description</th><th>date</th><th>user_id</th><th>cat_id</th></tr></thead>
      <tbody>${DB.expenses.slice(-10).map(e=>`<tr>
        <td>${e.expense_id}</td><td>${fmt(e.amount)}</td>
        <td style="max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${e.description}</td>
        <td>${e.date}</td><td>${e.user_id}</td><td>${e.category_id}</td>
      </tr>`).join('')}</tbody></table>
    </div>
    <div style="grid-column:1/-1"><div class="section-title" style="font-size:.85rem">🎯 BUDGET table (${DB.budgets.length} rows)</div>
      <table class="data-table"><thead><tr><th>budget_id</th><th>monthly_limit</th><th>month_year</th><th>user_id</th></tr></thead>
      <tbody>${DB.budgets.map(b=>`<tr><td>${b.budget_id}</td><td>${fmt(b.monthly_limit)}</td><td>${b.month_year}</td><td>${b.user_id}</td></tr>`).join('')}</tbody></table>
    </div>
  </div>`;
}
