// ═══════════════════════════════════════════
//  EXPENSES — Add/Edit/Delete + Search + CSV Export
// ═══════════════════════════════════════════
function addExpense() {
  const perm = getPermissions(currentUser.role);
  if (!perm.canWrite) { showToast('❌ No INSERT permission','error'); return; }
  const amount = parseFloat(document.getElementById('exp-amount').value);
  const desc   = document.getElementById('exp-desc').value.trim();
  const catId  = parseInt(document.getElementById('exp-cat').value);
  const date   = document.getElementById('exp-date').value;
  if (!amount||amount<=0) { showToast('❌ Amount must be > 0 — CHECK constraint','error'); return; }
  if (!desc)   { showToast('❌ Description required (NOT NULL)','error'); return; }
  if (!catId)  { showToast('❌ Select a category (NOT NULL)','error'); return; }
  if (!date)   { showToast('❌ Date is required (NOT NULL)','error'); return; }
  const newExp = { expense_id:DB.nextExpenseId++, amount, description:desc, date, user_id:currentUser.user_id, category_id:catId };
  DB.expenses.push(newExp);
  logAudit('INSERT', 'expense', `Added ₹${amount} — "${desc}" (${getCategoryById(catId)?.category_name})`);
  // TRIGGER simulation
  const monthYear = date.slice(0,7);
  const budget = getBudget(currentUser.user_id, monthYear);
  if (budget) {
    const totalNow = getExpensesForUser(currentUser.user_id, monthYear).reduce((a,b)=>a+b.amount,0);
    if (totalNow > budget.monthly_limit) {
      showToast(`🚨 TRIGGER: Budget exceeded! ${fmt(totalNow)} / ${fmt(budget.monthly_limit)}`,'warn');
    } else if (totalNow > budget.monthly_limit * 0.8) {
      showToast(`⚠️ Warning: 80%+ of budget used!`,'warn');
    } else {
      showToast(`✅ Added ${fmt(amount)} in ${getCategoryById(catId)?.category_name}`,'success');
    }
  } else {
    showToast(`✅ Expense added — ${fmt(amount)}`,'success');
  }
  document.getElementById('exp-amount').value='';
  document.getElementById('exp-desc').value='';
  saveDB();
  renderExpensesTable();
  renderDashboard();
}

function deleteExpense(id) {
  const perm = getPermissions(currentUser.role);
  if (!perm.canDelete) { showToast('❌ No DELETE permission','error'); return; }
  if (!confirm('Delete this expense?')) return;
  const exp = DB.expenses.find(e=>e.expense_id===id);
  DB.expenses = DB.expenses.filter(e=>e.expense_id!==id);
  if (exp) logAudit('DELETE', 'expense', `Deleted EXP${String(id).padStart(3,'0')} — ₹${exp.amount} "${exp.description}"`);
  saveDB();
  showToast('🗑️ Expense deleted','success');
  renderExpensesTable(); renderDashboard();
}

function openEditExpense(id) {
  const perm = getPermissions(currentUser.role);
  if (!perm.canUpdate) { showToast('❌ No UPDATE permission','error'); return; }
  const exp = DB.expenses.find(e=>e.expense_id===id);
  if (!exp) return;
  document.getElementById('modal-title').textContent = 'Edit Expense #EXP'+String(id).padStart(3,'0');
  document.getElementById('modal-body').innerHTML = `
    <div class="form-group"><label>Amount (₹)</label><input type="number" id="edit-amount" value="${exp.amount}"></div>
    <div class="form-group"><label>Description</label><input type="text" id="edit-desc" value="${exp.description}"></div>
    <div class="form-group"><label>Category</label>
      <select id="edit-cat">${DB.categories.map(c=>`<option value="${c.category_id}" ${c.category_id===exp.category_id?'selected':''}>${c.icon} ${c.category_name}</option>`).join('')}</select>
    </div>
    <div class="form-group"><label>Date</label><input type="date" id="edit-date" value="${exp.date}"></div>
    <div style="display:flex;gap:10px;margin-top:8px">
      <button class="btn btn-primary" onclick="saveEditExpense(${id})" style="flex:1">💾 Save (UPDATE)</button>
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
    </div>`;
  document.getElementById('modal-overlay').classList.add('open');
}

function saveEditExpense(id) {
  const exp = DB.expenses.find(e=>e.expense_id===id);
  const amount = parseFloat(document.getElementById('edit-amount').value);
  if (!amount||amount<=0) { showToast('❌ Amount must be > 0','error'); return; }
  const oldAmt = exp.amount;
  exp.amount      = amount;
  exp.description = document.getElementById('edit-desc').value;
  exp.category_id = parseInt(document.getElementById('edit-cat').value);
  exp.date        = document.getElementById('edit-date').value;
  logAudit('UPDATE', 'expense', `Updated EXP${String(id).padStart(3,'0')} — ₹${oldAmt} → ₹${amount}`);
  saveDB();
  closeModal();
  showToast('✅ Expense updated (UPDATE executed)','success');
  renderExpensesTable(); renderDashboard();
}

function renderExpensesTable() {
  const area      = document.getElementById('expenses-table-area');
  const filterCat = parseInt(document.getElementById('filter-cat')?.value) || 0;
  const filterMon = document.getElementById('filter-month')?.value || '';
  const searchTxt = (document.getElementById('exp-search')?.value || '').toLowerCase();
  let exps = getExpensesForUser(currentUser.user_id, filterMon || null);
  if (filterCat) exps = exps.filter(e=>e.category_id===filterCat);
  if (searchTxt) exps = exps.filter(e=>e.description.toLowerCase().includes(searchTxt));
  exps.sort((a,b)=>new Date(b.date)-new Date(a.date));
  const total = exps.reduce((a,b)=>a+b.amount,0);
  document.getElementById('filtered-total').textContent = fmt(total);
  document.getElementById('filtered-count').textContent = `${exps.length} transaction${exps.length!==1?'s':''}`;
  const perm = getPermissions(currentUser.role);
  if (!exps.length) {
    area.innerHTML='<div class="empty-state"><div class="empty-icon">💸</div><p>No expenses match your filter</p></div>'; return;
  }
  const hasActions = perm.canUpdate||perm.canDelete;
  area.innerHTML = `<table class="data-table">
    <thead><tr><th>ID</th><th>Date</th><th>Description</th><th>Category</th><th>Amount</th>${hasActions?'<th>Actions</th>':''}</tr></thead>
    <tbody>${exps.map(e=>{
      const cat=getCategoryById(e.category_id);
      const actions=hasActions?`<td>
        ${perm.canUpdate?`<button class="btn btn-ghost btn-sm" onclick="openEditExpense(${e.expense_id})">✏️ Edit</button>`:''}
        ${perm.canDelete?`<button class="btn btn-danger btn-sm" onclick="deleteExpense(${e.expense_id})">🗑️</button>`:''}
      </td>`:'';
      return `<tr>
        <td style="color:var(--text-muted)">EXP${String(e.expense_id).padStart(3,'0')}</td>
        <td>${e.date}</td><td>${e.description}</td>
        <td><span class="cat-tag" style="background:${cat?.color}22;color:${cat?.color}">${cat?.icon} ${cat?.category_name}</span></td>
        <td class="amount-cell amount-neg">${fmt(e.amount)}</td>${actions}
      </tr>`;
    }).join('')}</tbody></table>`;
}

function populateCategoryDropdowns() {
  ['exp-cat','filter-cat'].forEach(id=>{
    const sel=document.getElementById(id);
    if (!sel) return;
    const isFilter=id==='filter-cat';
    sel.innerHTML=(isFilter?'<option value="">All Categories</option>':'<option value="">Select category</option>')+
      DB.categories.map(c=>`<option value="${c.category_id}">${c.icon} ${c.category_name}</option>`).join('');
  });
}

// ─── CSV EXPORT ───────────────────────────
function exportCSV() {
  const exps = getExpensesForUser(currentUser.user_id, null);
  if (!exps.length) { showToast('❌ No expenses to export','error'); return; }
  const header = 'ID,Date,Description,Category,Amount\n';
  const rows = exps.map(e => {
    const cat = getCategoryById(e.category_id);
    return `EXP${String(e.expense_id).padStart(3,'0')},${e.date},"${e.description}",${cat?.category_name||'Other'},${e.amount}`;
  }).join('\n');
  const blob = new Blob([header + rows], { type:'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `expenseiq_export_${THIS_MONTH}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  logAudit('EXPORT', 'expense', `Exported ${exps.length} expenses to CSV`);
  showToast(`📥 Exported ${exps.length} expenses to CSV`,'success');
}
