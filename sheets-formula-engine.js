// Comprehensive Formula Engine for Omega Sheets
// Supports Excel/Google Sheets compatible formulas

const COL_NAMES = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

// Get cell value from spreadsheet data
function getCellValue(address, spreadsheet) {
    const val = spreadsheet[address];
    if (val === undefined || val === null || val === '') return 0;
    const num = parseFloat(val);
    return isNaN(num) ? 0 : num;
}

// Get cell value as number or text
function getCellValueRaw(address, spreadsheet) {
    return spreadsheet[address] || '';
}

// Parse range (A1:B5) into array of addresses
function parseRange(rangeStr) {
    const rangeMatch = rangeStr.match(/([A-Z]+)(\d+):([A-Z]+)(\d+)/);
    if (!rangeMatch) return [];
    
    const startCol = COL_NAMES.indexOf(rangeMatch[1]);
    const startRow = parseInt(rangeMatch[2]);
    const endCol = COL_NAMES.indexOf(rangeMatch[3]);
    const endRow = parseInt(rangeMatch[4]);
    
    const addresses = [];
    for (let r = Math.min(startRow, endRow); r <= Math.max(startRow, endRow); r++) {
        for (let c = Math.min(startCol, endCol); c <= Math.max(startCol, endCol); c++) {
            addresses.push(COL_NAMES[c] + r);
        }
    }
    return addresses;
}

// Parse function arguments (handles ranges, cells, and values)
function parseArgs(argsStr, spreadsheet) {
    const args = [];
    let current = '';
    let inQuotes = false;
    let depth = 0;
    
    for (let i = 0; i < argsStr.length; i++) {
        const char = argsStr[i];
        if (char === '"' && (i === 0 || argsStr[i-1] !== '\\')) {
            inQuotes = !inQuotes;
            current += char;
        } else if (!inQuotes) {
            if (char === '(') depth++;
            else if (char === ')') depth--;
            else if (char === ',' && depth === 0) {
                args.push(current.trim());
                current = '';
                continue;
            }
        }
        current += char;
    }
    if (current.trim()) args.push(current.trim());
    
    const values = [];
    args.forEach(arg => {
        arg = arg.trim();
        // Check if it's a range
        if (arg.includes(':') && /^[A-Z]+\d+:[A-Z]+\d+$/.test(arg.replace(/\s/g, ''))) {
            const rangeAddresses = parseRange(arg);
            rangeAddresses.forEach(addr => values.push(getCellValue(addr, spreadsheet)));
        }
        // Check if it's a cell reference
        else if (/^[A-Z]+\d+$/.test(arg)) {
            values.push(getCellValue(arg, spreadsheet));
        }
        // Check if it's a number
        else if (/^-?\d+(\.\d+)?$/.test(arg)) {
            values.push(parseFloat(arg));
        }
        // Check if it's a quoted string
        else if (arg.startsWith('"') && arg.endsWith('"')) {
            values.push(arg.slice(1, -1));
        }
        // Try to parse as number
        else {
            const num = parseFloat(arg);
            values.push(isNaN(num) ? 0 : num);
        }
    });
    
    return values;
}

// Main formula calculation function
function calculateFormula(formula, currentCellAddress, spreadsheet) {
    if (!formula || !formula.startsWith('=')) return formula;
    
    try {
        let expression = formula.substring(1).trim();
        const upperExpr = expression.toUpperCase();
        
        // Handle SUM function
        if (upperExpr.startsWith('SUM(')) {
            const match = expression.match(/SUM\(([^)]+)\)/i);
            if (match) {
                const values = parseArgs(match[1], spreadsheet);
                return values.reduce((sum, val) => sum + (typeof val === 'number' ? val : 0), 0);
            }
        }
        
        // Handle AVERAGE function
        else if (upperExpr.startsWith('AVERAGE(')) {
            const match = expression.match(/AVERAGE\(([^)]+)\)/i);
            if (match) {
                const values = parseArgs(match[1], spreadsheet).filter(v => typeof v === 'number');
                return values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
            }
        }
        
        // Handle COUNT function
        else if (upperExpr.startsWith('COUNT(')) {
            const match = expression.match(/COUNT\(([^)]+)\)/i);
            if (match) {
                const values = parseArgs(match[1], spreadsheet);
                return values.filter(v => typeof v === 'number' && !isNaN(v)).length;
            }
        }
        
        // Handle COUNTA function (count all non-empty)
        else if (upperExpr.startsWith('COUNTA(')) {
            const match = expression.match(/COUNTA\(([^)]+)\)/i);
            if (match) {
                const args = match[1].trim();
                if (args.includes(':')) {
                    const rangeAddresses = parseRange(args);
                    return rangeAddresses.filter(addr => {
                        const val = spreadsheet[addr];
                        return val !== undefined && val !== null && val !== '';
                    }).length;
                } else {
                    const values = parseArgs(match[1], spreadsheet);
                    return values.filter(v => v !== '' && v !== null && v !== undefined).length;
                }
            }
        }
        
        // Handle MIN function
        else if (upperExpr.startsWith('MIN(')) {
            const match = expression.match(/MIN\(([^)]+)\)/i);
            if (match) {
                const values = parseArgs(match[1], spreadsheet).filter(v => typeof v === 'number');
                return values.length > 0 ? Math.min(...values) : 0;
            }
        }
        
        // Handle MAX function
        else if (upperExpr.startsWith('MAX(')) {
            const match = expression.match(/MAX\(([^)]+)\)/i);
            if (match) {
                const values = parseArgs(match[1], spreadsheet).filter(v => typeof v === 'number');
                return values.length > 0 ? Math.max(...values) : 0;
            }
        }
        
        // Handle IF function
        else if (upperExpr.startsWith('IF(')) {
            const match = expression.match(/IF\(([^)]+)\)/i);
            if (match) {
                const args = match[1];
                // Parse IF(condition, value_if_true, value_if_false)
                let condition = '';
                let trueVal = '';
                let falseVal = '';
                let depth = 0;
                let currentPart = '';
                let parts = [];
                
                for (let i = 0; i < args.length; i++) {
                    const char = args[i];
                    if (char === '(') depth++;
                    else if (char === ')') depth--;
                    else if (char === ',' && depth === 0) {
                        parts.push(currentPart.trim());
                        currentPart = '';
                        continue;
                    }
                    currentPart += char;
                }
                if (currentPart.trim()) parts.push(currentPart.trim());
                
                if (parts.length >= 3) {
                    condition = parts[0];
                    trueVal = parts[1];
                    falseVal = parts[2];
                    
                    // Evaluate condition (simple comparisons)
                    let conditionResult = false;
                    const condUpper = condition.toUpperCase();
                    
                    if (condUpper.includes('>=')) {
                        const [left, right] = condition.split('>=').map(s => evaluateExpression(s.trim(), currentCellAddress, spreadsheet));
                        conditionResult = left >= right;
                    } else if (condUpper.includes('<=')) {
                        const [left, right] = condition.split('<=').map(s => evaluateExpression(s.trim(), currentCellAddress, spreadsheet));
                        conditionResult = left <= right;
                    } else if (condUpper.includes('<>') || condUpper.includes('!=')) {
                        const [left, right] = condition.split(/[<>!]=?/).map(s => evaluateExpression(s.trim(), currentCellAddress, spreadsheet));
                        conditionResult = left != right;
                    } else if (condUpper.includes('>')) {
                        const [left, right] = condition.split('>').map(s => evaluateExpression(s.trim(), currentCellAddress, spreadsheet));
                        conditionResult = left > right;
                    } else if (condUpper.includes('<')) {
                        const [left, right] = condition.split('<').map(s => evaluateExpression(s.trim(), currentCellAddress, spreadsheet));
                        conditionResult = left < right;
                    } else if (condUpper.includes('=')) {
                        const [left, right] = condition.split('=').map(s => evaluateExpression(s.trim(), currentCellAddress, spreadsheet));
                        conditionResult = left == right;
                    }
                    
                    const resultValue = conditionResult ? trueVal : falseVal;
                    return evaluateExpression(resultValue.trim(), currentCellAddress, spreadsheet);
                }
            }
        }
        
        // Handle CONCATENATE or CONCAT function
        else if (upperExpr.startsWith('CONCATENATE(') || upperExpr.startsWith('CONCAT(')) {
            const match = expression.match(/(?:CONCATENATE|CONCAT)\(([^)]+)\)/i);
            if (match) {
                const values = parseArgs(match[1], spreadsheet);
                return values.map(v => String(v)).join('');
            }
        }
        
        // Handle basic math expressions with cell references
        return evaluateExpression(expression, currentCellAddress, spreadsheet);
        
    } catch (error) {
        console.error('Formula calculation error:', error, 'Formula:', formula);
        return '#ERROR';
    }
}

// Evaluate mathematical expression with cell references
function evaluateExpression(expr, currentCellAddress, spreadsheet) {
    // Replace cell references with their values
    let processedExpr = expr.replace(/([A-Z]+)(\d+)/g, (match, col, row) => {
        const address = col + row;
        // Prevent circular references
        if (address === currentCellAddress) {
            return '0';
        }
        const val = getCellValue(address, spreadsheet);
        return String(val);
    });
    
    // Only allow safe math operations
    if (/^[0-9+\-*/().\s]+$/.test(processedExpr)) {
        try {
            return Function('"use strict"; return (' + processedExpr + ')')();
        } catch (e) {
            return '#ERROR';
        }
    }
    
    return '#ERROR';
}

// Check if a formula references a cell
function formulaReferences(formula, cellAddress) {
    if (!formula || !formula.startsWith('=')) return false;
    const regex = new RegExp(cellAddress.replace(/([A-Z]+)(\d+)/, '\\$1\\$2'), 'i');
    return regex.test(formula);
}

// Export to window for use in sheets.js
if (typeof window !== 'undefined') {
    window.calculateFormula = calculateFormula;
    window.formulaReferences = formulaReferences;
}

