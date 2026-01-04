// SIMPLE, BULLETPROOF SHEETS INITIALIZATION
// This version just creates cells - nothing fancy

if (window.debugLog) window.debugLog('sheets-simple.js loaded', 'success');

const ROWS = 100;
const COLS = 26;
const COL_NAMES = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function createCells() {
    if (window.debugLog) window.debugLog('createCells() called', 'info');
    
    try {
        const columnHeaders = document.getElementById('columnHeaders');
        const rowNumbers = document.getElementById('rowNumbers');
        const cellsContainer = document.getElementById('cellsContainer');
        
        if (window.debugLog) window.debugLog(`Elements: headers=${!!columnHeaders}, rows=${!!rowNumbers}, container=${!!cellsContainer}`, 'info');
        
        if (!columnHeaders || !rowNumbers || !cellsContainer) {
            throw new Error('Required elements not found');
        }
        
        // Clear
        columnHeaders.innerHTML = '';
        rowNumbers.innerHTML = '';
        cellsContainer.innerHTML = '';
        
        if (window.debugLog) window.debugLog('Creating grid...', 'info');
        
        const grid = document.createElement('div');
        grid.className = 'cells-grid';
        grid.style.display = 'table';
        
        // Headers
        if (window.debugLog) window.debugLog('Creating column headers...', 'info');
        for (let i = 0; i < COLS; i++) {
            const h = document.createElement('div');
            h.className = 'column-header';
            h.textContent = COL_NAMES[i];
            columnHeaders.appendChild(h);
        }
        
        // Rows and cells
        if (window.debugLog) window.debugLog(`Creating ${ROWS} rows...`, 'info');
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
                cell.dataset.address = COL_NAMES[col] + row;
                cellRow.appendChild(cell);
            }
            
            grid.appendChild(cellRow);
        }
        
        cellsContainer.appendChild(grid);
        
        const count = document.querySelectorAll('.cell').length;
        if (window.debugLog) window.debugLog(`✅ DONE! Created ${count} cells`, count > 0 ? 'success' : 'error');
        
        if (count === 0) {
            throw new Error('No cells created!');
        }
        
    } catch (e) {
        if (window.debugLog) window.debugLog(`ERROR: ${e.message}`, 'error');
        if (window.debugLog) window.debugLog(`Stack: ${e.stack}`, 'error');
        alert('Failed to create cells: ' + e.message);
    }
}

// Run immediately
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (window.debugLog) window.debugLog('DOMContentLoaded - creating cells', 'info');
        setTimeout(createCells, 100);
    });
} else {
    if (window.debugLog) window.debugLog('DOM ready - creating cells immediately', 'info');
    setTimeout(createCells, 100);
}


