# 💰 ExpenseIQ v2.0 Enhanced — Smart Expense & Budget Management System
### DBMS Course Project | Frontend + SQL Concepts

---

## ✨ What's New in v2.0 (Enhanced)

| Feature | Description | DBMS Concept |
|---------|-------------|--------------|
| **localStorage Persistence** | Data survives page refresh/browser close | Simulates persistent storage |
| **Audit / Transaction Log** | All INSERT, UPDATE, DELETE, LOGIN actions logged | Transaction logging / Redo log |
| **CSV Export** | Download all expenses as `.csv` file | Data export / SELECT INTO OUTFILE |
| **Search Expenses** | Real-time search filter by description | WHERE ... LIKE '%keyword%' |
| **Light / Dark Theme** | Toggle between dark and light mode | — |
| **Reset Database** | One-click reset to default seed data | DROP + re-CREATE |

---

## 📁 Project Structure

```
expenseiq-enhanced/
├── index.html          ← Main HTML (all pages, tabs, forms)
├── css/
│   └── style.css       ← All styling (dark/light theme, layout, components)
├── js/
│   ├── db.js           ← Database + localStorage + Audit log + SQL helpers
│   ├── auth.js         ← Login, Register, Role permissions (GRANT/REVOKE)
│   ├── expenses.js     ← Add/Edit/Delete + Search + CSV Export
│   ├── budget.js       ← Set budget, Budget vs Actual (UPSERT)
│   ├── reports.js      ← Dashboard, Charts, Reports (SUM, GROUP BY)
│   ├── dba.js          ← DBA Panel: Create users, Privileges, Audit Log
│   ├── ai.js           ← AI Financial Advisor (Claude API)
│   └── ui.js           ← Page routing, tabs, toast, modal, theme toggle
└── README.md           ← This file
```

---

## 🚀 How to Run

**Option 1 — Just double-click:**
Open `index.html` in any browser. No server needed.

**Option 2 — VS Code Live Server:**
1. Install "Live Server" extension in VS Code
2. Right-click `index.html` → "Open with Live Server"
3. Opens at `http://localhost:5500`

---

## 🔑 Demo Accounts

| Username | Password | Role      | SQL Equivalent                        |
|----------|----------|-----------|---------------------------------------|
| admin    | admin123 | DBA       | GRANT ALL PRIVILEGES WITH GRANT OPTION|
| editor   | edit123  | Editor    | GRANT SELECT, INSERT, UPDATE          |
| viewer   | view123  | Viewer    | GRANT SELECT only                     |

---

## 🗄️ Database Schema (4 Tables from ER Diagram)

```sql
CREATE TABLE user (
  user_id       INT PRIMARY KEY AUTO_INCREMENT,
  username      VARCHAR(50)  UNIQUE NOT NULL,
  email         VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL
);

CREATE TABLE category (
  category_id   INT PRIMARY KEY AUTO_INCREMENT,
  category_name VARCHAR(50) NOT NULL
);

CREATE TABLE budget (
  budget_id     INT PRIMARY KEY AUTO_INCREMENT,
  monthly_limit FLOAT NOT NULL,
  month_year    VARCHAR(7) NOT NULL,
  user_id       INT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES user(user_id),
  UNIQUE (user_id, month_year)
);

CREATE TABLE expense (
  expense_id  INT   PRIMARY KEY AUTO_INCREMENT,
  amount      FLOAT NOT NULL CHECK (amount > 0),
  description VARCHAR(255),
  date        DATE  NOT NULL,
  user_id     INT   NOT NULL,
  category_id INT   NOT NULL,
  FOREIGN KEY (user_id)     REFERENCES user(user_id),
  FOREIGN KEY (category_id) REFERENCES category(category_id)
);
```

---

## 🧠 SQL Concepts Demonstrated

| Concept         | Where Used                                    |
|-----------------|-----------------------------------------------|
| PRIMARY KEY     | All 4 tables (AUTO_INCREMENT)                 |
| FOREIGN KEY     | expense.user_id → user, expense.category_id → category |
| UNIQUE          | username, email, (user_id+month_year) in budget |
| CHECK           | amount > 0 in expense table                   |
| NOT NULL        | Required fields across all tables             |
| JOIN            | expense + category (for category names)        |
| SUM + GROUP BY  | Category spending, monthly totals for charts  |
| TRIGGER         | AFTER INSERT on expense → check_budget_limit  |
| VIEW            | expense_summary_view for viewer-role users    |
| GRANT/REVOKE    | DBA/Editor/Viewer role permissions            |
| INSERT          | addExpense(), registerUser(), setBudget()     |
| UPDATE          | saveEditExpense(), setBudget() UPSERT         |
| DELETE          | deleteExpense()                               |
| SELECT          | All render functions                          |
| **Transaction Log** | Audit log tracks all DML operations       |
| **LIKE search** | Real-time description search in expenses      |
| **Export (SELECT INTO)** | CSV download of expense data         |

---

## ⚡ Trigger (Overspending Alert)

```sql
DELIMITER $$
CREATE TRIGGER check_budget_limit
AFTER INSERT ON expense
FOR EACH ROW
BEGIN
  DECLARE v_limit FLOAT;
  DECLARE v_spent FLOAT;
  DECLARE v_month VARCHAR(7);

  SET v_month = DATE_FORMAT(NEW.date, '%Y-%m');

  SELECT monthly_limit INTO v_limit
  FROM budget
  WHERE user_id = NEW.user_id AND month_year = v_month;

  SELECT COALESCE(SUM(amount), 0) INTO v_spent
  FROM expense
  WHERE user_id = NEW.user_id
    AND DATE_FORMAT(date, '%Y-%m') = v_month;

  IF v_limit IS NOT NULL AND v_spent > v_limit THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Budget exceeded!';
  END IF;
END$$
DELIMITER ;
```

---

## 🤖 AI Agent

The AI Agent tab connects to Claude AI (Anthropic API).
It sends the user's real financial data and returns personalized advice.

---
