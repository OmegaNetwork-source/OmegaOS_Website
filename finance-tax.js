// Income Tax and Crypto Tax Functions

// Income Tax Form Fields
const incomeTaxFields = [
    { name: 'location', label: 'Location', type: 'select', options: ['US/State', 'Foreign'], required: true },
    { name: 'filingStatus', label: 'Filing Status', type: 'select', options: ['Single', 'Married Filing Jointly', 'Married Filing Separately', 'Head of Household'], required: true },
    { name: 'income', label: 'Annual Income ($)', type: 'number', required: true },
    { name: 'federalTaxesPaid', label: 'Federal Taxes Paid/Withheld ($)', type: 'number', default: 0 },
    { name: 'dependents', label: 'Number of Dependents', type: 'number', default: 0 },
    { name: 'educationExpenses', label: 'Education Expenses ($)', type: 'number', default: 0 },
    { name: 'movingExpenses', label: 'Moving Expenses ($)', type: 'number', default: 0 },
    { name: 'charitableDonations', label: 'Charitable Donations ($)', type: 'number', default: 0 },
    { name: 'mortgageInterest', label: 'Mortgage Interest ($)', type: 'number', default: 0 },
    { name: 'stateLocalTaxes', label: 'State/Local Taxes ($)', type: 'number', default: 0 },
    { name: 'medicalExpenses', label: 'Medical Expenses ($)', type: 'number', default: 0 }
];

// Generate Income Tax Form
function generateIncomeTaxForm() {
    const form = document.getElementById('incomeTaxForm');
    if (!form) return;
    
    form.innerHTML = '';
    
    incomeTaxFields.forEach(field => {
        const group = document.createElement('div');
        group.className = 'tax-form-group';
        
        const label = document.createElement('label');
        label.textContent = field.label + (field.required ? ' *' : '');
        label.setAttribute('for', field.name);
        
        if (field.type === 'select') {
            const select = document.createElement('select');
            select.id = field.name;
            select.name = field.name;
            if (field.required) select.required = true;
            
            field.options.forEach(option => {
                const optionEl = document.createElement('option');
                optionEl.value = option;
                optionEl.textContent = option;
                select.appendChild(optionEl);
            });
            
            group.appendChild(label);
            group.appendChild(select);
        } else {
            const input = document.createElement('input');
            input.type = field.type;
            input.id = field.name;
            input.name = field.name;
            input.placeholder = field.default !== undefined ? field.default.toString() : '';
            if (field.required) input.required = true;
            if (field.default !== undefined) input.value = field.default;
            
            group.appendChild(label);
            group.appendChild(input);
        }
        
        form.appendChild(group);
    });
    
    const submitBtn = document.createElement('button');
    submitBtn.type = 'button';
    submitBtn.className = 'tax-form-submit';
    submitBtn.textContent = 'Calculate & Submit to Sheet';
    submitBtn.addEventListener('click', handleIncomeTaxSubmit);
    form.appendChild(submitBtn);
}

// Generate Crypto Tax Form
function generateCryptoTaxForm() {
    const form = document.getElementById('cryptoTaxForm');
    if (!form) return;
    
    form.innerHTML = '';
    
    // Location field
    const locationGroup = document.createElement('div');
    locationGroup.className = 'tax-form-group';
    const locationLabel = document.createElement('label');
    locationLabel.textContent = 'Location *';
    locationLabel.setAttribute('for', 'cryptoLocation');
    const locationSelect = document.createElement('select');
    locationSelect.id = 'cryptoLocation';
    locationSelect.name = 'cryptoLocation';
    locationSelect.required = true;
    ['US', 'Foreign'].forEach(opt => {
        const option = document.createElement('option');
        option.value = opt;
        option.textContent = opt;
        locationSelect.appendChild(option);
    });
    locationGroup.appendChild(locationLabel);
    locationGroup.appendChild(locationSelect);
    form.appendChild(locationGroup);
    
    // Holdings container
    const holdingsContainer = document.createElement('div');
    holdingsContainer.className = 'crypto-holdings-container';
    
    const holdingsLabel = document.createElement('label');
    holdingsLabel.textContent = 'Crypto Holdings *';
    holdingsLabel.className = 'crypto-holdings-label';
    holdingsContainer.appendChild(holdingsLabel);
    
    // Header row for holdings
    const headerRow = document.createElement('div');
    headerRow.className = 'crypto-holding-header';
    headerRow.innerHTML = '<span>Coin</span><span>Buy Price</span><span>Sell Price</span><span>Quantity</span><span></span>';
    holdingsContainer.appendChild(headerRow);
    
    // Holdings rows container
    const holdingsRowsContainer = document.createElement('div');
    holdingsRowsContainer.id = 'cryptoHoldingsRows';
    holdingsContainer.appendChild(holdingsRowsContainer);
    
    // Add initial holding row
    addCryptoHoldingRow(holdingsRowsContainer);
    
    // Add button to add more holdings
    const addHoldingBtn = document.createElement('button');
    addHoldingBtn.type = 'button';
    addHoldingBtn.className = 'crypto-add-holding-btn';
    addHoldingBtn.textContent = '+ Add Holding';
    addHoldingBtn.addEventListener('click', () => addCryptoHoldingRow(holdingsRowsContainer));
    holdingsContainer.appendChild(addHoldingBtn);
    
    form.appendChild(holdingsContainer);
    
    const submitBtn = document.createElement('button');
    submitBtn.type = 'button';
    submitBtn.className = 'tax-form-submit';
    submitBtn.textContent = 'Calculate & Submit to Sheet';
    submitBtn.addEventListener('click', handleCryptoTaxSubmit);
    form.appendChild(submitBtn);
}

// Add Crypto Holding Row
function addCryptoHoldingRow(container) {
    const row = document.createElement('div');
    row.className = 'crypto-holding-row';
    
    const coinInput = document.createElement('input');
    coinInput.type = 'text';
    coinInput.placeholder = 'BTC';
    coinInput.className = 'crypto-input';
    coinInput.required = true;
    
    const buyPriceInput = document.createElement('input');
    buyPriceInput.type = 'number';
    buyPriceInput.placeholder = '0.00';
    buyPriceInput.step = '0.01';
    buyPriceInput.className = 'crypto-input';
    buyPriceInput.required = true;
    
    const sellPriceInput = document.createElement('input');
    sellPriceInput.type = 'number';
    sellPriceInput.placeholder = '0.00';
    sellPriceInput.step = '0.01';
    sellPriceInput.className = 'crypto-input';
    
    const quantityInput = document.createElement('input');
    quantityInput.type = 'number';
    quantityInput.placeholder = '0.00000000';
    quantityInput.step = '0.00000001';
    quantityInput.className = 'crypto-input';
    quantityInput.required = true;
    
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.textContent = '×';
    removeBtn.className = 'crypto-remove-btn';
    removeBtn.addEventListener('click', () => row.remove());
    
    row.appendChild(coinInput);
    row.appendChild(buyPriceInput);
    row.appendChild(sellPriceInput);
    row.appendChild(quantityInput);
    row.appendChild(removeBtn);
    
    container.appendChild(row);
}

// Handle Income Tax Submit
function handleIncomeTaxSubmit() {
    const form = document.getElementById('incomeTaxForm');
    if (!form) return;
    
    // Collect form data manually
    const data = {};
    incomeTaxFields.forEach(field => {
        const element = document.getElementById(field.name);
        if (element) {
            if (field.type === 'number') {
                data[field.name] = parseFloat(element.value) || 0;
            } else {
                data[field.name] = element.value || '';
            }
        }
    });
    
    // Validate required fields
    if (!data.location || !data.filingStatus || !data.income || data.income <= 0) {
        alert('Please fill in all required fields with valid values.');
        return;
    }
    
    // Calculate income tax
    const taxResult = calculateIncomeTax(data);
    
    // Show results and disclaimer
    let resultMessage = `Tax Calculation Results:\n\n`;
    resultMessage += `Taxable Income: ${formatCurrencyTax(taxResult.taxableIncome)}\n`;
    resultMessage += `Federal Tax Owed: ${formatCurrencyTax(taxResult.federalTax)}\n`;
    resultMessage += `Federal Taxes Paid: ${formatCurrencyTax(taxResult.federalTaxesPaid)}\n`;
    if (taxResult.stateTax > 0) {
        resultMessage += `State Tax (estimated): ${formatCurrencyTax(taxResult.stateTax)}\n`;
    }
    resultMessage += `Total Tax Owed: ${formatCurrencyTax(taxResult.totalTax)}\n`;
    
    // Show refund or amount owed
    if (taxResult.refundOrOwed > 0) {
        resultMessage += `\n💰 Refund: ${formatCurrencyTax(taxResult.refundOrOwed)}\n`;
    } else if (taxResult.refundOrOwed < 0) {
        resultMessage += `\n💸 Amount Owed: ${formatCurrencyTax(Math.abs(taxResult.refundOrOwed))}\n`;
    } else {
        resultMessage += `\n✅ You've paid exactly what you owe!\n`;
    }
    
    resultMessage += `\n${getTaxDisclaimer()}`;
    
    if (!confirm(resultMessage)) {
        return;
    }
    
    // Add to sheet - format entries properly for parseEntry
    addIncomeTaxToSheet(data, taxResult);
    
    // Close modal
    document.getElementById('incomeTaxModal').classList.remove('active');
}

// Handle Crypto Tax Submit
function handleCryptoTaxSubmit() {
    const location = document.getElementById('cryptoLocation').value;
    if (!location) {
        alert('Please select a location.');
        return;
    }
    
    const holdingsRows = document.querySelectorAll('#cryptoHoldingsRows .crypto-holding-row');
    const holdings = [];
    
    holdingsRows.forEach(row => {
        const inputs = row.querySelectorAll('.crypto-input');
        if (inputs.length >= 4) {
            const coin = inputs[0].value.trim();
            const buyPrice = parseFloat(inputs[1].value) || 0;
            const sellPrice = parseFloat(inputs[2].value) || 0;
            const quantity = parseFloat(inputs[3].value) || 0;
            
            if (coin && quantity > 0 && buyPrice > 0) {
                holdings.push({ coin, buyPrice, sellPrice, quantity });
            }
        }
    });
    
    if (holdings.length === 0) {
        alert('Please add at least one valid crypto holding with coin, buy price, and quantity.');
        return;
    }
    
    // Calculate crypto tax
    const taxResult = calculateCryptoTax(holdings, location);
    
    // Show results and disclaimer
    let resultMessage = `Crypto Tax Calculation Results:\n\n`;
    resultMessage += `Total Capital Gains: ${formatCurrencyTax(taxResult.totalGain)}\n`;
    resultMessage += `Total Tax Owed: ${formatCurrencyTax(taxResult.totalTax)}\n\n`;
    resultMessage += getTaxDisclaimer();
    
    if (!confirm(resultMessage)) {
        return;
    }
    
    // Add to sheet
    addCryptoTaxToSheet(location, holdings, taxResult);
    
    // Close modal
    document.getElementById('cryptoTaxModal').classList.remove('active');
}

// Calculate Income Tax based on jurisdiction
function calculateIncomeTax(data) {
    const location = data.location;
    let taxableIncome = data.income;
    
    // US/State tax calculation
    if (location === 'US/State') {
        // Federal tax calculation
        // Standard deduction based on filing status (2024 rates)
        let standardDeduction = 13850; // Single
        if (data.filingStatus === 'Married Filing Jointly') standardDeduction = 27700;
        else if (data.filingStatus === 'Head of Household') standardDeduction = 20800;
        else if (data.filingStatus === 'Married Filing Separately') standardDeduction = 13850;
        
        // Itemized deductions
        const itemizedDeductions = data.stateLocalTaxes + data.mortgageInterest + 
                                  Math.max(0, data.charitableDonations - 0.03 * data.income) +
                                  Math.max(0, data.medicalExpenses - 0.075 * data.income);
        
        const deduction = Math.max(standardDeduction, itemizedDeductions);
        taxableIncome -= deduction;
        
        // Dependents (simplified - child tax credit equivalent)
        taxableIncome -= data.dependents * 2000;
        
        // Education credit (simplified)
        taxableIncome -= Math.min(data.educationExpenses * 0.2, 2500);
        
        taxableIncome = Math.max(0, taxableIncome);
        
        // Federal tax brackets (2024)
        let federalTax = 0;
        const brackets = getFederalTaxBrackets(data.filingStatus);
        
        for (let i = brackets.length - 1; i >= 0; i--) {
            if (taxableIncome > brackets[i].min) {
                federalTax = brackets[i].tax + (taxableIncome - brackets[i].min) * brackets[i].rate;
                break;
            }
        }
        
        // State tax estimate (simplified - average state tax ~5%)
        const stateTax = taxableIncome * 0.05;
        
        const totalTax = federalTax + stateTax;
        const federalTaxesPaid = parseFloat(data.federalTaxesPaid) || 0;
        const netFederalTax = federalTax - federalTaxesPaid;
        const refundOrOwed = -netFederalTax; // Positive = refund, Negative = amount owed
        
        return {
            taxableIncome,
            federalTax,
            federalTaxesPaid,
            netFederalTax,
            stateTax,
            totalTax,
            refundOrOwed
        };
    } else {
        // Foreign - simplified calculation (typically lower rates)
        const taxRate = 0.20; // Average foreign rate
        const federalTax = taxableIncome * taxRate;
        const totalTax = federalTax;
        const federalTaxesPaid = parseFloat(data.federalTaxesPaid) || 0;
        const netFederalTax = federalTax - federalTaxesPaid;
        const refundOrOwed = -netFederalTax; // Positive = refund, Negative = amount owed
        
        return {
            taxableIncome,
            federalTax,
            federalTaxesPaid,
            netFederalTax,
            stateTax: 0,
            totalTax,
            refundOrOwed
        };
    }
}

// Get Federal Tax Brackets (2024)
function getFederalTaxBrackets(filingStatus) {
    if (filingStatus === 'Married Filing Jointly') {
        return [
            { min: 0, rate: 0.10, tax: 0 },
            { min: 23200, rate: 0.12, tax: 2320 },
            { min: 94300, rate: 0.22, tax: 10972 },
            { min: 201050, rate: 0.24, tax: 33572 },
            { min: 383900, rate: 0.32, tax: 81436 },
            { min: 487450, rate: 0.35, tax: 117232.5 },
            { min: 731200, rate: 0.37, tax: 202578.5 }
        ];
    } else if (filingStatus === 'Head of Household') {
        return [
            { min: 0, rate: 0.10, tax: 0 },
            { min: 16550, rate: 0.12, tax: 1655 },
            { min: 63100, rate: 0.22, tax: 6973 },
            { min: 100500, rate: 0.24, tax: 15157 },
            { min: 191950, rate: 0.32, tax: 37125 },
            { min: 243700, rate: 0.35, tax: 53623 },
            { min: 609350, rate: 0.37, tax: 184623.5 }
        ];
    } else {
        // Single or Married Filing Separately
        return [
            { min: 0, rate: 0.10, tax: 0 },
            { min: 11600, rate: 0.12, tax: 1160 },
            { min: 47150, rate: 0.22, tax: 5426 },
            { min: 100525, rate: 0.24, tax: 17169.5 },
            { min: 191950, rate: 0.32, tax: 39069.5 },
            { min: 243725, rate: 0.35, tax: 55693.5 },
            { min: 609350, rate: 0.37, tax: 178893.75 }
        ];
    }
}

// Calculate Crypto Tax based on jurisdiction
function calculateCryptoTax(holdings, location) {
    let totalGain = 0;
    let totalLoss = 0;
    
    holdings.forEach(holding => {
        const costBasis = holding.buyPrice * holding.quantity;
        if (holding.sellPrice > 0) {
            const saleValue = holding.sellPrice * holding.quantity;
            const gain = saleValue - costBasis;
            if (gain > 0) {
                totalGain += gain;
            } else {
                totalLoss += Math.abs(gain);
            }
        }
    });
    
    const netGain = totalGain - totalLoss;
    
    if (location === 'US') {
        // US crypto tax - capital gains tax
        // Short-term (< 1 year): ordinary income rates
        // Long-term (> 1 year): 0%, 15%, or 20% depending on income
        // For simplicity, assuming all are long-term at 15% rate
        const taxRate = netGain > 0 ? 0.15 : 0;
        return {
            totalGain: netGain,
            totalTax: netGain > 0 ? netGain * taxRate : 0
        };
    } else {
        // Foreign - varies widely, using average of 20%
        const taxRate = netGain > 0 ? 0.20 : 0;
        return {
            totalGain: netGain,
            totalTax: netGain > 0 ? netGain * taxRate : 0
        };
    }
}

// Get Tax Disclaimer
function getTaxDisclaimer() {
    return 'DISCLAIMER: These calculations are estimates only and are based on current tax guidelines and the information you provided. Tax laws vary by jurisdiction and may change. This calculator should not be used as a substitute for professional tax advice. Please consult with a qualified tax professional for accurate tax calculations and advice.';
}

// Format currency helper
function formatCurrencyTax(value) {
    if (typeof formatCurrency === 'function') {
        return formatCurrency(value);
    }
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2
    }).format(value);
}

// Add Income Tax to Sheet - format entries to work with parseEntry (needs plain numbers, not formatted currency)
function addIncomeTaxToSheet(data, taxResult) {
    const entries = [
        `Income Tax ${data.location} -${Math.round(taxResult.totalTax * 100) / 100}`,
        `Income +${Math.round(data.income * 100) / 100}`,
        `Taxable Income ${Math.round(taxResult.taxableIncome * 100) / 100}`,
        `Federal Tax Owed -${Math.round(taxResult.federalTax * 100) / 100}`,
        `Federal Taxes Paid +${Math.round(taxResult.federalTaxesPaid * 100) / 100}`
    ];
    
    if (taxResult.stateTax > 0) {
        entries.push(`State Tax -${Math.round(taxResult.stateTax * 100) / 100}`);
    }
    
    // Add refund or amount owed
    if (taxResult.refundOrOwed > 0) {
        entries.push(`Tax Refund +${Math.round(taxResult.refundOrOwed * 100) / 100}`);
    } else if (taxResult.refundOrOwed < 0) {
        entries.push(`Tax Amount Owed -${Math.round(Math.abs(taxResult.refundOrOwed) * 100) / 100}`);
    }
    
    // Use existing addEntriesToSheet functionality
    const quickInput = document.getElementById('quickInput');
    if (quickInput) {
        quickInput.value = entries.join('\n');
        // Small delay to ensure input is set
        setTimeout(() => {
            if (typeof addEntriesToSheet === 'function') {
                addEntriesToSheet();
                // Refocus input after adding to allow continued entry
                setTimeout(() => {
                    quickInput.focus();
                }, 150);
            }
        }, 100);
    }
}

// Add Crypto Tax to Sheet - format entries properly (plain numbers)
function addCryptoTaxToSheet(location, holdings, taxResult) {
    const entries = [
        `Crypto Tax ${location} -${Math.round(taxResult.totalTax * 100) / 100}`
    ];
    
    holdings.forEach(h => {
        if (h.sellPrice > 0) {
            const gain = (h.sellPrice - h.buyPrice) * h.quantity;
            const roundedGain = Math.round(gain * 100) / 100;
            entries.push(`${h.coin} ${roundedGain > 0 ? '-' : '+'}${Math.abs(roundedGain)}`);
        }
    });
    
    entries.push(`Total Gain ${Math.round(taxResult.totalGain * 100) / 100}`);
    
    const quickInput = document.getElementById('quickInput');
    if (quickInput) {
        quickInput.value = entries.join('\n');
        // Small delay to ensure input is set
        setTimeout(() => {
            if (typeof addEntriesToSheet === 'function') {
                addEntriesToSheet();
                // Refocus input after adding to allow continued entry
                setTimeout(() => {
                    quickInput.focus();
                }, 150);
            }
        }, 100);
    }
}
