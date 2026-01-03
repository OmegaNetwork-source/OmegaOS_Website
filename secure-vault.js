// Omega Secure Vault - Encrypted File Storage
let currentWindowId = null;
let isUnlocked = false;
let vaultPassword = null;
let currentPath = '';
let vaultFiles = [];

document.addEventListener('DOMContentLoaded', () => {
    if (window.electronAPI) {
        window.electronAPI.onWindowId((windowId) => {
            currentWindowId = windowId;
        });
    }

    setupWindowControls();
    setupEventListeners();
    checkVaultSetup();
});

function setupWindowControls() {
    document.getElementById('minimizeBtn').addEventListener('click', () => {
        if (currentWindowId && window.electronAPI) {
            window.electronAPI.appWindowMinimize(currentWindowId);
        }
    });
    document.getElementById('maximizeBtn').addEventListener('click', () => {
        if (currentWindowId && window.electronAPI) {
            window.electronAPI.appWindowMaximize(currentWindowId);
        }
    });
    document.getElementById('closeBtn').addEventListener('click', () => {
        if (currentWindowId && window.electronAPI) {
            window.electronAPI.appWindowClose(currentWindowId);
        }
    });
}

function setupEventListeners() {
    document.getElementById('unlockBtn').addEventListener('click', unlockVault);
    document.getElementById('vaultPassword').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') unlockVault();
    });
    
    const setupBtn = document.getElementById('setupVaultBtn');
    if (setupBtn) {
        setupBtn.addEventListener('click', setupVault);
        console.log('Setup vault button listener attached');
    } else {
        console.error('Setup vault button not found!');
    }
    
    document.getElementById('uploadFileBtn').addEventListener('click', () => {
        document.getElementById('fileUploadInput').click();
    });
    document.getElementById('fileUploadInput').addEventListener('change', handleFileUpload);
    document.getElementById('createFolderBtn').addEventListener('click', createFolder);
}

function checkVaultSetup() {
    const vaultHash = localStorage.getItem('vault_password_hash');
    const setupLink = document.getElementById('setupLink');
    if (setupLink) {
        if (!vaultHash) {
            setupLink.style.display = 'block';
        } else {
            setupLink.style.display = 'none';
        }
    }
}

async function setupVault(e) {
    e.preventDefault();
    e.stopPropagation();
    
    // Check if API is available
    if (!window.electronAPI || !window.electronAPI.hashPassword) {
        alert('Vault API not available. Please refresh the application.');
        console.error('electronAPI or hashPassword not available');
        return;
    }
    
    const password = prompt('Create a vault password (at least 8 characters):');
    if (!password) {
        return; // User cancelled
    }
    
    if (password.length < 8) {
        alert('Password must be at least 8 characters long');
        return;
    }
    
    try {
        const hash = await window.electronAPI.hashPassword(password);
        localStorage.setItem('vault_password_hash', hash);
        const setupLink = document.getElementById('setupLink');
        if (setupLink) {
            setupLink.style.display = 'none';
        }
        alert('Vault password created! You can now unlock the vault.');
    } catch (error) {
        console.error('Error setting up vault password:', error);
        alert('Failed to create vault password: ' + error.message);
    }
}

async function unlockVault() {
    const passwordInput = document.getElementById('vaultPassword');
    if (!passwordInput) {
        console.error('Vault password input not found');
        return;
    }
    
    const password = passwordInput.value;
    if (!password) {
        alert('Please enter a password');
        return;
    }

    const savedHash = localStorage.getItem('vault_password_hash');
    if (!savedHash) {
        alert('Please setup a vault password first');
        return;
    }

    if (!window.electronAPI || !window.electronAPI.hashPassword) {
        alert('Vault API not available. Please refresh the application.');
        console.error('electronAPI or hashPassword not available');
        return;
    }

    try {
        const inputHash = await window.electronAPI.hashPassword(password);
        if (inputHash === savedHash) {
            vaultPassword = password;
            isUnlocked = true;
            const lockScreen = document.getElementById('lockScreen');
            const vaultContent = document.getElementById('vaultContent');
            if (lockScreen) lockScreen.style.display = 'none';
            if (vaultContent) vaultContent.style.display = 'flex';
            await loadVaultFiles();
        } else {
            alert('Incorrect password');
            passwordInput.value = '';
        }
    } catch (error) {
        console.error('Error unlocking vault:', error);
        alert('Failed to unlock vault: ' + error.message);
    }
}

async function loadVaultFiles() {
    const encrypted = localStorage.getItem('vault_files');
    if (encrypted && window.electronAPI && window.electronAPI.decryptData && vaultPassword) {
        try {
            const decrypted = await window.electronAPI.decryptData(encrypted, vaultPassword);
            try {
                vaultFiles = JSON.parse(decrypted);
            } catch (e) {
                console.error('Failed to parse vault files:', e);
                vaultFiles = [];
            }
        } catch (error) {
            console.error('Failed to decrypt vault files:', error);
            vaultFiles = [];
        }
    } else {
        vaultFiles = [];
    }
    updateFileGrid();
    updateStats();
}

async function saveVaultFiles() {
    if (!isUnlocked || !vaultPassword) return;
    if (window.electronAPI && window.electronAPI.encryptData) {
        const encrypted = await window.electronAPI.encryptData(JSON.stringify(vaultFiles), vaultPassword);
        localStorage.setItem('vault_files', encrypted);
    }
}

async function handleFileUpload(e) {
    const files = Array.from(e.target.files);
    if (!isUnlocked || !vaultPassword) {
        alert('Please unlock the vault first');
        return;
    }

    for (const file of files) {
        const reader = new FileReader();
        reader.onload = async (event) => {
            const fileContent = event.target.result;
            const base64Content = typeof fileContent === 'string' 
                ? btoa(fileContent) 
                : btoa(String.fromCharCode(...new Uint8Array(fileContent)));
            
            if (window.electronAPI && window.electronAPI.encryptData) {
                const encrypted = await window.electronAPI.encryptData(base64Content, vaultPassword);
                vaultFiles.push({
                    id: Date.now() + Math.random(),
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    encrypted: encrypted,
                    path: currentPath,
                    date: Date.now()
                });
                await saveVaultFiles();
                updateFileGrid();
                updateStats();
            }
        };
        
        if (file.type.startsWith('text/')) {
            reader.readAsText(file);
        } else {
            reader.readAsArrayBuffer(file);
        }
    }
    
    e.target.value = '';
}

function createFolder() {
    if (!isUnlocked) {
        alert('Please unlock the vault first');
        return;
    }
    
    const name = prompt('Enter folder name:');
    if (name && name.trim()) {
        vaultFiles.push({
            id: Date.now(),
            name: name.trim(),
            type: 'folder',
            path: currentPath,
            date: Date.now()
        });
        saveVaultFiles();
        updateFileGrid();
        updateStats();
    }
}

function updateFileGrid() {
    const grid = document.getElementById('fileGrid');
    const emptyState = document.getElementById('emptyState');
    
    if (!grid || !emptyState) {
        console.error('File grid or empty state element not found');
        return;
    }
    
    const currentFiles = vaultFiles.filter(f => f.path === currentPath);
    
    if (currentFiles.length === 0) {
        grid.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
    }
    
    emptyState.classList.add('hidden');
    grid.innerHTML = currentFiles.map(file => {
        const icon = file.type === 'folder' ? '📁' : getFileIcon(file.name);
        return `
            <div class="file-item" data-id="${file.id}" data-type="${file.type}">
                <div class="file-icon">${icon}</div>
                <div class="file-name">${file.name}</div>
            </div>
        `;
    }).join('');
    
    document.querySelectorAll('.file-item').forEach(item => {
        item.addEventListener('click', () => {
            const id = item.dataset.id;
            const type = item.dataset.type;
            if (type === 'folder') {
                currentPath = id;
                updateBreadcrumb();
                updateFileGrid();
            } else {
                openFile(id);
            }
        });
    });
}

function getFileIcon(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const icons = {
        'pdf': '📄', 'doc': '📄', 'docx': '📄', 'txt': '📄',
        'jpg': '🖼️', 'jpeg': '🖼️', 'png': '🖼️', 'gif': '🖼️',
        'mp4': '🎬', 'avi': '🎬', 'mov': '🎬',
        'mp3': '🎵', 'wav': '🎵',
        'zip': '📦', 'rar': '📦'
    };
    return icons[ext] || '📄';
}

function updateBreadcrumb() {
    const breadcrumb = document.getElementById('breadcrumb');
    if (!breadcrumb) return;
    
    breadcrumb.innerHTML = '<span class="breadcrumb-item active" data-path="">Vault</span>';
    
    // Add click handler to breadcrumb
    breadcrumb.querySelector('.breadcrumb-item').addEventListener('click', () => {
        currentPath = '';
        updateBreadcrumb();
        updateFileGrid();
    });
}

function updateStats() {
    const files = vaultFiles.filter(f => f.type !== 'folder');
    const totalSize = files.reduce((sum, f) => sum + (f.size || 0), 0);
    document.getElementById('fileCount').textContent = files.length;
    document.getElementById('totalSize').textContent = formatSize(totalSize);
}

function formatSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

async function openFile(id) {
    const file = vaultFiles.find(f => f.id === id);
    if (!file || !file.encrypted || !window.electronAPI) return;
    
    try {
        const decryptedBase64 = await window.electronAPI.decryptData(file.encrypted, vaultPassword);
        const decrypted = atob(decryptedBase64);
        
        // Try to save and open file
        const result = await window.electronAPI.saveFileDialog({
            defaultPath: file.name,
            filters: [{ name: 'All Files', extensions: ['*'] }]
        });
        
        if (!result.canceled && result.filePath) {
            await window.electronAPI.writeFile(result.filePath, decrypted);
            alert('File decrypted and saved!');
        }
    } catch (error) {
        alert('Failed to decrypt file: ' + error.message);
    }
}

