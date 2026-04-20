// ═══════════════════════════════════════════
//  BUDGET — Set budget, Budget vs Actual (UPSERT)
// ═══════════════════════════════════════════
function setBudget() {
  const perm=getPermissions(currentUser.role);
  if (!perm.canWrite) { showToast('❌ No permission to set budget','error'); return; }
  const monthYear=document.getElementById('bud-month').value;
  const limit=parseFloat(document.getElementById('bud-limit').value);
  if (!monthYear||!limit||limit<=0) { showToast('❌ Enter valid month and positive amount','error'); return; }
  const existing=DB.budgets.find(b=>b.user_id===currentUser.user_id&&b.month_year===monthYear);
  if (existing) {
    const old = existing.monthly_limit;
    existing.monthly_limit=limit;
    logAudit('UPDATE', 'budget', `Budget for ${monthYear}: ₹${old} → ₹${limit}`);
    showToast(`✅ Budget updated for ${monthYear} → ${fmt(limit)}`,'success');
  } else {
    DB.budgets.push({budget_id:DB.nextBudgetId++,monthly_limit:limit,month_year:monthYear,user_id:currentUser.user_id});
    logAudit('INSERT', 'budget', `New budget for ${monthYear}: ₹${limit}`);
    showToast(`✅ Budget set for ${monthYear} → ${fmt(limit)}`,'success');
  }
  saveDB();
  renderBudgetTab(); renderDashboard();
}

function renderBudgetTab() {
  if (!currentUser) return;
  const myBudgets=DB.budgets.filter(b=>b.user_id===currentUser.user_id).sort((a,b)=>b.month_year.localeCompare(a.month_year));
  const ha=document.getElementById('budget-history-area');
  if (!myBudgets.length) { ha.innerHTML='<div class="empty-state"><div class="empty-icon">🎯</div><p>No budgets set yet</p></div>'; }
  else {
    ha.innerHTML=myBudgets.map(b=>{
      const spent=getExpensesForUser(currentUser.user_id,b.month_year).reduce((a,x)=>a+x.amount,0);
      const pct=Math.min(100,(spent/b.monthly_limit)*100);
      const cls=pct>=100?'bar-danger':pct>=80?'bar-warn':'bar-safe';
      return `<div class="budget-bar-wrap">
        <div class="budget-bar-header"><span style="font-family:'Syne',sans-serif">${b.month_year}</span><span>${fmt(spent)} / ${fmt(b.monthly_limit)}</span></div>
        <div class="budget-bar-track"><div class="budget-bar-fill ${cls}" style="width:${pct}%"></div></div>
        <div style="font-size:.7rem;color:var(--text-dim);margin-top:4px">${pct.toFixed(1)}% used — ${fmt(b.monthly_limit-spent)} remaining</div>
      </div>`;
    }).join('');
  }
  const bva=document.getElementById('bva-area');
  if (!myBudgets.length) { bva.innerHTML='<div class="empty-state"><div class="empty-icon">📈</div><p>Set a budget to see comparison</p></div>'; }
  else {
    bva.innerHTML=`<table class="data-table"><thead><tr><th>Month</th><th>Budget Limit</th><th>Actual Spent</th><th>Remaining</th><th>Status</th></tr></thead><tbody>
      ${myBudgets.map(b=>{
        const spent=getExpensesForUser(currentUser.user_id,b.month_year).reduce((a,x)=>a+x.amount,0);
        const rem=b.monthly_limit-spent;
        const pct=(spent/b.monthly_limit)*100;
        const status=pct>=100?'🔴 Over':pct>=80?'🟡 Warn':'🟢 OK';
        return `<tr>
          <td style="font-family:'Syne',sans-serif">${b.month_year}</td>
          <td class="amount-cell">${fmt(b.monthly_limit)}</td>
          <td class="amount-cell amount-neg">${fmt(spent)}</td>
          <td class="amount-cell" style="color:${rem<0?'var(--danger)':'var(--success)'}">
            ${fmt(Math.abs(rem))}${rem<0?' over':''}
          </td>
          <td>${status} (${pct.toFixed(0)}%)</td>
        </tr>`;
      }).join('')}</tbody></table>`;
  }
}
