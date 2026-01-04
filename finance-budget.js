// Budget Formula Functions

let expenseCount = 0;
let incomeCount = 0;

// Initialize Budget Form
function initializeBudgetForm() {
    const expensesContainer = document.getElementById('expensesContainer');
    const incomeContainer = document.getElementById('incomeContainer');
    const addExpenseBtn = document.getElementById('addExpenseBtn');
    const addIncomeBtn = document.getElementById('addIncomeBtn');
    const budgetSubmitBtn = document.getElementById('budgetSubmitBtn');

    if (!expensesContainer || !incomeContainer) return;

    // Add initial expense row
    addExpenseRow();
    
    // Add initial income row
    addIncomeRow();

    if (addExpenseBtn) {
        addExpenseBtn.addEventListener('click', addExpenseRow);
    }

    if (addIncomeBtn) {
        addIncomeBtn.addEventListener('click', addIncomeRow);
    }

    if (budgetSubmitBtn) {
        budgetSubmitBtn.addEventListener('click', createBudget);
    }
}

// Add Expense Row
function addExpenseRow() {
    const container = document.getElementById('expensesContainer');
    if (!container) return;

    const row = document.createElement('div');
    row.className = 'budget-item';
    row.dataset.index = expenseCount++;
    
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.placeholder = 'Expense name';
    nameInput.className = 'budget-item-name';
    
    const amountInput = document.createElement('input');
    amountInput.type = 'number';
    amountInput.placeholder = 'Amount';
    amountInput.step = '0.01';
    amountInput.className = 'budget-item-amount';
    
    const dateInput = document.createElement('input');
    dateInput.type = 'date';
    dateInput.className = 'budget-item-date';
    
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.textContent = '×';
    removeBtn.className = 'remove-item-btn';
    removeBtn.addEventListener('click', () => {
        row.remove();
    });

    row.appendChild(nameInput);
    row.appendChild(amountInput);
    row.appendChild(dateInput);
    row.appendChild(removeBtn);
    container.appendChild(row);
}

// Add Income Row
function addIncomeRow() {
    const container = document.getElementById('incomeContainer');
    if (!container) return;

    const row = document.createElement('div');
    row.className = 'budget-item';
    row.dataset.index = incomeCount++;
    
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.placeholder = 'Income source';
    nameInput.className = 'budget-item-name';
    
    const amountInput = document.createElement('input');
    amountInput.type = 'number';
    amountInput.placeholder = 'Amount';
    amountInput.step = '0.01';
    amountInput.className = 'budget-item-amount';
    
    const dateInput = document.createElement('input');
    dateInput.type = 'date';
    dateInput.className = 'budget-item-date';
    
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.textContent = '×';
    removeBtn.className = 'remove-item-btn';
    removeBtn.addEventListener('click', () => {
        row.remove();
    });

    row.appendChild(nameInput);
    row.appendChild(amountInput);
    row.appendChild(dateInput);
    row.appendChild(removeBtn);
    container.appendChild(row);
}

// Create Budget
function createBudget() {
    const forecastDateInput = document.getElementById('forecastDate');
    if (!forecastDateInput || !forecastDateInput.value) {
        alert('Please enter a forecast date.');
        return;
    }

    const forecastDate = new Date(forecastDateInput.value);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Collect expenses
    const expenses = [];
    const expenseItems = document.querySelectorAll('#expensesContainer .budget-item');
    expenseItems.forEach(item => {
        const name = item.querySelector('.budget-item-name')?.value.trim();
        const amount = parseFloat(item.querySelector('.budget-item-amount')?.value) || 0;
        const dateStr = item.querySelector('.budget-item-date')?.value;
        
        if (name && amount > 0 && dateStr) {
            expenses.push({
                name,
                amount: -Math.abs(amount), // Negative for expenses
                date: new Date(dateStr)
            });
        }
    });

    // Collect income
    const income = [];
    const incomeItems = document.querySelectorAll('#incomeContainer .budget-item');
    incomeItems.forEach(item => {
        const name = item.querySelector('.budget-item-name')?.value.trim();
        const amount = parseFloat(item.querySelector('.budget-item-amount')?.value) || 0;
        const dateStr = item.querySelector('.budget-item-date')?.value;
        
        if (name && amount > 0 && dateStr) {
            income.push({
                name,
                amount: Math.abs(amount), // Positive for income
                date: new Date(dateStr)
            });
        }
    });

    if (expenses.length === 0 && income.length === 0) {
        alert('Please add at least one expense or income entry.');
        return;
    }

    // Create bi-weekly budget intervals with clean layout
    const budgetLayout = generateBiWeeklyBudget(today, forecastDate, expenses, income);
    
    // Add to sheet with structured layout
    addBudgetToSheet(budgetLayout);
}

// Generate Bi-Weekly Budget with Recurring Items
function generateBiWeeklyBudget(startDate, endDate, expenses, income) {
    const budgetLayout = {
        periods: []
    };
    const biWeeklyIntervals = [];
    
    // Create bi-weekly intervals (every 14 days)
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
        biWeeklyIntervals.push(new Date(currentDate));
        currentDate = new Date(currentDate);
        currentDate.setDate(currentDate.getDate() + 14);
    }
    
    // Add the end date if it doesn't fall exactly on a bi-weekly interval
    if (biWeeklyIntervals.length > 0 && biWeeklyIntervals[biWeeklyIntervals.length - 1].getTime() !== endDate.getTime()) {
        biWeeklyIntervals.push(new Date(endDate));
    }

    // Process each bi-weekly period
    let previousNet = 0;
    for (let i = 0; i < biWeeklyIntervals.length; i++) {
        const periodStart = i === 0 ? startDate : biWeeklyIntervals[i - 1];
        const periodEnd = biWeeklyIntervals[i];
        
        // Calculate recurring income for this period (bi-weekly from original date)
        let periodIncome = 0;
        const periodIncomeItems = [];
        income.forEach(inc => {
            const originalDate = new Date(inc.date);
            originalDate.setHours(0, 0, 0, 0);
            
            // Calculate all bi-weekly occurrences of this income up to periodEnd
            let checkDate = new Date(originalDate);
            while (checkDate <= periodEnd) {
                if (checkDate >= periodStart && checkDate <= periodEnd) {
                    periodIncome += inc.amount;
                    periodIncomeItems.push({ 
                        name: inc.name, 
                        amount: inc.amount,
                        date: new Date(checkDate)
                    });
                }
                // Move to next bi-weekly occurrence (14 days later)
                checkDate = new Date(checkDate);
                checkDate.setDate(checkDate.getDate() + 14);
            }
        });

        // Calculate recurring expenses for this period (monthly on same day)
        let periodExpenses = 0;
        const periodExpenseItems = [];
        expenses.forEach(exp => {
            const originalDate = new Date(exp.date);
            originalDate.setHours(0, 0, 0, 0);
            const originalDay = originalDate.getDate();
            
            // Calculate all monthly occurrences of this expense up to periodEnd
            let checkDate = new Date(originalDate);
            while (checkDate <= periodEnd) {
                if (checkDate >= periodStart && checkDate <= periodEnd) {
                    periodExpenses += Math.abs(exp.amount);
                    periodExpenseItems.push({ 
                        name: exp.name, 
                        amount: Math.abs(exp.amount),
                        date: new Date(checkDate)
                    });
                }
                // Move to next month, same day
                checkDate = new Date(checkDate);
                checkDate.setMonth(checkDate.getMonth() + 1);
                // Handle months with different number of days (e.g., Jan 31 -> Feb 28)
                const targetMonth = checkDate.getMonth();
                checkDate.setDate(originalDay);
                if (checkDate.getMonth() !== targetMonth) {
                    // Day doesn't exist in this month (e.g., Feb 31), use last day of month
                    checkDate.setDate(0); // Go to last day of previous month
                }
            }
        });

        // Add carryover from previous period as income (only if there's a positive leftover)
        if (previousNet > 0) {
            periodIncome += previousNet;
            periodIncomeItems.push({ 
                name: 'carryover', 
                amount: previousNet,
                isCarryover: true
            });
        }

        // Calculate net with carryover
        // periodIncome already includes carryover from previous period (added above)
        const netAmount = periodIncome - periodExpenses;
        const netWithCarryover = netAmount; // This becomes carryover for next period (only if positive)
        
        // Format period dates
        const periodStartStr = formatBudgetPeriod(periodStart);
        const periodEndStr = formatBudgetPeriodEnd(periodEnd);
        
        budgetLayout.periods.push({
            start: periodStart,
            end: periodEnd,
            startStr: periodStartStr,
            endStr: periodEndStr,
            income: periodIncome,
            incomeItems: periodIncomeItems,
            expenses: periodExpenses,
            expenseItems: periodExpenseItems,
            net: netAmount,
            carryover: previousNet,
            netWithCarryover: netWithCarryover
        });
        
        // Only carry forward positive leftover amounts
        previousNet = netWithCarryover > 0 ? netWithCarryover : 0; // Carryover to next period (only positive)
    }

    return budgetLayout;
}

// Format budget period start date
function formatBudgetPeriod(date) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getMonth()];
    const day = date.getDate();
    const suffix = getDaySuffix(day);
    return `${month} ${day}${suffix}`;
}

// Format budget period end date
function formatBudgetPeriodEnd(date) {
    const day = date.getDate();
    return `${day}`;
}

// Get day suffix (1st, 2nd, 3rd, 4th, etc.)
function getDaySuffix(day) {
    if (day >= 11 && day <= 13) {
        return 'th';
    }
    switch (day % 10) {
        case 1: return 'st';
        case 2: return 'nd';
        case 3: return 'rd';
        default: return 'th';
    }
}

// Format Date Short
function formatDateShort(date) {
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${month}/${day}`;
}

// Add Budget to Sheet with clean, organized layout
function addBudgetToSheet(budgetLayout) {
    if (!budgetLayout.periods || budgetLayout.periods.length === 0) {
        alert('No budget data to add.');
        return;
    }

    // Start from row 2 (after headers) or next available row
    let startRow = typeof nextDataRow !== 'undefined' && nextDataRow > 2 ? nextDataRow : 2;
    
    // Better layout: Each period gets its own section with clear separation
    // Use 6 columns per period for better spacing
    const colsPerPeriod = 6;
    const spacingBetweenPeriods = 2; // Empty columns between periods
    let currentCol = 0;
    
    budgetLayout.periods.forEach((period, periodIndex) => {
        // Move to new row if we're starting a new row of periods (2 per row max)
        if (periodIndex > 0 && periodIndex % 2 === 0) {
            // Find the maximum row used in previous periods and add spacing
            startRow = findMaxRowUsed() + 4;
            currentCol = 0;
        }
        
        const incomeCol = currentCol;
        const incomeAmountCol = currentCol + 1;
        const expenseCol = currentCol + 3;
        const expenseAmountCol = currentCol + 4;
        let row = startRow;
        
        // Period Header - Large, bold, clear
        const headerCell = getCell(row, incomeCol);
        if (headerCell) {
            headerCell.textContent = `Week of ${period.startStr} - ${period.endStr}`;
            headerCell.style.fontWeight = '700';
            headerCell.style.fontSize = '14px';
            headerCell.style.backgroundColor = '#4a4a4a';
            headerCell.style.color = '#ffffff';
            headerCell.colSpan = colsPerPeriod - spacingBetweenPeriods;
            if (typeof spreadsheet !== 'undefined') {
                spreadsheet[headerCell.dataset.address] = headerCell.textContent;
            }
        }
        row++;
        
        // Empty row for visual spacing
        row++;
        
        // INCOME SECTION - Left side, clearly labeled
        const incomeLabelCell = getCell(row, incomeCol);
        if (incomeLabelCell) {
            incomeLabelCell.textContent = 'INCOME';
            incomeLabelCell.style.fontWeight = '700';
            incomeLabelCell.style.fontSize = '12px';
            incomeLabelCell.style.backgroundColor = '#3a5a3a';
            incomeLabelCell.style.color = '#ffffff';
            incomeLabelCell.style.padding = '4px';
            if (typeof spreadsheet !== 'undefined') {
                spreadsheet[incomeLabelCell.dataset.address] = incomeLabelCell.textContent;
            }
        }
        row++;
        
        // Regular income items
        const regularIncome = period.incomeItems.filter(item => !item.isCarryover);
        regularIncome.forEach(item => {
            const nameCell = getCell(row, incomeCol);
            const amountCell = getCell(row, incomeAmountCol);
            if (nameCell) {
                nameCell.textContent = item.name;
                nameCell.style.paddingLeft = '8px';
                if (typeof spreadsheet !== 'undefined') {
                    spreadsheet[nameCell.dataset.address] = item.name;
                }
            }
            if (amountCell) {
                amountCell.textContent = formatCurrencyBudget(item.amount);
                amountCell.style.textAlign = 'right';
                amountCell.style.paddingRight = '8px';
                if (typeof spreadsheet !== 'undefined') {
                    spreadsheet[amountCell.dataset.address] = formatCurrencyBudget(item.amount);
                }
            }
            row++;
        });
        
        // Carryover from previous period (only show if exists)
        const carryoverItems = period.incomeItems.filter(item => item.isCarryover);
        if (carryoverItems.length > 0) {
            carryoverItems.forEach(item => {
                const carryoverLabelCell = getCell(row, incomeCol);
                const carryoverAmountCell = getCell(row, incomeAmountCol);
                if (carryoverLabelCell) {
                    carryoverLabelCell.textContent = 'Carryover from previous week';
                    carryoverLabelCell.style.fontStyle = 'italic';
                    carryoverLabelCell.style.color = '#888';
                    carryoverLabelCell.style.paddingLeft = '8px';
                    if (typeof spreadsheet !== 'undefined') {
                        spreadsheet[carryoverLabelCell.dataset.address] = 'Carryover from previous week';
                    }
                }
                if (carryoverAmountCell) {
                    carryoverAmountCell.textContent = formatCurrencyBudget(item.amount);
                    carryoverAmountCell.style.textAlign = 'right';
                    carryoverAmountCell.style.paddingRight = '8px';
                    carryoverAmountCell.style.fontStyle = 'italic';
                    if (typeof spreadsheet !== 'undefined') {
                        spreadsheet[carryoverAmountCell.dataset.address] = formatCurrencyBudget(item.amount);
                    }
                }
                row++;
            });
        }
        
        // Income subtotal
        const incomeSubtotalCell = getCell(row, incomeCol);
        const incomeSubtotalAmountCell = getCell(row, incomeAmountCol);
        if (incomeSubtotalCell) {
            incomeSubtotalCell.textContent = 'Income Subtotal:';
            incomeSubtotalCell.style.fontWeight = '600';
            incomeSubtotalCell.style.borderTop = '1px solid #666';
            incomeSubtotalCell.style.paddingTop = '4px';
            incomeSubtotalCell.style.paddingLeft = '8px';
            if (typeof spreadsheet !== 'undefined') {
                spreadsheet[incomeSubtotalCell.dataset.address] = 'Income Subtotal:';
            }
        }
        if (incomeSubtotalAmountCell) {
            incomeSubtotalAmountCell.textContent = formatCurrencyBudget(period.income);
            incomeSubtotalAmountCell.style.fontWeight = '600';
            incomeSubtotalAmountCell.style.borderTop = '1px solid #666';
            incomeSubtotalAmountCell.style.paddingTop = '4px';
            incomeSubtotalAmountCell.style.textAlign = 'right';
            incomeSubtotalAmountCell.style.paddingRight = '8px';
            if (typeof spreadsheet !== 'undefined') {
                spreadsheet[incomeSubtotalAmountCell.dataset.address] = formatCurrencyBudget(period.income);
            }
        }
        row++;
        
        // Empty row for spacing
        row++;
        
        // EXPENSES SECTION - Right side, clearly labeled
        const expenseLabelCell = getCell(row, expenseCol);
        if (expenseLabelCell) {
            expenseLabelCell.textContent = 'EXPENSES';
            expenseLabelCell.style.fontWeight = '700';
            expenseLabelCell.style.fontSize = '12px';
            expenseLabelCell.style.backgroundColor = '#5a3a3a';
            expenseLabelCell.style.color = '#ffffff';
            expenseLabelCell.style.padding = '4px';
            if (typeof spreadsheet !== 'undefined') {
                spreadsheet[expenseLabelCell.dataset.address] = 'EXPENSES';
            }
        }
        row++;
        
        // Expense items
        if (period.expenseItems.length === 0) {
            const noExpenseCell = getCell(row, expenseCol);
            if (noExpenseCell) {
                noExpenseCell.textContent = '(none)';
                noExpenseCell.style.color = '#888';
                noExpenseCell.style.fontStyle = 'italic';
                if (typeof spreadsheet !== 'undefined') {
                    spreadsheet[noExpenseCell.dataset.address] = '(none)';
                }
            }
            row++;
        } else {
            period.expenseItems.forEach(item => {
                const nameCell = getCell(row, expenseCol);
                const amountCell = getCell(row, expenseAmountCol);
                if (nameCell) {
                    nameCell.textContent = item.name;
                    nameCell.style.paddingLeft = '8px';
                    if (typeof spreadsheet !== 'undefined') {
                        spreadsheet[nameCell.dataset.address] = item.name;
                    }
                }
                if (amountCell) {
                    amountCell.textContent = formatCurrencyBudget(-item.amount);
                    amountCell.style.textAlign = 'right';
                    amountCell.style.paddingRight = '8px';
                    amountCell.style.color = '#ff6b6b';
                    if (typeof spreadsheet !== 'undefined') {
                        spreadsheet[amountCell.dataset.address] = formatCurrencyBudget(-item.amount);
                    }
                }
                row++;
            });
        }
        
        // Expense subtotal
        const expenseSubtotalCell = getCell(row, expenseCol);
        const expenseSubtotalAmountCell = getCell(row, expenseAmountCol);
        if (expenseSubtotalCell) {
            expenseSubtotalCell.textContent = 'Expenses Subtotal:';
            expenseSubtotalCell.style.fontWeight = '600';
            expenseSubtotalCell.style.borderTop = '1px solid #666';
            expenseSubtotalCell.style.paddingTop = '4px';
            expenseSubtotalCell.style.paddingLeft = '8px';
            if (typeof spreadsheet !== 'undefined') {
                spreadsheet[expenseSubtotalCell.dataset.address] = 'Expenses Subtotal:';
            }
        }
        if (expenseSubtotalAmountCell) {
            expenseSubtotalAmountCell.textContent = formatCurrencyBudget(-period.expenses);
            expenseSubtotalAmountCell.style.fontWeight = '600';
            expenseSubtotalAmountCell.style.borderTop = '1px solid #666';
            expenseSubtotalAmountCell.style.paddingTop = '4px';
            expenseSubtotalAmountCell.style.textAlign = 'right';
            expenseSubtotalAmountCell.style.paddingRight = '8px';
            expenseSubtotalAmountCell.style.color = '#ff6b6b';
            if (typeof spreadsheet !== 'undefined') {
                spreadsheet[expenseSubtotalAmountCell.dataset.address] = formatCurrencyBudget(-period.expenses);
            }
        }
        row++;
        
        // Empty row for spacing
        row++;
        
        // TOTAL - Highlighted, clear
        const totalLabelCell = getCell(row, incomeCol);
        const totalAmountCell = getCell(row, incomeAmountCol);
        if (totalLabelCell) {
            totalLabelCell.textContent = 'LEFT OVER (Income - Expenses)';
            totalLabelCell.style.fontWeight = '700';
            totalLabelCell.style.fontSize = '13px';
            totalLabelCell.style.backgroundColor = '#4a4a7a';
            totalLabelCell.style.color = '#ffffff';
            totalLabelCell.style.padding = '6px 8px';
            totalLabelCell.colSpan = 2;
            if (typeof spreadsheet !== 'undefined') {
                spreadsheet[totalLabelCell.dataset.address] = 'LEFT OVER (Income - Expenses)';
            }
        }
        if (totalAmountCell) {
            totalAmountCell.textContent = formatCurrencyBudget(period.netWithCarryover);
            totalAmountCell.style.fontWeight = '700';
            totalAmountCell.style.fontSize = '13px';
            totalAmountCell.style.backgroundColor = '#4a4a7a';
            totalAmountCell.style.color = '#ffffff';
            totalAmountCell.style.textAlign = 'right';
            totalAmountCell.style.padding = '6px 8px';
            if (typeof spreadsheet !== 'undefined') {
                spreadsheet[totalAmountCell.dataset.address] = formatCurrencyBudget(period.netWithCarryover);
            }
        }
        row++;
        
        // Empty row after period for separation
        row++;
        
        // Move to next period position
        currentCol += colsPerPeriod;
    });
    
    // Update nextDataRow
    if (typeof nextDataRow !== 'undefined') {
        nextDataRow = findMaxRowUsed() + 2;
        // Setup total row after budget
        if (typeof setupTotalRow === 'function') {
            setupTotalRow();
        }
    }
    
    // Helper function to find max row used
    function findMaxRowUsed() {
        let maxRow = startRow;
        for (let col = 0; col < COL_NAMES.length; col++) {
            for (let r = startRow; r < startRow + 100; r++) {
                const cell = getCell(r, col);
                if (cell && cell.textContent.trim() !== '') {
                    maxRow = Math.max(maxRow, r);
                }
            }
        }
        return maxRow;
    }
}

// Helper function to get cell element
function getCell(row, colIndex) {
    let colNamesStr;
    if (typeof COL_NAMES !== 'undefined') {
        colNamesStr = COL_NAMES;
    } else {
        colNamesStr = 'ABCDEFGHIJKLMNOPQRST';
    }
    
    if (colIndex >= colNamesStr.length) return null;
    
    const col = colNamesStr[colIndex];
    const addr = `${col}${row}`;
    return document.querySelector(`[data-address="${addr}"]`);
}

// Helper function to set cell with styling
function setCellStyled(row, colIndex, value, style, bold = false) {
    const cell = getCell(row, colIndex);
    if (cell) {
        cell.textContent = value;
        if (bold) {
            cell.style.fontWeight = '600';
        }
        if (style) {
            Object.assign(cell.style, style);
        }
        if (typeof spreadsheet !== 'undefined') {
            spreadsheet[cell.dataset.address] = value;
        }
    }
}

// Helper function to set cell value
function setCell(row, colIndex, value) {
    // COL_NAMES is a string 'ABCDEFGHIJ' in finance.js
    let colNamesStr;
    if (typeof COL_NAMES !== 'undefined') {
        colNamesStr = COL_NAMES;
    } else {
        colNamesStr = 'ABCDEFGHIJKLMNOPQRST';
    }
    
    if (colIndex >= colNamesStr.length) return;
    
    const col = colNamesStr[colIndex];
    const addr = `${col}${row}`;
    const cell = document.querySelector(`[data-address="${addr}"]`);
    
    if (cell) {
        cell.textContent = value;
        if (typeof spreadsheet !== 'undefined') {
            spreadsheet[addr] = value;
        }
    }
}

// Format currency for budget (simpler format)
function formatCurrencyBudget(value) {
    if (typeof formatCurrency === 'function') {
        return formatCurrency(value);
    }
    const absValue = Math.abs(value);
    const sign = value < 0 ? '-' : '';
    return `${sign}$${absValue.toFixed(2)}`;
}

