// SIMPLIFIED AND FIXED CORE FUNCTIONS FOR SHEETS
// Replace the corresponding functions in sheets.js with these

// SIMPLIFIED CELL INPUT HANDLER
function handleCellInput(cell, finalize = false) {
    const address = cell.dataset.address;
    const spreadsheet = getCurrentSpreadsheet();
    
    // Get cell content - most reliable method
    let value = '';
    if (cell.textContent !== null && cell.textContent !== undefined) {
        value = String(cell.textContent).trim();
    }
    
    console.log('[INPUT]', address, 'value:', value, 'finalize:', finalize);
    
    // Check if it's a formula
    if (value.startsWith('=')) {
        // It's a formula
        cell.dataset.formula = value;
        spreadsheet[address + '_formula'] = value;
        
        // Only calculate when finalizing (Enter/blur)
        if (finalize && value.length > 1) {
            console.log('[FORMULA] Calculating:', value);
            const result = calculateFormula(value, address);
            console.log('[FORMULA] Result:', result);
            
            if (result !== null && result !== undefined && result !== '#ERROR' && 
                String(result) !== value && !isNaN(parseFloat(result))) {
                cell.textContent = String(result);
                spreadsheet[address] = result;
            } else if (result === '#ERROR') {
                cell.textContent = '#ERROR';
                spreadsheet[address] = '#ERROR';
            } else {
                cell.textContent = value;
                spreadsheet[address] = value;
            }
        } else {
            // Just store, don't calculate yet
            spreadsheet[address] = value;
        }
    } else {
        // Plain value
        delete cell.dataset.formula;
        delete spreadsheet[address + '_formula'];
        spreadsheet[address] = value;
        cell.textContent = value;
    }
    
    hasUnsavedChanges = true;
    updateWindowTitle();
    updateFormulaBar();
}

// SIMPLIFIED FORMULA CALCULATION
function calculateFormula(formula, currentCellAddress) {
    if (!formula || !formula.startsWith('=')) {
        return formula;
    }
    
    try {
        let expr = formula.substring(1).trim();
        console.log('[CALC] Expression:', expr);
        
        // Replace cell references (e.g., A1, B2) with their values
        expr = expr.replace(/([A-Z]+)(\d+)/g, (match, col, row) => {
            const addr = col + row;
            if (addr === currentCellAddress) return '0';
            
            const spreadsheet = getCurrentSpreadsheet();
            
            // Check for formula in referenced cell
            if (spreadsheet[addr + '_formula']) {
                const nested = calculateFormula(spreadsheet[addr + '_formula'], addr);
                const num = parseFloat(nested);
                return isNaN(num) ? '0' : String(num);
            }
            
            // Get value from DOM or stored
            const cellEl = document.querySelector(`[data-address="${addr}"]`);
            let val = cellEl ? cellEl.textContent : spreadsheet[addr];
            
            if (!val || val === '#ERROR') return '0';
            
            // Parse number
            const clean = String(val).trim().replace(/[$,\s%]/g, '');
            const num = parseFloat(clean);
            return isNaN(num) ? '0' : String(num);
        });
        
        console.log('[CALC] After cell replacement:', expr);
        
        // Handle functions
        const upper = expr.toUpperCase();
        
        if (upper.startsWith('SUM(')) {
            const match = expr.match(/SUM\(([^)]+)\)/i);
            if (match) {
                const vals = getCellRangeValues(match[1]);
                const sum = vals.reduce((a, b) => a + b, 0);
                console.log('[SUM]', match[1], '=', vals, 'sum =', sum);
                return sum;
            }
        }
        
        if (upper.startsWith('AVERAGE(')) {
            const match = expr.match(/AVERAGE\(([^)]+)\)/i);
            if (match) {
                const vals = getCellRangeValues(match[1]);
                return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
            }
        }
        
        // Basic math: numbers, operators, parentheses only
        if (/^[0-9+\-*/().\s]+$/.test(expr)) {
            const clean = expr.replace(/\s+/g, '');
            try {
                const result = Function('"use strict"; return (' + clean + ')')();
                if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
                    console.log('[MATH]', clean, '=', result);
                    return result;
                }
            } catch(e) {
                console.error('[MATH ERROR]', e);
            }
        }
        
        return '#ERROR';
    } catch(e) {
        console.error('[FORMULA ERROR]', e);
        return '#ERROR';
    }
}

// SIMPLIFIED RANGE VALUE GETTER
function getCellRangeValues(rangeStr) {
    const spreadsheet = getCurrentSpreadsheet();
    const values = [];
    
    console.log('[RANGE] Getting values for:', rangeStr);
    
    // Handle range like A1:B5
    const rangeMatch = rangeStr.match(/([A-Z]+)(\d+):([A-Z]+)(\d+)/);
    if (rangeMatch) {
        const startCol = COL_NAMES.indexOf(rangeMatch[1]);
        const startRow = parseInt(rangeMatch[2]);
        const endCol = COL_NAMES.indexOf(rangeMatch[3]);
        const endRow = parseInt(rangeMatch[4]);
        
        for (let r = startRow; r <= endRow; r++) {
            for (let c = startCol; c <= endCol; c++) {
                const addr = COL_NAMES[c] + r;
                const cellEl = document.querySelector(`[data-address="${addr}"]`);
                
                // Get value from displayed cell
                let val = cellEl ? String(cellEl.textContent).trim() : '';
                if (!val) val = spreadsheet[addr] || '';
                
                // Parse number
                const clean = val.replace(/[$,\s%]/g, '');
                const num = parseFloat(clean);
                if (!isNaN(num)) {
                    values.push(num);
                    console.log('[RANGE]', addr, '=', num);
                }
            }
        }
    } else {
        // Single cells or comma-separated
        const cells = rangeStr.split(',').map(c => c.trim());
        cells.forEach(addr => {
            const cellEl = document.querySelector(`[data-address="${addr}"]`);
            let val = cellEl ? String(cellEl.textContent).trim() : '';
            if (!val) val = spreadsheet[addr] || '';
            
            const clean = val.replace(/[$,\s%]/g, '');
            const num = parseFloat(clean);
            if (!isNaN(num)) {
                values.push(num);
            }
        });
    }
    
    console.log('[RANGE] Final values:', values);
    return values;
}



