# SpendWise - Smart Student Expense & Budget Tracker

SpendWise is a full-stack, beginner-friendly student expense tracker web application built without any frontend framework. It features robust budget management, interactive spending analytics, goal-oriented savings tracking, advanced transaction filtering, CSV export, and monthly reporting.

---

## 🛠️ Technology Stack
- **Frontend**: HTML5, CSS3, Vanilla JavaScript (ES6+), [Chart.js](https://www.chartjs.org/) (via CDN)
- **Backend**: Node.js, Express.js
- **Database**: SQLite (using Node.js's native `node:sqlite` module, requiring Node >= 22.5.0)
- **Architecture**: RESTful API with Parameterized SQL & Client-Side Fetch

---

## 🚀 Features & Upgrades

### 1. 🎯 Advanced Budget Management
- **Overall Monthly Budget**: Set and update a monthly overall budget limit.
- **Category-wise Budgets**: Dedicated spending limits for each category (`Food`, `Travel`, `Education`, `Shopping`, `Bills`, `Entertainment`, `Other`).
- **Visual Progress Indicators**: Real-time progress bars color-coded by usage:
  - **Green**: Safe (< 80%)
  - **Amber / Yellow Warning**: Approaching budget (80% - 99%)
  - **Red / Danger**: Budget exceeded (≥ 100%)
- **Active Month Calculation**: Totals and percentage calculations reflect the selected month's database records.

### 2. 📈 Spending Analytics
- **Category Breakdown Chart**: Interactive Chart.js doughnut chart showing proportional spending.
- **6-Month Trend Chart**: Monthly bar chart visualizing month-over-month expenses.
- **KPI Metrics**: Total monthly expenditure, average daily spend, and highest spending category.
- **Honest Empty States**: Clean, informative UI state when no transactions exist for the selected month.

### 3. 🐷 Savings Goals & Contributions
- **Goal Management**: Create, edit, and delete targeted savings goals (e.g., *Semester Books*, *New Laptop*, *Emergency Fund*).
- **Target Dates**: Set optional completion dates.
- **Atomic Contributions**: Add contributions using SQLite database transactions (`BEGIN` ... `COMMIT` / `ROLLBACK`).
- **History Tracking**: View a chronological contribution history log for every goal.

### 4. 💳 Advanced Transaction Management
- **Search**: Search by description or notes.
- **Filters**: Filter by category and date range (`From Date` and `To Date`).
- **Sorting**: Sort by Date (Newest/Oldest) or Amount (Highest/Lowest).
- **Pagination**: Paginated view with Previous/Next controls and total sum.
- **Full CRUD**: Add, edit, and safely delete expenses with confirmation.
- **Optional Notes**: Add notes (e.g. *Split with friend*, *Online order*).

### 5. 📥 CSV Export
- Export filtered transactions for any selected month or date range into an RFC 4180-compliant `.csv` file.
- Handles quotes, commas, and newlines properly for smooth import into Excel or Google Sheets.

### 6. 📄 Monthly Report & Print Stylesheet
- View financial statements comparing current month with the previous month.
- Displays percentage change (e.g. `+15%` or `-10%`).
- Print-friendly layout: click **Print / Save as PDF** to generate clean reports without UI buttons or headers.

---

## 🗄️ Database Design & Schema Migrations

The database is stored locally in `spendwise.db`.

### 1. `expenses` Table
Stores all individual transactions.
```sql
CREATE TABLE expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    description TEXT NOT NULL,
    amount INTEGER NOT NULL,  -- Stored as integer paise (₹1 = 100 paise)
    category TEXT NOT NULL,
    date TEXT NOT NULL,       -- YYYY-MM-DD
    notes TEXT DEFAULT ''
);
```

### 2. `settings` Table
Key-value store for global settings and schema versioning.
```sql
CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
```

### 3. `category_budgets` Table
Holds spending limits for each category.
```sql
CREATE TABLE category_budgets (
    category TEXT PRIMARY KEY,
    amount INTEGER NOT NULL   -- Stored in paise
);
```

### 4. `savings_goals` Table
Tracks student savings goals.
```sql
CREATE TABLE savings_goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    target_amount INTEGER NOT NULL,  -- Stored in paise
    current_amount INTEGER NOT NULL DEFAULT 0,
    target_date TEXT,
    created_at TEXT NOT NULL
);
```

### 5. `savings_contributions` Table
Log of individual contributions towards a goal.
```sql
CREATE TABLE savings_contributions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    goal_id INTEGER NOT NULL,
    amount INTEGER NOT NULL,         -- Stored in paise
    date TEXT NOT NULL,
    note TEXT,
    FOREIGN KEY (goal_id) REFERENCES savings_goals(id) ON DELETE CASCADE
);
```

### Non-Destructive Migrations (Schema v2)
On server startup:
1. Verifies if the `notes` column exists in `expenses`; adds it via `ALTER TABLE` if missing.
2. Checks `schema_version` in `settings`. If legacy rupee values exist, safely scales them to integer paise (`amount * 100`), updates the version to `2`, and preserves all original records.

---

## 🔌 API Endpoints Reference

### Expenses
- `GET /api/expenses` - Fetch expenses with query filters: `search`, `category`, `startDate`, `endDate`, `month`, `sortBy`, `sortOrder`, `page`, `limit`.
- `POST /api/expenses` - Create a new expense (`description`, `amount`, `category`, `date`, `notes`).
- `PUT /api/expenses/:id` - Update an expense.
- `DELETE /api/expenses/:id` - Delete an expense.
- `GET /api/expenses/export` - Export expenses as an RFC 4180 CSV attachment.

### Budgets
- `GET /api/budget?month=YYYY-MM` - Overall & category budget usage and warning flags.
- `PUT /api/budget` - Update total monthly budget (`{ budget: number }`).
- `PUT /api/budget/categories` - Update category budgets (`{ budgets: { Food: 1500, ... } }`).

### Analytics
- `GET /api/analytics?month=YYYY-MM` - Returns category breakdown, 6-month trend, and daily average.

### Savings Goals
- `GET /api/savings-goals` - List all savings goals with progress and remaining amounts.
- `POST /api/savings-goals` - Create a goal (`title`, `targetAmount`, `currentAmount`, `targetDate`).
- `PUT /api/savings-goals/:id` - Update goal title, target, or date.
- `DELETE /api/savings-goals/:id` - Delete goal and its history.
- `POST /api/savings-goals/:id/contribute` - Add contribution using atomic transaction.
- `GET /api/savings-goals/:id/contributions` - View history of contributions for a goal.

### Reports
- `GET /api/reports/monthly?month=YYYY-MM` - Current vs. previous month comparison & category share.

---

## 🧑‍🎓 Beginner Engineering Concepts Explained

### 1. Why Store Currency in Integer Paise?
In computers, floating-point numbers cannot precisely represent certain decimals due to binary fractions:
```javascript
0.1 + 0.2 === 0.30000000000000004 // Floating point inaccuracy!
```
In financial applications, rounding errors can accumulate over hundreds of transactions. By storing amounts as **integer paise** (`₹1.50 = 150 paise`), all database arithmetic uses exact integers. The frontend only converts to rupees for display.

### 2. Parameterized Queries (Preventing SQL Injection)
Instead of string concatenation:
```javascript
// DANGEROUS: Susceptible to SQL Injection!
db.exec(`SELECT * FROM expenses WHERE category = '${category}'`);
```
We use prepared statements with placeholders (`?`):
```javascript
// SAFE: Parameterized Query
const stmt = db.prepare("SELECT * FROM expenses WHERE category = ?");
stmt.all(category);
```
The database treats user input strictly as literal values, never executable SQL commands.

### 3. Atomic Database Transactions (`BEGIN` ... `COMMIT`)
When adding a savings contribution, two operations must succeed together:
1. Insert the contribution record into `savings_contributions`.
2. Update `current_amount` in `savings_goals`.

If the server crashes between step 1 and step 2, data becomes corrupted. Wrapping both in `BEGIN` and `COMMIT` ensures that if either fails, `ROLLBACK` undoes all partial changes.

---

## 💻 Running SpendWise Locally

### Prerequisites
- [Node.js](https://nodejs.org/) version **22.5.0** or higher (tested on Node.js v24.21.0).

### Installation & Execution
```bash
# 1. Install dependencies
npm install

# 2. Run in development mode (auto-restarts on code edits)
npm run dev

# 3. Alternatively, run in standard production mode
npm start
```

### Accessing the Dashboard
Open your browser and navigate to:
[http://localhost:3000](http://localhost:3000)

### Running Automated Verification Tests
```bash
node test_upgrade.js
```Design
The SQLite database (`spendwise.db`) is automatically created and contains:
- **expenses** table: `id`, `description`, `amount`, `category`, `date`
- **settings** table: `key`, `value` (used to store the `monthly_budget`)

