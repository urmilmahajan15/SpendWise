const express = require('express');
const cors = require('cors');
const path = require('path');
// Node:sqlite is a built-in module in Node.js >= 22.5.0
const { DatabaseSync } = require('node:sqlite');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Database Initialization
// Creates or opens a file named 'spendwise.db' in the same directory
const db = new DatabaseSync('spendwise.db');

// Create tables if they don't exist
function initDB() {
    db.exec(`
        CREATE TABLE IF NOT EXISTS expenses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            description TEXT NOT NULL,
            amount INTEGER NOT NULL,
            category TEXT NOT NULL,
            date TEXT NOT NULL
        )
    `);

    db.exec(`
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )
    `);

    // Initialize default budget if not set
    const stmt = db.prepare(`SELECT value FROM settings WHERE key = 'monthly_budget'`);
    const row = stmt.get();
    if (!row) {
        db.prepare(`INSERT INTO settings (key, value) VALUES ('monthly_budget', '5000')`).run();
    }
}

initDB();

// API Endpoints

// 1. Get all expenses
app.get('/api/expenses', (req, res) => {
    try {
        const stmt = db.prepare('SELECT * FROM expenses ORDER BY date DESC');
        const expenses = stmt.all();
        res.json(expenses);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch expenses' });
    }
});

// 2. Add an expense
app.post('/api/expenses', (req, res) => {
    const { description, amount, category, date } = req.body;
    
    // Basic validation
    if (!description || !amount || !category || !date) {
        return res.status(400).json({ error: 'All fields are required' });
    }
    
    // Parse amount to an integer (we treat it as whole rupees or paise, here let's assume whole rupees for simplicity)
    const amountInt = parseInt(amount, 10);
    if (isNaN(amountInt) || amountInt <= 0) {
        return res.status(400).json({ error: 'Amount must be a positive number' });
    }

    try {
        const stmt = db.prepare(`
            INSERT INTO expenses (description, amount, category, date)
            VALUES (?, ?, ?, ?)
        `);
        // .run() returns an object with lastInsertRowid
        const info = stmt.run(description, amountInt, category, date);
        
        res.status(201).json({ 
            id: info.lastInsertRowid,
            description,
            amount: amountInt,
            category,
            date
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to add expense' });
    }
});

// 3. Update an expense
app.put('/api/expenses/:id', (req, res) => {
    const { id } = req.params;
    const { description, amount, category, date } = req.body;
    
    if (!description || !amount || !category || !date) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    const amountInt = parseInt(amount, 10);
    if (isNaN(amountInt) || amountInt <= 0) {
        return res.status(400).json({ error: 'Amount must be a positive number' });
    }

    try {
        const stmt = db.prepare(`
            UPDATE expenses 
            SET description = ?, amount = ?, category = ?, date = ?
            WHERE id = ?
        `);
        const info = stmt.run(description, amountInt, category, date, id);
        
        if (info.changes === 0) {
            return res.status(404).json({ error: 'Expense not found' });
        }
        
        res.json({ id: parseInt(id, 10), description, amount: amountInt, category, date });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update expense' });
    }
});

// 4. Delete an expense
app.delete('/api/expenses/:id', (req, res) => {
    const { id } = req.params;
    try {
        const stmt = db.prepare('DELETE FROM expenses WHERE id = ?');
        const info = stmt.run(id);
        
        if (info.changes === 0) {
            return res.status(404).json({ error: 'Expense not found' });
        }
        
        res.json({ message: 'Expense deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete expense' });
    }
});

// 5. Get budget
app.get('/api/budget', (req, res) => {
    try {
        const stmt = db.prepare("SELECT value FROM settings WHERE key = 'monthly_budget'");
        const row = stmt.get();
        res.json({ budget: parseInt(row.value, 10) });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch budget' });
    }
});

// 6. Update budget
app.put('/api/budget', (req, res) => {
    const { budget } = req.body;
    const budgetInt = parseInt(budget, 10);
    
    if (isNaN(budgetInt) || budgetInt <= 0) {
        return res.status(400).json({ error: 'Budget must be a positive number' });
    }

    try {
        const stmt = db.prepare("UPDATE settings SET value = ? WHERE key = 'monthly_budget'");
        stmt.run(budgetInt.toString());
        res.json({ budget: budgetInt });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update budget' });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`SpendWise server running at http://localhost:${PORT}`);
});
