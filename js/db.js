// ═══════════════════════════════════════════
//  DB — In-memory database with localStorage persistence
// ═══════════════════════════════════════════
const TODAY = new Date();
const THIS_MONTH = TODAY.toISOString().slice(0, 7);
const THIS_YEAR = TODAY.getFullYear();
const PREV_MONTH = new Date(TODAY.getFullYear(), TODAY.getMonth() - 1, 1).toISOString().slice(0,7);
const TWO_MONTH_AGO = new Date(TODAY.getFullYear(), TODAY.getMonth() - 2, 1).toISOString().slice(0,7);

const DEFAULT_DB = {
  users: [
    { user_id:1, username:'admin',  email:'admin@expenseiq.com',  password_hash:'admin123', role:'dba' },
    { user_id:2, username:'editor', email:'editor@expenseiq.com', password_hash:'edit123',  role:'editor' },
    { user_id:3, username:'viewer', email:'viewer@expenseiq.com', password_hash:'view123',  role:'viewer' },
  ],
  categories: [
    { category_id:1, category_name:'Food',          icon:'🍕', color:'#6c63ff' },
    { category_id:2, category_name:'Transport',     icon:'🚌', color:'#fc5c7d' },
    { category_id:3, category_name:'Shopping',      icon:'🛍️', color:'#43e97b' },
    { category_id:4, category_name:'Bills',         icon:'💡', color:'#f7971e' },
    { category_id:5, category_name:'Entertainment', icon:'🎬', color:'#38f9d7' },
    { category_id:6, category_name:'Health',        icon:'💊', color:'#ff6b6b' },
    { category_id:7, category_name:'Education',     icon:'📚', color:'#ffd700' },
    { category_id:8, category_name:'Other',         icon:'📦', color:'#8888a8' },
  ],
  expenses: [
    { expense_id:1,  amount:450,  description:'Lunch at Cafe',        date:THIS_MONTH+'-01', user_id:1, category_id:1 },
    { expense_id:2,  amount:120,  description:'Uber ride',            date:THIS_MONTH+'-02', user_id:1, category_id:2 },
    { expense_id:3,  amount:2200, description:'Monthly groceries',    date:THIS_MONTH+'-03', user_id:1, category_id:1 },
    { expense_id:4,  amount:999,  description:'Netflix subscription', date:THIS_MONTH+'-05', user_id:1, category_id:5 },
    { expense_id:5,  amount:3500, description:'Electricity bill',     date:THIS_MONTH+'-07', user_id:1, category_id:4 },
    { expense_id:6,  amount:650,  description:'Dinner with friends',  date:THIS_MONTH+'-10', user_id:1, category_id:1 },
    { expense_id:7,  amount:1200, description:'Pharmacy',             date:THIS_MONTH+'-12', user_id:1, category_id:6 },
    { expense_id:8,  amount:800,  description:'Online course',        date:THIS_MONTH+'-15', user_id:1, category_id:7 },
    { expense_id:9,  amount:3200, description:'Grocery shop',         date:PREV_MONTH+'-05', user_id:1, category_id:1 },
    { expense_id:10, amount:1500, description:'Electricity bill',     date:PREV_MONTH+'-08', user_id:1, category_id:4 },
    { expense_id:11, amount:800,  description:'Metro pass',           date:PREV_MONTH+'-10', user_id:1, category_id:2 },
    { expense_id:12, amount:2200, description:'Books & stationery',   date:PREV_MONTH+'-15', user_id:1, category_id:7 },
    { expense_id:13, amount:2800, description:'Grocery shop',         date:TWO_MONTH_AGO+'-04', user_id:1, category_id:1 },
    { expense_id:14, amount:900,  description:'Doctor visit',         date:TWO_MONTH_AGO+'-11', user_id:1, category_id:6 },
  ],
  budgets: [
    { budget_id:1, monthly_limit:15000, month_year:THIS_MONTH, user_id:1 },
    { budget_id:2, monthly_limit:12000, month_year:PREV_MONTH, user_id:1 },
  ],
  auditLog: [],
  nextExpenseId: 15,
  nextUserId: 4,
  nextBudgetId: 3,
};

// ─── LOAD / SAVE from localStorage ────────
function loadDB() {
  try {
    const saved = localStorage.getItem('expenseiq_db');
    if (saved) return JSON.parse(saved);
  } catch(e) { console.warn('Could not load from localStorage:', e); }
  return JSON.parse(JSON.stringify(DEFAULT_DB));
}

function saveDB() {
  try { localStorage.setItem('expenseiq_db', JSON.stringify(DB)); }
  catch(e) { console.warn('Could not save to localStorage:', e); }
}

function resetDB() {
  if (!confirm('⚠️ Reset all data to defaults? This cannot be undone.')) return;
  localStorage.removeItem('expenseiq_db');
  location.reload();
}

const DB = loadDB();

// ─── AUDIT LOG (transaction logging) ──────
function logAudit(action, table, detail) {
  DB.auditLog.push({
    timestamp: new Date().toISOString(),
    user: currentUser ? currentUser.username : 'system',
    action, table, detail
  });
  if (DB.auditLog.length > 50) DB.auditLog = DB.auditLog.slice(-50);
  saveDB();
}

// ─── SQL HELPERS ───────────────────────────
function getExpensesForUser(userId, monthYear) {
  return DB.expenses.filter(e =>
    e.user_id === userId && (!monthYear || e.date.slice(0,7) === monthYear)
  );
}
function getCategorySpend(userId, monthYear) {
  const exps = getExpensesForUser(userId, monthYear);
  const map = {};
  exps.forEach(e => { map[e.category_id] = (map[e.category_id] || 0) + e.amount; });
  return map;
}
function getBudget(userId, monthYear) {
  return DB.budgets.find(b => b.user_id === userId && b.month_year === monthYear) || null;
}
function getCategoryById(id) { return DB.categories.find(c => c.category_id === id); }
function fmt(n) { return '₹' + Number(n).toLocaleString('en-IN', {minimumFractionDigits:0}); }

// ─── PERMISSIONS ───────────────────────────
function getPermissions(role) {
  if (role==='dba')    return {canRead:true,canWrite:true,canDelete:true,canCreateUser:true,canUpdate:true};
  if (role==='editor') return {canRead:true,canWrite:true,canDelete:false,canCreateUser:false,canUpdate:true};
  if (role==='viewer') return {canRead:true,canWrite:false,canDelete:false,canCreateUser:false,canUpdate:false};
  return {canRead:false,canWrite:false,canDelete:false,canCreateUser:false,canUpdate:false};
}
