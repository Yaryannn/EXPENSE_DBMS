// ═══════════════════════════════════════════
//  REPORTS & CHARTS — SUM, GROUP BY
// ═══════════════════════════════════════════
function renderDashboard() {
  if (!currentUser) return;
  const now=THIS_MONTH;
  const exps=getExpensesForUser(currentUser.user_id,now);
  const budget=getBudget(currentUser.user_id,now);
  const totalSpent=exps.reduce((a,b)=>a+b.amount,0);
  const budgetLimit=budget?budget.monthly_limit:0;
  const remaining=budgetLimit-totalSpent;
  const maxExp=exps.length?exps.reduce((a,b)=>b.amount>a.amount?b:a):null;
  document.getElementById('stat-spent').textContent=fmt(totalSpent);
  document.getElementById('stat-spent-sub').textContent=`vs ${fmt(budgetLimit)} budget`;
  document.getElementById('stat-remaining').textContent=fmt(Math.max(0,remaining));
  document.getElementById('stat-remaining-sub').textContent=remaining<0?'⚠️ Over budget!':'remaining';
  document.getElementById('stat-count').textContent=exps.length;
  document.getElementById('stat-max').textContent=maxExp?fmt(maxExp.amount):'₹0';
  document.getElementById('stat-max-cat').textContent=maxExp?(getCategoryById(maxExp.category_id)?.category_name||'—'):'—';
  renderAlerts(totalSpent,budgetLimit);
  renderBudgetBars(totalSpent,budgetLimit);
  renderDonut(getCategorySpend(currentUser.user_id,now));
  renderRecentExpenses(exps);
}

function renderAlerts(spent,limit) {
  const area=document.getElementById('alerts-area');
  area.innerHTML='';
  if (!limit) return;
  const pct=(spent/limit)*100;
  if (pct>=100) area.innerHTML=`<div class="alert-banner alert-danger">🚨 <strong>TRIGGER FIRED:</strong> Budget exceeded! Spent ${fmt(spent)} of ${fmt(limit)}.</div>`;
  else if (pct>=80) area.innerHTML=`<div class="alert-banner alert-warn">⚠️ Warning: ${pct.toFixed(1)}% of budget used. ${fmt(limit-spent)} remaining.</div>`;
  else area.innerHTML=`<div class="alert-banner alert-success">✅ Budget on track! ${pct.toFixed(1)}% used — ${fmt(limit-spent)} left.</div>`;
}

function renderBudgetBars(spent,limit) {
  const area=document.getElementById('budget-bars-area');
  if (!limit) { area.innerHTML='<div class="empty-state"><div class="empty-icon">🎯</div><p>No budget set for this month.</p></div>'; return; }
  const pct=Math.min(100,(spent/limit)*100);
  const cls=pct>=100?'bar-danger':pct>=80?'bar-warn':'bar-safe';
  area.innerHTML=`<div class="budget-bar-wrap">
    <div class="budget-bar-header"><span>Monthly Budget</span><span>${fmt(spent)} / ${fmt(limit)}</span></div>
    <div class="budget-bar-track"><div class="budget-bar-fill ${cls}" style="width:${pct}%"></div></div>
    <div style="font-size:.72rem;color:var(--text-dim);margin-top:5px">${pct.toFixed(1)}% used</div>
  </div>`;
}

// ─── DONUT CHART ───────────────────────────
function renderDonut(catSpend) {
  const wrap=document.getElementById('donut-wrap');
  const entries=Object.entries(catSpend).map(([id,amt])=>({cat:getCategoryById(parseInt(id)),amt})).sort((a,b)=>b.amt-a.amt);
  if (!entries.length) { wrap.innerHTML='<div class="empty-state" style="width:100%"><div class="empty-icon">📊</div><p>Add expenses to see breakdown</p></div>'; return; }
  const total=entries.reduce((a,b)=>a+b.amt,0);
  const r=60, cx=70, cy=70, strokeW=26;
  const circ=2*Math.PI*r;
  let cumPct=0;
  let segments='';
  entries.forEach((e,i)=>{
    const pct=e.amt/total;
    const dash=pct*circ;
    const gap=circ-dash;
    const offset=-(cumPct*circ);
    segments+=`<circle cx="${cx}" cy="${cy}" r="${r}" fill="none"
      stroke="${e.cat?.color||'#888'}" stroke-width="${strokeW}"
      stroke-dasharray="${dash.toFixed(2)} ${gap.toFixed(2)}"
      stroke-dashoffset="${offset.toFixed(2)}"
      transform="rotate(-90 ${cx} ${cy})"
      style="transition:stroke-dasharray .6s ease"/>`;
    cumPct+=pct;
  });
  const legendHTML=entries.slice(0,6).map((e,i)=>`
    <div class="legend-item">
      <div class="legend-dot" style="background:${e.cat?.color||'#888'}"></div>
      <div class="legend-name">${e.cat?.icon||'📦'} ${e.cat?.category_name||'Other'}</div>
      <div class="legend-val">${fmt(e.amt)}</div>
      <div class="legend-pct">${((e.amt/total)*100).toFixed(0)}%</div>
    </div>`).join('');
  wrap.innerHTML=`
    <svg class="donut-svg" width="140" height="140" viewBox="0 0 140 140">
      <circle cx="70" cy="70" r="${r}" fill="none" stroke="var(--surface3)" stroke-width="${strokeW}"/>
      ${segments}
      <text x="70" y="66" text-anchor="middle" fill="var(--text)" font-family="Fraunces,serif" font-size="11">${fmt(total)}</text>
      <text x="70" y="80" text-anchor="middle" fill="var(--text-dim)" font-family="DM Mono,monospace" font-size="8">total</text>
    </svg>
    <div class="donut-legend">${legendHTML}</div>`;
}

function renderRecentExpenses(exps) {
  const area=document.getElementById('recent-expenses-area');
  const last5=[...exps].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,5);
  if (!last5.length) { area.innerHTML='<div class="empty-state"><div class="empty-icon">💸</div><p>No expenses yet</p></div>'; return; }
  area.innerHTML=`<table class="data-table"><thead><tr><th>Date</th><th>Description</th><th>Category</th><th>Amount</th></tr></thead>
    <tbody>${last5.map(e=>{
      const cat=getCategoryById(e.category_id);
      return `<tr><td>${e.date}</td><td>${e.description}</td>
        <td><span class="cat-tag" style="background:${cat?.color}22;color:${cat?.color}">${cat?.icon} ${cat?.category_name}</span></td>
        <td class="amount-cell amount-neg">${fmt(e.amount)}</td></tr>`;
    }).join('')}</tbody></table>`;
}

// ─── REPORTS TAB ───────────────────────────
function renderReports() {
  if (!currentUser) return;
  // Monthly bar chart
  const allExps=DB.expenses.filter(e=>e.user_id===currentUser.user_id);
  const byMonth={};
  allExps.forEach(e=>{ const m=e.date.slice(0,7); byMonth[m]=(byMonth[m]||0)+e.amount; });
  const chartEl=document.getElementById('monthly-chart');
  if (!Object.keys(byMonth).length) {
    chartEl.innerHTML='<div class="empty-state" style="width:100%"><div class="empty-icon">📈</div><p>Add expenses to see trends</p></div>';
  } else {
    const maxVal=Math.max(...Object.values(byMonth));
    const months=Object.keys(byMonth).sort();
    const CHART_H=130;
    chartEl.innerHTML=months.map(m=>{
      const val=byMonth[m];
      const h=Math.max(8,Math.round((val/maxVal)*CHART_H));
      return `<div class="chart-bar-group">
        <div class="chart-bar" style="height:${h}px;background:linear-gradient(180deg,var(--accent),#8b5cf6)" data-val="${fmt(val)}"></div>
        <div class="chart-bar-label">${m.slice(5)}</div>
      </div>`;
    }).join('');
  }

  // Top categories (all time)
  const catSpend=getCategorySpend(currentUser.user_id,null);
  const catArea=document.getElementById('top-cats-area');
  const entries=Object.entries(catSpend).map(([id,amt])=>({cat:getCategoryById(parseInt(id)),amt})).sort((a,b)=>b.amt-a.amt);
  if (!entries.length) { catArea.innerHTML='<div class="empty-state"><div class="empty-icon">🏆</div><p>No data</p></div>'; }
  else {
    const maxA=entries[0].amt;
    const medals=['🥇','🥈','🥉','4️⃣','5️⃣'];
    catArea.innerHTML=entries.slice(0,5).map((e,i)=>{
      const pct=(e.amt/maxA)*100;
      return `<div style="margin-bottom:14px">
        <div style="display:flex;justify-content:space-between;font-size:.82rem;margin-bottom:5px">
          <span>${medals[i]} ${e.cat?.icon} ${e.cat?.category_name}</span>
          <span style="font-family:'Fraunces',serif">${fmt(e.amt)}</span>
        </div>
        <div class="budget-bar-track"><div class="budget-bar-fill bar-safe" style="width:${pct}%;background:${e.cat?.color}"></div></div>
      </div>`;
    }).join('');
  }

  // Monthly summary
  const now=THIS_MONTH;
  const thisMonExps=getExpensesForUser(currentUser.user_id,now);
  const totalNow=thisMonExps.reduce((a,b)=>a+b.amount,0);
  const bud=getBudget(currentUser.user_id,now);
  document.getElementById('monthly-report-area').innerHTML=`
    <div style="font-size:.82rem;line-height:2.2">
      <div style="display:flex;justify-content:space-between"><span style="color:var(--text-dim)">Period</span><span>${now}</span></div>
      <div style="display:flex;justify-content:space-between"><span style="color:var(--text-dim)">Transactions</span><span>${thisMonExps.length}</span></div>
      <div style="display:flex;justify-content:space-between"><span style="color:var(--text-dim)">Total Spent</span><span style="font-family:'Fraunces',serif">${fmt(totalNow)}</span></div>
      <div style="display:flex;justify-content:space-between"><span style="color:var(--text-dim)">Budget Limit</span><span>${bud?fmt(bud.monthly_limit):'Not set'}</span></div>
      <div style="display:flex;justify-content:space-between"><span style="color:var(--text-dim)">Remaining</span>
        <span style="color:${bud&&(bud.monthly_limit-totalNow)<0?'var(--danger)':'var(--success)'}">
          ${bud?fmt(bud.monthly_limit-totalNow):'—'}
        </span>
      </div>
      <div style="display:flex;justify-content:space-between"><span style="color:var(--text-dim)">Avg / Day</span><span>${fmt(Math.round(totalNow/30))}</span></div>
      <div style="display:flex;justify-content:space-between"><span style="color:var(--text-dim)">Categories Used</span><span>${new Set(thisMonExps.map(e=>e.category_id)).size}</span></div>
    </div>`;

  // Pie chart (canvas-based, all time)
  renderPieChart(catSpend);

  // NEW CHARTS
  renderDailyChart();
  renderCategoryBarChart(catSpend);
  renderHeatmap();
  renderBudgetUtilChart();
  renderAvgCategory(catSpend);
}

function renderPieChart(catSpend) {
  const area=document.getElementById('pie-chart-area');
  const entries=Object.entries(catSpend).map(([id,amt])=>({cat:getCategoryById(parseInt(id)),amt})).sort((a,b)=>b.amt-a.amt);
  if (!entries.length) { area.innerHTML='<div class="empty-state"><div class="empty-icon">🥧</div><p>No data</p></div>'; return; }
  const total=entries.reduce((a,b)=>a+b.amt,0);
  area.innerHTML=`<div class="pie-canvas-wrap"><canvas id="pie-canvas" width="220" height="220"></canvas>
    <div style="flex:1;min-width:180px">${entries.map(e=>`
      <div style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid rgba(42,42,69,.4);font-size:.82rem">
        <div style="width:12px;height:12px;border-radius:3px;background:${e.cat?.color||'#888'};flex-shrink:0"></div>
        <span style="flex:1;color:var(--text-dim)">${e.cat?.icon} ${e.cat?.category_name}</span>
        <span style="font-family:'Fraunces',serif">${fmt(e.amt)}</span>
        <span style="color:var(--text-muted);font-size:.75rem">${((e.amt/total)*100).toFixed(1)}%</span>
      </div>`).join('')}
    </div>
  </div>`;
  // Draw pie
  requestAnimationFrame(()=>{
    const canvas=document.getElementById('pie-canvas');
    if (!canvas) return;
    const ctx=canvas.getContext('2d');
    const cx=110, cy=110, r=100;
    let startAngle=-Math.PI/2;
    ctx.clearRect(0,0,220,220);
    entries.forEach(e=>{
      const slice=(e.amt/total)*(2*Math.PI);
      ctx.beginPath();
      ctx.moveTo(cx,cy);
      ctx.arc(cx,cy,r,startAngle,startAngle+slice);
      ctx.closePath();
      ctx.fillStyle=e.cat?.color||'#888';
      ctx.fill();
      ctx.strokeStyle='#070710';
      ctx.lineWidth=2;
      ctx.stroke();
      startAngle+=slice;
    });
    // Center hole
    ctx.beginPath();
    ctx.arc(cx,cy,55,0,2*Math.PI);
    ctx.fillStyle='#0f0f1c';
    ctx.fill();
    // Center text
    ctx.fillStyle='#e8e8f8';
    ctx.textAlign='center';
    ctx.font='bold 13px Syne,sans-serif';
    ctx.fillText(fmt(total),cx,cy-4);
    ctx.font='10px DM Mono,monospace';
    ctx.fillStyle='#7878a8';
    ctx.fillText('all time',cx,cy+14);
  });
}

// ─── DAILY SPENDING CHART ─────────────────
function renderDailyChart() {
  const chartEl=document.getElementById('daily-chart');
  if (!chartEl) return;
  const exps=getExpensesForUser(currentUser.user_id,THIS_MONTH);
  const byDay={};
  exps.forEach(e=>{ const d=parseInt(e.date.slice(8,10)); byDay[d]=(byDay[d]||0)+e.amount; });
  if (!Object.keys(byDay).length) {
    chartEl.innerHTML='<div class="empty-state" style="width:100%"><div class="empty-icon">📅</div><p>No data for this month</p></div>'; return;
  }
  const maxVal=Math.max(...Object.values(byDay));
  const days=Object.keys(byDay).map(Number).sort((a,b)=>a-b);
  const CHART_H=110;
  chartEl.innerHTML=days.map(d=>{
    const val=byDay[d];
    const h=Math.max(6,Math.round((val/maxVal)*CHART_H));
    return `<div class="chart-bar-group">
      <div class="chart-bar" style="height:${h}px;background:linear-gradient(180deg,var(--accent3),#38f9d7)" data-val="${fmt(val)}"></div>
      <div class="chart-bar-label">${d}</div>
    </div>`;
  }).join('');
}

// ─── CATEGORY BAR CHART ───────────────────
function renderCategoryBarChart(catSpend) {
  const chartEl=document.getElementById('cat-bar-chart');
  if (!chartEl) return;
  const entries=Object.entries(catSpend).map(([id,amt])=>({cat:getCategoryById(parseInt(id)),amt})).sort((a,b)=>b.amt-a.amt);
  if (!entries.length) {
    chartEl.innerHTML='<div class="empty-state" style="width:100%"><div class="empty-icon">📊</div><p>No data yet</p></div>'; return;
  }
  const maxVal=entries[0].amt;
  const CHART_H=110;
  chartEl.innerHTML=entries.map(e=>{
    const h=Math.max(6,Math.round((e.amt/maxVal)*CHART_H));
    return `<div class="chart-bar-group">
      <div class="chart-bar" style="height:${h}px;background:${e.cat?.color||'#888'}" data-val="${fmt(e.amt)}"></div>
      <div class="chart-bar-label">${e.cat?.icon||'📦'}</div>
    </div>`;
  }).join('');
}

// ─── SPENDING HEATMAP (Last 30 Days) ──────
function renderHeatmap() {
  const area=document.getElementById('heatmap-area');
  if (!area) return;
  const exps=DB.expenses.filter(e=>e.user_id===currentUser.user_id);
  const byDate={};
  exps.forEach(e=>{ byDate[e.date]=(byDate[e.date]||0)+e.amount; });
  if (!Object.keys(byDate).length) {
    area.innerHTML='<div class="empty-state"><div class="empty-icon">🔥</div><p>No data yet</p></div>'; return;
  }
  // Generate last 30 days
  const days=[];
  for (let i=29;i>=0;i--) {
    const d=new Date(TODAY);
    d.setDate(d.getDate()-i);
    days.push(d.toISOString().slice(0,10));
  }
  const maxVal=Math.max(...Object.values(byDate),1);
  area.innerHTML=`<div style="display:flex;flex-wrap:wrap;gap:4px">
    ${days.map(d=>{
      const val=byDate[d]||0;
      const intensity=val/maxVal;
      const bg=val===0?'var(--surface3)':`rgba(108,99,255,${(0.15+intensity*0.85).toFixed(2)})`;
      const label=new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short'});
      return `<div title="${label}: ${fmt(val)}" style="width:28px;height:28px;border-radius:6px;background:${bg};display:flex;align-items:center;justify-content:center;font-size:.55rem;color:${val?'white':'var(--text-muted)'};cursor:pointer;transition:transform .15s;border:1px solid ${val?'transparent':'var(--border)'}" onmouseover="this.style.transform='scale(1.3)'" onmouseout="this.style.transform='scale(1)'">${parseInt(d.slice(8,10))}</div>`;
    }).join('')}
  </div>
  <div style="display:flex;align-items:center;gap:8px;margin-top:12px;font-size:.72rem;color:var(--text-dim)">
    <span>Less</span>
    ${[0,.25,.5,.75,1].map(i=>`<div style="width:16px;height:16px;border-radius:4px;background:${i===0?'var(--surface3)':`rgba(108,99,255,${(0.15+i*0.85).toFixed(2)})`}"></div>`).join('')}
    <span>More</span>
  </div>`;
}

// ─── BUDGET UTILIZATION CHART ─────────────
function renderBudgetUtilChart() {
  const chartEl=document.getElementById('budget-util-chart');
  if (!chartEl) return;
  const myBudgets=DB.budgets.filter(b=>b.user_id===currentUser.user_id).sort((a,b)=>a.month_year.localeCompare(b.month_year));
  if (!myBudgets.length) {
    chartEl.innerHTML='<div class="empty-state" style="width:100%"><div class="empty-icon">💰</div><p>Set budgets to see utilization</p></div>'; return;
  }
  const CHART_H=110;
  chartEl.innerHTML=myBudgets.map(b=>{
    const spent=getExpensesForUser(currentUser.user_id,b.month_year).reduce((a,x)=>a+x.amount,0);
    const pct=Math.min(150,(spent/b.monthly_limit)*100);
    const h=Math.max(6,Math.round((pct/150)*CHART_H));
    const color=pct>=100?'var(--danger)':pct>=80?'var(--warn)':'var(--accent3)';
    return `<div class="chart-bar-group">
      <div class="chart-bar" style="height:${h}px;background:${color}" data-val="${pct.toFixed(0)}% used"></div>
      <div class="chart-bar-label">${b.month_year.slice(5)}</div>
    </div>`;
  }).join('');
}

// ─── AVERAGE EXPENSE PER CATEGORY ─────────
function renderAvgCategory(catSpend) {
  const area=document.getElementById('avg-cat-area');
  if (!area) return;
  const allExps=DB.expenses.filter(e=>e.user_id===currentUser.user_id);
  const catCount={}, catTotal={};
  allExps.forEach(e=>{
    catCount[e.category_id]=(catCount[e.category_id]||0)+1;
    catTotal[e.category_id]=(catTotal[e.category_id]||0)+e.amount;
  });
  const entries=Object.keys(catTotal).map(id=>({
    cat:getCategoryById(parseInt(id)),
    avg:catTotal[id]/catCount[id],
    count:catCount[id]
  })).sort((a,b)=>b.avg-a.avg);
  if (!entries.length) {
    area.innerHTML='<div class="empty-state"><div class="empty-icon">🧮</div><p>No data yet</p></div>'; return;
  }
  const maxAvg=entries[0].avg;
  area.innerHTML=entries.map(e=>{
    const pct=(e.avg/maxAvg)*100;
    return `<div style="margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;font-size:.82rem;margin-bottom:4px">
        <span>${e.cat?.icon} ${e.cat?.category_name} <span style="color:var(--text-muted);font-size:.72rem">(${e.count} txns)</span></span>
        <span style="font-family:'Fraunces',serif">${fmt(Math.round(e.avg))}</span>
      </div>
      <div class="budget-bar-track"><div class="budget-bar-fill" style="width:${pct}%;background:${e.cat?.color};border-radius:99px"></div></div>
    </div>`;
  }).join('');
}
