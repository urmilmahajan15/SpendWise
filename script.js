// Wait for the DOM to be fully loaded before running our script
document.addEventListener('DOMContentLoaded', () => {
    // --- State Variables ---
    let expenses = [];
    let monthlyBudget = 0;
    let categoryChartInstance = null;

    // --- DOM Elements ---
    // Forms & Inputs
    const expenseForm = document.getElementById('expense-form');
    const budgetForm = document.getElementById('budget-form');
    const expenseIdInput = document.getElementById('expense-id');
    const descriptionInput = document.getElementById('description');
    const amountInput = document.getElementById('amount');
    const categoryInput = document.getElementById('category');
    const dateInput = document.getElementById('date');
    const searchInput = document.getElementById('search-input');
    const filterCategory = document.getElementById('filter-category');
    
    // Buttons
    const submitExpenseBtn = document.getElementById('submit-expense-btn');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    const editBudgetBtn = document.getElementById('edit-budget-btn');
    const closeBudgetBtn = document.getElementById('close-budget-btn');
    
    // Modals & Display Areas
    const budgetModal = document.getElementById('budget-modal');
    const transactionsBody = document.getElementById('transactions-body');
    const totalExpensesEl = document.getElementById('total-expenses');
    const monthlyBudgetEl = document.getElementById('monthly-budget');
    const remainingBudgetEl = document.getElementById('remaining-budget');
    const transactionCountEl = document.getElementById('transaction-count');

    // --- Initialization ---
    // Fetch initial data from the backend
    async function init() {
        await fetchBudget();
        await fetchExpenses();
        // Set default date to today
        dateInput.value = new Date().toISOString().split('T')[0];
    }

    // --- API Calls (CRUD Operations via fetch) ---

    // Get all expenses
    async function fetchExpenses() {
        try {
            const res = await fetch('/api/expenses');
            if (!res.ok) throw new Error('Failed to fetch expenses');
            expenses = await res.json();
            renderDashboard();
        } catch (error) {
            console.error(error);
            alert('Error loading expenses. Please try again.');
        }
    }

    // Get budget
    async function fetchBudget() {
        try {
            const res = await fetch('/api/budget');
            if (!res.ok) throw new Error('Failed to fetch budget');
            const data = await res.json();
            monthlyBudget = data.budget;
        } catch (error) {
            console.error(error);
        }
    }

    // Add new expense
    async function addExpense(expenseData) {
        try {
            const res = await fetch('/api/expenses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(expenseData)
            });
            if (!res.ok) throw new Error('Failed to add expense');
            await fetchExpenses(); // Refresh data
        } catch (error) {
            console.error(error);
            alert('Error saving expense.');
        }
    }

    // Update existing expense
    async function updateExpense(id, expenseData) {
        try {
            const res = await fetch(`/api/expenses/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(expenseData)
            });
            if (!res.ok) throw new Error('Failed to update expense');
            await fetchExpenses(); // Refresh data
        } catch (error) {
            console.error(error);
            alert('Error updating expense.');
        }
    }

    // Delete expense
    async function deleteExpense(id) {
        if (!confirm('Are you sure you want to delete this expense?')) return;
        
        try {
            const res = await fetch(`/api/expenses/${id}`, {
                method: 'DELETE'
            });
            if (!res.ok) throw new Error('Failed to delete expense');
            await fetchExpenses(); // Refresh data
        } catch (error) {
            console.error(error);
            alert('Error deleting expense.');
        }
    }

    // Update budget
    async function updateBudget(newBudget) {
        try {
            const res = await fetch('/api/budget', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ budget: newBudget })
            });
            if (!res.ok) throw new Error('Failed to update budget');
            const data = await res.json();
            monthlyBudget = data.budget;
            renderDashboard();
        } catch (error) {
            console.error(error);
            alert('Error updating budget.');
        }
    }

    // --- UI Rendering ---

    function renderDashboard() {
        const searchTerm = searchInput.value.toLowerCase();
        const filterVal = filterCategory.value;

        // Filter transactions for display
        const filteredExpenses = expenses.filter(exp => {
            const matchesSearch = exp.description.toLowerCase().includes(searchTerm);
            const matchesCategory = filterVal === 'All' || exp.category === filterVal;
            return matchesSearch && matchesCategory;
        });

        renderTransactions(filteredExpenses);
        updateSummary(filteredExpenses);
        renderChart(filteredExpenses);
    }

    function renderTransactions(transactions) {
        transactionsBody.innerHTML = '';

        if (transactions.length === 0) {
            transactionsBody.innerHTML = '<tr><td colspan="5" class="empty-state">No transactions found.</td></tr>';
            return;
        }

        transactions.forEach(exp => {
            const tr = document.createElement('tr');
            
            // Format date for Indian locale context
            const dateObj = new Date(exp.date);
            const dateStr = dateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
            
            tr.innerHTML = `
                <td>${dateStr}</td>
                <td>${escapeHTML(exp.description)}</td>
                <td><span class="category-badge">${escapeHTML(exp.category)}</span></td>
                <td style="font-weight: 600;">₹${exp.amount}</td>
                <td class="action-buttons">
                    <button class="btn btn-edit" onclick="window.editExpenseClicked(${exp.id})">Edit</button>
                    <button class="btn btn-danger" onclick="window.deleteExpenseClicked(${exp.id})">Del</button>
                </td>
            `;
            transactionsBody.appendChild(tr);
        });
    }

    function updateSummary(transactions) {
        // Calculate total for current view
        const total = transactions.reduce((acc, exp) => acc + exp.amount, 0);
        const remaining = monthlyBudget - total;

        totalExpensesEl.textContent = `₹${total}`;
        monthlyBudgetEl.textContent = `₹${monthlyBudget}`;
        remainingBudgetEl.textContent = `₹${remaining}`;
        transactionCountEl.textContent = transactions.length;

        // Warn if over budget
        if (remaining < 0) {
            remainingBudgetEl.classList.add('text-danger');
        } else {
            remainingBudgetEl.classList.remove('text-danger');
        }
    }

    function renderChart(transactions) {
        const ctx = document.getElementById('categoryChart').getContext('2d');
        
        // Aggregate data by category
        const categoryTotals = {};
        transactions.forEach(exp => {
            categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amount;
        });

        const labels = Object.keys(categoryTotals);
        const data = Object.values(categoryTotals);

        // Chart colors matching our CSS palette
        const backgroundColors = [
            '#1e3a8a', '#2563eb', '#3b82f6', '#60a5fa', 
            '#93c5fd', '#bfdbfe', '#dbeafe', '#f1f5f9'
        ];

        // Destroy previous chart instance if it exists to avoid rendering issues
        if (categoryChartInstance) {
            categoryChartInstance.destroy();
        }

        if (data.length === 0) {
            // Optional: Draw an empty state on the canvas manually, 
            // but for simplicity we just let Chart.js render an empty chart
        }

        categoryChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: backgroundColors.slice(0, labels.length),
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right'
                    }
                }
            }
        });
    }

    // --- Event Listeners ---

    // Handle Form Submit (Add / Edit)
    expenseForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const id = expenseIdInput.value;
        const expenseData = {
            description: descriptionInput.value,
            amount: amountInput.value,
            category: categoryInput.value,
            date: dateInput.value
        };

        if (id) {
            // Edit Mode
            await updateExpense(id, expenseData);
            resetForm();
        } else {
            // Add Mode
            await addExpense(expenseData);
            resetForm();
        }
    });

    // Handle Search and Filter
    searchInput.addEventListener('input', renderDashboard);
    filterCategory.addEventListener('change', renderDashboard);

    // Cancel Edit
    cancelEditBtn.addEventListener('click', resetForm);

    // Budget Modal Logic
    editBudgetBtn.addEventListener('click', () => {
        document.getElementById('budget-input').value = monthlyBudget;
        budgetModal.showModal();
    });

    closeBudgetBtn.addEventListener('click', () => {
        budgetModal.close();
    });

    budgetForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newBudget = document.getElementById('budget-input').value;
        await updateBudget(newBudget);
        budgetModal.close();
    });

    // --- Helper Functions ---

    function resetForm() {
        expenseForm.reset();
        expenseIdInput.value = '';
        submitExpenseBtn.textContent = 'Add Expense';
        cancelEditBtn.classList.add('hidden');
        // Reset date to today
        dateInput.value = new Date().toISOString().split('T')[0];
    }

    // Expose functions to window object for inline onclick handlers in the generated HTML
    window.editExpenseClicked = (id) => {
        const expense = expenses.find(e => e.id === id);
        if (expense) {
            expenseIdInput.value = expense.id;
            descriptionInput.value = expense.description;
            amountInput.value = expense.amount;
            categoryInput.value = expense.category;
            dateInput.value = expense.date;

            submitExpenseBtn.textContent = 'Update Expense';
            cancelEditBtn.classList.remove('hidden');
            // Scroll up to form smoothly
            document.querySelector('.add-expense-section').scrollIntoView({ behavior: 'smooth' });
        }
    };

    window.deleteExpenseClicked = (id) => {
        deleteExpense(id);
    };

    // Basic XSS protection for displaying text
    function escapeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // Start the app
    init();
});

