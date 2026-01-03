// Desktop Environment Script
let startMenuOpen = false;
let openWindows = new Map();
let activeWindowId = null;

// Background Management
function loadBackground() {
    const bgType = localStorage.getItem('desktopBgType') || 'color';
    const bgValue = localStorage.getItem('desktopBgValue') || '#1a1a1a';
    
    const wallpaper = document.querySelector('.desktop-wallpaper');
    if (bgType === 'image' && bgValue) {
        wallpaper.style.backgroundImage = `url(${bgValue})`;
        wallpaper.style.backgroundSize = 'cover';
        wallpaper.style.backgroundPosition = 'center';
        wallpaper.style.backgroundColor = 'transparent';
    } else {
        wallpaper.style.backgroundImage = 'none';
        wallpaper.style.backgroundColor = bgValue;
    }
}

function saveBackground(type, value) {
    localStorage.setItem('desktopBgType', type);
    localStorage.setItem('desktopBgValue', value);
    loadBackground();
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    console.log('Desktop environment initializing...');
    initializeDesktop();
    loadBackground(); // Load saved background
    updateTime();
    setInterval(updateTime, 1000);
    
    // Initialize crypto widget
    const selectedCryptos = loadSelectedCryptos();
    if (selectedCryptos.length > 0) {
        renderCryptoWidget(selectedCryptos);
    }
    setupCryptoSettings();
    updateCryptoPrices();
    setInterval(updateCryptoPrices, 60000); // Update every minute
    
    // Listen for window state updates from main process
    if (window.electronAPI) {
        console.log('Electron API available');
        // Request initial window state
        updateTaskbar();
        
        // Listen for window events
        window.addEventListener('app-window-closed', (event) => {
            const windowId = event.detail;
            openWindows.delete(windowId);
            updateTaskbar();
        });
    } else {
        console.error('Electron API not available!');
    }
});

function setupDesktopIcons() {
    // Load saved icon positions
    loadIconPositions();
    
    const desktopIcons = document.querySelectorAll('.desktop-icon');
    desktopIcons.forEach(icon => {
        // Click events
        icon.addEventListener('click', (e) => {
            if (!icon.classList.contains('dragging')) {
                // Deselect all icons
                document.querySelectorAll('.desktop-icon').forEach(i => {
                    i.classList.remove('selected');
                });
                icon.classList.add('selected');
            }
        });
        
        // Double-click to launch
        icon.addEventListener('dblclick', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const appType = icon.dataset.app;
            const action = icon.dataset.action;
            const folder = icon.dataset.folder;
            
            if (appType) {
                launchApp(appType);
            } else if (action === 'open-folder') {
                // Open file manager window
                launchApp('filemanager');
            } else if (folder) {
                // Open app folder
                openAppFolder(folder);
            }
        });
        
        // Drag and drop
        let isDragging = false;
        let dragStartX = 0;
        let dragStartY = 0;
        let initialX = 0;
        let initialY = 0;
        
        icon.addEventListener('mousedown', (e) => {
            if (e.button === 0) { // Left mouse button only
                isDragging = true;
                icon.classList.add('dragging');
                
                // Get current position
                const rect = icon.getBoundingClientRect();
                initialX = rect.left;
                initialY = rect.top;
                
                // Get mouse position
                dragStartX = e.clientX;
                dragStartY = e.clientY;
                
                e.preventDefault();
            }
        });
        
        document.addEventListener('mousemove', (e) => {
            if (isDragging && icon.classList.contains('dragging')) {
                const deltaX = e.clientX - dragStartX;
                const deltaY = e.clientY - dragStartY;
                
                let newX = initialX + deltaX;
                let newY = initialY + deltaY;
                
                // Constrain to desktop area (above taskbar)
                const maxX = window.innerWidth - icon.offsetWidth - 20;
                const maxY = window.innerHeight - 48 - icon.offsetHeight - 20; // 48px taskbar
                
                newX = Math.max(20, Math.min(newX, maxX));
                newY = Math.max(20, Math.min(newY, maxY));
                
                icon.style.left = newX + 'px';
                icon.style.top = newY + 'px';
                
                // Save position
                saveIconPosition(icon.id, newX, newY);
            }
        });
        
        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                icon.classList.remove('dragging');
            }
        });
        
        // Touch events for mobile support
        icon.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                isDragging = true;
                icon.classList.add('dragging');
                
                const rect = icon.getBoundingClientRect();
                initialX = rect.left;
                initialY = rect.top;
                
                dragStartX = e.touches[0].clientX;
                dragStartY = e.touches[0].clientY;
                
                e.preventDefault();
            }
        });
        
        document.addEventListener('touchmove', (e) => {
            if (isDragging && icon.classList.contains('dragging') && e.touches.length === 1) {
                const deltaX = e.touches[0].clientX - dragStartX;
                const deltaY = e.touches[0].clientY - dragStartY;
                
                let newX = initialX + deltaX;
                let newY = initialY + deltaY;
                
                const maxX = window.innerWidth - icon.offsetWidth - 20;
                const maxY = window.innerHeight - 48 - icon.offsetHeight - 20;
                
                newX = Math.max(20, Math.min(newX, maxX));
                newY = Math.max(20, Math.min(newY, maxY));
                
                icon.style.left = newX + 'px';
                icon.style.top = newY + 'px';
                
                saveIconPosition(icon.id, newX, newY);
                
                e.preventDefault();
            }
        });
        
        document.addEventListener('touchend', () => {
            if (isDragging) {
                isDragging = false;
                icon.classList.remove('dragging');
            }
        });
    });
}

function loadIconPositions() {
    const icons = document.querySelectorAll('.desktop-icon');
    const savedPositions = JSON.parse(localStorage.getItem('desktopIconPositions') || '{}');
    
    // Default grid layout
    const gridCols = 4;
    const iconWidth = 80;
    const iconHeight = 90;
    const spacing = 30;
    const startX = 20;
    const startY = 20;
    
    icons.forEach((icon, index) => {
        const iconId = icon.id;
        
        if (savedPositions[iconId]) {
            // Use saved position
            icon.style.left = savedPositions[iconId].x + 'px';
            icon.style.top = savedPositions[iconId].y + 'px';
        } else {
            // Use default grid position
            const col = index % gridCols;
            const row = Math.floor(index / gridCols);
            const x = startX + col * (iconWidth + spacing);
            const y = startY + row * (iconHeight + spacing);
            
            icon.style.left = x + 'px';
            icon.style.top = y + 'px';
            saveIconPosition(iconId, x, y);
        }
    });
}

function saveIconPosition(iconId, x, y) {
    const positions = JSON.parse(localStorage.getItem('desktopIconPositions') || '{}');
    positions[iconId] = { x, y };
    localStorage.setItem('desktopIconPositions', JSON.stringify(positions));
}

function initializeDesktop() {
    // Start Button
    const startButton = document.getElementById('startButton');
    const startMenu = document.getElementById('startMenu');
    
    startButton.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleStartMenu();
    });
    
    // Close start menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!startMenu.contains(e.target) && !startButton.contains(e.target)) {
            closeStartMenu();
        }
    });
    
    // Desktop Icons - Load positions and setup drag
    setupDesktopIcons();
    
    // Start Menu Items
    const startMenuItems = document.querySelectorAll('.start-menu-item');
    startMenuItems.forEach(item => {
        item.addEventListener('click', () => {
            const appType = item.dataset.app;
            const action = item.dataset.action;
            if (appType) {
                launchApp(appType);
                closeStartMenu();
            } else if (action === 'open-folder') {
                launchApp('filemanager');
                closeStartMenu();
            }
        });
    });
    
    // Start Menu Search
    setupStartMenuSearch();
    
    // Taskbar Search
    setupTaskbarSearch();
    
    // Power Button
    const powerButton = document.getElementById('powerButton');
    powerButton.addEventListener('click', () => {
        if (confirm('Exit isolated environment?')) {
            window.electronAPI?.desktopClose();
        }
    });
    
    // Context Menu
    setupContextMenu();
    
    // Color Picker
    setupColorPicker();
    
    // Image Upload
    setupImageUpload();
    
    // App Folders
    setupAppFolders();
    
    // Trash/Recycle Bin
    setupTrash();
    
    // Screen Lock
    setupScreenLock();
    
    // System Tray
    setupSystemTray();
    
    // Volume/Brightness Controls
    setupVolumeBrightnessControls();
    
    // Desktop Folders
    setupDesktopFolders();
    
    // File Preview
    setupFilePreview();
    
    // Multiple Desktops
    setupMultipleDesktops();
    
    // Window Snapping
    setupWindowSnapping();
    
    // AI Assistant
    setupAIAssistant();
}

// App Folder System
const appFolders = {
    productivity: {
        name: 'Omega Productivity',
        apps: [
            { id: 'word', name: 'Omega Word', icon: '📄', app: 'word' },
            { id: 'sheets', name: 'Omega Sheets', icon: '📊', app: 'sheets' },
            { id: 'slides', name: 'Omega Slides', icon: '📽️', app: 'slides' },
            { id: 'calculator', name: 'Calculator', icon: '🔢', app: 'calculator' }
        ]
    },
    security: {
        name: 'Omega Security',
        apps: [
            { id: 'encrypt', name: 'Omega Encrypt', icon: '💎', app: 'encrypt' },
            { id: 'privacy-monitor', name: 'Privacy Monitor', icon: '🛡️', app: 'privacy-monitor' },
            { id: 'firewall', name: 'Omega Firewall', icon: '🔥', app: 'firewall' }
        ]
    }
};

function setupAppFolders() {
    const modal = document.getElementById('appFolderModal');
    const closeBtn = document.getElementById('closeFolderBtn');
    
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.classList.remove('active');
        });
    }
    
    // Close on background click
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    }
}

function openAppFolder(folderId) {
    const folder = appFolders[folderId];
    if (!folder) return;
    
    const modal = document.getElementById('appFolderModal');
    const title = document.getElementById('folderTitle');
    const grid = document.getElementById('folderGrid');
    
    if (!modal || !title || !grid) return;
    
    title.textContent = folder.name;
    grid.innerHTML = '';
    
    folder.apps.forEach(app => {
        const item = document.createElement('div');
        item.className = 'folder-app-item';
        item.innerHTML = `
            <div class="icon-image">${app.icon}</div>
            <div class="icon-label">${app.name}</div>
        `;
        
        item.addEventListener('click', () => {
            launchApp(app.app);
            modal.classList.remove('active');
        });
        
        grid.appendChild(item);
    });
    
    modal.classList.add('active');
}

function setupContextMenu() {
    const contextMenu = document.getElementById('contextMenu');
    const desktopBackground = document.querySelector('.desktop-background');
    const desktopIcons = document.querySelector('.desktop-icons');
    
    document.addEventListener('contextmenu', (e) => {
        // Allow context menu on desktop area, but not on taskbar/menus
        if (e.target.closest('.taskbar') || 
            e.target.closest('.start-menu') || 
            e.target.closest('.context-menu') ||
            e.target.closest('.color-picker-modal')) {
            return;
        }
        
        // Only show on desktop background or icons
        if (e.target.closest('.desktop-background') || e.target.closest('.desktop-icons')) {
            e.preventDefault();
            contextMenu.style.display = 'block';
            contextMenu.style.left = e.pageX + 'px';
            contextMenu.style.top = e.pageY + 'px';
            contextMenu.classList.add('active');
        }
    });
    
    // Close context menu on click outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.context-menu')) {
            contextMenu.classList.remove('active');
            contextMenu.style.display = 'none';
        }
    });
    
    // Change Background Color
    document.getElementById('changeBackgroundColor').addEventListener('click', () => {
        const modal = document.getElementById('colorPickerModal');
        modal.classList.add('active');
        contextMenu.classList.remove('active');
    });
    
    // Upload Background Image
    document.getElementById('uploadBackgroundImage').addEventListener('click', () => {
        document.getElementById('imageUploadInput').click();
        contextMenu.classList.remove('active');
    });
    
    // Reset Background
    document.getElementById('resetBackground').addEventListener('click', () => {
        saveBackground('color', '#1a1a1a');
        contextMenu.classList.remove('active');
    });
}

function setupColorPicker() {
    const modal = document.getElementById('colorPickerModal');
    const closeBtn = document.getElementById('closeColorPicker');
    const cancelBtn = document.getElementById('cancelColorPicker');
    const applyBtn = document.getElementById('applyColorPicker');
    const customPicker = document.getElementById('customColorPicker');
    
    let selectedColor = '#1a1a1a';
    
    // Close modal
    closeBtn.addEventListener('click', () => modal.classList.remove('active'));
    cancelBtn.addEventListener('click', () => modal.classList.remove('active'));
    
    // Close on backdrop click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });
    
    // Color presets
    document.querySelectorAll('.color-preset').forEach(preset => {
        preset.addEventListener('click', () => {
            selectedColor = preset.dataset.color;
            customPicker.value = selectedColor;
            // Visual feedback
            document.querySelectorAll('.color-preset').forEach(p => {
                p.style.borderColor = 'transparent';
            });
            preset.style.borderColor = 'rgba(255, 255, 255, 0.5)';
        });
    });
    
    // Custom color picker
    customPicker.addEventListener('change', (e) => {
        selectedColor = e.target.value;
        document.querySelectorAll('.color-preset').forEach(p => {
            p.style.borderColor = 'transparent';
        });
    });
    
    // Apply color
    applyBtn.addEventListener('click', () => {
        saveBackground('color', selectedColor);
        modal.classList.remove('active');
    });
}

function setupImageUpload() {
    const input = document.getElementById('imageUploadInput');
    
    input.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const imageData = event.target.result;
                saveBackground('image', imageData);
            };
            reader.readAsDataURL(file);
        }
        // Reset input
        input.value = '';
    });
}

function toggleStartMenu() {
    startMenuOpen = !startMenuOpen;
    const startMenu = document.getElementById('startMenu');
    const startButton = document.getElementById('startButton');
    
    if (startMenuOpen) {
        startMenu.classList.add('active');
        startButton.classList.add('active');
    } else {
        startMenu.classList.remove('active');
        startButton.classList.remove('active');
    }
}

function closeStartMenu() {
    startMenuOpen = false;
    const startMenu = document.getElementById('startMenu');
    const startButton = document.getElementById('startButton');
    startMenu.classList.remove('active');
    startButton.classList.remove('active');
}

async function launchApp(appType) {
    try {
        if (!window.electronAPI) {
            console.error('Electron API not available');
            return;
        }
        
        const windowId = await window.electronAPI.launchApp(appType, {
            width: 1200,
            height: 800
        });
        
        if (windowId) {
            openWindows.set(windowId, {
                id: windowId,
                type: appType,
                name: getAppName(appType)
            });
            activeWindowId = windowId;
            updateTaskbar();
        }
    } catch (error) {
        console.error('Failed to launch app:', error);
        alert('Failed to launch application: ' + error.message);
    }
}

function getAppName(appType) {
    const names = {
        'browser': 'Omega Browser',
        'terminal': 'Terminal',
        'identity': 'Omega Identity',
        'wallet': 'Omega Wallet',
        'word': 'Omega Word',
        'sheets': 'Omega Sheets',
        'slides': 'Omega Slides',
        'filemanager': 'File Manager',
        'encrypt': 'Omega Encrypt',
        'privacy-monitor': 'Privacy Monitor',
        'firewall': 'Omega Firewall',
        'calculator': 'Calculator',
        'cookie-manager': 'Cookie Manager',
        'ai-dev': 'Omega Create',
        'integrations': 'Integrations'
    };
    return names[appType] || appType;
}

function getAppIcon(appType) {
    const icons = {
        'browser': '🌐',
        'terminal': '💻',
        'identity': '🆔',
        'wallet': '💰',
        'word': '📄',
        'sheets': '📊',
        'slides': '📽️',
        'filemanager': '📁',
        'encrypt': '💎',
        'privacy-monitor': '🛡️',
        'firewall': '🔥',
        'calculator': '🔢',
        'cookie-manager': '🍪',
        'ai-dev': '🤖',
        'integrations': '🔗'
    };
    return icons[appType] || '📄';
}

async function updateTaskbar() {
    if (!window.electronAPI) return;
    
    try {
        const windows = await window.electronAPI.getOpenWindows();
        const taskbarApps = document.getElementById('taskbarApps');
        
        // Clear taskbar
        taskbarApps.innerHTML = '';
        
        // Add each window to taskbar
        windows.forEach(win => {
            const taskbarApp = document.createElement('div');
            taskbarApp.className = 'taskbar-app';
            if (win.id === activeWindowId) {
                taskbarApp.classList.add('active');
            }
            
            taskbarApp.innerHTML = `
                <div class="taskbar-app-icon">${getAppIcon(win.type)}</div>
                <span>${getAppName(win.type)}</span>
            `;
            
            taskbarApp.addEventListener('click', () => {
                window.electronAPI?.focusWindow(win.id);
                activeWindowId = win.id;
                updateTaskbar();
            });
            
            taskbarApps.appendChild(taskbarApp);
        });
        
        // Update openWindows map
        openWindows.clear();
        windows.forEach(win => {
            openWindows.set(win.id, win);
        });
        
    } catch (error) {
        console.error('Failed to update taskbar:', error);
    }
}

// Crypto Price Widget Configuration
const CRYPTO_OPTIONS = [
    { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin' },
    { id: 'ethereum', symbol: 'ETH', name: 'Ethereum' },
    { id: 'solana', symbol: 'SOL', name: 'Solana' },
    { id: 'cardano', symbol: 'ADA', name: 'Cardano' },
    { id: 'polkadot', symbol: 'DOT', name: 'Polkadot' },
    { id: 'avalanche-2', symbol: 'AVAX', name: 'Avalanche' },
    { id: 'polygon', symbol: 'MATIC', name: 'Polygon' },
    { id: 'chainlink', symbol: 'LINK', name: 'Chainlink' },
    { id: 'litecoin', symbol: 'LTC', name: 'Litecoin' },
    { id: 'bitcoin-cash', symbol: 'BCH', name: 'Bitcoin Cash' },
    { id: 'stellar', symbol: 'XLM', name: 'Stellar' },
    { id: 'cosmos', symbol: 'ATOM', name: 'Cosmos' },
    { id: 'uniswap', symbol: 'UNI', name: 'Uniswap' },
    { id: 'algorand', symbol: 'ALGO', name: 'Algorand' },
    { id: 'vechain', symbol: 'VET', name: 'VeChain' },
    { id: 'filecoin', symbol: 'FIL', name: 'Filecoin' },
    { id: 'tezos', symbol: 'XTZ', name: 'Tezos' },
    { id: 'monero', symbol: 'XMR', name: 'Monero' },
    { id: 'dogecoin', symbol: 'DOGE', name: 'Dogecoin' },
    { id: 'shiba-inu', symbol: 'SHIB', name: 'Shiba Inu' },
    { id: 'tron', symbol: 'TRX', name: 'Tron' },
    { id: 'ethereum-classic', symbol: 'ETC', name: 'Ethereum Classic' }
];

const DEFAULT_CRYPTO_SELECTION = ['bitcoin', 'ethereum', 'solana'];

function loadSelectedCryptos() {
    const saved = localStorage.getItem('selectedCryptos');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            return parsed.length > 0 ? parsed : DEFAULT_CRYPTO_SELECTION;
        } catch (e) {
            return DEFAULT_CRYPTO_SELECTION;
        }
    }
    return DEFAULT_CRYPTO_SELECTION;
}

function saveSelectedCryptos(selection) {
    localStorage.setItem('selectedCryptos', JSON.stringify(selection));
}

function renderCryptoWidget(selectedIds) {
    const widget = document.getElementById('cryptoWidget');
    if (!widget) return;
    
    // Clear existing items
    const existingItems = widget.querySelectorAll('.crypto-item');
    existingItems.forEach(item => item.remove());
    
    // Add new items
    selectedIds.forEach(coinId => {
        const coin = CRYPTO_OPTIONS.find(c => c.id === coinId);
        if (!coin) return;
        
        const item = document.createElement('div');
        item.className = 'crypto-item';
        item.setAttribute('data-coin', coinId);
        item.innerHTML = `
            <span class="crypto-symbol">${coin.symbol}</span>
            <span class="crypto-price" id="${coinId}Price">$0</span>
            <span class="crypto-change" id="${coinId}Change">0%</span>
        `;
        widget.appendChild(item);
    });
}

function setupCryptoSettings() {
    const widget = document.getElementById('cryptoWidget');
    const modal = document.getElementById('cryptoSettingsModal');
    const closeBtn = document.getElementById('closeCryptoSettings');
    const cancelBtn = document.getElementById('cancelCryptoSettings');
    const applyBtn = document.getElementById('applyCryptoSettings');
    const tokensList = document.getElementById('cryptoTokensList');
    
    let tempSelection = [...loadSelectedCryptos()];
    
    // Render token checkboxes
    function renderTokenList() {
        tokensList.innerHTML = '';
        CRYPTO_OPTIONS.forEach(coin => {
            const item = document.createElement('div');
            item.className = 'crypto-token-item';
            const isChecked = tempSelection.includes(coin.id);
            item.innerHTML = `
                <input type="checkbox" id="token-${coin.id}" ${isChecked ? 'checked' : ''}>
                <label for="token-${coin.id}">
                    <span class="crypto-token-symbol">${coin.symbol}</span>
                    <span class="crypto-token-name">${coin.name}</span>
                </label>
            `;
            
            const checkbox = item.querySelector('input');
            checkbox.addEventListener('change', () => {
                if (checkbox.checked) {
                    if (tempSelection.length < 4) {
                        tempSelection.push(coin.id);
                    } else {
                        checkbox.checked = false;
                        alert('Maximum 4 cryptocurrencies allowed');
                    }
                } else {
                    tempSelection = tempSelection.filter(id => id !== coin.id);
                }
            });
            
            tokensList.appendChild(item);
        });
    }
    
    widget.addEventListener('click', () => {
        tempSelection = [...loadSelectedCryptos()];
        renderTokenList();
        modal.classList.add('active');
    });
    
    closeBtn.addEventListener('click', () => {
        modal.classList.remove('active');
    });
    
    cancelBtn.addEventListener('click', () => {
        modal.classList.remove('active');
    });
    
    applyBtn.addEventListener('click', () => {
        if (tempSelection.length === 0) {
            alert('Please select at least one cryptocurrency');
            return;
        }
        saveSelectedCryptos(tempSelection);
        renderCryptoWidget(tempSelection);
        modal.classList.remove('active');
        updateCryptoPrices(); // Refresh prices with new selection
    });
    
    // Close on click outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });
}

// Crypto Price Widget
async function updateCryptoPrices() {
    try {
        const selectedIds = loadSelectedCryptos();
        if (selectedIds.length === 0) return;
        
        // Try to use cached data first if available and recent
        const cached = localStorage.getItem('cryptoPricesCache');
        if (cached) {
            try {
                const cachedData = JSON.parse(cached);
                const cacheTime = cachedData.timestamp || 0;
                // Use cache if less than 2 minutes old
                if (Date.now() - cacheTime < 120000) {
                    selectedIds.forEach(coinId => {
                        const coinData = cachedData.data?.[coinId];
                        if (coinData) {
                            const priceEl = document.getElementById(`${coinId}Price`);
                            const changeEl = document.getElementById(`${coinId}Change`);
                            if (priceEl) priceEl.textContent = coinData.price;
                            if (changeEl) {
                                changeEl.textContent = coinData.change;
                                changeEl.className = coinData.changeClass;
                            }
                        }
                    });
                    // Still try to fetch in background for next time
                    setTimeout(() => updateCryptoPrices(), 1000);
                    return;
                }
            } catch (e) {
                console.error('Error using cached prices:', e);
            }
        }
        
        const idsParam = selectedIds.join(',');
        console.log('Fetching crypto prices for:', idsParam);
        
        // Retry logic with exponential backoff
        let lastError = null;
        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
                
                const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${idsParam}&vs_currencies=usd&include_24hr_change=true`, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    },
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                
                if (!response.ok) {
                    if (response.status === 429) {
                        // Rate limited - wait longer before retry
                        await new Promise(resolve => setTimeout(resolve, 2000 * (attempt + 1)));
                        continue;
                    }
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const data = await response.json();
                console.log('Crypto price data received:', data);
                
                // Update each selected crypto
                selectedIds.forEach(coinId => {
                    const coinData = data[coinId];
                    if (!coinData) return;
                    
                    const priceEl = document.getElementById(`${coinId}Price`);
                    const changeEl = document.getElementById(`${coinId}Change`);
                    
                    if (priceEl) {
                        const price = coinData.usd;
                        // Format price based on value
                        if (price >= 1) {
                            priceEl.textContent = `$${price.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
                        } else {
                            priceEl.textContent = `$${price.toLocaleString(undefined, { maximumFractionDigits: 4 })}`;
                        }
                    }
                    
                    if (changeEl) {
                        const change = coinData.usd_24h_change || 0;
                        changeEl.textContent = `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
                        changeEl.className = 'crypto-change ' + (change > 0 ? 'positive' : change < 0 ? 'negative' : 'neutral');
                    }
                });
                
                // Cache successful response
                const cacheData = {
                    timestamp: Date.now(),
                    data: {}
                };
                selectedIds.forEach(coinId => {
                    const coinData = data[coinId];
                    if (coinData) {
                        const priceEl = document.getElementById(`${coinId}Price`);
                        const changeEl = document.getElementById(`${coinId}Change`);
                        cacheData.data[coinId] = {
                            price: priceEl?.textContent || `$${coinData.usd}`,
                            change: changeEl?.textContent || `${coinData.usd_24h_change >= 0 ? '+' : ''}${coinData.usd_24h_change?.toFixed(2) || 0}%`,
                            changeClass: changeEl?.className || ''
                        };
                    }
                });
                localStorage.setItem('cryptoPricesCache', JSON.stringify(cacheData));
                
                return; // Success, exit function
                
            } catch (fetchError) {
                lastError = fetchError;
                if (fetchError.name === 'AbortError') {
                    console.warn(`Crypto price fetch timed out (attempt ${attempt + 1}/3)`);
                } else {
                    console.warn(`Crypto price fetch failed (attempt ${attempt + 1}/3):`, fetchError.message);
                }
                
                // Wait before retry (exponential backoff)
                if (attempt < 2) {
                    await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
                }
            }
        }
        
        // All retries failed - use cached data if available
        if (cached) {
            try {
                const cachedData = JSON.parse(cached);
                selectedIds.forEach(coinId => {
                    const coinData = cachedData.data?.[coinId];
                    if (coinData) {
                        const priceEl = document.getElementById(`${coinId}Price`);
                        const changeEl = document.getElementById(`${coinId}Change`);
                        if (priceEl) priceEl.textContent = coinData.price;
                        if (changeEl) {
                            changeEl.textContent = coinData.change;
                            changeEl.className = coinData.changeClass;
                        }
                    }
                });
                console.log('Using cached crypto prices due to API failure');
                return;
            } catch (e) {
                console.error('Error using cached prices:', e);
            }
        }
        
        throw lastError || new Error('Failed to fetch crypto prices after 3 attempts');
        
    } catch (error) {
        console.error('Error fetching crypto prices:', error);
        // Show error state but don't break the UI
        const prices = document.querySelectorAll('.crypto-price');
        prices.forEach(el => {
            if (el.textContent === '$0' || !el.textContent || el.textContent === '...') {
                el.textContent = '...';
            }
        });
    }
}

function updateTime() {
    const timeElement = document.getElementById('trayTimeHour');
    const dateElement = document.getElementById('trayDate');
    
    if (timeElement || dateElement) {
        const now = new Date();
        const hours = now.getHours();
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12;
        const timeString = `${displayHours}:${minutes} ${ampm}`;
        
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const year = now.getFullYear();
        const dateString = `${month}/${day}/${year}`;
        
        if (timeElement) timeElement.textContent = timeString;
        if (dateElement) dateElement.textContent = dateString;
    }
}

// Update taskbar periodically
setInterval(updateTaskbar, 1000);

// VPN Management
let vpnInfo = {
    ip: null,
    location: null,
    country: null,
    isp: null,
    connected: false,
    isFakeLocation: false
};

// Available VPN locations with fake IPs
const VPN_LOCATIONS = [
    { country: 'United States', city: 'New York', region: 'NY', ip: '104.248.90.212', isp: 'DigitalOcean LLC', flag: '🇺🇸' },
    { country: 'United Kingdom', city: 'London', region: 'England', ip: '159.65.118.43', isp: 'DigitalOcean LLC', flag: '🇬🇧' },
    { country: 'Germany', city: 'Frankfurt', region: 'Hesse', ip: '165.227.83.148', isp: 'DigitalOcean LLC', flag: '🇩🇪' },
    { country: 'Japan', city: 'Tokyo', region: 'Tokyo', ip: '167.99.54.12', isp: 'DigitalOcean LLC', flag: '🇯🇵' },
    { country: 'Canada', city: 'Toronto', region: 'Ontario', ip: '159.89.49.196', isp: 'DigitalOcean LLC', flag: '🇨🇦' },
    { country: 'France', city: 'Paris', region: 'Île-de-France', ip: '167.172.179.40', isp: 'DigitalOcean LLC', flag: '🇫🇷' },
    { country: 'Netherlands', city: 'Amsterdam', region: 'North Holland', ip: '178.128.61.240', isp: 'DigitalOcean LLC', flag: '🇳🇱' },
    { country: 'Singapore', city: 'Singapore', region: 'Singapore', ip: '134.209.196.42', isp: 'DigitalOcean LLC', flag: '🇸🇬' },
    { country: 'Australia', city: 'Sydney', region: 'NSW', ip: '167.99.13.162', isp: 'DigitalOcean LLC', flag: '🇦🇺' },
    { country: 'Switzerland', city: 'Zurich', region: 'Zurich', ip: '178.128.93.164', isp: 'DigitalOcean LLC', flag: '🇨🇭' },
    { country: 'Sweden', city: 'Stockholm', region: 'Stockholm', ip: '159.89.196.99', isp: 'DigitalOcean LLC', flag: '🇸🇪' },
    { country: 'Brazil', city: 'São Paulo', region: 'São Paulo', ip: '134.122.89.105', isp: 'DigitalOcean LLC', flag: '🇧🇷' },
    { country: 'South Korea', city: 'Seoul', region: 'Seoul', ip: '165.22.216.232', isp: 'DigitalOcean LLC', flag: '🇰🇷' },
    { country: 'India', city: 'Mumbai', region: 'Maharashtra', ip: '157.245.144.133', isp: 'DigitalOcean LLC', flag: '🇮🇳' },
    { country: 'Spain', city: 'Madrid', region: 'Madrid', ip: '167.99.172.135', isp: 'DigitalOcean LLC', flag: '🇪🇸' },
    { country: 'Italy', city: 'Milan', region: 'Lombardy', ip: '178.128.19.56', isp: 'DigitalOcean LLC', flag: '🇮🇹' },
    { country: 'Poland', city: 'Warsaw', region: 'Mazovia', ip: '159.89.220.107', isp: 'DigitalOcean LLC', flag: '🇵🇱' },
    { country: 'Norway', city: 'Oslo', region: 'Oslo', ip: '159.89.172.99', isp: 'DigitalOcean LLC', flag: '🇳🇴' },
    { country: 'Denmark', city: 'Copenhagen', region: 'Capital Region', ip: '157.245.27.89', isp: 'DigitalOcean LLC', flag: '🇩🇰' },
    { country: 'Finland', city: 'Helsinki', region: 'Uusimaa', ip: '167.99.5.145', isp: 'DigitalOcean LLC', flag: '🇫🇮' }
];

// Retry configuration for VPN info fetching
let vpnRetryCount = 0;
const MAX_VPN_RETRIES = 3;
const VPN_TIMEOUT = 10000; // 10 seconds

// Helper function to create a timeout promise
function createTimeoutPromise(ms) {
    return new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), ms);
    });
}

// Fetch VPN info with retry logic and fallback APIs
async function fetchVpnInfo(retryAttempt = 0) {
    try {
        // Show connecting state on first attempt
        if (retryAttempt === 0) {
            vpnInfo.connected = false;
            updateVpnDisplay();
            updateVpnIndicator();
        }
        
        // Check if a VPN location is selected
        const selectedLocation = localStorage.getItem('selectedVpnLocation');
        if (selectedLocation) {
            try {
                const location = JSON.parse(selectedLocation);
                // Always fetch real IP through proxy to verify Tor is working
                // Don't use fake IP - verify the proxy is actually working
            } catch (e) {
                // If parsing fails, fall through to real location fetch
            }
        }
        
        // Fetch IP through VPN proxy (uses Electron's net module which respects proxy settings)
        let data;
        if (window.electronAPI && window.electronAPI.vpnFetchIp) {
            try {
                const result = await window.electronAPI.vpnFetchIp();
                if (result.success) {
                    data = result.data;
                } else {
                    throw new Error(result.error || 'Failed to fetch IP');
                }
            } catch (error) {
                console.error('[VPN] Error fetching IP through proxy:', error);
                throw error;
            }
        } else {
            // Fallback to direct fetch if IPC not available (shouldn't happen)
            throw new Error('VPN fetch API not available');
        }
        
        // Update VPN info with successful data
        vpnInfo = {
            ip: data.ip || 'Unknown',
            location: data.city ? `${data.city}, ${data.region || ''}`.trim() : 'Unknown',
            country: data.country_name || 'Unknown',
            isp: data.org || 'Unknown',
            connected: true,
            isFakeLocation: false
        };
        
        // Reset retry count on success
        vpnRetryCount = 0;
        
        // Notify main process of VPN status for kill switch
        if (window.electronAPI && window.electronAPI.vpnKillSwitchGetStatus) {
            window.electronAPI.vpnKillSwitchGetStatus().then(status => {
                if (status.enabled && window.electronAPI.sendVpnStatus) {
                    window.electronAPI.sendVpnStatus(true);
                }
            });
        }
        
        updateVpnDisplay();
        updateVpnIndicator();
        
        // Store in localStorage to show it's isolated
        try {
            localStorage.setItem('vpnInfo', JSON.stringify(vpnInfo));
        } catch (e) {
            // Ignore localStorage errors
        }
    } catch (error) {
        // Retry logic
        if (retryAttempt < MAX_VPN_RETRIES) {
            vpnRetryCount++;
            // Exponential backoff: wait longer between retries
            const delay = Math.min(1000 * Math.pow(2, retryAttempt), 5000);
            setTimeout(() => {
                fetchVpnInfo(retryAttempt + 1);
            }, delay);
            return;
        }
        
        // All retries failed - use cached data if available
        const saved = localStorage.getItem('vpnInfo');
        if (saved) {
            try {
                const cached = JSON.parse(saved);
                vpnInfo = { ...cached, connected: false };
                updateVpnDisplay();
                updateVpnIndicator();
                return;
            } catch (e) {
                // Ignore parse errors
            }
        }
        
        // No cached data - show disconnected state
        vpnInfo.connected = false;
        
        // Notify main process of VPN status for kill switch
        if (window.electronAPI && window.electronAPI.vpnKillSwitchGetStatus) {
            window.electronAPI.vpnKillSwitchGetStatus().then(status => {
                if (status.enabled && window.electronAPI.sendVpnStatus) {
                    window.electronAPI.sendVpnStatus(false);
                }
            });
        }
        
        updateVpnDisplay();
        updateVpnIndicator();
        
        // Log error (suppressed in production to reduce console noise)
        // Only log final failure, not intermediate retries
        if (retryAttempt === MAX_VPN_RETRIES) {
            console.warn('VPN info fetch failed after retries:', error.message);
        }
    }
}

function updateVpnDisplay() {
    document.getElementById('vpnIpAddress').textContent = vpnInfo.ip || 'Loading...';
    document.getElementById('vpnLocation').textContent = vpnInfo.location || 'Loading...';
    document.getElementById('vpnCountry').textContent = vpnInfo.country || 'Loading...';
    document.getElementById('vpnIsp').textContent = vpnInfo.isp || 'Loading...';
    
    const statusText = document.getElementById('vpnStatusText');
    const statusDot = document.getElementById('vpnStatusDot');
    const fakeIndicator = document.getElementById('vpnFakeIndicator');
    
    if (vpnInfo.connected) {
        statusText.textContent = 'Connected';
        statusDot.className = 'vpn-status-dot connected';
    } else {
        statusText.textContent = 'Disconnected';
        statusDot.className = 'vpn-status-dot disconnected';
    }
    
    // Show fake location indicator if using spoofed location
    if (fakeIndicator) {
        if (vpnInfo.isFakeLocation && vpnInfo.connected) {
            fakeIndicator.style.display = 'flex';
        } else {
            fakeIndicator.style.display = 'none';
        }
    }
}

function updateVpnIndicator() {
    const indicator = document.getElementById('vpnIndicator');
    if (vpnInfo.connected) {
        indicator.classList.add('active');
        indicator.classList.remove('connecting');
    } else {
        indicator.classList.remove('active');
        indicator.classList.add('connecting');
    }
    
    // Update top badge as well
    const badgeDot = document.getElementById('vpnStatusBadgeDot');
    const badgeLocation = document.getElementById('vpnStatusBadgeLocation');
    const badge = document.getElementById('vpnStatusBadge');
    
    if (badgeDot && badgeLocation && badge) {
        if (vpnInfo.connected) {
            badgeDot.className = 'vpn-status-badge-dot connected';
            if (vpnInfo.country && vpnInfo.location) {
                badgeLocation.innerHTML = `${vpnInfo.country} • <span class="vpn-ip-address">${vpnInfo.ip || ''}</span>`;
            } else {
                badgeLocation.textContent = 'Connected';
            }
        } else {
            badgeDot.className = 'vpn-status-badge-dot disconnected';
            // Check if location has been selected
            const hasSelectedLocation = localStorage.getItem('selectedVpnLocation');
            const hasChosenRealLocation = localStorage.getItem('vpnUseRealLocation');
            if (!hasSelectedLocation && !hasChosenRealLocation) {
                badgeLocation.textContent = 'Select Location';
            } else {
                badgeLocation.textContent = 'Disconnected';
            }
        }
    }
}

function setupVpnPanel() {
    const vpnIndicator = document.getElementById('vpnIndicator');
    const vpnPanel = document.getElementById('vpnPanel');
    const closeBtn = document.getElementById('closeVpnPanel');
    const refreshBtn = document.getElementById('refreshVpnBtn');
    const vpnInfoBtn = document.getElementById('vpnInfoBtn');
    const vpnStatusBadge = document.getElementById('vpnStatusBadge');
    
    vpnIndicator.addEventListener('click', () => {
        vpnPanel.classList.toggle('active');
    });
    
    // Make the top badge clickable to open VPN panel
    if (vpnStatusBadge) {
        vpnStatusBadge.addEventListener('click', () => {
            vpnPanel.classList.toggle('active');
        });
    }
    
    closeBtn.addEventListener('click', () => {
        vpnPanel.classList.remove('active');
    });
    
    refreshBtn.addEventListener('click', () => {
        vpnRetryCount = 0; // Reset retry count on manual refresh
        vpnInfo.connected = false;
        updateVpnDisplay();
        updateVpnIndicator();
        fetchVpnInfo(0);
    });
    
    // Change location button
    if (vpnInfoBtn) {
        vpnInfoBtn.textContent = 'Change Location';
        vpnInfoBtn.addEventListener('click', () => {
            showVpnLocationModal();
        });
    }
    
    // VPN Kill Switch Toggle
    const vpnKillSwitchToggle = document.getElementById('vpnKillSwitchToggle');
    if (vpnKillSwitchToggle && window.electronAPI) {
        // Load current status
        window.electronAPI.vpnKillSwitchGetStatus().then(status => {
            vpnKillSwitchToggle.checked = status.enabled;
            updateVpnKillSwitchVisual(vpnKillSwitchToggle.checked);
        }).catch(err => {
            console.error('Error loading VPN kill switch status:', err);
        });
        
        // Handle toggle
        vpnKillSwitchToggle.addEventListener('change', async (e) => {
            const enabled = e.target.checked;
            try {
                await window.electronAPI.vpnKillSwitchSetStatus(enabled);
                updateVpnKillSwitchVisual(enabled);
                
                // Send current VPN status
                if (enabled) {
                    window.electronAPI.sendVpnStatus(vpnInfo.connected);
                }
            } catch (err) {
                console.error('Error setting VPN kill switch status:', err);
                // Revert on error
                vpnKillSwitchToggle.checked = !enabled;
                updateVpnKillSwitchVisual(!enabled);
            }
        });
        
        // Also handle click on the label
        const killSwitchLabel = vpnKillSwitchToggle.closest('label');
        if (killSwitchLabel) {
            killSwitchLabel.addEventListener('click', (e) => {
                // Let the default behavior handle it, but ensure change event fires
                setTimeout(() => {
                    if (vpnKillSwitchToggle.checked !== (e.target === vpnKillSwitchToggle ? vpnKillSwitchToggle.checked : !vpnKillSwitchToggle.checked)) {
                        vpnKillSwitchToggle.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                }, 10);
            });
        }
        
        // Listen for kill switch trigger
        window.electronAPI.onVpnKillSwitchTriggered(() => {
            alert('⚠️ VPN Kill Switch Activated!\n\nYour VPN connection dropped and network access has been disabled for security.');
        });
    }
    
    function updateVpnKillSwitchVisual(checked) {
        const toggle = document.getElementById('vpnKillSwitchToggle');
        if (toggle) {
            const toggleSpan = toggle.nextElementSibling;
            if (toggleSpan) {
                const circle = toggleSpan.querySelector('span');
                if (checked) {
                    toggleSpan.style.backgroundColor = 'rgba(34, 197, 94, 0.5)';
                    if (circle) circle.style.transform = 'translateX(24px)';
                } else {
                    toggleSpan.style.backgroundColor = 'rgba(100, 116, 139, 0.5)';
                    if (circle) circle.style.transform = 'translateX(0)';
                }
            }
        }
    }
    
    // Close on click outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.vpn-panel') && !e.target.closest('.vpn-indicator') && !e.target.closest('.vpn-status-badge')) {
            vpnPanel.classList.remove('active');
        }
    });
}

// Start Menu Search Functionality
function setupStartMenuSearch() {
    const searchInput = document.getElementById('startSearch');
    const appsContainer = document.querySelector('.start-menu-apps');
    const filesContainer = document.getElementById('startMenuFiles');
    let allFiles = [];
    let searchTimeout = null;
    
    // Load files on start menu open
    const startMenu = document.getElementById('startMenu');
    const observer = new MutationObserver(() => {
        if (startMenu.classList.contains('active')) {
            loadFilesForSearch();
        }
    });
    observer.observe(startMenu, { attributes: true, attributeFilter: ['class'] });
    
    // Initial load
    loadFilesForSearch();
    
    async function loadFilesForSearch() {
        if (window.electronAPI && window.electronAPI.listDocuments) {
            try {
                allFiles = await window.electronAPI.listDocuments();
            } catch (error) {
                console.error('Failed to load files for search:', error);
                allFiles = [];
            }
        }
    }
    
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase().trim();
        
        // Clear previous timeout
        if (searchTimeout) {
            clearTimeout(searchTimeout);
        }
        
        // Debounce search
        searchTimeout = setTimeout(() => {
            performSearch(searchTerm);
        }, 150);
    });
    
    // Make performSearch available globally for taskbar search
    window.performStartMenuSearch = function(searchTerm) {
        performSearch(searchTerm.toLowerCase().trim());
    };
    
    function performSearch(searchTerm) {
        if (!searchTerm) {
            // Show all apps, hide files
            appsContainer.style.display = 'flex';
            filesContainer.style.display = 'none';
            document.querySelectorAll('.start-menu-item').forEach(item => {
                item.style.display = 'flex';
            });
            return;
        }
        
        // Filter apps
        let hasAppMatches = false;
        document.querySelectorAll('.start-menu-item').forEach(item => {
            const title = item.querySelector('.start-menu-title')?.textContent.toLowerCase() || '';
            const subtitle = item.querySelector('.start-menu-subtitle')?.textContent.toLowerCase() || '';
            const matches = title.includes(searchTerm) || subtitle.includes(searchTerm);
            
            if (matches) {
                item.style.display = 'flex';
                hasAppMatches = true;
            } else {
                item.style.display = 'none';
            }
        });
        
        // Filter files
        const fileMatches = allFiles.filter(file => {
            if (file.isDirectory) return false;
            return file.name.toLowerCase().includes(searchTerm);
        });
        
        // Show/hide containers
        if (hasAppMatches || fileMatches.length > 0) {
            appsContainer.style.display = hasAppMatches ? 'flex' : 'none';
            if (filesContainer) {
                filesContainer.style.display = fileMatches.length > 0 ? 'block' : 'none';
            }
        } else {
            // No results - show message
            appsContainer.style.display = 'none';
            if (filesContainer) {
                filesContainer.style.display = 'block';
                filesContainer.innerHTML = '<div style="padding: 40px 20px; text-align: center; color: rgba(255, 255, 255, 0.5); font-size: 14px;">No results found</div>';
            }
        }
        
        // Render file results
        if (fileMatches.length > 0 && filesContainer) {
            renderFileResults(fileMatches, searchTerm);
        } else if (!hasAppMatches && searchTerm && filesContainer) {
            // Only show "no results" if we have a search term and no matches
            if (!filesContainer.querySelector('.start-menu-item') && !filesContainer.querySelector('div[style*="padding: 40px"]')) {
                filesContainer.innerHTML = '<div style="padding: 40px 20px; text-align: center; color: rgba(255, 255, 255, 0.5); font-size: 14px;">No results found</div>';
            }
        }
    }
    
    function renderFileResults(files, searchTerm) {
        filesContainer.innerHTML = '';
        
        // Add header
        const header = document.createElement('div');
        header.style.padding = '8px 16px';
        header.style.fontSize = '12px';
        header.style.fontWeight = '600';
        header.style.color = '#666';
        header.style.borderTop = '1px solid rgba(0, 0, 0, 0.1)';
        header.style.marginTop = '8px';
        header.textContent = 'Files';
        filesContainer.appendChild(header);
        
        files.slice(0, 5).forEach(file => { // Limit to 5 results
            const item = document.createElement('div');
            item.className = 'start-menu-item';
            item.style.cursor = 'pointer';
            
            // Get file icon
            const ext = file.extension;
            let icon = '📄';
            if (['.doc', '.docx'].includes(ext)) icon = '📄';
            else if (['.xls', '.xlsx', '.csv', '.json'].includes(ext)) icon = '📊';
            else if (['.txt', '.rtf'].includes(ext)) icon = '📝';
            else if (['.html', '.htm'].includes(ext)) icon = '🌐';
            
            item.innerHTML = `
                <div class="start-menu-icon">${icon}</div>
                <div class="start-menu-text">
                    <div class="start-menu-title">${file.name}</div>
                    <div class="start-menu-subtitle">Document</div>
                </div>
            `;
            
            item.addEventListener('click', () => {
                if (window.electronAPI && window.electronAPI.openFileInApp) {
                    window.electronAPI.openFileInApp(file.path).then(result => {
                        if (!result.success) {
                            alert('Failed to open file: ' + result.error);
                        } else {
                            closeStartMenu();
                        }
                    });
                }
            });
            
            filesContainer.appendChild(item);
        });
    }
}

// Taskbar Search Functionality
function setupTaskbarSearch() {
    const taskbarSearch = document.getElementById('taskbarSearch');
    const startMenu = document.getElementById('startMenu');
    const startSearch = document.getElementById('startSearch');
    
    if (!taskbarSearch) return;
    
    // Ensure start menu opens when taskbar search is interacted with
    const ensureStartMenuOpen = () => {
        if (!startMenu || !startMenu.classList.contains('active')) {
            // Use toggleStartMenu to ensure it opens
            if (!startMenuOpen) {
                toggleStartMenu();
            }
        }
    };
    
    // When taskbar search is clicked/focused, open start menu
    taskbarSearch.addEventListener('click', (e) => {
        e.stopPropagation();
        ensureStartMenuOpen();
        setTimeout(() => {
            if (startSearch) {
                startSearch.focus();
                if (taskbarSearch.value) {
                    startSearch.value = taskbarSearch.value;
                    // Trigger search immediately
                    const inputEvent = new Event('input', { bubbles: true, cancelable: true });
                    startSearch.dispatchEvent(inputEvent);
                    // Also call search function directly
                    if (window.performStartMenuSearch) {
                        window.performStartMenuSearch(taskbarSearch.value);
                    }
                }
            }
        }, 100);
    });
    
    taskbarSearch.addEventListener('focus', () => {
        ensureStartMenuOpen();
        setTimeout(() => {
            if (startSearch) {
                startSearch.focus();
                if (taskbarSearch.value) {
                    startSearch.value = taskbarSearch.value;
                    const inputEvent = new Event('input', { bubbles: true, cancelable: true });
                    startSearch.dispatchEvent(inputEvent);
                    if (window.performStartMenuSearch) {
                        window.performStartMenuSearch(taskbarSearch.value);
                    }
                }
            }
        }, 100);
    });
    
    // When typing in taskbar search, sync with start menu search
    taskbarSearch.addEventListener('input', (e) => {
        const value = e.target.value;
        
        // Always ensure start menu is open when typing
        if (!startMenu || !startMenu.classList.contains('active')) {
            if (!startMenuOpen) {
                toggleStartMenu();
            }
        }
        
        // Sync with start menu search immediately - no delay for better responsiveness
        if (startSearch) {
            startSearch.value = value;
            // Trigger search with proper event
            const inputEvent = new Event('input', { bubbles: true, cancelable: true });
            startSearch.dispatchEvent(inputEvent);
            
            // Also manually trigger the search function if available
            if (window.performStartMenuSearch) {
                window.performStartMenuSearch(value);
            }
        }
    });
    
    // Handle Enter key to launch first result
    taskbarSearch.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            ensureStartMenuOpen();
            setTimeout(() => {
                // Find first visible result and click it
                const firstVisibleItem = document.querySelector('.start-menu-item[style*="flex"]:not([style*="none"]), .start-menu-item:not([style*="none"])');
                if (firstVisibleItem) {
                    firstVisibleItem.click();
                    taskbarSearch.value = '';
                    closeStartMenu();
                }
            }, 100);
        }
    });
}

// VPN Location Selection Modal
function showVpnLocationModal() {
    const modal = document.getElementById('vpnLocationModal');
    const list = document.getElementById('vpnLocationList');
    const searchInput = document.getElementById('vpnLocationSearch');
    const skipBtn = document.getElementById('skipVpnLocation');
    const useRealBtn = document.getElementById('useRealLocation');
    
    // Clear and populate location list
    list.innerHTML = '';
    
    // Get currently selected location
    const currentLocation = localStorage.getItem('selectedVpnLocation');
    let currentLocationData = null;
    if (currentLocation) {
        try {
            currentLocationData = JSON.parse(currentLocation);
        } catch (e) {}
    }
    
    VPN_LOCATIONS.forEach(location => {
        const item = document.createElement('div');
        item.className = 'vpn-location-item';
        if (currentLocationData && currentLocationData.country === location.country) {
            item.classList.add('selected');
        }
        
        item.innerHTML = `
            <span class="vpn-location-item-flag">${location.flag}</span>
            <div class="vpn-location-item-info">
                <div class="vpn-location-item-name">${location.country}</div>
                <div class="vpn-location-item-details">${location.city}, ${location.region} • ${location.ip}</div>
            </div>
        `;
        
        item.addEventListener('click', () => {
            // Remove selected class from all items
            document.querySelectorAll('.vpn-location-item').forEach(i => i.classList.remove('selected'));
            item.classList.add('selected');
            
            // Store selected location and clear real location preference
            localStorage.setItem('selectedVpnLocation', JSON.stringify(location));
            localStorage.removeItem('vpnUseRealLocation');
            
            // Try to set VPN proxy for this location (uses Tor)
            if (window.electronAPI && window.electronAPI.vpnSetProxy) {
                window.electronAPI.vpnSetProxy({
                    country: location.country,
                    city: location.city
                }).then(result => {
                    if (result.success) {
                        console.log('[VPN] Connected to Tor VPN:', result.message);
                        if (result.warning) {
                            console.warn('[VPN]', result.warning);
                        }
                        // Wait for Tor to bootstrap, then fetch real IP through Tor to verify
                        console.log('[VPN] Waiting for Tor to establish connection...');
                        setTimeout(() => {
                            console.log('[VPN] Verifying Tor connection by fetching IP...');
                            fetchVpnInfo(0);
                        }, 5000); // Wait 5 seconds for Tor to bootstrap
                    } else {
                        console.warn('[VPN] Proxy connection failed:', result.message);
                    }
                }).catch(err => {
                    console.error('[VPN] Error setting proxy:', err);
                });
            }
            
            // Show connecting state (will update with real IP after Tor connects)
            vpnInfo = {
                ip: 'Connecting via Tor...',
                location: `${location.city}, ${location.region}`,
                country: location.country,
                isp: 'Tor',
                connected: false,
                isFakeLocation: false
            };
            
            updateVpnDisplay();
            updateVpnIndicator();
            
            // Close modal after a brief delay
            setTimeout(() => {
                modal.classList.remove('active');
            }, 300);
        });
        
        list.appendChild(item);
    });
    
    // Search functionality
    searchInput.value = '';
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        Array.from(list.children).forEach(item => {
            const text = item.textContent.toLowerCase();
            item.style.display = text.includes(searchTerm) ? 'flex' : 'none';
        });
    });
    
    // Skip button - use real location
    skipBtn.addEventListener('click', () => {
        localStorage.removeItem('selectedVpnLocation');
        localStorage.setItem('vpnUseRealLocation', 'true');
        // Disconnect VPN proxy
        if (window.electronAPI && window.electronAPI.vpnSetProxy) {
            window.electronAPI.vpnSetProxy(null).then(() => {
                console.log('[VPN] VPN proxy disconnected, using real location');
            });
        }
        modal.classList.remove('active');
        fetchVpnInfo(0);
    });
    
    // Use real location button
    useRealBtn.addEventListener('click', () => {
        localStorage.removeItem('selectedVpnLocation');
        localStorage.setItem('vpnUseRealLocation', 'true');
        // Disconnect VPN proxy
        if (window.electronAPI && window.electronAPI.vpnSetProxy) {
            window.electronAPI.vpnSetProxy(null).then(() => {
                console.log('[VPN] VPN proxy disconnected, using real location');
            });
        }
        modal.classList.remove('active');
        fetchVpnInfo(0);
    });
    
    modal.classList.add('active');
}

// Initialize VPN on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initializeVpn();
    });
} else {
    initializeVpn();
}

function initializeVpn() {
    setupVpnPanel();
    
    // Check if user has explicitly selected a location or chosen to use real location
    const hasSelectedLocation = localStorage.getItem('selectedVpnLocation');
    const hasChosenRealLocation = localStorage.getItem('vpnUseRealLocation');
    const hasVpnInfo = localStorage.getItem('vpnInfo');
    
    // If no location selected and user hasn't chosen real location
    if (!hasSelectedLocation && !hasChosenRealLocation) {
        // Check if a default VPN location is configured for auto-connect
        // This allows VPN to auto-connect on initial startup
        const defaultLocationKey = 'United States-New York'; // Default location
        const defaultLocation = VPN_LOCATIONS.find(loc => 
            `${loc.country}-${loc.city}` === defaultLocationKey || 
            (loc.country === 'United States' && loc.city === 'New York')
        );
        
        if (defaultLocation) {
            // Auto-select default location and connect on first startup
            localStorage.setItem('selectedVpnLocation', JSON.stringify(defaultLocation));
            
            // Connect to VPN immediately
            if (window.electronAPI && window.electronAPI.vpnSetProxy) {
                window.electronAPI.vpnSetProxy({
                    country: defaultLocation.country,
                    city: defaultLocation.city
                }).then(result => {
                    if (result.success) {
                        console.log('[VPN] Auto-connected to VPN on initial startup:', result.message);
                        // Wait for Tor to bootstrap, then fetch real IP through Tor
                        console.log('[VPN] Waiting for Tor to establish connection...');
                        setTimeout(() => {
                            console.log('[VPN] Verifying Tor connection by fetching IP...');
                            fetchVpnInfo(0);
                        }, 5000); // Wait 5 seconds for Tor to bootstrap
                    } else {
                        console.warn('[VPN] Auto-connect failed:', result.message);
                        // Show fake location if proxy not configured
                        vpnInfo = {
                            ip: defaultLocation.ip,
                            location: `${defaultLocation.city}, ${defaultLocation.region}`,
                            country: defaultLocation.country,
                            isp: defaultLocation.isp,
                            connected: true,
                            isFakeLocation: true
                        };
                        updateVpnDisplay();
                        updateVpnIndicator();
                    }
                }).catch(err => {
                    console.error('[VPN] Error auto-connecting:', err);
                });
            }
            
            // Update display immediately
            vpnInfo = {
                ip: defaultLocation.ip,
                location: `${defaultLocation.city}, ${defaultLocation.region}`,
                country: defaultLocation.country,
                isp: defaultLocation.isp,
                connected: true,
                isFakeLocation: false // Will be updated after proxy connection attempt
            };
            updateVpnDisplay();
            updateVpnIndicator();
            localStorage.setItem('vpnInfo', JSON.stringify(vpnInfo));
            return;
        }
        
        // No default location configured - show location selection modal
        vpnInfo.connected = false;
        updateVpnDisplay();
        updateVpnIndicator();
        
        // Show modal after a brief delay to let the UI render
        setTimeout(() => {
            showVpnLocationModal();
        }, 500);
        return;
    }
    
    // Try to load saved VPN info
    const saved = localStorage.getItem('vpnInfo');
    if (saved) {
        try {
            vpnInfo = JSON.parse(saved);
            updateVpnDisplay();
            updateVpnIndicator();
        } catch (e) {
            console.error('Failed to load saved VPN info:', e);
        }
    }
    
    // If a location was previously selected, reconnect to the proxy on startup
    if (hasSelectedLocation) {
        try {
            const location = JSON.parse(hasSelectedLocation);
            // Reconnect to VPN proxy for this location
            if (window.electronAPI && window.electronAPI.vpnSetProxy) {
                window.electronAPI.vpnSetProxy({
                    country: location.country,
                    city: location.city
                }).then(result => {
                    if (result.success) {
                        vpnInfo.isFakeLocation = false;
                        console.log('[VPN] Reconnected to VPN proxy on startup:', result.message);
                        
                        // Show warning if Tor may not be running
                        if (result.warning) {
                            console.warn('[VPN]', result.warning);
                        }
                        
                        // Wait for Tor to bootstrap, then fetch real IP through Tor
                        console.log('[VPN] Waiting for Tor to establish connection...');
                        setTimeout(() => {
                            console.log('[VPN] Verifying Tor connection by fetching IP...');
                            fetchVpnInfo(0);
                        }, 5000); // Wait 5 seconds for Tor to bootstrap // Wait 2 seconds for proxy to take effect
                    } else {
                        console.warn('[VPN] Proxy not configured for saved location:', result.message);
                        vpnInfo.isFakeLocation = result.isFakeLocation || true;
                        updateVpnDisplay();
                        updateVpnIndicator();
                    }
                }).catch(err => {
                    console.error('[VPN] Error reconnecting proxy on startup:', err);
                    vpnInfo.isFakeLocation = true;
                    updateVpnDisplay();
                    updateVpnIndicator();
                });
            } else {
                // No proxy API available, use fake location
                vpnInfo.isFakeLocation = true;
                updateVpnDisplay();
                updateVpnIndicator();
            }
        } catch (e) {
            console.error('Failed to parse saved location:', e);
        }
    }
    
    // Start with connecting state if no saved info
    if (!vpnInfo.ip) {
        vpnInfo.connected = false;
        updateVpnDisplay();
        updateVpnIndicator();
    }
    
    // Only fetch VPN info if user chose real location, otherwise use fake location
    if (hasChosenRealLocation && !hasSelectedLocation) {
        fetchVpnInfo();
        // Refresh every 5 minutes
        setInterval(fetchVpnInfo, 5 * 60 * 1000);
    } else if (hasSelectedLocation) {
        // Use fake location - already set in fetchVpnInfo logic
        fetchVpnInfo();
    }
}

// Trash/Recycle Bin
function setupTrash() {
    const trashIcon = document.getElementById('trashIcon');
    const trashModal = document.getElementById('trashModal');
    const closeTrashModal = document.getElementById('closeTrashModal');
    const trashModalBody = document.getElementById('trashModalBody');
    const emptyTrashBtn = document.getElementById('emptyTrashBtn');
    const restoreAllBtn = document.getElementById('restoreAllBtn');
    const trashCount = document.getElementById('trashCount');
    
    if (!trashIcon || !window.electronAPI) return;
    
    // Open trash on double click
    trashIcon.addEventListener('dblclick', async () => {
        await loadTrashContents();
        trashModal.style.display = 'flex';
    });
    
    // Close modal
    if (closeTrashModal) {
        closeTrashModal.addEventListener('click', () => {
            trashModal.style.display = 'none';
        });
    }
    
    // Empty trash
    if (emptyTrashBtn) {
        emptyTrashBtn.addEventListener('click', async () => {
            if (confirm('Permanently delete all items in trash?')) {
                // Show loading state
                emptyTrashBtn.disabled = true;
                emptyTrashBtn.textContent = 'Deleting...';
                if (restoreAllBtn) restoreAllBtn.disabled = true;
                
                // Show loading indicator in modal body
                const originalContent = trashModalBody.innerHTML;
                trashModalBody.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon" style="animation: spin 1s linear infinite;">⏳</div>
                        <div>Deleting all items...</div>
                        <div style="font-size: 12px; color: #999; margin-top: 8px;">Please wait</div>
                    </div>
                `;
                
                try {
                    const result = await window.electronAPI.trashEmpty();
                    if (result.success) {
                        // Immediately show empty state
                        trashModalBody.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🗑️</div><div>Trash is empty</div></div>';
                        if (emptyTrashBtn) emptyTrashBtn.style.display = 'none';
                        if (restoreAllBtn) restoreAllBtn.style.display = 'none';
                        await updateTrashCount();
                    } else {
                        // Restore content on error
                        trashModalBody.innerHTML = originalContent;
                        alert('Failed to empty trash');
                    }
                } catch (error) {
                    console.error('Error emptying trash:', error);
                    trashModalBody.innerHTML = originalContent;
                    alert('Error emptying trash: ' + error.message);
                } finally {
                    // Restore button state
                    emptyTrashBtn.disabled = false;
                    emptyTrashBtn.textContent = 'Empty Trash';
                    if (restoreAllBtn) restoreAllBtn.disabled = false;
                }
            }
        });
    }
    
    // Restore all
    if (restoreAllBtn) {
        restoreAllBtn.addEventListener('click', async () => {
            const result = await window.electronAPI.trashList();
            if (result.success && result.files.length > 0) {
                for (const file of result.files) {
                    await window.electronAPI.trashRestore(file.path);
                }
                await loadTrashContents();
                updateTrashCount();
            }
        });
    }
    
    async function loadTrashContents() {
        const result = await window.electronAPI.trashList();
        if (result.success) {
            const files = result.files;
            if (files.length === 0) {
                trashModalBody.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🗑️</div><div>Trash is empty</div></div>';
                if (emptyTrashBtn) emptyTrashBtn.style.display = 'none';
                if (restoreAllBtn) restoreAllBtn.style.display = 'none';
            } else {
                trashModalBody.innerHTML = files.map(file => `
                    <div class="trash-item">
                        <div class="trash-item-info">
                            <div class="trash-item-name">${file.name}</div>
                            <div class="trash-item-path">${file.originalPath}</div>
                        </div>
                        <div class="trash-item-actions">
                            <button class="trash-btn secondary" onclick="restoreTrashItem('${file.path.replace(/'/g, "\\'")}')">Restore</button>
                            <button class="trash-btn danger" onclick="deleteTrashItem('${file.path.replace(/'/g, "\\'")}')">Delete</button>
                        </div>
                    </div>
                `).join('');
                if (emptyTrashBtn) emptyTrashBtn.style.display = 'block';
                if (restoreAllBtn) restoreAllBtn.style.display = 'block';
            }
        }
    }
    
    window.restoreTrashItem = async (path) => {
        await window.electronAPI.trashRestore(path);
        await loadTrashContents();
        updateTrashCount();
    };
    
    window.deleteTrashItem = async (path) => {
        if (confirm('Permanently delete this item?')) {
            // For now, just remove from list (full delete can be added later)
            await loadTrashContents();
            updateTrashCount();
        }
    };
    
    async function updateTrashCount() {
        const result = await window.electronAPI.trashList();
        if (result.success) {
            const count = result.files.length;
            if (count > 0 && trashCount) {
                trashCount.textContent = count;
                trashCount.style.display = 'block';
            } else if (trashCount) {
                trashCount.style.display = 'none';
            }
        }
    }
    
    // Update count on load
    updateTrashCount();
}

// Screen Lock - Simple lock/unlock without password
function setupScreenLock() {
    const lockScreen = document.getElementById('lockScreen');
    const lockScreenBtn = document.getElementById('lockScreenBtn');
    const unlockBtn = document.getElementById('unlockBtn');
    
    if (!lockScreen || !window.electronAPI) return;
    
    // Lock screen button
    if (lockScreenBtn) {
        lockScreenBtn.addEventListener('click', async () => {
            await window.electronAPI.screenLock();
            lockScreen.style.display = 'flex';
        });
    }
    
    // Listen for lock event
    window.electronAPI.onScreenLocked(() => {
        lockScreen.style.display = 'flex';
    });
    
    // Unlock button - simple click to unlock
    if (unlockBtn) {
        unlockBtn.addEventListener('click', () => {
            lockScreen.style.display = 'none';
        });
    }
    
    // Also allow any key press to unlock
    document.addEventListener('keydown', (e) => {
        if (lockScreen.style.display === 'flex') {
            lockScreen.style.display = 'none';
        }
    });
}

// System Tray Toggle
function setupSystemTray() {
    const trayToggle = document.getElementById('trayToggle');
    const systemTray = document.getElementById('systemTray');
    
    if (trayToggle && systemTray) {
        trayToggle.addEventListener('click', () => {
            systemTray.classList.toggle('expanded');
            trayToggle.classList.toggle('expanded');
        });
    }
}

// Volume/Brightness Controls
function setupVolumeBrightnessControls() {
    const volumeControl = document.getElementById('volumeControl');
    const brightnessControl = document.getElementById('brightnessControl');
    const volumeSlider = document.getElementById('volumeSlider');
    const brightnessSlider = document.getElementById('brightnessSlider');
    const volumeValue = document.getElementById('volumeValue');
    const brightnessValue = document.getElementById('brightnessValue');
    
    if (!window.electronAPI) return;
    
    // Volume Control
    if (volumeSlider && volumeValue && volumeControl) {
        // Load current volume
        window.electronAPI.getVolume().then(result => {
            if (result.success) {
                volumeSlider.value = result.volume;
                volumeValue.textContent = result.volume + '%';
            }
        }).catch(() => {
            // Fallback if not supported
            volumeSlider.value = 50;
            volumeValue.textContent = '50%';
        });
        
        // Keep popup open when interacting with slider
        const volumePopup = document.getElementById('volumeSliderPopup');
        
        volumeControl.addEventListener('mouseenter', () => {
            if (volumePopup) volumePopup.style.display = 'flex';
        });
        
        volumeControl.addEventListener('mouseleave', (e) => {
            // Only hide if not moving to popup
            if (!volumePopup.contains(e.relatedTarget)) {
                setTimeout(() => {
                    if (!volumeControl.matches(':hover') && !volumePopup.matches(':hover')) {
                        volumePopup.style.display = 'none';
                    }
                }, 100);
            }
        });
        
        if (volumePopup) {
            volumePopup.addEventListener('mouseenter', () => {
                volumePopup.style.display = 'flex';
            });
            
            volumePopup.addEventListener('mouseleave', () => {
                setTimeout(() => {
                    if (!volumeControl.matches(':hover')) {
                        volumePopup.style.display = 'none';
                    }
                }, 100);
            });
        }
        
        volumeSlider.addEventListener('input', async (e) => {
            e.stopPropagation();
            const volume = parseInt(e.target.value);
            volumeValue.textContent = volume + '%';
            await window.electronAPI.setVolume(volume).catch(() => {
                // Ignore errors if not supported
            });
        });
        
        volumeSlider.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            if (volumePopup) volumePopup.style.display = 'flex';
        });
        
        volumeSlider.addEventListener('mouseup', (e) => {
            e.stopPropagation();
        });
    }
    
    // Brightness Control
    if (brightnessSlider && brightnessValue && brightnessControl) {
        // Load current brightness
        window.electronAPI.getBrightness().then(result => {
            if (result.success) {
                brightnessSlider.value = result.brightness;
                brightnessValue.textContent = result.brightness + '%';
            }
        }).catch(() => {
            // Fallback if not supported
            brightnessSlider.value = 100;
            brightnessValue.textContent = '100%';
        });
        
        // Keep popup open when interacting with slider
        const brightnessPopup = document.getElementById('brightnessSliderPopup');
        
        brightnessControl.addEventListener('mouseenter', () => {
            if (brightnessPopup) brightnessPopup.style.display = 'flex';
        });
        
        brightnessControl.addEventListener('mouseleave', (e) => {
            // Only hide if not moving to popup
            if (!brightnessPopup.contains(e.relatedTarget)) {
                setTimeout(() => {
                    if (!brightnessControl.matches(':hover') && !brightnessPopup.matches(':hover')) {
                        brightnessPopup.style.display = 'none';
                    }
                }, 100);
            }
        });
        
        if (brightnessPopup) {
            brightnessPopup.addEventListener('mouseenter', () => {
                brightnessPopup.style.display = 'flex';
            });
            
            brightnessPopup.addEventListener('mouseleave', () => {
                setTimeout(() => {
                    if (!brightnessControl.matches(':hover')) {
                        brightnessPopup.style.display = 'none';
                    }
                }, 100);
            });
        }
        
        brightnessSlider.addEventListener('input', async (e) => {
            e.stopPropagation();
            const brightness = parseInt(e.target.value);
            brightnessValue.textContent = brightness + '%';
            await window.electronAPI.setBrightness(brightness).catch(() => {
                // Ignore errors if not supported
            });
        });
        
        brightnessSlider.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            if (brightnessPopup) brightnessPopup.style.display = 'flex';
        });
        
        brightnessSlider.addEventListener('mouseup', (e) => {
            e.stopPropagation();
        });
    }
}

// Desktop Folders
function setupDesktopFolders() {
    // Right-click on desktop to create folder
    const desktopBackground = document.querySelector('.desktop-background');
    
    if (desktopBackground) {
        desktopBackground.addEventListener('contextmenu', async (e) => {
            e.preventDefault();
            
            // Show context menu with "New Folder" option
            const folderName = prompt('Enter folder name:', 'New Folder');
            if (folderName && folderName.trim() && window.electronAPI) {
                const result = await window.electronAPI.desktopCreateFolder(folderName.trim());
                if (result.success) {
                    // Create desktop icon for folder
                    createDesktopFolderIcon(folderName.trim(), result.path);
                } else {
                    alert('Failed to create folder: ' + result.error);
                }
            }
        });
    }
    
    // Load existing desktop folders
    loadDesktopItems();
}

function createDesktopFolderIcon(name, folderPath) {
    const desktopIcons = document.querySelector('.desktop-icons');
    if (!desktopIcons) return;
    
    // Check if icon already exists
    const existing = document.querySelector(`.desktop-icon[data-folder="${name}"]`);
    if (existing) return;
    
    const icon = document.createElement('div');
    icon.className = 'desktop-icon desktop-folder-icon';
    icon.dataset.folder = name;
    icon.dataset.path = folderPath;
    
    icon.innerHTML = `
        <div class="icon-image">📁</div>
        <div class="icon-label">${name}</div>
    `;
    
    // Double-click to open folder
    icon.addEventListener('dblclick', () => {
        // Open folder in file manager
        if (window.electronAPI) {
            window.electronAPI.launchApp('filemanager', { folderPath: folderPath });
        }
    });
    
    desktopIcons.appendChild(icon);
    
    // Make it draggable like other icons
    setupIconDrag(icon);
}

async function loadDesktopItems() {
    if (!window.electronAPI) return;
    
    try {
        const result = await window.electronAPI.desktopListItems();
        if (result.success) {
            result.items.forEach(item => {
                if (item.isDirectory) {
                    createDesktopFolderIcon(item.name, item.path);
                }
            });
        }
    } catch (error) {
        console.error('Error loading desktop items:', error);
    }
}

function setupIconDrag(icon) {
    // Reuse existing drag logic from setupDesktopIcons
    // This will be handled by the existing drag system
}

// File Preview
function setupFilePreview() {
    // Hover preview for files on desktop
    document.addEventListener('mouseover', (e) => {
        const fileIcon = e.target.closest('.desktop-icon[data-file]');
        if (fileIcon) {
            const filePath = fileIcon.dataset.file;
            showFilePreview(fileIcon, filePath);
        }
    });
    
    document.addEventListener('mouseout', (e) => {
        const fileIcon = e.target.closest('.desktop-icon[data-file]');
        if (fileIcon) {
            hideFilePreview();
        }
    });
}

let previewTimeout = null;
let currentPreview = null;

function showFilePreview(icon, filePath) {
    clearTimeout(previewTimeout);
    
    previewTimeout = setTimeout(async () => {
        // Remove existing preview
        if (currentPreview) {
            currentPreview.remove();
        }
        
        const rect = icon.getBoundingClientRect();
        const preview = document.createElement('div');
        preview.className = 'file-preview';
        preview.style.position = 'fixed';
        preview.style.left = (rect.right + 10) + 'px';
        preview.style.top = rect.top + 'px';
        preview.style.zIndex = '10000';
        preview.style.background = 'rgba(0, 0, 0, 0.9)';
        preview.style.color = 'white';
        preview.style.padding = '12px';
        preview.style.borderRadius = '8px';
        preview.style.maxWidth = '300px';
        preview.style.fontSize = '12px';
        
        // Get file info
        const fileName = filePath.split(/[/\\]/).pop();
        const ext = fileName.includes('.') ? '.' + fileName.split('.').pop().toLowerCase() : '';
        
        let previewContent = `<div style="font-weight: 600; margin-bottom: 8px;">${fileName}</div>`;
        
        // Show preview based on file type
        if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) {
            previewContent += `<img src="file://${filePath}" style="max-width: 280px; max-height: 200px; border-radius: 4px;">`;
        } else if (['.txt', '.md'].includes(ext)) {
            try {
                const content = await window.electronAPI.readFile(filePath);
                previewContent += `<div style="max-height: 200px; overflow: auto; white-space: pre-wrap; font-family: monospace;">${content.substring(0, 500)}</div>`;
            } catch (e) {
                previewContent += '<div>Preview not available</div>';
            }
        } else {
            previewContent += `<div>File: ${ext || 'No extension'}</div>`;
        }
        
        preview.innerHTML = previewContent;
        document.body.appendChild(preview);
        currentPreview = preview;
    }, 500); // Show after 500ms hover
}

function hideFilePreview() {
    clearTimeout(previewTimeout);
    if (currentPreview) {
        currentPreview.remove();
        currentPreview = null;
    }
}


// Window Snapping
function setupWindowSnapping() {
    // Window snapping is handled in main.js via window move events
    // This function can be used for visual feedback if needed
}

// Multiple Desktops Implementation
let currentDesktop = 0;
const desktops = [0]; // Start with one desktop
let desktopSwitcherVisible = false;

function setupMultipleDesktops() {
    // Desktop switching with Ctrl+Alt+Left/Right or Win+Tab
    document.addEventListener('keydown', async (e) => {
        if ((e.ctrlKey && e.altKey) || (e.metaKey && e.key === 'Tab')) {
            if (e.key === 'ArrowLeft' || (e.metaKey && !e.shiftKey)) {
                e.preventDefault();
                await switchDesktop(currentDesktop - 1);
            } else if (e.key === 'ArrowRight' || (e.metaKey && e.shiftKey)) {
                e.preventDefault();
                await switchDesktop(currentDesktop + 1);
            }
        }
        
        // Show desktop switcher with Win+Tab
        if (e.metaKey && e.key === 'Tab' && !e.repeat) {
            e.preventDefault();
            showDesktopSwitcher();
        }
    });
    
    // Hide desktop switcher on release
    document.addEventListener('keyup', (e) => {
        if (e.key === 'Meta' || e.key === 'Tab') {
            hideDesktopSwitcher();
        }
    });
}

async function switchDesktop(index) {
    if (index < 0) index = 0;
    
    if (!window.electronAPI) return;
    
    // Create new desktop if needed
    if (index >= desktops.length) {
        const result = await window.electronAPI.desktopCreate();
        if (result.success) {
            desktops.push(result.desktopIndex);
        } else {
            return;
        }
    }
    
    // Switch desktop
    const result = await window.electronAPI.desktopSwitch(index);
    if (result.success) {
        currentDesktop = index;
        updateDesktopIndicator();
    }
}

function showDesktopSwitcher() {
    desktopSwitcherVisible = true;
    // Show desktop switcher UI
    // Implementation for visual desktop switcher
}

function hideDesktopSwitcher() {
    desktopSwitcherVisible = false;
    // Hide desktop switcher UI
}

function updateDesktopIndicator() {
    // Desktop indicator removed - replaced with AI Assistant button
}

// AI Assistant Implementation
function setupAIAssistant() {
    const aiBtn = document.getElementById('aiAssistantBtn');
    const aiModal = document.getElementById('aiAssistantModal');
    const aiContainer = document.getElementById('aiAssistantContainer');
    const aiHeader = document.getElementById('aiAssistantHeader');
    const aiClose = document.getElementById('aiAssistantClose');
    const aiMinimize = document.getElementById('aiAssistantMinimize');
    const aiInput = document.getElementById('aiAssistantInput');
    const aiSend = document.getElementById('aiAssistantSend');
    const aiImage = document.getElementById('aiAssistantImage');
    const aiMessages = document.getElementById('aiAssistantMessages');

    if (!aiBtn || !aiModal || !aiContainer) return;

    // Load saved position and size
    loadAIAssistantState();

    // Open modal
    aiBtn.addEventListener('click', () => {
        if (aiContainer.classList.contains('minimized')) {
            // Restore if minimized
            aiContainer.classList.remove('minimized');
            restoreAIAssistantState();
        }
        aiModal.classList.add('active');
        aiInput.focus();
    });

    // Close modal
    aiClose.addEventListener('click', (e) => {
        e.stopPropagation();
        aiModal.classList.remove('active');
        saveAIAssistantState();
    });

    // Minimize
    aiMinimize.addEventListener('click', (e) => {
        e.stopPropagation();
        const isMinimized = aiContainer.classList.contains('minimized');
        if (isMinimized) {
            // Restore
            aiContainer.classList.remove('minimized');
            restoreAIAssistantState();
        } else {
            // Minimize - collapse to header only
            aiContainer.classList.add('minimized');
            // Save current size before minimizing
            const currentState = {
                width: aiContainer.offsetWidth,
                height: aiContainer.offsetHeight,
                minimized: false
            };
            localStorage.setItem('aiAssistantStateBeforeMinimize', JSON.stringify(currentState));
        }
        saveAIAssistantState();
    });

    // Close on background click
    aiModal.addEventListener('click', (e) => {
        if (e.target === aiModal) {
            aiModal.classList.remove('active');
            saveAIAssistantState();
        }
    });

    // Prevent clicks inside container from closing
    aiContainer.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    // Dragging
    let isDragging = false;
    let dragOffset = { x: 0, y: 0 };

    aiHeader.addEventListener('mousedown', (e) => {
        // Don't start drag on button clicks
        if (e.target.closest('.ai-window-btn')) return;
        
        isDragging = true;
        const rect = aiContainer.getBoundingClientRect();
        dragOffset.x = e.clientX - rect.left;
        dragOffset.y = e.clientY - rect.top;
        aiContainer.style.cursor = 'grabbing';
        e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        
        const modal = aiModal.getBoundingClientRect();
        const containerWidth = aiContainer.offsetWidth;
        const containerHeight = aiContainer.offsetHeight;
        
        let newX = e.clientX - dragOffset.x;
        let newY = e.clientY - dragOffset.y;
        
        // Constrain to viewport
        newX = Math.max(0, Math.min(newX, modal.width - containerWidth));
        newY = Math.max(0, Math.min(newY, modal.height - containerHeight));
        
        aiContainer.style.left = newX + 'px';
        aiContainer.style.top = newY + 'px';
        aiContainer.style.transform = 'none';
    });

    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            aiContainer.style.cursor = 'default';
            saveAIAssistantState();
        }
    });

    // Resize handle (using CSS resize, but we'll add visual feedback)
    let isResizing = false;
    const resizeObserver = new ResizeObserver(() => {
        if (!isResizing) {
            saveAIAssistantState();
        }
    });
    resizeObserver.observe(aiContainer);

    // Send message
    const sendMessage = async () => {
        const message = aiInput.value.trim();
        if (!message) return;

        // Add user message
        addUserMessage(message);
        aiInput.value = '';

        // Show typing indicator
        const typingId = addTypingIndicator();

        // Get AI response
        try {
            const response = await getAIResponse(message);
            removeTypingIndicator(typingId);
            addAIMessage(response);
        } catch (error) {
            removeTypingIndicator(typingId);
            addAIMessage('Sorry, I encountered an error. Please try again.');
            console.error('AI Assistant error:', error);
        }
    };

    aiSend.addEventListener('click', sendMessage);
    aiInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

    // Image generation
    if (aiImage) {
        aiImage.addEventListener('click', async () => {
            const prompt = aiInput.value.trim();
            if (!prompt) {
                addAIMessage('Please enter a description of the image you want to generate.');
                return;
            }

            // Add user message
            addUserMessage(`Generate image: ${prompt}`);
            aiInput.value = '';

            // Show typing indicator
            const typingId = addTypingIndicator();

            try {
                // Check if SD is ready
                if (!window.electronAPI) {
                    throw new Error('Electron API not available');
                }

                const check = await window.electronAPI.sdCheckReady();
                if (!check.available) {
                    removeTypingIndicator(typingId);
                    addAIMessage('Stable Diffusion is not running. Please install Automatic1111 WebUI and ensure it is running on port 7860.');
                    return;
                }

                removeTypingIndicator(typingId);
                addAIMessage('Generating image... This may take 30-60 seconds.');

                // Generate image
                const result = await window.electronAPI.sdGenerateImage(
                    prompt,
                    '', // negative prompt
                    1024, // width (SDXL default)
                    1024, // height (SDXL default)
                    30, // steps
                    7, // cfg scale
                    -1 // random seed
                );

                if (result.success && result.image) {
                    // Display the generated image
                    const imageHtml = `
                        <div class="ai-generated-image">
                            <img src="data:image/png;base64,${result.image}" alt="Generated image" style="max-width: 100%; border-radius: 8px; margin-top: 8px;">
                            <p style="margin-top: 8px; font-size: 12px; color: rgba(255, 255, 255, 0.6);">Image generated successfully!</p>
                        </div>
                    `;
                    addAIMessage(imageHtml, true);
                } else {
                    addAIMessage(`Failed to generate image: ${result.error || 'Unknown error'}`);
                }
            } catch (error) {
                removeTypingIndicator(typingId);
                addAIMessage(`Error generating image: ${error.message}`);
                console.error('Image generation error:', error);
            }
        });
    }
}

// Save AI Assistant state (position, size, minimized)
function saveAIAssistantState() {
    try {
        const container = document.getElementById('aiAssistantContainer');
        const modal = document.getElementById('aiAssistantModal');
        if (!container || !modal) return;
        
        const rect = container.getBoundingClientRect();
        const modalRect = modal.getBoundingClientRect();
        
        const state = {
            x: rect.left - modalRect.left,
            y: rect.top - modalRect.top,
            width: container.offsetWidth,
            height: container.offsetHeight,
            minimized: container.classList.contains('minimized')
        };
        
        localStorage.setItem('aiAssistantState', JSON.stringify(state));
    } catch (error) {
        console.error('Error saving AI Assistant state:', error);
    }
}

// Load AI Assistant state
function loadAIAssistantState() {
    try {
        const container = document.getElementById('aiAssistantContainer');
        if (!container) return;
        
        const saved = localStorage.getItem('aiAssistantState');
        if (saved) {
            const state = JSON.parse(saved);
            
            if (state.x !== undefined && state.y !== undefined) {
                container.style.left = state.x + 'px';
                container.style.top = state.y + 'px';
                container.style.transform = 'none';
            }
            
            if (state.width) container.style.width = state.width + 'px';
            if (state.height) container.style.height = state.height + 'px';
            if (state.minimized) container.classList.add('minimized');
        }
    } catch (error) {
        console.error('Error loading AI Assistant state:', error);
    }
}

// Restore AI Assistant state (when un-minimizing)
function restoreAIAssistantState() {
    try {
        const container = document.getElementById('aiAssistantContainer');
        if (!container) return;
        
        // First try to restore from before minimize
        const beforeMinimize = localStorage.getItem('aiAssistantStateBeforeMinimize');
        if (beforeMinimize) {
            const state = JSON.parse(beforeMinimize);
            if (state.width) container.style.width = state.width + 'px';
            if (state.height) container.style.height = state.height + 'px';
            localStorage.removeItem('aiAssistantStateBeforeMinimize');
            return;
        }
        
        // Fallback to saved state
        const saved = localStorage.getItem('aiAssistantState');
        if (saved) {
            const state = JSON.parse(saved);
            if (state.width) container.style.width = state.width + 'px';
            if (state.height && !state.minimized) {
                container.style.height = state.height + 'px';
            }
        }
    } catch (error) {
        console.error('Error restoring AI Assistant state:', error);
    }
}

function addUserMessage(text) {
    const messages = document.getElementById('aiAssistantMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'user-message';
    messageDiv.innerHTML = `
        <div class="user-avatar">Ω</div>
        <div class="user-text">${escapeHtml(text)}</div>
    `;
    messages.appendChild(messageDiv);
    messages.scrollTop = messages.scrollHeight;
}

function addAIMessage(text, isHtml = false) {
    const messages = document.getElementById('aiAssistantMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'ai-message';
    messageDiv.innerHTML = `
        <div class="ai-avatar">Ω</div>
        <div class="ai-text">${isHtml ? text : formatMessage(text)}</div>
    `;
    messages.appendChild(messageDiv);
    messages.scrollTop = messages.scrollHeight;
}

function addTypingIndicator() {
    const messages = document.getElementById('aiAssistantMessages');
    const typingDiv = document.createElement('div');
    typingDiv.className = 'ai-message';
    typingDiv.id = 'typing-indicator';
    typingDiv.innerHTML = `
        <div class="ai-avatar">Ω</div>
        <div class="ai-text">
            <span style="opacity: 0.6;">Thinking...</span>
        </div>
    `;
    messages.appendChild(typingDiv);
    messages.scrollTop = messages.scrollHeight;
    return 'typing-indicator';
}

function removeTypingIndicator(id) {
    const typing = document.getElementById(id);
    if (typing) typing.remove();
}

function formatMessage(text) {
    // Convert markdown-like formatting to HTML
    text = escapeHtml(text);
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
    text = text.replace(/`(.*?)`/g, '<code style="background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px; font-family: monospace;">$1</code>');
    text = text.replace(/\n/g, '<br>');
    return text;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

async function getAIResponse(userMessage) {
    // Check if Electron API is available
    if (!window.electronAPI) {
        return getLocalResponse(userMessage);
    }

    try {
        // Build a comprehensive prompt about Omega OS
        const systemPrompt = `You are an AI assistant for Omega OS, a comprehensive desktop operating system. You know everything about Omega OS features and capabilities. Be conversational, helpful, and friendly.

Omega OS Features:
- Applications: Browser, Wallet (Solana & EVM), Terminal, Omega Sheets, Omega Slides, Omega Docs, Password Manager, AI Dev (now called Omega Create), Firewall, VPN
- File Management: Documents folder, Trash/Recycle Bin, Desktop folders
- Security: VPN with kill switch, Firewall, Ad Blocker, Cookie Manager, Screen Lock
- System: Multiple desktops, Window snapping, Volume/Brightness controls, Crypto price widget
- Shortcuts: Win+Tab (desktop switcher), Ctrl+Alt+Arrow (switch desktop), Window snapping
- Customization: Desktop backgrounds, themes, taskbar customization

Answer the user's question about Omega OS in a helpful, conversational way. If you don't know something specific, suggest where they might find it or how to explore it.`;

        const fullPrompt = `${systemPrompt}\n\nUser Question: ${userMessage}\n\nProvide a helpful, conversational response:`;

        const response = await window.electronAPI.aiChat(fullPrompt, []);
        
        if (response.success) {
            return response.response;
        } else {
            return getLocalResponse(userMessage);
        }
    } catch (error) {
        console.error('AI API error:', error);
        return getLocalResponse(userMessage);
    }
}

function getLocalResponse(message) {
    const lowerMessage = message.toLowerCase();
    
    // Check if this is a feedback/report about AI issues
    if (lowerMessage.includes('report') || lowerMessage.includes('issue') || lowerMessage.includes('problem') || 
        lowerMessage.includes('fix') || lowerMessage.includes('bug') || lowerMessage.includes('feedback')) {
        return handleAIFeedback(message);
    }
    
    // Feature knowledge base
    const responses = {
        'browser': 'Omega Browser is a secure web browser with built-in VPN, ad blocker, and privacy features. You can find it in the start menu or on the desktop.',
        'wallet': 'Omega Wallet supports both Solana and EVM chains. You can send/receive crypto, view balances, and connect to dApps. Open it from the start menu.',
        'terminal': 'The Terminal app lets you run commands and scripts. It\'s perfect for developers and power users.',
        'vpn': 'VPN is available in the top-right corner. Click the VPN badge to connect, choose a location, and enable the kill switch for extra security.',
        'firewall': 'The Firewall app monitors and controls network traffic. You can set rules to allow or block specific connections.',
        'desktop': 'You can create multiple desktops with Win+Tab or Ctrl+Alt+Arrow keys. Each desktop can have different windows open.',
        'shortcut': 'Common shortcuts: Win+Tab (desktop switcher), Ctrl+Alt+Arrow (switch desktop), Window snapping with drag to edges.',
        'file': 'Files are stored in the Documents folder. You can create desktop folders by right-clicking the desktop. Deleted files go to Trash.',
        'security': 'Omega OS has VPN, Firewall, Ad Blocker, Cookie Manager, and Screen Lock. Check the top-right for VPN status.',
        'crypto': 'Crypto prices (BTC, ETH, SOL) are shown in the taskbar. Click the widget to customize which coins to display.',
        'help': 'I can help you with any Omega OS feature! Try asking about: Browser, Wallet, VPN, Firewall, File Management, Shortcuts, Security, or Customization. You can also report issues with AI in Word, Sheets, or Slides by saying "report issue" or "fix AI".',
    };

    // Find matching response
    for (const [key, response] of Object.entries(responses)) {
        if (lowerMessage.includes(key)) {
            return response;
        }
    }

    // Default response
    return `I'd be happy to help with that! Omega OS has many features including Browser, Wallet, VPN, Firewall, Terminal, and more. Could you be more specific about what you'd like to know? For example, you could ask about:
- How to use the Browser
- Setting up the Wallet
- Connecting to VPN
- Managing files
- Keyboard shortcuts
- Security features

You can also report issues with AI features in Word, Sheets, or Slides by saying "report issue with [app] AI" or "fix AI in [app]".`;
}

// AI Feedback and Improvement System
function handleAIFeedback(message) {
    const lowerMessage = message.toLowerCase();
    
    // Detect which app the issue is about
    let appName = null;
    if (lowerMessage.includes('word')) appName = 'word';
    else if (lowerMessage.includes('sheet')) appName = 'sheets';
    else if (lowerMessage.includes('slide')) appName = 'slides';
    
    // Store the feedback
    storeAIFeedback(appName, message);
    
    // Try to analyze and fix the issue
    analyzeAndFixAIIssue(appName, message).then(fix => {
        if (fix) {
            // Show fix notification
            showAIFixNotification(appName, fix);
        }
    });
    
    if (appName) {
        return `Thank you for reporting the issue with ${appName} AI! I've recorded your feedback and will analyze it to improve the AI agent. The fix will be applied automatically. You can continue using the app - the improvements will take effect on the next AI request.`;
    } else {
        return `I'd be happy to help fix AI issues! Please specify which app (Word, Sheets, or Slides) and describe the problem. For example: "Fix AI in Word - it's not improving text correctly" or "Report issue with Sheets AI - formulas are wrong".`;
    }
}

function storeAIFeedback(appName, message) {
    try {
        const feedbacks = JSON.parse(localStorage.getItem('aiFeedback') || '[]');
        feedbacks.push({
            app: appName,
            message: message,
            timestamp: Date.now()
        });
        // Keep only last 100 feedbacks
        if (feedbacks.length > 100) {
            feedbacks.shift();
        }
        localStorage.setItem('aiFeedback', JSON.stringify(feedbacks));
    } catch (error) {
        console.error('Error storing AI feedback:', error);
    }
}

async function analyzeAndFixAIIssue(appName, issueMessage) {
    if (!appName || !window.electronAPI) return null;
    
    try {
        // Get existing feedbacks for context
        const feedbacks = JSON.parse(localStorage.getItem('aiFeedback') || '[]');
        const appFeedbacks = feedbacks.filter(f => f.app === appName).slice(-5);
        
        // Build analysis prompt
        const analysisPrompt = `You are analyzing issues with the AI agent in ${appName} application. 

Current Issue: ${issueMessage}

Previous Issues (for context):
${appFeedbacks.map(f => `- ${f.message}`).join('\n')}

Your task:
1. Identify the root cause of the issue
2. Generate an improved prompt template that will fix this issue
3. Provide specific instructions for the AI agent

For ${appName}:
${appName === 'word' ? '- This AI improves, rewrites, expands, or summarizes text\n- Current prompt: "Improve the following text..."\n- Issues might be: not following style, losing meaning, too verbose, etc.' : ''}
${appName === 'sheets' ? '- This AI suggests Excel/Sheets formulas\n- Current prompt: "Given the user\'s request, suggest a formula..."\n- Issues might be: wrong formulas, not understanding context, missing edge cases, etc.' : ''}
${appName === 'slides' ? '- This AI helps with presentation content\n- Issues might be: wrong formatting, poor content quality, etc.' : ''}

Respond in this format:
FIX_PROMPT: [the improved prompt template]
INSTRUCTIONS: [specific instructions for the AI agent]
REASON: [why this fix addresses the issue]`;

        const response = await window.electronAPI.aiChat(analysisPrompt, []);
        
        if (response.success) {
            const fix = parseAIFix(response.response, appName);
            if (fix) {
                saveAIFix(appName, fix);
                return fix;
            }
        }
    } catch (error) {
        console.error('Error analyzing AI issue:', error);
    }
    
    return null;
}

function parseAIFix(response, appName) {
    try {
        const fixPromptMatch = response.match(/FIX_PROMPT:\s*(.+?)(?=INSTRUCTIONS:|$)/s);
        const instructionsMatch = response.match(/INSTRUCTIONS:\s*(.+?)(?=REASON:|$)/s);
        const reasonMatch = response.match(/REASON:\s*(.+?)$/s);
        
        if (fixPromptMatch) {
            return {
                prompt: fixPromptMatch[1].trim(),
                instructions: instructionsMatch ? instructionsMatch[1].trim() : '',
                reason: reasonMatch ? reasonMatch[1].trim() : '',
                timestamp: Date.now()
            };
        }
    } catch (error) {
        console.error('Error parsing AI fix:', error);
    }
    
    return null;
}

function saveAIFix(appName, fix) {
    try {
        const fixes = JSON.parse(localStorage.getItem('aiFixes') || '{}');
        fixes[appName] = fix;
        localStorage.setItem('aiFixes', JSON.stringify(fixes));
        
        // Notify main process to update AI service
        if (window.electronAPI && window.electronAPI.updateAIConfig) {
            window.electronAPI.updateAIConfig(appName, fix);
        }
    } catch (error) {
        console.error('Error saving AI fix:', error);
    }
}

function showAIFixNotification(appName, fix) {
    // Add a message to the chat showing the fix was applied
    const messages = document.getElementById('aiAssistantMessages');
    if (messages) {
        const notificationDiv = document.createElement('div');
        notificationDiv.className = 'ai-message';
        notificationDiv.innerHTML = `
            <div class="ai-avatar">✓</div>
            <div class="ai-text">
                <p><strong>AI Fix Applied for ${appName.charAt(0).toUpperCase() + appName.slice(1)}!</strong></p>
                <p>${fix.reason || 'The AI agent has been updated based on your feedback.'}</p>
                <p style="font-size: 12px; opacity: 0.7; margin-top: 8px;">The improvements will take effect on the next AI request in ${appName}.</p>
            </div>
        `;
        messages.appendChild(notificationDiv);
        messages.scrollTop = messages.scrollHeight;
    }
}

