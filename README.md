# SpendWise
SpendWise is a beginner-friendly full-stack web application designed for students to track their monthly expenses and budget.

## Tech Stack
- **Frontend**: HTML5, CSS3, Vanilla JavaScript, Chart.js
- **Backend**: Node.js, Express.js
- **Database**: SQLite (using Node's built-in `node:sqlite`)

## Features
- Dashboard with total expenses, monthly budget, and remaining budget
- Add, edit, and delete expenses
- Categorize expenses (Food, Travel, Education, etc.)
- Search and filter by category
- Visual breakdown of expenses using Chart.js
- Data persistence via SQLite database

## Prerequisites
- Node.js (v22.5.0 or later, currently using v24+)

## Installation & Setup

1. **Install dependencies:**
   \`\`\`bash
   npm install
   \`\`\`

2. **Start the server (Development mode):**
   \`\`\`bash
   npm run dev
   \`\`\`
   *(Or use `npm start` for production mode)*

3. **Open in browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## API Endpoints
- \`GET /api/expenses\` - List all expenses
- \`POST /api/expenses\` - Create a new expense
- \`PUT /api/expenses/:id\` - Update an expense
- \`DELETE /api/expenses/:id\` - Delete an expense
- \`GET /api/budget\` - Retrieve monthly budget
- \`PUT /api/budget\` - Update monthly budget

## Database Design
The SQLite database (`spendwise.db`) is automatically created and contains:
- **expenses** table: `id`, `description`, `amount`, `category`, `date`
- **settings** table: `key`, `value` (used to store the `monthly_budget`)

