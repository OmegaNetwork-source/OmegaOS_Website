// Omega Finance App
const ROWS = 100;
const COLS = 10;
const COL_NAMES = 'ABCDEFGHIJ';
let spreadsheet = {};
let selectedCell = null;
let currentWindowId = null;
let nextDataRow = 2; // Start after header row
let totalRow = null;

// Undo/Redo history
let undoHistory = [];
let redoHistory = [];
const MAX_HISTORY = 50;

function saveState() {
    // Save current spreadsheet state
    const state = JSON.parse(JSON.stringify(spreadsheet));
    undoHistory.push(state);
    if (undoHistory.length > MAX_HISTORY) {
        undoHistory.shift();
    }
    // Clear redo history when new action is performed
    redoHistory = [];
}

function undo() {
    if (undoHistory.length === 0) return;
    
    // Save current state to redo
    const currentState = JSON.parse(JSON.stringify(spreadsheet));
    redoHistory.push(currentState);
    
    // Restore previous state
    const previousState = undoHistory.pop();
    spreadsheet = JSON.parse(JSON.stringify(previousState));
    
    // Update all cells in DOM
    Object.keys(spreadsheet).forEach(addr => {
        const cell = document.querySelector(`[data-address="${addr}"]`);
        if (cell) {
            cell.textContent = spreadsheet[addr];
        }
    });
    
    // Clear cells that are no longer in spreadsheet
    document.querySelectorAll('.cell').forEach(cell => {
        const addr = cell.dataset.address;
        if (!spreadsheet[addr] && !cell.classList.contains('total-row')) {
            cell.textContent = '';
        }
    });
    
    updateTotal();
}

function redo() {
    if (redoHistory.length === 0) return;
    
    // Save current state to undo
    const currentState = JSON.parse(JSON.stringify(spreadsheet));
    undoHistory.push(currentState);
    
    // Restore next state
    const nextState = redoHistory.pop();
    spreadsheet = JSON.parse(JSON.stringify(nextState));
    
    // Update all cells in DOM
    Object.keys(spreadsheet).forEach(addr => {
        const cell = document.querySelector(`[data-address="${addr}"]`);
        if (cell) {
            cell.textContent = spreadsheet[addr];
        }
    });
    
    // Clear cells that are no longer in spreadsheet
    document.querySelectorAll('.cell').forEach(cell => {
        const addr = cell.dataset.address;
        if (!spreadsheet[addr] && !cell.classList.contains('total-row')) {
            cell.textContent = '';
        }
    });
    
    updateTotal();
}

// Sheet Management
let sheets = {};
let currentSheet = 'Sheet1';
let sheetCounter = 1;

// Calculator state
let calcExpression = '0';
let calcShouldReset = false;
let calcLastAnswer = null;

// Initialize spreadsheet
function initializeSpreadsheet() {
    const columnHeaders = document.getElementById('columnHeaders');
    const rowNumbers = document.getElementById('rowNumbers');
    const cellsContainer = document.getElementById('cellsContainer');

    if (!columnHeaders || !rowNumbers || !cellsContainer) {
        console.error('Required elements not found');
        return;
    }

    // Clear existing content
    columnHeaders.innerHTML = '';
    rowNumbers.innerHTML = '';
    cellsContainer.innerHTML = '';

    const grid = document.createElement('div');
    grid.className = 'cells-grid';
    grid.style.display = 'table';

    // Column headers (A, B, C, etc.)
    for (let i = 0; i < COL_NAMES.length; i++) {
        const header = document.createElement('div');
        header.className = 'column-header';
        header.textContent = COL_NAMES[i];
        columnHeaders.appendChild(header);
    }

    // Create rows
    for (let row = 1; row <= ROWS; row++) {
        const rowNum = document.createElement('div');
        rowNum.className = 'row-number';
        rowNum.textContent = row;
        rowNumbers.appendChild(rowNum);

        const cellRow = document.createElement('div');
        cellRow.className = 'cell-row';
        cellRow.style.display = 'table-row';

        for (let col = 0; col < COL_NAMES.length; col++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.contentEditable = true;
            const address = COL_NAMES[col] + row;
            cell.dataset.address = address;

            // Row 1 is editable for user-defined headers

            // Events
            cell.addEventListener('focus', () => selectCell(cell));
            cell.addEventListener('blur', handleCellBlur);
            cell.addEventListener('input', handleCellInput);
            cell.addEventListener('keydown', handleCellKeydown);
            cell.addEventListener('paste', handleCellPaste);
            cell.addEventListener('copy', handleCellCopy);
            cell.addEventListener('cut', handleCellCut);
            

            cellRow.appendChild(cell);
        }

        grid.appendChild(cellRow);
    }

    cellsContainer.appendChild(grid);

    // Global handlers for multi-cell selection drag
    let mouseDownCell = null;
    let mouseDownTime = 0;
    let mouseDownPos = { x: 0, y: 0 };
    
    cellsContainer.addEventListener('mousedown', (e) => {
        const cell = e.target.closest('.cell');
        if (cell && e.button === 0) {
            mouseDownCell = cell;
            mouseDownTime = Date.now();
            mouseDownPos = { x: e.clientX, y: e.clientY };
            selectionStart = cell;
            isSelecting = false;
            selectCell(cell, false);
        }
    });
    
    cellsContainer.addEventListener('mousemove', (e) => {
        if (mouseDownCell && e.buttons === 1) {
            const timeSinceDown = Date.now() - mouseDownTime;
            const distance = Math.sqrt(
                Math.pow(e.clientX - mouseDownPos.x, 2) + 
                Math.pow(e.clientY - mouseDownPos.y, 2)
            );
            
            // If mouse moved more than 3px or 100ms passed, it's a drag
            if (distance > 3 || timeSinceDown > 100) {
                isSelecting = true;
                const cell = e.target.closest('.cell');
                if (cell && selectionStart) {
                    selectCell(cell, true);
                    e.preventDefault();
                }
            }
        }
    });
    
    cellsContainer.addEventListener('mouseup', (e) => {
        if (mouseDownCell) {
            if (!isSelecting) {
                // It was just a click, allow normal focus
                mouseDownCell.focus();
            }
            mouseDownCell = null;
            isSelecting = false;
        }
    });

    // Don't set up total row initially - wait until we have data
}

function setupTotalRow() {
    // Store old total row before updating
    const oldTotalRow = totalRow;
    
    // Clear old total row if it exists
    if (oldTotalRow) {
        for (let col = 0; col < COL_NAMES.length; col++) {
            const cell = document.querySelector(`[data-address="${COL_NAMES[col]}${oldTotalRow}"]`);
            if (cell) {
                cell.classList.remove('total-row');
                cell.contentEditable = true;
                cell.style.fontWeight = 'normal';
                // Clear "Total" text from first cell (A column)
                if (col === 0) {
                    cell.textContent = '';
                }
            }
        }
    }

    // Set total row to be after nextDataRow
    totalRow = nextDataRow;
    
    // Style the new total row using data-address
    const totalRowCells = [];
    for (let col = 0; col < COL_NAMES.length; col++) {
        const cell = document.querySelector(`[data-address="${COL_NAMES[col]}${totalRow}"]`);
        if (cell) totalRowCells.push(cell);
    }
    
    if (totalRowCells.length > 0) {
        totalRowCells[0].textContent = 'Total';
        totalRowCells[0].style.fontWeight = '600';
        totalRowCells.forEach(cell => {
            cell.classList.add('total-row');
            cell.contentEditable = false;
        });
        
        // Calculate and display total
        updateTotal();
    }
}

// Multi-cell selection support
let selectedCells = new Set();
let selectionStart = null;
let isSelecting = false;

function selectCell(cell, addToSelection = false) {
    if (!addToSelection && !isSelecting) {
        // Clear previous selection
        selectedCells.forEach(c => c.classList.remove('selected', 'range-selected'));
        selectedCells.clear();
    }
    
    selectedCell = cell;
    selectedCells.add(cell);
    cell.classList.add('selected');
    
    if (isSelecting && selectionStart) {
        // Update range selection
        updateRangeSelection(selectionStart, cell);
    }
}

function updateRangeSelection(startCell, endCell) {
    // Clear all range selections
    document.querySelectorAll('.cell').forEach(c => {
        c.classList.remove('range-selected');
    });
    
    const startAddr = startCell.dataset.address;
    const endAddr = endCell.dataset.address;
    
    const startMatch = startAddr.match(/([A-Z]+)(\d+)/);
    const endMatch = endAddr.match(/([A-Z]+)(\d+)/);
    
    if (!startMatch || !endMatch) return;
    
    const startCol = COL_NAMES.indexOf(startMatch[1]);
    const startRow = parseInt(startMatch[2]);
    const endCol = COL_NAMES.indexOf(endMatch[1]);
    const endRow = parseInt(endMatch[2]);
    
    const minCol = Math.min(startCol, endCol);
    const maxCol = Math.max(startCol, endCol);
    const minRow = Math.min(startRow, endRow);
    const maxRow = Math.max(startRow, endRow);
    
    // Select all cells in range
    for (let row = minRow; row <= maxRow; row++) {
        for (let col = minCol; col <= maxCol; col++) {
            const addr = `${COL_NAMES[col]}${row}`;
            const cell = document.querySelector(`[data-address="${addr}"]`);
            if (cell) {
                cell.classList.add('range-selected');
                selectedCells.add(cell);
            }
        }
    }
}

function getSelectedRange() {
    if (selectedCells.size === 0) return null;
    
    const cells = Array.from(selectedCells);
    const addresses = cells.map(c => c.dataset.address).filter(Boolean);
    
    if (addresses.length === 0) return null;
    
    const matches = addresses.map(addr => addr.match(/([A-Z]+)(\d+)/)).filter(Boolean);
    if (matches.length === 0) return null;
    
    const cols = matches.map(m => COL_NAMES.indexOf(m[1]));
    const rows = matches.map(m => parseInt(m[2]));
    
    return {
        minCol: Math.min(...cols),
        maxCol: Math.max(...cols),
        minRow: Math.min(...rows),
        maxRow: Math.max(...rows),
        cells: cells
    };
}

function handleCellBlur(e) {
    const cell = e.target;
    const addr = cell.dataset.address;
    const value = cell.textContent.trim();
    
    // Save state before change if value actually changed
    const oldValue = spreadsheet[addr];
    if (oldValue !== value) {
        saveState();
    }
    
    spreadsheet[addr] = value;
    
    // Update totals when amount changes
    if (addr.startsWith('B')) {
        updateTotal();
    }
}

function handleCellInput(e) {
    const cell = e.target;
    const addr = cell.dataset.address;
    const value = cell.textContent;
    spreadsheet[addr] = value;
}

function handleCellKeydown(e) {
    const cell = e.target;
    const addr = cell.dataset.address;
    const match = addr.match(/([A-Z]+)(\d+)/);
    if (!match) return;

    const col = COL_NAMES.indexOf(match[1]);
    let row = parseInt(match[2]);

    // Handle Ctrl+C, Ctrl+V, Ctrl+X
    if (e.ctrlKey || e.metaKey) {
        if (e.key === 'c' || e.key === 'C') {
            // Copy - let default behavior handle it
            return;
        } else if (e.key === 'v' || e.key === 'V') {
            // Paste - handled by paste event
            return;
        } else if (e.key === 'x' || e.key === 'X') {
            // Cut - let default behavior handle it
            return;
        }
    }

    if (e.key === 'Enter') {
        e.preventDefault();
        cell.blur();
        if (row < ROWS) {
            const nextCell = document.querySelector(`[data-address="${COL_NAMES[col]}${row + 1}"]`);
            if (nextCell) nextCell.focus();
        }
    } else if (e.key === 'ArrowUp' && row > 1) {
        e.preventDefault();
        const nextCell = document.querySelector(`[data-address="${COL_NAMES[col]}${row - 1}"]`);
        if (nextCell) nextCell.focus();
    } else if (e.key === 'ArrowDown' && row < ROWS) {
        e.preventDefault();
        const nextCell = document.querySelector(`[data-address="${COL_NAMES[col]}${row + 1}"]`);
        if (nextCell) nextCell.focus();
    } else if (e.key === 'ArrowLeft' && col > 0) {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            const cursorPos = selection.getRangeAt(0).startOffset;
            if (cursorPos === 0 || (selection.toString().length === cell.textContent.length && cell.textContent.length > 0)) {
                e.preventDefault();
                const nextCell = document.querySelector(`[data-address="${COL_NAMES[col - 1]}${row}"]`);
                if (nextCell) nextCell.focus();
            }
        }
    } else if (e.key === 'ArrowRight' && col < COLS - 1) {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            const cursorPos = selection.getRangeAt(0).startOffset;
            if (cursorPos === cell.textContent.length || (selection.toString().length === cell.textContent.length && cell.textContent.length > 0)) {
                e.preventDefault();
                const nextCell = document.querySelector(`[data-address="${COL_NAMES[col + 1]}${row}"]`);
                if (nextCell) nextCell.focus();
            }
        }
    }
}

// Handle paste in cells
function handleCellPaste(e) {
    e.preventDefault();
    const cell = e.target;
    const pasteData = (e.clipboardData || window.clipboardData).getData('text');
    
    // Handle multi-line paste (tab-separated or newline-separated)
    const lines = pasteData.split(/\r?\n/);
    const match = cell.dataset.address.match(/([A-Z]+)(\d+)/);
    if (!match) return;
    
    let startCol = COL_NAMES.indexOf(match[1]);
    let startRow = parseInt(match[2]);
    
    lines.forEach((line, lineIndex) => {
        if (line.trim() === '') return;
        
        const cells = line.split('\t'); // Tab-separated (Excel format)
        cells.forEach((cellValue, cellIndex) => {
            const targetRow = startRow + lineIndex;
            const targetCol = startCol + cellIndex;
            
            if (targetRow <= ROWS && targetCol < COL_NAMES.length) {
                const targetAddr = `${COL_NAMES[targetCol]}${targetRow}`;
                const targetCell = document.querySelector(`[data-address="${targetAddr}"]`);
                
                if (targetCell && !targetCell.classList.contains('total-row')) {
                    targetCell.textContent = cellValue.trim();
                    spreadsheet[targetAddr] = cellValue.trim();
                    
                    // Update totals if amount column
                    if (targetAddr.startsWith('B')) {
                        updateTotal();
                    }
                }
            }
        });
    });
    
    // Update total after paste
    updateTotal();
}

// Handle copy from cells
function handleCellCopy(e) {
    const cell = e.target;
    const cellText = cell.textContent;
    
    if (cellText) {
        e.clipboardData.setData('text/plain', cellText);
        e.preventDefault();
    }
}

// Handle cut from cells
function handleCellCut(e) {
    const cell = e.target;
    const cellText = cell.textContent;
    const addr = cell.dataset.address;
    
    if (cellText && !cell.classList.contains('total-row')) {
        saveState(); // Save state before cut
        e.clipboardData.setData('text/plain', cellText);
        e.preventDefault();
        
        // Clear cell after cut
        cell.textContent = '';
        if (spreadsheet) {
            delete spreadsheet[addr];
        }
        
        // Update totals if amount column
        if (addr.startsWith('B')) {
            updateTotal();
        }
    }
}

function updateTotal() {
    if (!totalRow) return;
    
    const totalCell = document.querySelector(`[data-address="B${totalRow}"]`);
    if (!totalCell) return;

    let total = 0;
    
    // Sum all amounts in column B from row 2 to (totalRow - 1)
    for (let row = 2; row < totalRow; row++) {
        const cell = document.querySelector(`[data-address="B${row}"]`);
        if (cell) {
            const value = cell.textContent.trim();
            if (value) {
                const num = parseFloat(value.replace(/[,$]/g, ''));
                if (!isNaN(num)) {
                    total += num;
                }
            }
        }
    }

    // Format and display total
    totalCell.textContent = formatCurrency(total);
    spreadsheet[`B${totalRow}`] = total.toString();
}

function formatCurrency(value) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2
    }).format(value);
}

// Parse natural language entry
function parseEntry(text) {
    text = text.trim();
    if (!text) return null;

    // Pattern 1: "description +amount" or "description -amount" (with explicit sign)
    // Examples: "house cost -100", "paycheck +500", "house +5"
    const patternWithSign = /^(.+?)\s+([+-])(\d+(?:\.\d+)?)$/;
    let match = text.match(patternWithSign);
    if (match) {
        const description = match[1].trim();
        const sign = match[2];
        let amount = parseFloat(match[3]);
        amount = sign === '-' ? -Math.abs(amount) : Math.abs(amount);
        return { description, amount };
    }

    // Pattern 2: "description amount" (no sign, default positive)
    // Examples: "groceries 75", "rent 1200"
    const patternNoSign = /^(.+?)\s+(\d+(?:\.\d+)?)$/;
    match = text.match(patternNoSign);
    if (match) {
        const description = match[1].trim();
        const amount = parseFloat(match[2]);
        return { description, amount: Math.abs(amount) };
    }

    // Pattern 3: Just a number (use as amount, description becomes "Entry")
    const numMatch = text.match(/^([+-]?\d+(?:\.\d+)?)$/);
    if (numMatch) {
        return { description: 'Entry', amount: parseFloat(numMatch[1]) };
    }

    return null;
}

// Clear sheet (except row 1 headers)
function clearSheet() {
    if (!confirm('Clear all data from the sheet? This cannot be undone.')) {
        return;
    }

    // Clear all cells except row 1
    document.querySelectorAll('.cell').forEach(cell => {
        const addr = cell.dataset.address;
        if (addr) {
            const match = addr.match(/([A-Z]+)(\d+)/);
            if (match) {
                const row = parseInt(match[2]);
                if (row > 1) {
                    cell.textContent = '';
                    delete spreadsheet[addr];
                    delete spreadsheet[addr + '_formula'];
                    delete cell.dataset.formula;
                    cell.classList.remove('total-row');
                }
            }
        }
    });

    // Reset data row tracking
    nextDataRow = 2;
    totalRow = null; // Clear total row - it will be set up when data is added
}

// Add entries from quick input
function addEntriesToSheet() {
    const quickInput = document.getElementById('quickInput');
    const text = quickInput.value.trim();
    
    if (!text) return;

    const lines = text.split('\n').filter(line => line.trim());
    let addedCount = 0;

    for (const line of lines) {
        const entry = parseEntry(line);
        if (entry) {
            // Skip if we're at the total row or out of bounds
            if (totalRow && nextDataRow >= totalRow) {
                nextDataRow = totalRow + 1;
            }
            
            if (nextDataRow >= ROWS) break;
            
            // Add to sheet
            const descCell = document.querySelector(`[data-address="A${nextDataRow}"]`);
            const amountCell = document.querySelector(`[data-address="B${nextDataRow}"]`);

            if (descCell && amountCell) {
                descCell.textContent = entry.description;
                amountCell.textContent = formatCurrency(entry.amount);
                
                spreadsheet[`A${nextDataRow}`] = entry.description;
                spreadsheet[`B${nextDataRow}`] = entry.amount.toString();

                // Add date
                const dateCell = document.querySelector(`[data-address="C${nextDataRow}"]`);
                if (dateCell) {
                    const today = new Date().toLocaleDateString();
                    dateCell.textContent = today;
                    spreadsheet[`C${nextDataRow}`] = today;
                }

                nextDataRow++;
                addedCount++;
            }
        }
    }

    // Update total row after adding entries
    if (addedCount > 0) {
        setupTotalRow();
    }

    // Clear input and refocus to allow continued entry
    quickInput.value = '';
    quickInput.focus();

    // Show feedback
    if (addedCount > 0) {
        console.log(`Added ${addedCount} entries`);
    }
}

// Calculator functions
function calcUpdateDisplay() {
    const display = document.getElementById('calcDisplay');
    if (display) {
        display.textContent = calcExpression.length > 15 ? 
            calcExpression.substring(0, 15) + '...' : calcExpression;
    }
}

function calcNumber(num) {
    if (calcShouldReset) {
        calcExpression = '0';
        calcShouldReset = false;
    }
    
    if (calcExpression === '0') {
        calcExpression = num;
    } else {
        calcExpression += num;
    }
    calcUpdateDisplay();
}

function calcDecimal() {
    if (calcShouldReset) {
        calcExpression = '0';
        calcShouldReset = false;
    }
    
    const parts = calcExpression.match(/\d+\.?\d*$/);
    if (!parts || !parts[0].includes('.')) {
        calcExpression += '.';
    }
    calcUpdateDisplay();
}

function calcOperator(op) {
    calcShouldReset = false;
    
    if (calcExpression === '0') {
        calcExpression = op === '-' ? '-' : '0';
    } else {
        const lastChar = calcExpression.slice(-1);
        if (['+', '-', '*', '/', '%'].includes(lastChar)) {
            calcExpression = calcExpression.slice(0, -1) + op;
        } else {
            calcExpression += op;
        }
    }
    calcUpdateDisplay();
}

function calcCalculate() {
    try {
        let expr = calcExpression.replace(/×/g, '*').replace(/÷/g, '/');
        
        // Handle percentage
        if (expr.includes('%')) {
            expr = expr.replace(/(\d+\.?\d*)\s*%\s*([+\-*/])?\s*(\d+\.?\d*)?/g, (match, num, op, num2) => {
                const value = parseFloat(num) / 100;
                if (op && num2) {
                    return `${value}${op}${num2}`;
                }
                return value.toString();
            });
        }
        
        const result = Function('"use strict"; return (' + expr + ')')();
        
        if (isNaN(result) || !isFinite(result)) {
            calcExpression = 'Error';
        } else {
            calcLastAnswer = result;
            calcExpression = result.toString();
        }
        
        calcShouldReset = true;
        calcUpdateDisplay();
    } catch (error) {
        calcExpression = 'Error';
        calcUpdateDisplay();
        calcShouldReset = true;
    }
}

function calcClearAll() {
    calcExpression = '0';
    calcShouldReset = false;
    calcUpdateDisplay();
}

function calcClearEntry() {
    calcExpression = '0';
    calcUpdateDisplay();
}

function calcDelete() {
    if (calcExpression.length > 1) {
        calcExpression = calcExpression.slice(0, -1);
    } else {
        calcExpression = '0';
    }
    calcUpdateDisplay();
}

// Window controls
function setupWindowControls() {
    const closeBtn = document.getElementById('closeBtn');
    const minimizeBtn = document.getElementById('minimizeBtn');
    const maximizeBtn = document.getElementById('maximizeBtn');

    if (minimizeBtn) {
        minimizeBtn.addEventListener('click', () => {
            if (currentWindowId && window.electronAPI && window.electronAPI.appWindowMinimize) {
                window.electronAPI.appWindowMinimize(currentWindowId);
            }
        });
    }

    if (maximizeBtn) {
        maximizeBtn.addEventListener('click', () => {
            if (currentWindowId && window.electronAPI && window.electronAPI.appWindowMaximize) {
                window.electronAPI.appWindowMaximize(currentWindowId);
            }
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            if (currentWindowId && window.electronAPI && window.electronAPI.appWindowClose) {
                window.electronAPI.appWindowClose(currentWindowId);
            }
        });
    }
}

// Store file menu close handler to prevent duplicates
let fileMenuCloseHandler = null;

// File menu
function setupFileMenu() {
    const fileMenuBtn = document.getElementById('fileMenuBtn');
    const fileMenuDropdown = document.getElementById('fileMenuDropdown');
    const fileMenuContainer = fileMenuBtn?.closest('.file-menu-container');
    
    if (fileMenuBtn && fileMenuDropdown) {
        // Remove existing close handler if it exists
        if (fileMenuCloseHandler) {
            document.removeEventListener('click', fileMenuCloseHandler);
        }
        
        fileMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            fileMenuDropdown.classList.toggle('show');
        });

        // Close menu when clicking outside - but NOT when clicking menu items
        fileMenuCloseHandler = (e) => {
            // Don't close if clicking on menu items or the button
            const isClickOnMenuItem = e.target.closest('.file-menu-item') || 
                                     e.target.closest('.file-menu-dropdown') ||
                                     e.target === fileMenuBtn ||
                                     fileMenuContainer?.contains(e.target);
            
            if (!isClickOnMenuItem) {
                fileMenuDropdown.classList.remove('show');
            }
        };
        document.addEventListener('click', fileMenuCloseHandler);

        // File menu items
        const fileMenuNew = document.getElementById('fileMenuNew');
        const fileMenuOpen = document.getElementById('fileMenuOpen');
        const fileMenuSave = document.getElementById('fileMenuSave');
        const fileMenuSaveAs = document.getElementById('fileMenuSaveAs');

        if (fileMenuNew) {
            fileMenuNew.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                fileMenuDropdown.classList.remove('show');
                if (confirm('Create a new finance sheet? This will clear all data.')) {
                    spreadsheet = {};
                    nextDataRow = 2;
                    document.querySelectorAll('.cell').forEach(cell => {
                        const addr = cell.dataset.address;
                        if (addr && !addr.endsWith('1')) {
                            cell.textContent = '';
                        }
                    });
                    setupTotalRow();
                }
            });
        }

        if (fileMenuOpen) {
            fileMenuOpen.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                fileMenuDropdown.classList.remove('show');
                console.log('[FINANCE] Open file clicked - functionality not yet implemented');
                // TODO: Implement file open functionality
            });
        }

        if (fileMenuSave) {
            fileMenuSave.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                fileMenuDropdown.classList.remove('show');
                console.log('[FINANCE] Save file clicked - functionality not yet implemented');
                // TODO: Implement file save functionality
            });
        }

        if (fileMenuSaveAs) {
            fileMenuSaveAs.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                fileMenuDropdown.classList.remove('show');
                console.log('[FINANCE] Save As file clicked - functionality not yet implemented');
                // TODO: Implement file save as functionality
            });
        }
    }
}

// Get window ID
function getWindowId() {
    if (window.electronAPI && window.electronAPI.getWindowId) {
        window.electronAPI.getWindowId().then(id => {
            currentWindowId = id;
        }).catch(e => {
            console.error('getWindowId error:', e);
        });
    }
}

// Theme Management
let currentTheme = localStorage.getItem('finance-theme') || 'dark';
document.documentElement.setAttribute('data-theme', currentTheme);

// Store theme toggle handler to prevent duplicates
let themeToggleHandler = null;

function setupThemeToggle() {
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    if (!themeToggleBtn) {
        console.warn('[FINANCE] Theme toggle button not found');
        return;
    }
    
    console.log('[FINANCE] Setting up theme toggle, current theme:', currentTheme);
    
    // Remove existing listener if it exists
    if (themeToggleHandler) {
        themeToggleBtn.removeEventListener('click', themeToggleHandler);
    }
    
    // Set initial icon
    themeToggleBtn.textContent = currentTheme === 'dark' ? '☀️' : '🌙';
    
    // Ensure button is clickable
    themeToggleBtn.style.pointerEvents = 'auto';
    themeToggleBtn.style.cursor = 'pointer';
    themeToggleBtn.disabled = false;
    
    // Create and store new handler
    themeToggleHandler = (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('[FINANCE] Theme toggle clicked, current theme:', currentTheme);
        
        currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', currentTheme);
        localStorage.setItem('finance-theme', currentTheme);
        themeToggleBtn.textContent = currentTheme === 'dark' ? '☀️' : '🌙';
        
        console.log('[FINANCE] Theme changed to:', currentTheme);
    };
    
    // Attach handler with capture phase to catch it early
    themeToggleBtn.addEventListener('click', themeToggleHandler, true);
    
    // Also add mousedown as backup
    themeToggleBtn.addEventListener('mousedown', (e) => {
        console.log('[FINANCE] Theme toggle mousedown event');
    }, true);
    
    console.log('[FINANCE] Theme toggle handler attached successfully');
}

// Initialize
function initialize() {
    getWindowId();
    initializeSpreadsheet();
    setupWindowControls();
    setupFileMenu();
    setupThemeToggle();

    // Setup quick input button
    const addEntriesBtn = document.getElementById('addEntriesBtn');
    if (addEntriesBtn) {
        addEntriesBtn.addEventListener('click', addEntriesToSheet);
    }

    // Setup clear button
    const clearSheetBtn = document.getElementById('clearSheetBtn');
    if (clearSheetBtn) {
        clearSheetBtn.addEventListener('click', clearSheet);
    }

    // Allow Enter in quick input (Shift+Enter for new line, Enter to add)
    const quickInput = document.getElementById('quickInput');
    if (quickInput) {
        quickInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                addEntriesToSheet();
            }
        });
    }

    // Setup calculator toggle
    const toggleCalculatorBtn = document.getElementById('toggleCalculatorBtn');
    const calculatorSection = document.querySelector('.calculator-section');
    const calculatorContent = document.getElementById('calculatorContent');
    if (toggleCalculatorBtn && calculatorSection) {
        toggleCalculatorBtn.addEventListener('click', () => {
            calculatorSection.classList.toggle('minimized');
            toggleCalculatorBtn.textContent = calculatorSection.classList.contains('minimized') ? '+' : '−';
        });
    }

    // Setup quick entry toggle
    const toggleQuickEntryBtn = document.getElementById('toggleQuickEntryBtn');
    const inputSection = document.querySelector('.input-section');
    if (toggleQuickEntryBtn && inputSection) {
        toggleQuickEntryBtn.addEventListener('click', () => {
            inputSection.classList.toggle('minimized');
            toggleQuickEntryBtn.textContent = inputSection.classList.contains('minimized') ? '+' : '−';
        });
    }

    // Setup tax calculator toggle
    const toggleTaxCalculatorBtn = document.getElementById('toggleTaxCalculatorBtn');
    const taxCalculatorSection = document.querySelector('.tax-calculator-section');
    if (toggleTaxCalculatorBtn && taxCalculatorSection) {
        toggleTaxCalculatorBtn.addEventListener('click', () => {
            taxCalculatorSection.classList.toggle('minimized');
            toggleTaxCalculatorBtn.textContent = taxCalculatorSection.classList.contains('minimized') ? '+' : '−';
        });
    }

    // Setup tax calculator
    setupTaxCalculator();

    // Setup income tax and crypto tax buttons
    setupTaxTypeButtons();

    // Setup right panel toggle
    setupRightPanelToggle();

    // Setup AI section toggle
    setupAiToggle();

    // Setup Formulas section toggle
    setupFormulasToggle();

    // Setup Ribbon and Sheet Management
    setupRibbon();
    setupSheetManagement();
    
    // Sync row numbers scrolling with cells container
    setupRowNumberScrollSync();

    // Keyboard shortcuts for calculator and undo/redo
    document.addEventListener('keydown', (e) => {
        // Don't intercept if typing in input fields
        if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT' || e.target.contentEditable === 'true') {
            // Allow Ctrl+Z for undo even in cells
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                undo();
                return;
            }
            // Allow Ctrl+Y or Ctrl+Shift+Z for redo
            if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
                e.preventDefault();
                redo();
                return;
            }
            return;
        }

        // Undo/Redo shortcuts
        if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
            e.preventDefault();
            undo();
            return;
        }
        if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
            e.preventDefault();
            redo();
            return;
        }

        // Calculator shortcuts
        if (e.key >= '0' && e.key <= '9') {
            calcNumber(e.key);
        } else if (e.key === '.') {
            calcDecimal();
        } else if (e.key === '+' || e.key === '-') {
            calcOperator(e.key);
        } else if (e.key === '*') {
            calcOperator('*');
        } else if (e.key === '/') {
            e.preventDefault();
            calcOperator('/');
        } else if (e.key === 'Enter' || e.key === '=') {
            calcCalculate();
        } else if (e.key === 'Escape') {
            calcClearAll();
        } else if (e.key === 'Backspace') {
            calcDelete();
        } else if (e.key === '%') {
            calcOperator('%');
        }
    });
}

// Tax Calculator Functions - Removed since we only have Income Tax and Crypto Tax buttons now
function setupTaxCalculator() {
    // No longer needed - tax calculator fields removed
}


// Setup Right Panel Toggle
function setupRightPanelToggle() {
    const closeRightPanelBtn = document.getElementById('closeRightPanelBtn');
    const helpBtn = document.getElementById('helpBtn');
    const rightPanel = document.getElementById('rightPanel');

    if (closeRightPanelBtn && rightPanel) {
        closeRightPanelBtn.addEventListener('click', () => {
            rightPanel.classList.add('hidden');
            updateLayoutForPanel();
        });
    }

    if (helpBtn && rightPanel) {
        helpBtn.addEventListener('click', () => {
            rightPanel.classList.toggle('hidden');
            updateLayoutForPanel();
        });
    }
    
    // Function to update layout when panel visibility changes
    function updateLayoutForPanel() {
        const mainContainer = document.querySelector('.main-container');
        if (rightPanel.classList.contains('hidden')) {
            mainContainer?.classList.add('panel-hidden');
        } else {
            mainContainer?.classList.remove('panel-hidden');
        }
    }
    
    // Initial check
    updateLayoutForPanel();
}

// Setup AI Toggle
function setupAiToggle() {
    const toggleAiBtn = document.getElementById('toggleAiBtn');
    const aiSection = document.querySelector('.ai-section');

    if (toggleAiBtn && aiSection) {
        toggleAiBtn.addEventListener('click', () => {
            aiSection.classList.toggle('minimized');
            toggleAiBtn.textContent = aiSection.classList.contains('minimized') ? '+' : '−';
        });
    }

    // Setup AI submit button with real AI integration
    const aiSubmitBtn = document.getElementById('aiSubmitBtn');
    const aiInput = document.getElementById('aiInput');
    const aiResponse = document.getElementById('aiResponse');

    if (aiSubmitBtn && aiInput && aiResponse) {
        aiSubmitBtn.addEventListener('click', async () => {
            const query = aiInput.value.trim();
            if (!query) return;

            aiResponse.textContent = 'Processing...';
            aiSubmitBtn.disabled = true;
            
            try {
                // Get spreadsheet data for context
                const spreadsheetData = getSpreadsheetDataForAI();
                
                // Check if user wants to perform an action (formula, calculation, etc.)
                const lowerQuery = query.toLowerCase();
                const isAction = lowerQuery.includes('calculate') || 
                               lowerQuery.includes('sum') || 
                               lowerQuery.includes('total') ||
                               lowerQuery.includes('average') || 
                               lowerQuery.includes('max') ||
                               lowerQuery.includes('min') ||
                               lowerQuery.includes('subtract') ||
                               lowerQuery.includes('multiply') ||
                               lowerQuery.includes('divide') ||
                               lowerQuery.includes('formula') ||
                               lowerQuery.includes('put') ||
                               lowerQuery.includes('set') ||
                               lowerQuery.includes('add') ||
                               lowerQuery.startsWith('=');
                
                if (isAction) {
                    // Try to execute the action
                    try {
                        const actionResult = await executeAIAction(query, spreadsheetData);
                        if (actionResult.success) {
                            // Format the response with work shown
                            let responseText = '';
                            if (actionResult.work) {
                                responseText = actionResult.work + '\n\n';
                            }
                            responseText += actionResult.message || 'Action completed successfully!';
                            aiResponse.textContent = responseText;
                            // Refresh display
                            if (actionResult.refresh) {
                                updateTotal();
                            }
                        } else {
                            // If action fails, fall back to AI analysis
                            const contextPrompt = `You are a financial assistant with full control over a spreadsheet. Here's the current data:

${spreadsheetData}

User request: ${query}

You can:
- Create formulas (e.g., "=SUM(A1:A10)", "=A1*B1")
- Calculate values and put them in cells
- Analyze data and provide insights
- Perform calculations

Respond with either:
1. A formula to execute (format: FORMULA:cell_address=formula)
2. Analysis and explanation
3. Both

If you want to set a cell value, use: SET:cell_address=value
If you want to create a formula, use: FORMULA:cell_address=formula`;

                            if (window.electronAPI && window.electronAPI.aiChat) {
                                const result = await window.electronAPI.aiChat(contextPrompt, []);
                                if (result.success) {
                                    // Parse AI response for commands
                                    const formulaMatch = result.response.match(/FORMULA:([A-Z]\d+)=(.+)/i);
                                    const setMatch = result.response.match(/SET:([A-Z]\d+)=(.+)/i);
                                    
                                    if (formulaMatch) {
                                        const [, addr, formula] = formulaMatch;
                                        await executeFormula(addr, formula);
                                        aiResponse.textContent = `Formula applied to ${addr}: ${formula}\n\n${result.response}`;
                                    } else if (setMatch) {
                                        const [, addr, value] = setMatch;
                                        await setCellValue(addr, value);
                                        aiResponse.textContent = `Value set in ${addr}: ${value}\n\n${result.response}`;
                                    } else {
                                        aiResponse.textContent = result.response;
                                    }
                                } else {
                                    aiResponse.textContent = `Error: ${result.error || 'Failed to get AI response'}`;
                                }
                            }
                        }
                    } catch (actionError) {
                        // Fall back to regular AI chat
                        const contextPrompt = `You are a financial assistant analyzing a spreadsheet. Here's the current data:

${spreadsheetData}

User question: ${query}

Provide helpful financial analysis, insights, or suggestions based on the data. Be concise and actionable.`;
                        
                        if (window.electronAPI && window.electronAPI.aiChat) {
                            const result = await window.electronAPI.aiChat(contextPrompt, []);
                            if (result.success) {
                                aiResponse.textContent = result.response;
                            } else {
                                aiResponse.textContent = `Error: ${result.error || 'Failed to get AI response'}`;
                            }
                        }
                    }
                } else {
                    // Regular analysis query
                    const contextPrompt = `You are a financial assistant analyzing a spreadsheet. Here's the current data:

${spreadsheetData}

User question: ${query}

Provide helpful financial analysis, insights, or suggestions based on the data. Be concise and actionable.`;
                    
                    // Call AI API
                    if (window.electronAPI && window.electronAPI.aiChat) {
                        const result = await window.electronAPI.aiChat(contextPrompt, []);
                        if (result.success) {
                            aiResponse.textContent = result.response;
                        } else {
                            aiResponse.textContent = `Error: ${result.error || 'Failed to get AI response'}`;
                        }
                    } else {
                        aiResponse.textContent = 'Error: AI service is not available. Please make sure Ollama is running.';
                    }
                }
            } catch (error) {
                aiResponse.textContent = `Error: ${error.message}`;
            } finally {
                aiSubmitBtn.disabled = false;
            }
        });

        // Allow Enter key to submit
        aiInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                aiSubmitBtn.click();
            }
        });
    }

    // Setup AI button in titlebar
    const aiTitleBtn = document.getElementById('aiBtn');
    if (aiTitleBtn && aiSection) {
        aiTitleBtn.addEventListener('click', () => {
            // Show right panel if hidden
            const rightPanel = document.getElementById('rightPanel');
            if (rightPanel && rightPanel.classList.contains('hidden')) {
                rightPanel.classList.remove('hidden');
            }
            // Expand AI section
            aiSection.classList.remove('minimized');
            toggleAiBtn.textContent = '−';
            // Focus on AI input
            setTimeout(() => {
                const aiInput = document.getElementById('aiInput');
                if (aiInput) aiInput.focus();
            }, 100);
        });
    }
}

// Get Spreadsheet Data for AI Analysis - Gets actual cell values from DOM
function getSpreadsheetDataForAI() {
    const data = [];
    const columns = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    
    // Get all cells with actual content from DOM (more reliable than spreadsheet object)
    const allCells = document.querySelectorAll('.cell');
    const cellMap = {};
    allCells.forEach(cell => {
        const addr = cell.dataset.address;
        if (addr) {
            const value = cell.textContent.trim();
            if (value) {
                cellMap[addr] = value;
            }
        }
    });
    
    // Build a table representation
    const tableData = [];
    
    // Get header row (row 1)
    const headerRow = [];
    columns.forEach(col => {
        const value = cellMap[`${col}1`] || '';
        headerRow.push(value);
    });
    if (headerRow.some(v => v)) {
        tableData.push({ row: 1, type: 'header', data: headerRow });
    }
    
    // Get all data rows (row 2 onwards, up to 100 rows)
    for (let row = 2; row <= ROWS; row++) {
        const rowData = [];
        let hasData = false;
        columns.forEach(col => {
            const value = cellMap[`${col}${row}`] || '';
            rowData.push(value);
            if (value) hasData = true;
        });
        if (hasData) {
            tableData.push({ row, type: 'data', data: rowData });
        }
    }
    
    // Format as a readable table for AI
    if (tableData.length === 0) {
        return 'The spreadsheet is currently empty.';
    }
    
    // Build a markdown-style table
    let result = 'SPREADSHEET DATA:\n\n';
    
    // Header row
    if (tableData.length > 0 && tableData[0].type === 'header') {
        result += '| ' + columns.join(' | ') + ' |\n';
        result += '|' + columns.map(() => '---').join('|') + '|\n';
        result += '| ' + tableData[0].data.map(v => v || '').join(' | ') + ' |\n\n';
    }
    
    // Data rows
    const dataRows = tableData.filter(r => r.type === 'data');
    if (dataRows.length > 0) {
        if (tableData[0].type !== 'header') {
            result += '| ' + columns.join(' | ') + ' |\n';
            result += '|' + columns.map(() => '---').join('|') + '|\n';
        }
        dataRows.forEach(rowInfo => {
            result += '| ' + rowInfo.data.map(v => v || '').join(' | ') + ' |\n';
        });
    }
    
    // Add summary
    result += `\n\nSummary: ${dataRows.length} data rows, ${columns.length} columns (A-${columns[columns.length-1]})`;
    if (totalRow) {
        result += `, Total row at row ${totalRow}`;
    }
    
    return result;
}

// Execute AI actions (formulas, calculations, etc.)
async function executeAIAction(query, spreadsheetData) {
    const lowerQuery = query.toLowerCase();
    
    // Parse "total of column X" or "sum of column X" or "total in column X" or "total value of column X"
    const columnTotalMatch = query.match(/(?:total|sum)\s+(?:value\s+of\s+|of\s+|in\s+)?column\s+([A-J])/i) ||
                              query.match(/(?:total|sum)\s+([A-J])\s+column/i) ||
                              query.match(/column\s+([A-J])\s+(?:total|sum)/i);
    if (columnTotalMatch) {
        const column = columnTotalMatch[1].toUpperCase();
        const result = await calculateColumnTotal(column);
        if (result !== null && result.values && result.values.length > 0) {
            // Find the last row with data and place result after it (at the bottom)
            const lastRow = findLastRowInColumn(column);
            const targetCell = `${column}${lastRow + 1}`;
            
            await setCellValue(targetCell, result.total);
            
            // Build detailed work message
            let workMessage = 'Calculation Steps:\n\n';
            result.values.forEach((item, index) => {
                workMessage += `${item.addr} value is ${item.value}`;
                if (index < result.values.length - 1) {
                    workMessage += ', ';
                }
            });
            workMessage += '\n\nAdding it all up:\n';
            workMessage += result.values.map(v => v.value).join(' + ');
            workMessage += ` = ${result.total}\n\n`;
            workMessage += `The total is: ${result.total}\n\n`;
            workMessage += `Placed in cell ${targetCell}.`;
            
            return { 
                success: true, 
                work: workMessage,
                message: `Total calculated and placed in cell ${targetCell}.`,
                refresh: true 
            };
        }
    }
    
    // Parse formula requests
    const formulaMatch = query.match(/formula\s+([A-Z]\d+)\s*=\s*(.+)/i) || 
                        query.match(/put\s+(.+)\s+in\s+([A-Z]\d+)/i) ||
                        query.match(/set\s+([A-Z]\d+)\s*=\s*(.+)/i) ||
                        query.match(/^=([A-Z]\d+)\s*=\s*(.+)/i);
    
    if (formulaMatch) {
        let addr, formula;
        if (formulaMatch[2] && formulaMatch[1].match(/^[A-Z]\d+$/)) {
            // "formula A1 = SUM(B1:B10)" or "put SUM(B1:B10) in A1"
            addr = formulaMatch[1];
            formula = formulaMatch[2];
        } else {
            addr = formulaMatch[2] || formulaMatch[1];
            formula = formulaMatch[1] || formulaMatch[2];
        }
        
        if (addr && formula) {
            await executeFormula(addr, formula);
            return { success: true, message: `Formula applied to ${addr}` };
        }
    }
    
    // Parse calculation requests
    const calcMatch = query.match(/(sum|average|max|min)\s+(.+?)(?:\s+in\s+([A-Z]\d+))?/i);
    if (calcMatch) {
        const operation = calcMatch[1].toLowerCase();
        const range = calcMatch[2];
        const targetCell = calcMatch[3] || selectedCell?.dataset.address;
        
        if (targetCell) {
            const result = await calculateRange(operation, range);
            if (result !== null) {
                await setCellValue(targetCell, result);
                return { success: true, message: `${operation} result: ${result}`, refresh: true };
            }
        }
    }
    
    return { success: false };
}

// Calculate total of a column with work shown
async function calculateColumnTotal(column) {
    const values = [];
    
    // Get all numeric values from the column
    for (let row = 1; row <= ROWS; row++) {
        const addr = `${column}${row}`;
        const cell = document.querySelector(`[data-address="${addr}"]`);
        if (cell && !cell.classList.contains('total-row')) {
            const text = cell.textContent.trim();
            if (text) {
                // Try to parse as number
                const num = parseFloat(text.replace(/[,$%]/g, ''));
                if (!isNaN(num)) {
                    values.push({ addr, value: num });
                }
            }
        }
    }
    
    if (values.length === 0) {
        return null;
    }
    
    // Calculate sum
    const total = values.reduce((sum, item) => sum + item.value, 0);
    
    return { total, values };
}

// Find the last row with data in a column
function findLastRowInColumn(column) {
    let lastRow = 1;
    for (let row = 1; row <= ROWS; row++) {
        const addr = `${column}${row}`;
        const cell = document.querySelector(`[data-address="${addr}"]`);
        if (cell && cell.textContent.trim() && !cell.classList.contains('total-row')) {
            lastRow = row;
        }
    }
    return lastRow;
}

// Calculate column operations (average, max, min, subtract, multiply, divide)
async function calculateColumnOperation(column, operation) {
    const values = [];
    
    // Get all numeric values from the column
    for (let row = 1; row <= ROWS; row++) {
        const addr = `${column}${row}`;
        const cell = document.querySelector(`[data-address="${addr}"]`);
        if (cell && !cell.classList.contains('total-row')) {
            const text = cell.textContent.trim();
            if (text) {
                // Try to parse as number
                const num = parseFloat(text.replace(/[,$%]/g, ''));
                if (!isNaN(num)) {
                    values.push({ addr, value: num });
                }
            }
        }
    }
    
    if (values.length === 0) {
        return null;
    }
    
    let result;
    switch (operation.toLowerCase()) {
        case 'average':
            result = values.reduce((sum, item) => sum + item.value, 0) / values.length;
            break;
        case 'max':
            result = Math.max(...values.map(v => v.value));
            break;
        case 'min':
            result = Math.min(...values.map(v => v.value));
            break;
        case 'subtract':
            result = values.reduce((diff, item, index) => {
                if (index === 0) return item.value;
                return diff - item.value;
            }, 0);
            break;
        case 'multiply':
            result = values.reduce((product, item) => product * item.value, 1);
            break;
        case 'divide':
            result = values.reduce((quotient, item, index) => {
                if (index === 0) return item.value;
                if (item.value === 0) return quotient; // Avoid division by zero
                return quotient / item.value;
            }, 0);
            break;
        default:
            return null;
    }
    
    return { result, values };
}

// Calculate column operations (average, max, min, subtract, multiply, divide)
async function calculateColumnOperation(column, operation) {
    const values = [];
    
    // Get all numeric values from the column
    for (let row = 1; row <= ROWS; row++) {
        const addr = `${column}${row}`;
        const cell = document.querySelector(`[data-address="${addr}"]`);
        if (cell && !cell.classList.contains('total-row')) {
            const text = cell.textContent.trim();
            if (text) {
                // Try to parse as number
                const num = parseFloat(text.replace(/[,$%]/g, ''));
                if (!isNaN(num)) {
                    values.push({ addr, value: num });
                }
            }
        }
    }
    
    if (values.length === 0) {
        return null;
    }
    
    let result;
    switch (operation.toLowerCase()) {
        case 'average':
            result = values.reduce((sum, item) => sum + item.value, 0) / values.length;
            break;
        case 'max':
            result = Math.max(...values.map(v => v.value));
            break;
        case 'min':
            result = Math.min(...values.map(v => v.value));
            break;
        case 'subtract':
            result = values.reduce((diff, item, index) => {
                if (index === 0) return item.value;
                return diff - item.value;
            }, 0);
            break;
        case 'multiply':
            result = values.reduce((product, item) => product * item.value, 1);
            break;
        case 'divide':
            result = values.reduce((quotient, item, index) => {
                if (index === 0) return item.value;
                if (item.value === 0) return quotient; // Avoid division by zero
                return quotient / item.value;
            }, 0);
            break;
        default:
            return null;
    }
    
    return { result, values };
}

// Execute a formula in a cell
async function executeFormula(addr, formula) {
    saveState();
    const cell = document.querySelector(`[data-address="${addr}"]`);
    if (!cell) return;
    
    // Remove leading = if present
    formula = formula.replace(/^=/, '').trim();
    
    // Replace cell references with values
    let processedFormula = formula;
    const cellRefRegex = /([A-Z]+\d+)/g;
    const matches = formula.match(cellRefRegex);
    
    if (matches) {
        matches.forEach(ref => {
            const refCell = document.querySelector(`[data-address="${ref}"]`);
            if (refCell) {
                const value = parseFloat(refCell.textContent.replace(/[,$%]/g, '')) || 0;
                processedFormula = processedFormula.replace(ref, value);
            }
        });
    }
    
    try {
        // Evaluate formula
        const result = Function('"use strict"; return (' + processedFormula + ')')();
        cell.textContent = result;
        spreadsheet[addr] = result.toString();
    } catch (error) {
        cell.textContent = '#ERROR';
        spreadsheet[addr] = '#ERROR';
    }
}

// Set a cell value
async function setCellValue(addr, value) {
    saveState();
    const cell = document.querySelector(`[data-address="${addr}"]`);
    if (cell) {
        cell.textContent = value;
        spreadsheet[addr] = value;
        if (addr.startsWith('B')) {
            updateTotal();
        }
    }
}

// Calculate range operations
async function calculateRange(operation, rangeText) {
    // Parse range like "B2:B10" or "A1, A2, A3"
    const rangeMatch = rangeText.match(/([A-Z]+)(\d+):([A-Z]+)(\d+)/);
    const cells = [];
    
    if (rangeMatch) {
        const startCol = COL_NAMES.indexOf(rangeMatch[1]);
        const startRow = parseInt(rangeMatch[2]);
        const endCol = COL_NAMES.indexOf(rangeMatch[3]);
        const endRow = parseInt(rangeMatch[4]);
        
        for (let row = startRow; row <= endRow; row++) {
            for (let col = startCol; col <= endCol; col++) {
                const addr = `${COL_NAMES[col]}${row}`;
                const cell = document.querySelector(`[data-address="${addr}"]`);
                if (cell) {
                    const value = parseFloat(cell.textContent.replace(/[,$%]/g, ''));
                    if (!isNaN(value)) {
                        cells.push(value);
                    }
                }
            }
        }
    } else {
        // Try comma-separated cells
        const cellRefs = rangeText.split(',').map(s => s.trim());
        cellRefs.forEach(ref => {
            const cell = document.querySelector(`[data-address="${ref}"]`);
            if (cell) {
                const value = parseFloat(cell.textContent.replace(/[,$%]/g, ''));
                if (!isNaN(value)) {
                    cells.push(value);
                }
            }
        });
    }
    
    if (cells.length === 0) return null;
    
    switch (operation.toLowerCase()) {
        case 'sum':
            return cells.reduce((a, b) => a + b, 0);
        case 'average':
            return cells.reduce((a, b) => a + b, 0) / cells.length;
        case 'max':
            return Math.max(...cells);
        case 'min':
            return Math.min(...cells);
        default:
            return null;
    }
}

// Setup Row Number Scroll Synchronization
function setupRowNumberScrollSync() {
    const rowNumbers = document.getElementById('rowNumbers');
    const cellsContainer = document.getElementById('cellsContainer');
    
    if (!rowNumbers || !cellsContainer) return;
    
    // Sync cells container scroll to row numbers
    cellsContainer.addEventListener('scroll', () => {
        rowNumbers.scrollTop = cellsContainer.scrollTop;
    });
    
    // Sync row numbers scroll to cells container
    rowNumbers.addEventListener('scroll', () => {
        cellsContainer.scrollTop = rowNumbers.scrollTop;
    });
}

// Setup Formulas Toggle
function setupFormulasToggle() {
    const toggleFormulasBtn = document.getElementById('toggleFormulasBtn');
    const formulasSection = document.querySelector('.formulas-section');

    if (toggleFormulasBtn && formulasSection) {
        toggleFormulasBtn.addEventListener('click', () => {
            formulasSection.classList.toggle('minimized');
            toggleFormulasBtn.textContent = formulasSection.classList.contains('minimized') ? '+' : '−';
            
            // Initialize budget form when expanded for the first time
            if (!formulasSection.classList.contains('minimized')) {
                if (typeof initializeBudgetForm === 'function') {
                    initializeBudgetForm();
                }
            }
        });
    }
}

// Setup Tax Type Buttons (Income Tax and Crypto Tax)
function setupTaxTypeButtons() {
    const incomeTaxBtn = document.getElementById('incomeTaxBtn');
    const cryptoTaxBtn = document.getElementById('cryptoTaxBtn');
    const incomeTaxModal = document.getElementById('incomeTaxModal');
    const cryptoTaxModal = document.getElementById('cryptoTaxModal');
    const closeIncomeTaxModal = document.getElementById('closeIncomeTaxModal');
    const closeCryptoTaxModal = document.getElementById('closeCryptoTaxModal');
    
    if (incomeTaxBtn && incomeTaxModal) {
        incomeTaxBtn.addEventListener('click', () => {
            if (typeof generateIncomeTaxForm === 'function') {
                generateIncomeTaxForm();
            }
            incomeTaxModal.classList.add('active');
        });
    }
    
    if (cryptoTaxBtn && cryptoTaxModal) {
        cryptoTaxBtn.addEventListener('click', () => {
            if (typeof generateCryptoTaxForm === 'function') {
                generateCryptoTaxForm();
            }
            cryptoTaxModal.classList.add('active');
        });
    }
    
    if (closeIncomeTaxModal && incomeTaxModal) {
        closeIncomeTaxModal.addEventListener('click', () => {
            incomeTaxModal.classList.remove('active');
        });
    }
    
    if (closeCryptoTaxModal && cryptoTaxModal) {
        closeCryptoTaxModal.addEventListener('click', () => {
            cryptoTaxModal.classList.remove('active');
        });
    }
    
    // Close modals when clicking outside
    if (incomeTaxModal) {
        incomeTaxModal.addEventListener('click', (e) => {
            if (e.target === incomeTaxModal) {
                incomeTaxModal.classList.remove('active');
            }
        });
    }
    
    if (cryptoTaxModal) {
        cryptoTaxModal.addEventListener('click', (e) => {
            if (e.target === cryptoTaxModal) {
                cryptoTaxModal.classList.remove('active');
            }
        });
    }
}

// Ribbon Interface Setup
function setupRibbon() {
    // Tab switching
    const ribbonTabs = document.querySelectorAll('.ribbon-tab');
    const ribbonContents = document.querySelectorAll('.ribbon-content');
    
    ribbonTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.dataset.tab;
            
            // Update active tab
            ribbonTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Show/hide content
            ribbonContents.forEach(content => {
                content.classList.add('hidden');
            });
            
            const targetContent = document.getElementById(`ribbon${targetTab.charAt(0).toUpperCase() + targetTab.slice(1)}`);
            if (targetContent) {
                targetContent.classList.remove('hidden');
            }
        });
    });
    
    // Clipboard buttons
    const ribbonPaste = document.getElementById('ribbonPaste');
    const ribbonCut = document.getElementById('ribbonCut');
    const ribbonCopy = document.getElementById('ribbonCopy');
    
    if (ribbonPaste) {
        ribbonPaste.addEventListener('click', async () => {
            if (selectedCell) {
                try {
                    const text = await navigator.clipboard.readText();
                    pasteFromClipboard(text);
                } catch (err) {
                    console.error('Failed to paste:', err);
                }
            }
        });
    }
    
    if (ribbonCut) {
        ribbonCut.addEventListener('click', () => {
            if (selectedCell) {
                cutCellContent(selectedCell);
            }
        });
    }
    
    if (ribbonCopy) {
        ribbonCopy.addEventListener('click', () => {
            const range = getSelectedRange();
            if (range) {
                const text = range.cells.map(c => c.textContent).join('\t');
                copyToClipboard(text);
            } else if (selectedCell) {
                copyToClipboard(selectedCell.textContent);
            }
        });
    }
    
    // Undo/Redo buttons
    const ribbonUndo = document.getElementById('ribbonUndo');
    const ribbonRedo = document.getElementById('ribbonRedo');
    
    if (ribbonUndo) {
        ribbonUndo.addEventListener('click', () => {
            undo();
        });
    }
    
    if (ribbonRedo) {
        ribbonRedo.addEventListener('click', () => {
            redo();
        });
    }
    
    // Font formatting
    const ribbonBold = document.getElementById('ribbonBold');
    const ribbonItalic = document.getElementById('ribbonItalic');
    const ribbonUnderline = document.getElementById('ribbonUnderline');
    
    if (ribbonBold) {
        ribbonBold.addEventListener('click', () => {
            if (selectedCell) {
                if (selectedCell.style.fontWeight === 'bold' || selectedCell.style.fontWeight === '700') {
                    selectedCell.style.fontWeight = 'normal';
                } else {
                    selectedCell.style.fontWeight = 'bold';
                }
            }
        });
    }
    
    if (ribbonItalic) {
        ribbonItalic.addEventListener('click', () => {
            if (selectedCell) {
                if (selectedCell.style.fontStyle === 'italic') {
                    selectedCell.style.fontStyle = 'normal';
                } else {
                    selectedCell.style.fontStyle = 'italic';
                }
            }
        });
    }
    
    if (ribbonUnderline) {
        ribbonUnderline.addEventListener('click', () => {
            if (selectedCell) {
                if (selectedCell.style.textDecoration === 'underline') {
                    selectedCell.style.textDecoration = 'none';
                } else {
                    selectedCell.style.textDecoration = 'underline';
                }
            }
        });
    }
    
    // Alignment
    const ribbonAlignLeft = document.getElementById('ribbonAlignLeft');
    const ribbonAlignCenter = document.getElementById('ribbonAlignCenter');
    const ribbonAlignRight = document.getElementById('ribbonAlignRight');
    
    if (ribbonAlignLeft) {
        ribbonAlignLeft.addEventListener('click', () => {
            if (selectedCell) {
                selectedCell.style.textAlign = 'left';
            }
        });
    }
    
    if (ribbonAlignCenter) {
        ribbonAlignCenter.addEventListener('click', () => {
            if (selectedCell) {
                selectedCell.style.textAlign = 'center';
            }
        });
    }
    
    if (ribbonAlignRight) {
        ribbonAlignRight.addEventListener('click', () => {
            const range = getSelectedRange();
            if (range) {
                range.cells.forEach(cell => cell.style.textAlign = 'right');
            } else if (selectedCell) {
                selectedCell.style.textAlign = 'right';
            }
        });
    }
    
    // Vertical alignment
    const ribbonAlignTop = document.getElementById('ribbonAlignTop');
    const ribbonAlignMiddle = document.getElementById('ribbonAlignMiddle');
    const ribbonAlignBottom = document.getElementById('ribbonAlignBottom');
    
    if (ribbonAlignTop) {
        ribbonAlignTop.addEventListener('click', () => {
            const range = getSelectedRange();
            if (range) {
                range.cells.forEach(cell => cell.style.verticalAlign = 'top');
            } else if (selectedCell) {
                selectedCell.style.verticalAlign = 'top';
            }
        });
    }
    
    if (ribbonAlignMiddle) {
        ribbonAlignMiddle.addEventListener('click', () => {
            const range = getSelectedRange();
            if (range) {
                range.cells.forEach(cell => cell.style.verticalAlign = 'middle');
            } else if (selectedCell) {
                selectedCell.style.verticalAlign = 'middle';
            }
        });
    }
    
    if (ribbonAlignBottom) {
        ribbonAlignBottom.addEventListener('click', () => {
            const range = getSelectedRange();
            if (range) {
                range.cells.forEach(cell => cell.style.verticalAlign = 'bottom');
            } else if (selectedCell) {
                selectedCell.style.verticalAlign = 'bottom';
            }
        });
    }
    
    // Wrap text
    const ribbonWrapText = document.getElementById('ribbonWrapText');
    if (ribbonWrapText) {
        ribbonWrapText.addEventListener('click', () => {
            const range = getSelectedRange();
            if (range) {
                range.cells.forEach(cell => cell.style.whiteSpace = 'normal');
            } else if (selectedCell) {
                selectedCell.style.whiteSpace = selectedCell.style.whiteSpace === 'normal' ? 'nowrap' : 'normal';
            }
        });
    }
    
    // Merge & Center
    const ribbonMergeCenter = document.getElementById('ribbonMergeCenter');
    if (ribbonMergeCenter) {
        ribbonMergeCenter.addEventListener('click', () => {
            const range = getSelectedRange();
            if (range && range.cells.length > 1) {
                // Merge cells - combine text and apply to first cell
                let combinedText = '';
                range.cells.forEach(cell => {
                    if (cell.textContent.trim()) {
                        combinedText += (combinedText ? ' ' : '') + cell.textContent.trim();
                    }
                });
                range.cells[0].textContent = combinedText;
                range.cells[0].style.textAlign = 'center';
                // Clear other cells
                for (let i = 1; i < range.cells.length; i++) {
                    range.cells[i].textContent = '';
                }
            } else if (selectedCell) {
                selectedCell.style.textAlign = 'center';
            }
        });
    }
    
    // Number format
    const ribbonNumberFormat = document.getElementById('ribbonNumberFormat');
    if (ribbonNumberFormat) {
        ribbonNumberFormat.addEventListener('change', (e) => {
            const range = getSelectedRange();
            const cells = range ? range.cells : (selectedCell ? [selectedCell] : []);
            
            cells.forEach(cell => {
                const value = parseFloat(cell.textContent.replace(/[,$%]/g, ''));
                if (!isNaN(value)) {
                    switch(e.target.value) {
                        case 'currency':
                            cell.textContent = formatCurrency(value);
                            break;
                        case 'percent':
                            cell.textContent = `${(value * 100).toFixed(2)}%`;
                            break;
                        case 'number':
                            cell.textContent = value.toLocaleString();
                            break;
                        case 'general':
                            cell.textContent = value.toString();
                            break;
                    }
                }
            });
        });
    }
    
    // Number format buttons
    const ribbonCurrency = document.getElementById('ribbonCurrency');
    const ribbonPercent = document.getElementById('ribbonPercent');
    const ribbonComma = document.getElementById('ribbonComma');
    const ribbonIncreaseDecimal = document.getElementById('ribbonIncreaseDecimal');
    const ribbonDecreaseDecimal = document.getElementById('ribbonDecreaseDecimal');
    
    if (ribbonCurrency) {
        ribbonCurrency.addEventListener('click', () => {
            const range = getSelectedRange();
            const cells = range ? range.cells : (selectedCell ? [selectedCell] : []);
            cells.forEach(cell => {
                const value = parseFloat(cell.textContent.replace(/[,$]/g, ''));
                if (!isNaN(value)) {
                    cell.textContent = formatCurrency(value);
                }
            });
        });
    }
    
    if (ribbonPercent) {
        ribbonPercent.addEventListener('click', () => {
            const range = getSelectedRange();
            const cells = range ? range.cells : (selectedCell ? [selectedCell] : []);
            cells.forEach(cell => {
                const value = parseFloat(cell.textContent.replace(/[%]/g, ''));
                if (!isNaN(value)) {
                    cell.textContent = `${(value * 100).toFixed(2)}%`;
                }
            });
        });
    }
    
    if (ribbonComma) {
        ribbonComma.addEventListener('click', () => {
            const range = getSelectedRange();
            const cells = range ? range.cells : (selectedCell ? [selectedCell] : []);
            cells.forEach(cell => {
                const value = parseFloat(cell.textContent.replace(/[,]/g, ''));
                if (!isNaN(value)) {
                    cell.textContent = value.toLocaleString();
                }
            });
        });
    }
    
    if (ribbonIncreaseDecimal) {
        ribbonIncreaseDecimal.addEventListener('click', () => {
            const range = getSelectedRange();
            const cells = range ? range.cells : (selectedCell ? [selectedCell] : []);
            cells.forEach(cell => {
                const value = parseFloat(cell.textContent.replace(/[,$%]/g, ''));
                if (!isNaN(value)) {
                    const decimals = (cell.textContent.match(/\.(\d+)/) || ['', ''])[1].length || 0;
                    cell.textContent = value.toFixed(decimals + 1);
                }
            });
        });
    }
    
    if (ribbonDecreaseDecimal) {
        ribbonDecreaseDecimal.addEventListener('click', () => {
            const range = getSelectedRange();
            const cells = range ? range.cells : (selectedCell ? [selectedCell] : []);
            cells.forEach(cell => {
                const value = parseFloat(cell.textContent.replace(/[,$%]/g, ''));
                if (!isNaN(value)) {
                    const decimals = (cell.textContent.match(/\.(\d+)/) || ['', ''])[1].length || 0;
                    if (decimals > 0) {
                        cell.textContent = value.toFixed(decimals - 1);
                    }
                }
            });
        });
    }
    
    // Font size and family
    const ribbonFontSize = document.getElementById('ribbonFontSize');
    const ribbonFontFamily = document.getElementById('ribbonFontFamily');
    
    if (ribbonFontSize) {
        ribbonFontSize.addEventListener('change', (e) => {
            if (selectedCell) {
                selectedCell.style.fontSize = `${e.target.value}px`;
            }
        });
    }
    
    if (ribbonFontFamily) {
        ribbonFontFamily.addEventListener('change', (e) => {
            if (selectedCell) {
                selectedCell.style.fontFamily = e.target.value;
            }
        });
    }
    
    // Clear button
    const ribbonClear = document.getElementById('ribbonClear');
    if (ribbonClear) {
        ribbonClear.addEventListener('click', () => {
            const range = getSelectedRange();
            if (range) {
                range.cells.forEach(cell => {
                    cell.textContent = '';
                    const addr = cell.dataset.address;
                    delete spreadsheet[addr];
                });
            } else if (selectedCell) {
                selectedCell.textContent = '';
                const addr = selectedCell.dataset.address;
                delete spreadsheet[addr];
            }
        });
    }
    
    // Cells group - Delete button only (Insert and Format removed)
    const ribbonDelete = document.getElementById('ribbonDelete');
    
    if (ribbonDelete) {
        ribbonDelete.addEventListener('click', () => {
            const range = getSelectedRange();
            if (range) {
                range.cells.forEach(cell => {
                    cell.textContent = '';
                    const addr = cell.dataset.address;
                    delete spreadsheet[addr];
                });
            } else if (selectedCell) {
                selectedCell.textContent = '';
                const addr = selectedCell.dataset.address;
                delete spreadsheet[addr];
            }
        });
    }
    
    // Find & Select functionality
    let findDialog = null;
    let findInput = null;
    let findResults = [];
    let currentFindIndex = -1;
    
    function showFindDialog() {
        // Remove existing dialog if present
        const existing = document.getElementById('findDialog');
        if (existing) {
            existing.remove();
        }
        
        // Create find dialog
        findDialog = document.createElement('div');
        findDialog.id = 'findDialog';
        findDialog.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #2d2d2d;
            border: 2px solid #0078d4;
            border-radius: 8px;
            padding: 20px;
            z-index: 10000;
            min-width: 400px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
        `;
        
        findDialog.innerHTML = `
            <div style="margin-bottom: 16px; font-size: 16px; font-weight: 600; color: #fff;">Find & Select</div>
            <input type="text" id="findInput" placeholder="Search for..." 
                style="width: 100%; padding: 8px; background: #1e1e1e; border: 1px solid #404040; border-radius: 4px; color: #fff; font-size: 14px; margin-bottom: 12px;">
            <div style="display: flex; gap: 8px; justify-content: flex-end;">
                <button id="findNextBtn" style="padding: 6px 16px; background: #0078d4; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 13px;">Find Next</button>
                <button id="findAllBtn" style="padding: 6px 16px; background: #0078d4; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 13px;">Find All</button>
                <button id="closeFindBtn" style="padding: 6px 16px; background: #404040; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 13px;">Close</button>
            </div>
        `;
        
        document.body.appendChild(findDialog);
        findInput = document.getElementById('findInput');
        findInput.focus();
        findInput.select();
        
        // Find Next button
        document.getElementById('findNextBtn').addEventListener('click', () => {
            performFind(true);
        });
        
        // Find All button
        document.getElementById('findAllBtn').addEventListener('click', () => {
            performFindAll();
        });
        
        // Close button
        document.getElementById('closeFindBtn').addEventListener('click', () => {
            findDialog.remove();
            findDialog = null;
        });
        
        // Enter key to find next
        findInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                performFind(true);
            } else if (e.key === 'Escape') {
                findDialog.remove();
                findDialog = null;
            }
        });
    }
    
    function performFind(next = false) {
        const searchTerm = findInput.value.trim();
        if (!searchTerm) return;
        
        const allCells = Array.from(document.querySelectorAll('.cell'));
        
        if (next) {
            // Find next occurrence
            currentFindIndex++;
            if (currentFindIndex >= findResults.length) {
                currentFindIndex = 0;
            }
            
            // Clear previous highlights
            allCells.forEach(cell => {
                cell.classList.remove('find-highlight');
            });
            
            // Find all matches
            findResults = [];
            allCells.forEach((cell, index) => {
                if (cell.textContent.toLowerCase().includes(searchTerm.toLowerCase())) {
                    findResults.push({ cell, index });
                }
            });
            
            if (findResults.length === 0) {
                alert('No matches found');
                currentFindIndex = -1;
                return;
            }
            
            // Highlight current match
            if (currentFindIndex < findResults.length) {
                const match = findResults[currentFindIndex];
                match.cell.classList.add('find-highlight');
                match.cell.scrollIntoView({ behavior: 'smooth', block: 'center' });
                selectCell(match.cell, false);
            }
        } else {
            // Initial find
            findResults = [];
            allCells.forEach((cell, index) => {
                if (cell.textContent.toLowerCase().includes(searchTerm.toLowerCase())) {
                    findResults.push({ cell, index });
                }
            });
            
            if (findResults.length === 0) {
                alert('No matches found');
                return;
            }
            
            currentFindIndex = 0;
            findResults[0].cell.classList.add('find-highlight');
            findResults[0].cell.scrollIntoView({ behavior: 'smooth', block: 'center' });
            selectCell(findResults[0].cell, false);
        }
    }
    
    function performFindAll() {
        const searchTerm = findInput.value.trim();
        if (!searchTerm) return;
        
        const allCells = document.querySelectorAll('.cell');
        findResults = [];
        
        // Clear previous highlights
        allCells.forEach(cell => {
            cell.classList.remove('find-highlight', 'selected');
        });
        
        // Find all matches
        allCells.forEach((cell, index) => {
            if (cell.textContent.toLowerCase().includes(searchTerm.toLowerCase())) {
                findResults.push({ cell, index });
                cell.classList.add('find-highlight');
                selectedCells.add(cell);
            }
        });
        
        if (findResults.length === 0) {
            alert('No matches found');
        } else {
            alert(`Found ${findResults.length} match(es)`);
            if (findResults.length > 0) {
                findResults[0].cell.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }
    
    // Find & Select button
    const ribbonFind = document.getElementById('ribbonFind');
    const ribbonFindSelect = document.getElementById('ribbonFindSelect');
    const findButton = ribbonFind || ribbonFindSelect;
    
    if (findButton) {
        findButton.addEventListener('click', () => {
            showFindDialog();
        });
    }
    
    // Ctrl+F keyboard shortcut (only when not typing in cells)
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
            // Don't intercept if typing in input fields or cells
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.contentEditable === 'true') {
                return;
            }
            e.preventDefault();
            showFindDialog();
        }
    });
    
    // AutoSum button
    const ribbonAutoSum = document.getElementById('ribbonAutoSum');
    if (ribbonAutoSum) {
        ribbonAutoSum.addEventListener('click', () => {
            const range = getSelectedRange();
            if (range && range.cells.length > 1) {
                // Sum all numeric values in selected range
                let sum = 0;
                range.cells.forEach(cell => {
                    const value = parseFloat(cell.textContent.replace(/[,$]/g, ''));
                    if (!isNaN(value)) {
                        sum += value;
                    }
                });
                
                // Put result in the cell after the selection (or in selectedCell if single)
                if (selectedCell) {
                    selectedCell.textContent = formatCurrency(sum);
                    const addr = selectedCell.dataset.address;
                    spreadsheet[addr] = sum.toString();
                }
            } else if (selectedCell) {
                // Auto-detect range above or to the left
                const addr = selectedCell.dataset.address;
                const match = addr.match(/([A-Z]+)(\d+)/);
                if (match) {
                    const col = COL_NAMES.indexOf(match[1]);
                    const row = parseInt(match[2]);
                    
                    // Try to sum column above
                    let sum = 0;
                    let hasValues = false;
                    for (let r = row - 1; r >= 2; r--) {
                        const cell = document.querySelector(`[data-address="${COL_NAMES[col]}${r}"]`);
                        if (cell) {
                            const value = parseFloat(cell.textContent.replace(/[,$]/g, ''));
                            if (!isNaN(value)) {
                                sum += value;
                                hasValues = true;
                            } else if (cell.textContent.trim()) {
                                break; // Stop at first non-numeric
                            }
                        }
                    }
                    
                    if (hasValues) {
                        selectedCell.textContent = formatCurrency(sum);
                        spreadsheet[addr] = sum.toString();
                    }
                }
            }
        });
    }
}

// Sheet Management Setup
function setupSheetManagement() {
    const addSheetBtn = document.getElementById('addSheetBtn');
    
    if (addSheetBtn) {
        addSheetBtn.addEventListener('click', () => {
            sheetCounter++;
            const sheetName = `Sheet${sheetCounter}`;
            createNewSheet(sheetName);
        });
    }
    
    // Handle sheet tab clicks
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('sheet-tab')) {
            const sheetName = e.target.dataset.sheet;
            switchToSheet(sheetName);
        }
    });
}

// Create a new sheet
function createNewSheet(sheetName) {
    // Create sheet data structure
    sheets[sheetName] = {
        name: sheetName,
        data: {},
        nextDataRow: 2,
        totalRow: null
    };
    
    // Create tab button
    const sheetTabs = document.getElementById('sheetTabs');
    if (sheetTabs) {
        const tab = document.createElement('button');
        tab.className = 'sheet-tab';
        tab.dataset.sheet = sheetName;
        tab.textContent = sheetName;
        sheetTabs.appendChild(tab);
    }
    
    // Switch to new sheet
    switchToSheet(sheetName);
}

// Switch to a different sheet
function switchToSheet(sheetName) {
    if (!sheets[sheetName]) {
        return;
    }
    
    // Save current sheet data
    if (currentSheet) {
        sheets[currentSheet].data = {...spreadsheet};
        sheets[currentSheet].nextDataRow = nextDataRow;
        sheets[currentSheet].totalRow = totalRow;
    }
    
    // Update active tab
    document.querySelectorAll('.sheet-tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.dataset.sheet === sheetName) {
            tab.classList.add('active');
        }
    });
    
    // Load new sheet data
    currentSheet = sheetName;
    const sheet = sheets[sheetName];
    spreadsheet = {...sheet.data};
    nextDataRow = sheet.nextDataRow;
    totalRow = sheet.totalRow;
    
    // Clear and rebuild spreadsheet display
    const cellsContainer = document.getElementById('cellsContainer');
    if (cellsContainer) {
        // Update all cells with saved data
        for (let row = 1; row <= ROWS; row++) {
            for (let col = 0; col < COL_NAMES.length; col++) {
                const address = `${COL_NAMES[col]}${row}`;
                const cell = document.querySelector(`[data-address="${address}"]`);
                if (cell) {
                    if (spreadsheet[address]) {
                        cell.textContent = spreadsheet[address];
                    } else {
                        cell.textContent = '';
                    }
                }
            }
        }
    }
    
    // Recalculate total row if needed
    if (typeof setupTotalRow === 'function') {
        setupTotalRow();
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    initialize();
}

// Helper functions for ribbon operations
async function pasteFromClipboard(text) {
    if (!selectedCell) return;
    
    const cell = selectedCell;
    const addr = cell.dataset.address;
    const match = addr.match(/([A-Z]+)(\d+)/);
    if (!match) return;
    
    let startCol = COL_NAMES.indexOf(match[1]);
    let startRow = parseInt(match[2]);
    
    // Handle multi-line paste
    const lines = text.split(/\r?\n/);
    lines.forEach((line, lineIndex) => {
        if (line.trim() === '') return;
        
        const cells = line.split('\t');
        cells.forEach((cellValue, cellIndex) => {
            const targetRow = startRow + lineIndex;
            const targetCol = startCol + cellIndex;
            
            if (targetRow <= ROWS && targetCol < COL_NAMES.length) {
                const targetAddr = `${COL_NAMES[targetCol]}${targetRow}`;
                const targetCell = document.querySelector(`[data-address="${targetAddr}"]`);
                
                if (targetCell && !targetCell.classList.contains('total-row')) {
                    targetCell.textContent = cellValue.trim();
                    spreadsheet[targetAddr] = cellValue.trim();
                    
                    if (targetAddr.startsWith('B')) {
                        updateTotal();
                    }
                }
            }
        });
    });
    
    updateTotal();
}

function cutCellContent(cell) {
    if (!cell || cell.classList.contains('total-row')) return;
    
    const addr = cell.dataset.address;
    const cellText = cell.textContent;
    
    // Copy to clipboard
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(cellText).catch(err => console.error('Failed to copy:', err));
    }
    
    // Clear cell
    cell.textContent = '';
    if (spreadsheet) {
        delete spreadsheet[addr];
    }
    
    if (addr.startsWith('B')) {
        updateTotal();
    }
}

async function copyToClipboard(text) {
    try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(text);
        } else {
            // Fallback
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.left = '-999999px';
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
        }
    } catch (err) {
        console.error('Failed to copy:', err);
    }
}
