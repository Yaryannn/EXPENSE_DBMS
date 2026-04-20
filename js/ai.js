// ═══════════════════════════════════════════
//  AI AGENT — Claude API Financial Advisor
// ═══════════════════════════════════════════

// ─── API KEY MANAGEMENT ───────────────────
function saveAPIKey() {
  const key = document.getElementById('ai-api-key').value.trim();
  const status = document.getElementById('api-key-status');
  if (!key) { status.textContent='❌ Please enter a key.'; status.style.color='var(--danger)'; return; }
  if (!key.startsWith('sk-')) { status.textContent='⚠️ Key should start with "sk-". Saved anyway.'; status.style.color='var(--warn)'; }
  else { status.textContent='✅ API key saved! You can now chat with the AI.'; status.style.color='var(--success)'; }
  localStorage.setItem('expenseiq_api_key', key);
}

function getAPIKey() {
  return localStorage.getItem('expenseiq_api_key') || '';
}

function loadSavedKey() {
  const key = getAPIKey();
  const input = document.getElementById('ai-api-key');
  const status = document.getElementById('api-key-status');
  if (key && input) {
    input.value = key;
    status.textContent = '✅ API key loaded from saved session.';
    status.style.color = 'var(--success)';
  }
}

function renderAIContext() {
  if (!currentUser) return;
  loadSavedKey();
  const now=THIS_MONTH;
  const exps=getExpensesForUser(currentUser.user_id,now);
  const totalSpent=exps.reduce((a,b)=>a+b.amount,0);
  const budget=getBudget(currentUser.user_id,now);
  const catSpend=getCategorySpend(currentUser.user_id,now);
  const topCat=Object.entries(catSpend).sort((a,b)=>b[1]-a[1])[0];
  document.getElementById('ai-context-preview').innerHTML=`
    <div>Month: <strong>${now}</strong></div>
    <div>Total Spent: <strong>${fmt(totalSpent)}</strong></div>
    <div>Budget: <strong>${budget?fmt(budget.monthly_limit):'Not set'}</strong></div>
    <div>Remaining: <strong>${budget?fmt(budget.monthly_limit-totalSpent):'N/A'}</strong></div>
    <div>Transactions: <strong>${exps.length}</strong></div>
    <div>Top Category: <strong>${topCat?getCategoryById(parseInt(topCat[0]))?.category_name:'None'}</strong></div>
    <div style="margin-top:8px;color:var(--text-muted);font-size:.7rem">This context is automatically sent to Claude AI with every message.</div>`;
}

function getFinancialContext() {
  if (!currentUser) return '';
  const now=THIS_MONTH;
  const exps=getExpensesForUser(currentUser.user_id,now);
  const totalSpent=exps.reduce((a,b)=>a+b.amount,0);
  const budget=getBudget(currentUser.user_id,now);
  const catSpend=getCategorySpend(currentUser.user_id,now);
  const catBreakdown=Object.entries(catSpend).map(([id,amt])=>{
    const cat=getCategoryById(parseInt(id));
    return `${cat?.category_name}: ₹${amt.toLocaleString('en-IN')}`;
  }).join(', ');
  return `User "${currentUser.username}" financial data for ${now}:
- Total spent: ₹${totalSpent.toLocaleString('en-IN')}
- Monthly budget: ${budget?'₹'+budget.monthly_limit.toLocaleString('en-IN'):'Not set'}
- Budget remaining: ${budget?'₹'+(budget.monthly_limit-totalSpent).toLocaleString('en-IN'):'N/A'}
- Transactions: ${exps.length}
- By category: ${catBreakdown||'None'}
- Recent: ${exps.slice(-3).map(e=>`${e.description} (₹${e.amount})`).join(', ')||'None'}
This is the ExpenseIQ DBMS project with tables: USER, CATEGORY, EXPENSE, BUDGET. It demonstrates foreign keys, constraints, triggers, views, and role-based access (DBA/Editor/Viewer).`;
}

async function sendAIMsg() {
  const input=document.getElementById('ai-input');
  const msg=input.value.trim();
  if (!msg) return;

  const apiKey = getAPIKey();
  if (!apiKey) {
    showToast('❌ Please enter your Anthropic API key in the setup box above.','error');
    return;
  }

  const messagesEl=document.getElementById('ai-messages');
  const btn=document.getElementById('ai-send-btn');
  messagesEl.innerHTML+=`<div class="msg msg-user"><div class="msg-label">👤 You</div>${escHtml(msg)}</div>`;
  input.value='';
  btn.disabled=true;
  const thinkId='thinking-'+Date.now();
  messagesEl.innerHTML+=`<div class="msg msg-ai" id="${thinkId}">
    <div class="msg-label">🤖 AI</div>
    <div class="ai-thinking">Analyzing<div class="dot-anim"><span></span><span></span><span></span></div></div>
  </div>`;
  messagesEl.scrollTop=messagesEl.scrollHeight;
  try {
    const response=await fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        'x-api-key': apiKey,
        'anthropic-version':'2023-06-01',
        'anthropic-dangerous-direct-browser-access':'true'
      },
      body:JSON.stringify({
        model:'claude-sonnet-4-20250514',
        max_tokens:1000,
        system:`You are ExpenseIQ's AI Financial Advisor in a DBMS course project. Help users analyze spending, give budget advice, suggest savings, and explain SQL/DBMS concepts (triggers, views, joins, group by, foreign keys, roles/privileges, constraints). Be concise and practical. Use ₹ for Indian Rupees. Format with line breaks.\n\nUser financial context:\n${getFinancialContext()}`,
        messages:[{role:'user',content:msg}]
      })
    });
    if (!response.ok) {
      const err=await response.json();
      throw new Error(err.error?.message||`HTTP ${response.status}`);
    }
    const data=await response.json();
    const reply=data.content?.find(c=>c.type==='text')?.text||"Sorry, I couldn't generate a response.";
    const thinkEl=document.getElementById(thinkId);
    if (thinkEl) thinkEl.innerHTML=`<div class="msg-label">🤖 ExpenseIQ AI</div>${reply.replace(/\n/g,'<br>')}`;
  } catch(err) {
    const thinkEl=document.getElementById(thinkId);
    let errorMsg = err.message;
    if (errorMsg.includes('401') || errorMsg.includes('authentication')) {
      errorMsg = 'Invalid API key. Please check your key and try again.';
    } else if (errorMsg.includes('Failed to fetch') || errorMsg.includes('NetworkError')) {
      errorMsg = 'Network error. CORS may be blocking the request — try using a proxy or running from a server.';
    }
    if (thinkEl) thinkEl.innerHTML=`<div class="msg-label">🤖 ExpenseIQ AI</div>⚠️ ${escHtml(errorMsg)}`;
  }
  btn.disabled=false;
  messagesEl.scrollTop=messagesEl.scrollHeight;
}

function askSuggestion(btn) {
  document.getElementById('ai-input').value=btn.textContent.trim();
  sendAIMsg();
}

function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
