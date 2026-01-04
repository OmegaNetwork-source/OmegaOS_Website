// Omega Sheets Application
if (window.debugLog) window.debugLog('sheets.js script file loaded', 'success');

let currentWindowId = null;
let spreadsheet = {};
let selectedCell = null;
let currentFileName = null;
let hasUnsavedChanges = false;

const ROWS = 100;
const COLS = 26; // A-Z
const COL_NAMES = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

if (window.debugLog) window.debugLog('Variables initialized', 'info');

// Debug Panel Functions - use global if available, otherwise create
if (typeof window.debugLog !== 'function') {
    window.debugLog = function(message, type = 'info') {
        const debugContent = document.getElementById('debugContent');
        if (!debugContent) {
            console.log(`[SHEETS DEBUG] ${message}`);
            return;
        }
        
        const timestamp = new Date().toLocaleTimeString();
        const colors = {
            info: '#0f0',
            error: '#f00',
            warn: '#ff0',
            success: '#0ff'
        };
        const color = colors[type] || colors.info;
        
        const div = document.createElement('div');
        div.style.color = color;
        div.textContent = `[${timestamp}] ${message}`;
        debugContent.appendChild(div);
        debugContent.scrollTop = debugContent.scrollHeight;
        
        console.log(`[SHEETS DEBUG] ${message}`);
    };
}

function hideDebugPanel() {
    const panel = document.getElementById('debugPanel');
    if (panel) {
        panel.style.display = 'none';
    }
}

// Initialize function
function initSheets() {
    if (window.debugLog) window.debugLog('=== INIT SHEETS CALLED ===', 'success');
    
    try {
        if (typeof window.debugLog === 'function') {
            window.debugLog('DOMContentLoaded fired', 'success');
        } else {
            console.log('[SHEETS] DOMContentLoaded fired (debugLog not available)');
        }
    } catch (e) {
        console.error('[SHEETS] Error in debugLog:', e);
    }
    
    // Setup debug panel close button
    try {
        const closeDebugBtn = document.getElementById('closeDebugBtn');
        if (closeDebugBtn) {
            closeDebugBtn.addEventListener('click', hideDebugPanel);
            if (window.debugLog) window.debugLog('Close button attached', 'success');
        }
    } catch (e) {
        console.error('[SHEETS] Error setting up close button:', e);
    }
    
    // CRITICAL: Initialize spreadsheet FIRST - nothing else matters if this fails
    setTimeout(() => {
        try {
            if (window.debugLog) window.debugLog('Starting spreadsheet initialization...', 'info');
            initializeSpreadsheet();
            if (window.debugLog) window.debugLog('✅ Spreadsheet cells created successfully!', 'success');
        } catch (e) {
            const errorMsg = `❌ CRITICAL ERROR: ${e.message}`;
            const stackMsg = `Stack: ${e.stack}`;
            if (window.debugLog) {
                window.debugLog(errorMsg, 'error');
                window.debugLog(stackMsg, 'error');
            }
            alert('Failed to create spreadsheet cells: ' + e.message + '\n\nCheck the debug panel for details.');
            console.error('[SHEETS] CRITICAL ERROR:', e);
            return;
        }
    }, 100);
    
    // Other initialization - non-blocking
    try {
        if (window.debugLog) window.debugLog('Checking for electronAPI...', 'info');
        if (window.electronAPI) {
            if (window.debugLog) window.debugLog('electronAPI found', 'success');
            try {
                window.electronAPI.onWindowId((windowId) => {
                    currentWindowId = windowId;
                    if (window.debugLog) window.debugLog(`Window ID received: ${windowId}`, 'success');
                });
            } catch (e) {
                if (window.debugLog) window.debugLog(`Window ID error: ${e.message}`, 'warn');
            }
            
            if (window.electronAPI.onOpenFile) {
                window.electronAPI.onOpenFile((filePath) => {
                    loadFile(filePath);
                });
            }
        } else {
            if (window.debugLog) window.debugLog('⚠️ electronAPI not found', 'warn');
        }
    } catch (e) {
        if (window.debugLog) window.debugLog(`Window API setup error: ${e.message}`, 'error');
    }

    // Window Controls
    setTimeout(() => {
        try {
            if (window.debugLog) window.debugLog('Setting up window controls...', 'info');
            setupWindowControls();
            if (window.debugLog) window.debugLog('Window controls ready', 'success');
        } catch (e) {
            if (window.debugLog) window.debugLog(`Window controls error: ${e.message}`, 'error');
        }
    }, 150);

    // Setup toolbar
    setTimeout(() => {
        try {
            if (window.debugLog) window.debugLog('Setting up toolbar...', 'info');
            setupToolbar();
            if (window.debugLog) window.debugLog('Toolbar ready', 'success');
        } catch (e) {
            if (window.debugLog) window.debugLog(`Toolbar setup error: ${e.message}`, 'error');
        }
    }, 200);

    // Setup file operations
    setTimeout(() => {
        try {
            if (window.debugLog) window.debugLog('Setting up file operations...', 'info');
            setupFileOperations();
            if (window.debugLog) window.debugLog('File operations ready', 'success');
        } catch (e) {
            if (window.debugLog) window.debugLog(`File operations error: ${e.message}`, 'error');
        }
    }, 250);

    // Setup AI features - non-critical
    setTimeout(() => {
        try {
            if (window.debugLog) window.debugLog('Setting up AI features...', 'info');
            setupAIFeatures();
            if (window.debugLog) window.debugLog('AI features ready', 'success');
        } catch (e) {
            if (window.debugLog) window.debugLog(`AI features error: ${e.message}`, 'warn');
        }
    }, 300);
}

// Initialize - with better error handling
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSheets);
    if (window.debugLog) window.debugLog('Waiting for DOMContentLoaded...', 'info');
} else {
    // DOM already loaded, run immediately
    if (window.debugLog) window.debugLog('DOM already loaded, initializing immediately...', 'info');
    setTimeout(initSheets, 50);
}

function setupWindowControls() {
    const minimizeBtn = document.getElementById('minimizeBtn');
    const maximizeBtn = document.getElementById('maximizeBtn');
    const closeBtn = document.getElementById('closeBtn');
    
    if (!minimizeBtn || !maximizeBtn || !closeBtn) {
        console.error('[SHEETS] Window control buttons not found!');
        return;
    }
    
    minimizeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        try {
            if (currentWindowId && window.electronAPI && window.electronAPI.appWindowMinimize) {
                window.electronAPI.appWindowMinimize(currentWindowId);
            }
        } catch (err) {
            console.error('[SHEETS] Minimize error:', err);
        }
    });

    maximizeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        try {
            if (currentWindowId && window.electronAPI && window.electronAPI.appWindowMaximize) {
                window.electronAPI.appWindowMaximize(currentWindowId);
            }
        } catch (err) {
            console.error('[SHEETS] Maximize error:', err);
        }
    });

    closeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        try {
            if (currentWindowId && window.electronAPI && window.electronAPI.appWindowClose) {
                if (hasUnsavedChanges) {
                    if (confirm('You have unsaved changes. Close anyway?')) {
                        window.electronAPI.appWindowClose(currentWindowId);
                    }
                } else {
                    window.electronAPI.appWindowClose(currentWindowId);
                }
            } else {
                console.error('[SHEETS] Cannot close - API not available');
            }
        } catch (err) {
            console.error('[SHEETS] Close error:', err);
        }
    });
}

function initializeSpreadsheet() {
    if (window.debugLog) window.debugLog('initializeSpreadsheet() called', 'info');
    
    const columnHeaders = document.getElementById('columnHeaders');
    const rowNumbers = document.getElementById('rowNumbers');
    const cellsContainer = document.getElementById('cellsContainer');
    
    if (window.debugLog) window.debugLog(`DOM elements check: columnHeaders=${!!columnHeaders}, rowNumbers=${!!rowNumbers}, cellsContainer=${!!cellsContainer}`, 'info');
    
    if (!columnHeaders) {
        throw new Error('columnHeaders element not found');
    }
    if (!rowNumbers) {
        throw new Error('rowNumbers element not found');
    }
    if (!cellsContainer) {
        throw new Error('cellsContainer element not found');
    }
    
    if (window.debugLog) window.debugLog('All DOM elements found, clearing content...', 'success');
    
    // Clear any existing content
    columnHeaders.innerHTML = '';
    rowNumbers.innerHTML = '';
    cellsContainer.innerHTML = '';
    
    if (window.debugLog) window.debugLog('Creating cells grid...', 'info');
    
    const cellsGrid = document.createElement('div');
    cellsGrid.className = 'cells-grid';
    cellsGrid.style.display = 'table';

        if (window.debugLog) window.debugLog(`Creating ${COLS} column headers...`, 'info');
        // Create column headers
        for (let i = 0; i < COLS; i++) {
            const header = document.createElement('div');
            header.className = 'column-header';
            header.textContent = COL_NAMES[i];
            columnHeaders.appendChild(header);
        }
        if (window.debugLog) window.debugLog('Column headers created', 'success');

        if (window.debugLog) window.debugLog(`Creating ${ROWS} rows with ${COLS} cells each...`, 'info');
        // Create rows
        for (let row = 1; row <= ROWS; row++) {
            const rowNum = document.createElement('div');
            rowNum.className = 'row-number';
            rowNum.textContent = row;
            rowNumbers.appendChild(rowNum);

            const cellRow = document.createElement('div');
            cellRow.className = 'cell-row';
            cellRow.style.display = 'table-row';

            for (let col = 0; col < COLS; col++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.contentEditable = true;
                cell.dataset.row = row;
                cell.dataset.col = COL_NAMES[col];
                cell.dataset.address = COL_NAMES[col] + row;

                // Cell events
                cell.addEventListener('focus', () => {
                    try {
                        selectCell(cell);
                        cell.classList.add('editing');
                    } catch (e) {
                        console.error('[SHEETS] Focus error:', e);
                    }
                });
                
                cell.addEventListener('blur', () => {
                    try {
                        cell.classList.remove('editing');
                        const address = cell.dataset.address;
                        const value = spreadsheet[address] || '';
                        
                        // Process formulas on blur
                        if (value && value.startsWith('=')) {
                            const result = calculateFormula(value, address);
                            if (result !== null && result !== undefined && result !== '#ERROR' && String(result) !== value) {
                                cell.dataset.formula = value;
                                try {
                                    cell.textContent = formatCellValue(result, cell);
                                } catch (e) {
                                    cell.textContent = String(result);
                                }
                                spreadsheet[address] = result;
                                spreadsheet[address + '_formula'] = value;
                                recalculateDependentCells(address);
                            }
                        }
                        // Recalculate formulas that might depend on this cell
                        recalculateDependentCells(address);
                    } catch (e) {
                        console.error('[SHEETS] Cell blur error:', e);
                    }
                });
                
                cell.addEventListener('input', () => {
                    try {
                        const address = cell.dataset.address;
                        const value = cell.textContent || '';
                        
                        // Simple: just store the value for now, handle formulas on blur
                        spreadsheet[address] = value;
                        
                        hasUnsavedChanges = true;
                        updateWindowTitle();
                        updateFormulaBar();
                    } catch (e) {
                        console.error('[SHEETS] Cell input error:', e);
                    }
                });
                cell.addEventListener('keydown', (e) => {
                    handleCellKeydown(e, cell);
                });

                cellRow.appendChild(cell);
            }

            cellsGrid.appendChild(cellRow);
        }

        if (window.debugLog) window.debugLog('Appending cells grid to container...', 'info');
        cellsContainer.appendChild(cellsGrid);
        
        // Ensure cells are visible
        const cellCount = document.querySelectorAll('.cell').length;
        if (window.debugLog) window.debugLog(`Spreadsheet initialized: ${ROWS} rows x ${COLS} columns`, 'info');
        if (window.debugLog) window.debugLog(`Total cells created: ${cellCount}`, cellCount > 0 ? 'success' : 'error');
        
        if (cellCount === 0) {
            throw new Error(`No cells were created! Expected ${ROWS * COLS}, got 0.`);
        }
        
        if (cellCount !== ROWS * COLS) {
            if (window.debugLog) window.debugLog(`⚠️ Warning: Expected ${ROWS * COLS} cells but got ${cellCount}`, 'warn');
        }
        
        if (window.debugLog) window.debugLog('✅ Spreadsheet ready!', 'success');
    } catch (error) {
        if (window.debugLog) window.debugLog(`❌ Error initializing spreadsheet: ${error.message}`, 'error');
        if (window.debugLog) window.debugLog(`Stack: ${error.stack}`, 'error');
        throw error; // Re-throw so caller knows it failed
    }
}

function selectCell(cell) {
    // Deselect previous
    if (selectedCell) {
        selectedCell.classList.remove('selected');
    }
    
    selectedCell = cell;
    cell.classList.add('selected', 'editing');
    updateFormulaBar();
}

function updateFormulaBar() {
    const formulaBar = document.getElementById('formulaBar');
    if (selectedCell) {
        // Show formula if exists, otherwise show cell content
        const formula = selectedCell.dataset.formula;
        formulaBar.value = formula || selectedCell.textContent;
    } else {
        formulaBar.value = '';
    }
}

function handleCellKeydown(e, cell) {
    const row = parseInt(cell.dataset.row);
    const col = COL_NAMES.indexOf(cell.dataset.col);

    switch (e.key) {
        case 'Enter':
            e.preventDefault();
            navigateCell(row + 1, col);
            break;
        case 'Tab':
            e.preventDefault();
            if (e.shiftKey) {
                navigateCell(row, col - 1);
            } else {
                navigateCell(row, col + 1);
            }
            break;
        case 'ArrowUp':
            e.preventDefault();
            navigateCell(row - 1, col);
            break;
        case 'ArrowDown':
            e.preventDefault();
            navigateCell(row + 1, col);
            break;
        case 'ArrowLeft':
            if (cell.textContent.length === 0 || window.getSelection().toString() === cell.textContent) {
                e.preventDefault();
                navigateCell(row, col - 1);
            }
            break;
        case 'ArrowRight':
            const selection = window.getSelection();
            if (cell.textContent.length === 0 || selection.toString() === cell.textContent) {
                e.preventDefault();
                navigateCell(row, col + 1);
            }
            break;
    }
}

function navigateCell(row, col) {
    if (row < 1) row = 1;
    if (row > ROWS) row = ROWS;
    if (col < 0) col = 0;
    if (col >= COLS) col = COLS - 1;

    const address = COL_NAMES[col] + row;
    const cell = document.querySelector(`[data-address="${address}"]`);
    if (cell) {
        cell.focus();
        selectCell(cell);
    }
}

// Clipboard for copy/paste
let clipboardData = null;

function setupToolbar() {
    const boldBtn = document.getElementById('boldBtn');
    const italicBtn = document.getElementById('italicBtn');
    const underlineBtn = document.getElementById('underlineBtn');
    const sumBtn = document.getElementById('sumBtn');
    const averageBtn = document.getElementById('averageBtn');
    const copyBtn = document.getElementById('copyBtn');
    const pasteBtn = document.getElementById('pasteBtn');
    const formulaBar = document.getElementById('formulaBar');
    const formatNumberBtn = document.getElementById('formatNumberBtn');
    const formatCurrencyBtn = document.getElementById('formatCurrencyBtn');
    const formatPercentBtn = document.getElementById('formatPercentBtn');
    const insertRowBtn = document.getElementById('insertRowBtn');
    const insertColBtn = document.getElementById('insertColBtn');
    const deleteRowBtn = document.getElementById('deleteRowBtn');
    const deleteColBtn = document.getElementById('deleteColBtn');

    boldBtn?.addEventListener('click', () => {
        if (selectedCell) {
            const isBold = selectedCell.style.fontWeight === 'bold';
            selectedCell.style.fontWeight = isBold ? 'normal' : 'bold';
            hasUnsavedChanges = true;
            updateWindowTitle();
        }
    });

    italicBtn?.addEventListener('click', () => {
        if (selectedCell) {
            const isItalic = selectedCell.style.fontStyle === 'italic';
            selectedCell.style.fontStyle = isItalic ? 'normal' : 'italic';
            hasUnsavedChanges = true;
            updateWindowTitle();
        }
    });

    underlineBtn?.addEventListener('click', () => {
        if (selectedCell) {
            const isUnderlined = selectedCell.style.textDecoration === 'underline';
            selectedCell.style.textDecoration = isUnderlined ? 'none' : 'underline';
            hasUnsavedChanges = true;
            updateWindowTitle();
        }
    });

    sumBtn?.addEventListener('click', () => {
        if (selectedCell) {
            const row = parseInt(selectedCell.dataset.row);
            const col = COL_NAMES.indexOf(selectedCell.dataset.col);
            // Sum cells above current cell
            if (row > 1) {
                const startRow = 1;
                const endRow = row - 1;
                const formula = `=SUM(${COL_NAMES[col]}${startRow}:${COL_NAMES[col]}${endRow})`;
                applyFormulaToCell(selectedCell, formula);
            }
        }
    });

    averageBtn?.addEventListener('click', () => {
        if (selectedCell) {
            const row = parseInt(selectedCell.dataset.row);
            const col = COL_NAMES.indexOf(selectedCell.dataset.col);
            // Average cells above current cell
            if (row > 1) {
                const startRow = 1;
                const endRow = row - 1;
                const formula = `=AVERAGE(${COL_NAMES[col]}${startRow}:${COL_NAMES[col]}${endRow})`;
                applyFormulaToCell(selectedCell, formula);
            }
        }
    });

    copyBtn?.addEventListener('click', () => {
        if (selectedCell) {
            clipboardData = {
                address: selectedCell.dataset.address,
                value: selectedCell.textContent,
                formula: selectedCell.dataset.formula || null,
                styles: {
                    fontWeight: selectedCell.style.fontWeight,
                    fontStyle: selectedCell.style.fontStyle,
                    textDecoration: selectedCell.style.textDecoration
                }
            };
        }
    });

    pasteBtn?.addEventListener('click', () => {
        if (selectedCell && clipboardData) {
            const address = selectedCell.dataset.address;
            if (clipboardData.formula) {
                applyFormulaToCell(selectedCell, clipboardData.formula);
            } else {
                selectedCell.textContent = clipboardData.value;
                spreadsheet[address] = clipboardData.value;
                delete spreadsheet[address + '_formula'];
                delete selectedCell.dataset.formula;
            }
            
            // Apply styles
            if (clipboardData.styles) {
                selectedCell.style.fontWeight = clipboardData.styles.fontWeight || 'normal';
                selectedCell.style.fontStyle = clipboardData.styles.fontStyle || 'normal';
                selectedCell.style.textDecoration = clipboardData.styles.textDecoration || 'none';
            }
            
            hasUnsavedChanges = true;
            updateWindowTitle();
            updateFormulaBar();
        }
    });

    formatNumberBtn?.addEventListener('click', () => {
        if (selectedCell) {
            formatCellAsNumber(selectedCell);
        }
    });

    formatCurrencyBtn?.addEventListener('click', () => {
        if (selectedCell) {
            formatCellAsCurrency(selectedCell);
        }
    });

    formatPercentBtn?.addEventListener('click', () => {
        if (selectedCell) {
            formatCellAsPercent(selectedCell);
        }
    });

    insertRowBtn?.addEventListener('click', () => {
        alert('Row/column insert/delete coming soon!');
        // TODO: Implement row/column insertion
    });

    insertColBtn?.addEventListener('click', () => {
        alert('Row/column insert/delete coming soon!');
    });

    deleteRowBtn?.addEventListener('click', () => {
        alert('Row/column insert/delete coming soon!');
    });

    deleteColBtn?.addEventListener('click', () => {
        alert('Row/column insert/delete coming soon!');
    });

    formulaBar.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (selectedCell) {
                const address = selectedCell.dataset.address;
                const value = formulaBar.value;
                applyValueToCell(selectedCell, value);
                selectedCell.focus();
            }
        }
    });

    // Keyboard shortcuts for copy/paste
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'c' && selectedCell) {
            e.preventDefault();
            copyBtn?.click();
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'v' && selectedCell) {
            e.preventDefault();
            pasteBtn?.click();
        }
    });
}

function applyFormulaToCell(cell, formula) {
    const address = cell.dataset.address;
    const result = calculateFormula(formula, address);
    cell.dataset.formula = formula;
    spreadsheet[address + '_formula'] = formula;
    if (result !== null && result !== undefined && result !== '#ERROR') {
        cell.textContent = formatCellValue(result, cell);
        spreadsheet[address] = result;
    } else {
        cell.textContent = formula;
        spreadsheet[address] = formula;
    }
    hasUnsavedChanges = true;
    updateWindowTitle();
    updateFormulaBar();
    recalculateDependentCells(address);
}

function applyValueToCell(cell, value) {
    const address = cell.dataset.address;
    
    if (value.startsWith('=')) {
        applyFormulaToCell(cell, value);
    } else {
        cell.textContent = value;
        spreadsheet[address] = value;
        delete spreadsheet[address + '_formula'];
        delete cell.dataset.formula;
        hasUnsavedChanges = true;
        updateWindowTitle();
        recalculateDependentCells(address);
    }
}

function formatCellAsNumber(cell) {
    const val = parseFloat(cell.textContent);
    if (!isNaN(val)) {
        cell.textContent = val.toLocaleString();
        cell.dataset.format = 'number';
        hasUnsavedChanges = true;
        updateWindowTitle();
    }
}

function formatCellAsCurrency(cell) {
    const val = parseFloat(cell.textContent);
    if (!isNaN(val)) {
        cell.textContent = '$' + val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        cell.dataset.format = 'currency';
        hasUnsavedChanges = true;
        updateWindowTitle();
    }
}

function formatCellAsPercent(cell) {
    const val = parseFloat(cell.textContent);
    if (!isNaN(val)) {
        cell.textContent = (val * 100).toFixed(2) + '%';
        cell.dataset.format = 'percent';
        hasUnsavedChanges = true;
        updateWindowTitle();
    }
}

function formatCellValue(value, cell) {
    if (value === null || value === undefined || value === '') return '';
    if (typeof value !== 'number') return String(value);
    if (!cell) return value;
    
    const format = cell.dataset.format;
    
    switch (format) {
        case 'currency':
            return '$' + value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        case 'percent':
            return (value * 100).toFixed(2) + '%';
        case 'number':
            return value.toLocaleString();
        default:
            return value;
    }
}

function setupFileOperations() {
    const newBtn = document.getElementById('newBtn');
    const openBtn = document.getElementById('openBtn');
    const saveBtn = document.getElementById('saveBtn');

    newBtn.addEventListener('click', () => {
        if (hasUnsavedChanges) {
            if (!confirm('You have unsaved changes. Create a new spreadsheet anyway?')) {
                return;
            }
        }
        clearSpreadsheet();
    });

    openBtn.addEventListener('click', async () => {
        if (hasUnsavedChanges) {
            if (!confirm('You have unsaved changes. Open a new file anyway?')) {
                return;
            }
        }
        if (window.electronAPI && window.electronAPI.openFileDialog) {
            try {
                const result = await window.electronAPI.openFileDialog({
                    filters: [
                        { name: 'JSON Files', extensions: ['json'] },
                        { name: 'CSV Files', extensions: ['csv'] },
                        { name: 'All Files', extensions: ['*'] }
                    ]
                });
                if (result && !result.canceled && result.filePaths && result.filePaths.length > 0) {
                    await loadFile(result.filePaths[0]);
                }
            } catch (error) {
                console.error('Error opening file:', error);
                alert('Error opening file: ' + error.message);
            }
        }
    });

    saveBtn.addEventListener('click', async () => {
        await saveSpreadsheet();
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            saveSpreadsheet();
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            e.preventDefault();
            newBtn.click();
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
            e.preventDefault();
            openBtn.click();
        }
        // Find
        if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
            e.preventDefault();
            showFindDialog();
        }
    });
}

// Find Dialog for Sheets
let findDialog = null;
let findMatchIndex = 0;
let findMatches = [];

function showFindDialog() {
    // Remove existing dialog if any
    if (findDialog) {
        findDialog.remove();
    }
    
    // Create find dialog
    findDialog = document.createElement('div');
    findDialog.id = 'findDialog';
    findDialog.style.cssText = `
        position: fixed;
        top: 60px;
        right: 20px;
        background: white;
        border: 1px solid #ccc;
        border-radius: 8px;
        padding: 15px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        min-width: 300px;
    `;
    
    findDialog.innerHTML = `
        <div style="display: flex; gap: 8px; align-items: center;">
            <input type="text" id="findInput" placeholder="Find in cells..." 
                   style="flex: 1; padding: 6px 10px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px;"
                   autocomplete="off">
            <button id="findPrevBtn" style="padding: 6px 12px; border: 1px solid #ccc; background: white; border-radius: 4px; cursor: pointer;">↑</button>
            <button id="findNextBtn" style="padding: 6px 12px; border: 1px solid #ccc; background: white; border-radius: 4px; cursor: pointer;">↓</button>
            <button id="findCloseBtn" style="padding: 6px 12px; border: 1px solid #ccc; background: white; border-radius: 4px; cursor: pointer;">✕</button>
        </div>
        <div id="findStatus" style="margin-top: 8px; font-size: 12px; color: #666;"></div>
    `;
    
    document.body.appendChild(findDialog);
    
    const findInput = document.getElementById('findInput');
    const findNextBtn = document.getElementById('findNextBtn');
    const findPrevBtn = document.getElementById('findPrevBtn');
    const findCloseBtn = document.getElementById('findCloseBtn');
    const findStatus = document.getElementById('findStatus');
    
    // Focus input
    setTimeout(() => findInput.focus(), 100);
    
    // Find function
    function performFind(direction = 'next') {
        const searchTerm = findInput.value.trim();
        if (!searchTerm) {
            findStatus.textContent = '';
            findMatches = [];
            return;
        }
        
        // Search through all cells
        findMatches = [];
        document.querySelectorAll('.cell').forEach(cell => {
            const cellText = cell.textContent || '';
            if (cellText.toLowerCase().includes(searchTerm.toLowerCase())) {
                findMatches.push(cell);
            }
        });
        
        if (findMatches.length === 0) {
            findStatus.textContent = 'No matches found';
            return;
        }
        
        if (direction === 'next') {
            findMatchIndex = (findMatchIndex + 1) % findMatches.length;
        } else {
            findMatchIndex = (findMatchIndex - 1 + findMatches.length) % findMatches.length;
        }
        
        findStatus.textContent = `${findMatchIndex + 1} of ${findMatches.length}`;
        
        // Select and scroll to the matching cell
        const matchCell = findMatches[findMatchIndex];
        selectCell(matchCell);
        matchCell.scrollIntoView({ behavior: 'smooth', block: 'center' });
        matchCell.focus();
    }
    
    // Event listeners
    findInput.addEventListener('input', () => {
        findMatchIndex = -1;
        performFind('next');
    });
    
    findInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            performFind('next');
        } else if (e.key === 'Escape') {
            closeFindDialog();
        }
    });
    
    findNextBtn.addEventListener('click', () => performFind('next'));
    findPrevBtn.addEventListener('click', () => performFind('prev'));
    findCloseBtn.addEventListener('click', closeFindDialog);
    
    function closeFindDialog() {
        if (findDialog) {
            findDialog.remove();
            findDialog = null;
        }
    }
}

function clearSpreadsheet() {
    spreadsheet = {};
    document.querySelectorAll('.cell').forEach(cell => {
        cell.textContent = '';
    });
    currentFileName = null;
    hasUnsavedChanges = false;
    updateWindowTitle();
}

function loadSpreadsheet(data) {
    spreadsheet = data;
    document.querySelectorAll('.cell').forEach(cell => {
        const address = cell.dataset.address;
        // Restore formula if exists
        if (spreadsheet[address + '_formula']) {
            cell.dataset.formula = spreadsheet[address + '_formula'];
            const result = calculateFormula(spreadsheet[address + '_formula'], address);
            if (result !== null && result !== undefined && result !== '#ERROR') {
                cell.textContent = formatCellValue(result, cell);
                spreadsheet[address] = result;
            } else {
                cell.textContent = spreadsheet[address] || '';
            }
        } else {
            cell.textContent = spreadsheet[address] || '';
            delete cell.dataset.formula;
        }
    });
    // Recalculate all formulas after loading
    document.querySelectorAll('.cell[data-formula]').forEach(cell => {
        const formula = cell.dataset.formula;
        const address = cell.dataset.address;
        const result = calculateFormula(formula, address);
        if (result !== null && result !== undefined && result !== '#ERROR') {
            cell.textContent = formatCellValue(result, cell);
            spreadsheet[address] = result;
        }
    });
}

// Formula calculation engine - uses the comprehensive formula engine
// Formula calculation engine - uses the comprehensive formula engine
function calculateFormula(formula, currentCellAddress) {
    if (!formula || !formula.startsWith('=')) return formula;
    
    // Use the global formula engine if available
    if (typeof window.calculateFormula === 'function') {
        try {
            const result = window.calculateFormula(formula, currentCellAddress, spreadsheet);
            return result;
        } catch (e) {
            console.error('[SHEETS] Formula engine error:', e);
            return '#ERROR';
        }
    }
    
    // Fallback: Basic formula support if engine not loaded
    try {
        let expression = formula.substring(1).trim();
        
        // Replace cell references
        expression = expression.replace(/([A-Z]+)(\d+)/g, (match, col, row) => {
            const address = col + row;
            if (address === currentCellAddress) return '0'; // Prevent circular refs
            const val = spreadsheet[address];
            if (val === undefined || val === null || val === '') return '0';
            const num = parseFloat(val);
            return isNaN(num) ? '0' : num.toString();
        });
        
        // Basic math
        if (/^[0-9+\-*/().\s]+$/.test(expression)) {
            return Function('"use strict"; return (' + expression + ')')();
        }
        
        // Basic SUM
        const sumMatch = expression.match(/SUM\(([^)]+)\)/i);
        if (sumMatch) {
            const args = sumMatch[1];
            let sum = 0;
            const rangeMatch = args.match(/([A-Z]+)(\d+):([A-Z]+)(\d+)/);
            if (rangeMatch) {
                const startCol = COL_NAMES.indexOf(rangeMatch[1]);
                const startRow = parseInt(rangeMatch[2]);
                const endCol = COL_NAMES.indexOf(rangeMatch[3]);
                const endRow = parseInt(rangeMatch[4]);
                for (let r = Math.min(startRow, endRow); r <= Math.max(startRow, endRow); r++) {
                    for (let c = Math.min(startCol, endCol); c <= Math.max(startCol, endCol); c++) {
                        const addr = COL_NAMES[c] + r;
                        const val = parseFloat(spreadsheet[addr] || 0);
                        if (!isNaN(val)) sum += val;
                    }
                }
                return sum;
            }
        }
        
        return '#ERROR';
    } catch (e) {
        console.error('[SHEETS] Formula calculation error:', e);
        return '#ERROR';
    }
}

async function saveSpreadsheet() {
    const dataStr = JSON.stringify(spreadsheet, null, 2);
    
    if (window.electronAPI && window.electronAPI.saveFileDialog) {
        try {
            const result = await window.electronAPI.saveFileDialog({
                defaultPath: currentFileName || 'spreadsheet.json',
                filters: [
                    { name: 'JSON Files', extensions: ['json'] },
                    { name: 'All Files', extensions: ['*'] }
                ]
            });
            if (result && !result.canceled && result.filePath) {
                await window.electronAPI.writeFile(result.filePath, dataStr);
                currentFileName = result.filePath.split(/[\\/]/).pop();
                hasUnsavedChanges = false;
                updateWindowTitle();
            }
        } catch (error) {
            console.error('Error saving file:', error);
            alert('Error saving file: ' + error.message);
        }
    } else {
        // Fallback to browser download
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = currentFileName || 'spreadsheet.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        hasUnsavedChanges = false;
        updateWindowTitle();
    }
}

function recalculateDependentCells(changedAddress) {
    // Find all cells with formulas that reference the changed cell
    document.querySelectorAll('.cell[data-formula]').forEach(cell => {
        const formula = cell.dataset.formula;
        const address = cell.dataset.address;
        
        // Check if formula references the changed cell using formulaReferences function
        if (formula && typeof window.formulaReferences === 'function') {
            if (window.formulaReferences(formula, changedAddress)) {
                const result = calculateFormula(formula, address);
                if (result !== null && result !== undefined && result !== '#ERROR') {
                    cell.textContent = formatCellValue(result, cell);
                    spreadsheet[address] = result;
                }
            }
        } else if (formula && formula.includes(changedAddress)) {
            // Fallback to simple string check
            const result = calculateFormula(formula, address);
            if (result !== null && result !== undefined && result !== '#ERROR') {
                cell.textContent = formatCellValue(result, cell);
                spreadsheet[address] = result;
            }
        }
    });
}

async function loadFile(filePath) {
    try {
        if (window.electronAPI && window.electronAPI.readFile) {
            const content = await window.electronAPI.readFile(filePath);
            const ext = filePath.split('.').pop().toLowerCase();
            
            let data;
            if (ext === 'csv') {
                // Parse CSV to JSON format
                const lines = content.split('\n').filter(line => line.trim());
                data = {};
                lines.forEach((line, rowIndex) => {
                    const cols = line.split(',');
                    cols.forEach((cell, colIndex) => {
                        const address = COL_NAMES[colIndex] + (rowIndex + 1);
                        data[address] = cell.trim();
                    });
                });
            } else {
                // Parse JSON
                data = JSON.parse(content);
            }
            
            loadSpreadsheet(data);
            currentFileName = filePath.split(/[\\/]/).pop();
            hasUnsavedChanges = false;
            updateWindowTitle();
        }
    } catch (error) {
        console.error('Error loading file:', error);
        alert('Error loading file: ' + error.message);
    }
}

function updateWindowTitle() {
    const title = document.querySelector('.window-title');
    const fileName = currentFileName || 'Untitled';
    title.textContent = hasUnsavedChanges ? `Omega Sheets - ${fileName} *` : `Omega Sheets - ${fileName}`;
}

function setupAIFeatures() {
    // Switch to best DeepSeek model for code/formula generation (Excel)
    if (window.electronAPI && window.electronAPI.aiSwitchModelForApp) {
        window.electronAPI.aiSwitchModelForApp('excel').then(result => {
            if (result.success) {
                console.log('[Excel] Switched to AI model:', result.model);
            }
        }).catch(err => {
            console.log('[Excel] Model switch failed (will use default):', err);
        });
    }

    const aiBtn = document.getElementById('aiBtn');
    if (!aiBtn) {
        console.warn('AI button not found in DOM');
        return;
    }

    // Always attach event listener, but check API availability inside
    aiBtn.addEventListener('click', async () => {
        // Check if API is available
        if (!window.electronAPI || !window.electronAPI.aiSuggestFormula || !window.electronAPI.aiAnalyzeData) {
            alert('AI features require Ollama to be running. Please start Ollama and try again.');
            return;
        }
            // Show menu to choose between Formula and Analyze
            const choice = prompt(
                'Choose AI feature:\n' +
                '1 = Suggest Formula\n' +
                '2 = Analyze Data\n\n' +
                'Enter 1 or 2:',
                '1'
            );

            if (!choice || !['1', '2'].includes(choice)) {
                return;
            }

            if (choice === '1') {
                // Formula suggestion
                if (!selectedCell) {
                    alert('Please select a cell where you want the formula.');
                    return;
                }

                const description = prompt('Describe what you want the formula to do (e.g., "sum cells A1 to A10", "calculate average of B column"):');
                if (!description || !description.trim()) {
                    return;
                }

                // Get context from selected range or nearby cells
                let dataContext = null;

                aiBtn.disabled = true;
                const originalTitle = aiBtn.title;
                aiBtn.title = 'Processing...';

                try {
                    const result = await window.electronAPI.aiSuggestFormula(description.trim(), dataContext);
                    
                    if (result && result.success) {
                        const formula = result.formula || result.response;
                        // Set formula in the selected cell
                        const cellId = selectedCell.dataset.address;
                        selectedCell.dataset.formula = formula;
                        spreadsheet[cellId + '_formula'] = formula;
                        const resultValue = calculateFormula(formula, cellId);
                        if (resultValue !== null && resultValue !== undefined && resultValue !== '#ERROR') {
                            selectedCell.textContent = resultValue;
                            spreadsheet[cellId] = resultValue;
                        } else {
                            selectedCell.textContent = formula;
                            spreadsheet[cellId] = formula;
                        }
                        const formulaBar = document.getElementById('formulaBar');
                        if (formulaBar) {
                            formulaBar.value = formula;
                        }
                        hasUnsavedChanges = true;
                        updateWindowTitle();
                    } else {
                        alert('Error: ' + (result?.error || 'Failed to generate formula'));
                    }
                } catch (error) {
                    console.error('AI formula error:', error);
                    alert('Error generating formula: ' + error.message);
                } finally {
                    aiBtn.disabled = false;
                    aiBtn.title = originalTitle;
                }
            } else {
                // Data analysis
                if (!selectedCell) {
                    alert('Please select a cell to analyze.');
                    return;
                }

                // Collect data from nearby cells (simple implementation)
                const dataValues = [];
                const row = parseInt(selectedCell.dataset.row);
                const col = COL_NAMES.indexOf(selectedCell.dataset.col);
                for (let r = Math.max(1, row - 5); r <= Math.min(ROWS, row + 5); r++) {
                    for (let c = Math.max(0, col - 5); c <= Math.min(COLS - 1, col + 5); c++) {
                        const addr = COL_NAMES[c] + r;
                        const val = spreadsheet[addr];
                        if (val !== undefined && val !== null && val !== '') {
                            dataValues.push(val);
                        }
                    }
                }
                const dataSample = dataValues.slice(0, 20).filter(v => v !== '');

                if (dataSample.length === 0) {
                    alert('No data found nearby. Please add some data to analyze.');
                    return;
                }

                const dataDescription = prompt('Briefly describe what this data represents (e.g., "sales numbers", "temperature readings", "student grades"):');
                if (!dataDescription || !dataDescription.trim()) {
                    return;
                }

                aiBtn.disabled = true;
                const originalTitle = aiBtn.title;
                aiBtn.title = 'Processing...';

                try {
                    const result = await window.electronAPI.aiAnalyzeData(dataDescription.trim(), dataSample.join(', '));
                    
                    if (result && result.success) {
                        const analysis = result.analysis || result.response;
                        alert('AI Analysis:\n\n' + analysis);
                    } else {
                        alert('Error: ' + (result?.error || 'Failed to analyze data'));
                    }
                } catch (error) {
                    console.error('AI analyze error:', error);
                    alert('Error analyzing data: ' + error.message);
                } finally {
                    aiBtn.disabled = false;
                    aiBtn.title = originalTitle;
                }
            }
        });
    });
}

