// SIMPLE, BULLETPROOF SHEETS WITH FORMULAS
if (window.debugLog) window.debugLog('sheets.js loaded', 'success');

const ROWS = 100;
const COLS = 26;
const COL_NAMES = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
let spreadsheet = {};
let selectedCell = null;
let currentWindowId = null;

// Simple formula calculator
function calculateFormula(formula, currentCellAddress) {
    if (!formula || !formula.startsWith('=')) return formula;
    
    try {
        let expr = formula.substring(1).trim();
        
        // Replace cell references with values
        expr = expr.replace(/([A-Z]+)(\d+)/g, (match, col, row) => {
            const addr = col + row;
            if (addr === currentCellAddress) return '0'; // Prevent circular refs
            const val = spreadsheet[addr] || '0';
            const num = parseFloat(val);
            return isNaN(num) ? '0' : num.toString();
        });
        
        // Basic math
        if (/^[0-9+\-*/().\s]+$/.test(expr)) {
            return Function('"use strict"; return (' + expr + ')')();
        }
        
        // SUM function
        const sumMatch = expr.match(/SUM\(([^)]+)\)/i);
        if (sumMatch) {
            let sum = 0;
            const args = sumMatch[1];
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
            } else {
                args.split(',').forEach(ref => {
                    const addr = ref.trim();
                    const val = parseFloat(spreadsheet[addr] || 0);
                    if (!isNaN(val)) sum += val;
                });
            }
            return sum;
        }
        
        return '#ERROR';
    } catch (e) {
        return '#ERROR';
    }
}

function selectCell(cell) {
    if (selectedCell) selectedCell.classList.remove('selected');
    selectedCell = cell;
    cell.classList.add('selected');
    
    const formulaBar = document.getElementById('formulaBar');
    if (formulaBar) {
        const formula = cell.dataset.formula || cell.textContent;
        formulaBar.value = formula;
    }
}

function updateFormulaBar() {
    const formulaBar = document.getElementById('formulaBar');
    if (selectedCell && formulaBar) {
        const formula = selectedCell.dataset.formula || selectedCell.textContent;
        formulaBar.value = formula;
    }
}

function createCells() {
    if (window.debugLog) window.debugLog('createCells() called', 'info');
    
    try {
        const columnHeaders = document.getElementById('columnHeaders');
        const rowNumbers = document.getElementById('rowNumbers');
        const cellsContainer = document.getElementById('cellsContainer');
        
        if (!columnHeaders || !rowNumbers || !cellsContainer) {
            throw new Error('Required elements not found');
        }
        
        columnHeaders.innerHTML = '';
        rowNumbers.innerHTML = '';
        cellsContainer.innerHTML = '';
        
        const grid = document.createElement('div');
        grid.className = 'cells-grid';
        grid.style.display = 'table';
        
        // Headers
        for (let i = 0; i < COLS; i++) {
            const h = document.createElement('div');
            h.className = 'column-header';
            h.textContent = COL_NAMES[i];
            columnHeaders.appendChild(h);
        }
        
        // Rows and cells
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
                const address = COL_NAMES[col] + row;
                cell.dataset.address = address;
                
                // Events
                cell.addEventListener('focus', () => selectCell(cell));
                
                cell.addEventListener('blur', () => {
                    const addr = cell.dataset.address;
                    let value = cell.textContent || '';
                    
                    // Check if we have a stored formula
                    const storedFormula = spreadsheet[addr + '_formula'];
                    if (storedFormula && storedFormula.startsWith('=')) {
                        value = storedFormula;
                    }
                    
                    // Process formulas on blur
                    if (value && value.startsWith('=')) {
                        const result = calculateFormula(value, addr);
                        if (result !== '#ERROR' && result !== value && result !== null && result !== undefined) {
                            cell.dataset.formula = value;
                            cell.textContent = String(result);
                            spreadsheet[addr] = result;
                            spreadsheet[addr + '_formula'] = value;
                        } else if (result === '#ERROR') {
                            cell.dataset.formula = value;
                            cell.textContent = '#ERROR';
                            spreadsheet[addr] = value;
                            spreadsheet[addr + '_formula'] = value;
                        } else {
                            spreadsheet[addr] = value;
                        }
                    } else {
                        spreadsheet[addr] = value;
                        delete cell.dataset.formula;
                        delete spreadsheet[addr + '_formula'];
                    }
                    updateFormulaBar();
                    if (typeof markAsChanged === 'function') {
                        markAsChanged();
                    }
                });
                
                cell.addEventListener('input', () => {
                    const addr = cell.dataset.address;
                    const value = cell.textContent || '';
                    // Store the raw input (including = for formulas)
                    spreadsheet[addr] = value;
                    // If it's a formula, store it as formula too
                    if (value.startsWith('=')) {
                        spreadsheet[addr + '_formula'] = value;
                        cell.dataset.formula = value;
                    } else {
                        delete spreadsheet[addr + '_formula'];
                        delete cell.dataset.formula;
                    }
                    // Don't calculate here - wait for blur
                    if (typeof markAsChanged === 'function') {
                        markAsChanged();
                    }
                });
                
                cell.addEventListener('keydown', (e) => {
                    const addr = cell.dataset.address;
                    const match = addr.match(/([A-Z]+)(\d+)/);
                    if (!match) return;
                    
                    const col = COL_NAMES.indexOf(match[1]);
                    let row = parseInt(match[2]);
                    
                    let handled = false;
                    
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        cell.blur();
                        // Move to next row
                        if (row < ROWS) {
                            const nextCell = document.querySelector(`[data-address="${COL_NAMES[col]}${row + 1}"]`);
                            if (nextCell) {
                                nextCell.focus();
                                handled = true;
                            }
                        }
                    } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        if (row > 1) {
                            const nextCell = document.querySelector(`[data-address="${COL_NAMES[col]}${row - 1}"]`);
                            if (nextCell) {
                                nextCell.focus();
                                handled = true;
                            }
                        }
                    } else if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        if (row < ROWS) {
                            const nextCell = document.querySelector(`[data-address="${COL_NAMES[col]}${row + 1}"]`);
                            if (nextCell) {
                                nextCell.focus();
                                handled = true;
                            }
                        }
                    } else if (e.key === 'ArrowLeft') {
                        e.preventDefault();
                        const selection = window.getSelection();
                        const cursorPos = selection.rangeCount > 0 ? selection.getRangeAt(0).startOffset : 0;
                        const textLen = cell.textContent.length;
                        
                        // Only navigate if cursor is at start or entire text is selected
                        if (cursorPos === 0 || (selection.toString().length === textLen && textLen > 0)) {
                            if (col > 0) {
                                const nextCell = document.querySelector(`[data-address="${COL_NAMES[col - 1]}${row}"]`);
                                if (nextCell) {
                                    nextCell.focus();
                                    handled = true;
                                }
                            }
                        }
                    } else if (e.key === 'ArrowRight') {
                        e.preventDefault();
                        const selection = window.getSelection();
                        const cursorPos = selection.rangeCount > 0 ? selection.getRangeAt(0).startOffset : 0;
                        const textLen = cell.textContent.length;
                        
                        // Only navigate if cursor is at end or entire text is selected
                        if (cursorPos === textLen || (selection.toString().length === textLen && textLen > 0)) {
                            if (col < COLS - 1) {
                                const nextCell = document.querySelector(`[data-address="${COL_NAMES[col + 1]}${row}"]`);
                                if (nextCell) {
                                    nextCell.focus();
                                    handled = true;
                                }
                            }
                        }
                    } else if (e.key === 'Tab') {
                        e.preventDefault();
                        if (e.shiftKey) {
                            // Shift+Tab: move left
                            if (col > 0) {
                                const nextCell = document.querySelector(`[data-address="${COL_NAMES[col - 1]}${row}"]`);
                                if (nextCell) {
                                    nextCell.focus();
                                    handled = true;
                                }
                            }
                        } else {
                            // Tab: move right
                            if (col < COLS - 1) {
                                const nextCell = document.querySelector(`[data-address="${COL_NAMES[col + 1]}${row}"]`);
                                if (nextCell) {
                                    nextCell.focus();
                                    handled = true;
                                }
                            }
                        }
                    }
                });
                
                cellRow.appendChild(cell);
            }
            
            grid.appendChild(cellRow);
        }
        
        cellsContainer.appendChild(grid);
        
        // Formula bar enter handler
        const formulaBar = document.getElementById('formulaBar');
        if (formulaBar) {
            formulaBar.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && selectedCell) {
                    e.preventDefault();
                    const value = formulaBar.value;
                    if (value.startsWith('=')) {
                        const result = calculateFormula(value, selectedCell.dataset.address);
                        if (result !== '#ERROR') {
                            selectedCell.dataset.formula = value;
                            selectedCell.textContent = result;
                            spreadsheet[selectedCell.dataset.address] = result;
                            spreadsheet[selectedCell.dataset.address + '_formula'] = value;
                        } else {
                            selectedCell.textContent = value;
                            spreadsheet[selectedCell.dataset.address] = value;
                        }
                    } else {
                        selectedCell.textContent = value;
                        spreadsheet[selectedCell.dataset.address] = value;
                        delete selectedCell.dataset.formula;
                    }
                    selectedCell.focus();
                }
            });
        }
        
        const count = document.querySelectorAll('.cell').length;
        if (window.debugLog) window.debugLog(`✅ Created ${count} cells with formula support`, 'success');
        
    } catch (e) {
        if (window.debugLog) window.debugLog(`ERROR: ${e.message}`, 'error');
        alert('Failed: ' + e.message);
    }
}

// Get window ID
function getWindowId() {
    if (window.electronAPI) {
        // Try to get window ID immediately
        if (window.electronAPI.getWindowId) {
            window.electronAPI.getWindowId().then(id => {
                if (id) {
                    currentWindowId = id;
                    if (window.debugLog) window.debugLog(`Window ID received: ${id}`, 'success');
                }
            }).catch(e => {
                if (window.debugLog) window.debugLog(`getWindowId error: ${e.message}`, 'warn');
            });
        }
        
        // Listen for window ID assignment
        if (window.electronAPI.onWindowId) {
            window.electronAPI.onWindowId((windowId) => {
                currentWindowId = windowId;
                if (window.debugLog) window.debugLog(`Window ID from callback: ${windowId}`, 'success');
            });
        }
    }
}

// Window controls
function setupWindowControls() {
    const closeBtn = document.getElementById('closeBtn');
    const minimizeBtn = document.getElementById('minimizeBtn');
    const maximizeBtn = document.getElementById('maximizeBtn');
    
    // Hide debug panel
    const debugPanel = document.getElementById('debugPanel');
    if (debugPanel) {
        debugPanel.style.display = 'none';
    }
    
    // Close debug button
    const closeDebugBtn = document.getElementById('closeDebugBtn');
    if (closeDebugBtn) {
        closeDebugBtn.addEventListener('click', () => {
            if (debugPanel) debugPanel.style.display = 'none';
        });
    }
    
    if (minimizeBtn) {
        minimizeBtn.addEventListener('click', () => {
            if (currentWindowId && window.electronAPI && window.electronAPI.appWindowMinimize) {
                window.electronAPI.appWindowMinimize(currentWindowId);
            } else if (window.electronAPI && window.electronAPI.appWindowMinimize) {
                window.electronAPI.appWindowMinimize(null);
            }
        });
    }

    if (maximizeBtn) {
        maximizeBtn.addEventListener('click', () => {
            if (currentWindowId && window.electronAPI && window.electronAPI.appWindowMaximize) {
                window.electronAPI.appWindowMaximize(currentWindowId);
            } else if (window.electronAPI && window.electronAPI.appWindowMaximize) {
                window.electronAPI.appWindowMaximize(null);
            }
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            if (hasUnsavedChanges) {
                if (confirm('You have unsaved changes. Close anyway?')) {
                    if (currentWindowId && window.electronAPI && window.electronAPI.appWindowClose) {
                        window.electronAPI.appWindowClose(currentWindowId);
                    } else if (window.electronAPI && window.electronAPI.appWindowClose) {
                        window.electronAPI.appWindowClose(null);
                    }
                }
            } else {
                if (currentWindowId && window.electronAPI && window.electronAPI.appWindowClose) {
                    window.electronAPI.appWindowClose(currentWindowId);
                } else if (window.electronAPI && window.electronAPI.appWindowClose) {
                    window.electronAPI.appWindowClose(null);
                }
            }
        });
    }
}

// File operations
let currentFileName = null;
let hasUnsavedChanges = false;

function setupFileOperations() {
    const newBtn = document.getElementById('newBtn');
    const openBtn = document.getElementById('openBtn');
    const saveBtn = document.getElementById('saveBtn');
    
    // File menu
    const fileMenuBtn = document.getElementById('fileMenuBtn');
    const fileMenuDropdown = document.getElementById('fileMenuDropdown');
    const fileMenuNew = document.getElementById('fileMenuNew');
    const fileMenuOpen = document.getElementById('fileMenuOpen');
    const fileMenuSave = document.getElementById('fileMenuSave');
    const fileMenuSaveAs = document.getElementById('fileMenuSaveAs');
    
    // Toggle file menu dropdown
    if (fileMenuBtn && fileMenuDropdown) {
        const fileMenuContainer = fileMenuBtn.closest('.file-menu-container');
        
        fileMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            fileMenuDropdown.classList.toggle('show');
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (fileMenuContainer && !fileMenuContainer.contains(e.target)) {
                fileMenuDropdown.classList.remove('show');
            }
        });
        
        // File menu actions
        if (fileMenuNew) {
            fileMenuNew.addEventListener('click', () => {
                fileMenuDropdown.classList.remove('show');
                if (newBtn) newBtn.click();
            });
        }
        
        if (fileMenuOpen) {
            fileMenuOpen.addEventListener('click', () => {
                fileMenuDropdown.classList.remove('show');
                if (openBtn) openBtn.click();
            });
        }
        
        if (fileMenuSave) {
            fileMenuSave.addEventListener('click', async () => {
                fileMenuDropdown.classList.remove('show');
                await saveSpreadsheet();
            });
        }
        
        if (fileMenuSaveAs) {
            fileMenuSaveAs.addEventListener('click', async () => {
                fileMenuDropdown.classList.remove('show');
                await saveSpreadsheetAs();
            });
        }
    }
    
    if (newBtn) {
        newBtn.addEventListener('click', () => {
            if (hasUnsavedChanges) {
                if (!confirm('You have unsaved changes. Create a new spreadsheet anyway?')) {
                    return;
                }
            }
            spreadsheet = {};
            currentFileName = null;
            hasUnsavedChanges = false;
            // Clear all cells
            document.querySelectorAll('.cell').forEach(cell => {
                cell.textContent = '';
                const addr = cell.dataset.address;
                delete spreadsheet[addr];
                delete spreadsheet[addr + '_formula'];
                delete cell.dataset.formula;
            });
            updateWindowTitle();
        });
    }
    
    if (openBtn) {
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
                            { name: 'Excel Files', extensions: ['xlsx', 'xls'] },
                            { name: 'CSV Files', extensions: ['csv'] },
                            { name: 'JSON Files', extensions: ['json'] },
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
    }
    
    if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
            await saveSpreadsheet();
        });
    }
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            saveSpreadsheet();
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            e.preventDefault();
            if (newBtn) newBtn.click();
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
            e.preventDefault();
            if (openBtn) openBtn.click();
        }
    });
}

async function saveSpreadsheet() {
    // If file already has a name, save directly; otherwise use Save As
    if (currentFileName && window.electronAPI && window.electronAPI.writeFile) {
        try {
            const data = {
                spreadsheet: spreadsheet,
                version: '1.0'
            };
            const content = JSON.stringify(data, null, 2);
            await window.electronAPI.writeFile(currentFileName, content);
            hasUnsavedChanges = false;
            updateWindowTitle();
            return;
        } catch (error) {
            console.error('Error saving file:', error);
            // Fall through to Save As dialog
        }
    }
    // Use Save As dialog
    await saveSpreadsheetAs();
}

async function saveSpreadsheetAs() {
    if (window.electronAPI && window.electronAPI.saveFileDialog) {
        try {
            // Determine default filename and extension
            let defaultFileName = currentFileName || 'spreadsheet';
            // Remove existing extension
            defaultFileName = defaultFileName.replace(/\.[^/.]+$/, '');
            
            const result = await window.electronAPI.saveFileDialog({
                defaultPath: defaultFileName + '.xlsx',
                filters: [
                    { name: 'Excel Files', extensions: ['xlsx'] },
                    { name: 'CSV Files', extensions: ['csv'] },
                    { name: 'JSON Files', extensions: ['json'] },
                    { name: 'All Files', extensions: ['*'] }
                ]
            });
            if (result && !result.canceled && result.filePath) {
                let filePath = result.filePath;
                let ext = filePath.toLowerCase().split('.').pop();
                
                // If no extension, default to xlsx if Excel filter was likely selected
                if (!ext || ext === filePath.toLowerCase()) {
                    filePath = filePath + '.xlsx';
                    ext = 'xlsx';
                }
                
                if (ext === 'xlsx' && window.electronAPI.convertToXlsx) {
                    // Convert to XLSX
                    const convertResult = await window.electronAPI.convertToXlsx(spreadsheet, filePath);
                    if (convertResult && convertResult.success) {
                        currentFileName = filePath;
                        hasUnsavedChanges = false;
                        updateWindowTitle();
                        alert('Spreadsheet saved as Excel format (.xlsx)');
                        // Sync to Omega Network
                        await syncSpreadsheetToOmega(spreadsheet, currentFileName);
                    } else {
                        alert('Error converting to XLSX: ' + (convertResult?.error || 'Unknown error'));
                    }
                } else if (ext === 'csv' && window.electronAPI.convertToCsv) {
                    // Convert to CSV
                    const convertResult = await window.electronAPI.convertToCsv(spreadsheet, filePath);
                    if (convertResult && convertResult.success) {
                        currentFileName = filePath;
                        hasUnsavedChanges = false;
                        updateWindowTitle();
                        alert('Spreadsheet saved as CSV format (.csv)');
                        // Sync to Omega Network
                        await syncSpreadsheetToOmega(spreadsheet, currentFileName);
                    } else {
                        alert('Error converting to CSV: ' + (convertResult?.error || 'Unknown error'));
                    }
                } else {
                    // Save as JSON
                    const data = {
                        spreadsheet: spreadsheet,
                        version: '1.0'
                    };
                    const content = JSON.stringify(data, null, 2);
                    await window.electronAPI.writeFile(filePath, content);
                    currentFileName = filePath;
                    hasUnsavedChanges = false;
                    updateWindowTitle();
                    // Sync to Omega Network
                    await syncSpreadsheetToOmega(spreadsheet, currentFileName);
                }
            }
        } catch (error) {
            console.error('Error saving file:', error);
            alert('Error saving file: ' + error.message);
        }
    } else {
        // Fallback to browser download
        const data = {
            spreadsheet: spreadsheet,
            version: '1.0'
        };
        const content = JSON.stringify(data, null, 2);
        const blob = new Blob([content], { type: 'application/json' });
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

async function loadFile(filePath) {
    try {
        if (window.electronAPI && window.electronAPI.readFile) {
            const content = await window.electronAPI.readFile(filePath);
            const ext = filePath.toLowerCase().split('.').pop();
            
            if (ext === 'json') {
                const data = JSON.parse(content);
                spreadsheet = data.spreadsheet || {};
                
                // Load data into cells
                Object.keys(spreadsheet).forEach(addr => {
                    if (!addr.endsWith('_formula')) {
                        const cell = document.querySelector(`[data-address="${addr}"]`);
                        if (cell) {
                            const value = spreadsheet[addr];
                            const formula = spreadsheet[addr + '_formula'];
                            
                            if (formula) {
                                cell.dataset.formula = formula;
                                const result = calculateFormula(formula, addr);
                                cell.textContent = result;
                            } else {
                                cell.textContent = value || '';
                            }
                        }
                    }
                });
            } else {
                // For XLSX and CSV, we'd need to parse them
                // For now, show a message
                alert('Loading Excel/CSV files is not yet implemented. Please use JSON format for now.');
                return;
            }
            
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
    if (title) {
        const fileName = currentFileName || 'Untitled';
        title.textContent = hasUnsavedChanges ? `Omega Sheets - ${fileName} *` : `Omega Sheets - ${fileName}`;
    }
}

// Mark as changed when cells are edited
function markAsChanged() {
    hasUnsavedChanges = true;
    updateWindowTitle();
}

// Initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (window.debugLog) window.debugLog('DOMContentLoaded - initializing', 'info');
        getWindowId();
        setTimeout(() => {
            createCells();
            setupWindowControls();
            setupFileOperations();
            updateWindowTitle();
        }, 100);
    });
} else {
    if (window.debugLog) window.debugLog('DOM ready - initializing immediately', 'info');
    getWindowId();
    setTimeout(() => {
        createCells();
        setupWindowControls();
        setupFileOperations();
        updateWindowTitle();
    }, 100);
}

// Sync spreadsheet to Omega Network
async function syncSpreadsheetToOmega(spreadsheetData, fileName) {
    try {
        if (!window.electronAPI || !window.electronAPI.identitySyncDocument) {
            return; // Identity API not available
        }

        // Check if identity is initialized
        const hasIdentity = await window.electronAPI.identityHasIdentity();
        if (!hasIdentity) {
            // Silently fail - user can sync manually later
            return;
        }

        // Convert spreadsheet data to JSON string for hashing
        const content = JSON.stringify(spreadsheetData);
        
        // Generate document hash
        const encoder = new TextEncoder();
        const data = encoder.encode(content);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const documentHash = '0x' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        // Create document ID from filename
        const documentId = fileName.replace(/[^a-zA-Z0-9]/g, '_') + '_' + Date.now();

        // Sync to Omega Network
        const result = await window.electronAPI.identitySyncDocument(
            documentId,
            documentHash,
            {
                name: fileName,
                type: 'sheets',
                timestamp: Date.now()
            }
        );

        if (result && result.success) {
            console.log('Spreadsheet synced to Omega Network:', result.txHash);
        }
    } catch (error) {
        console.error('Failed to sync spreadsheet to Omega Network:', error);
        // Don't show error to user - sync is optional
    }
}

