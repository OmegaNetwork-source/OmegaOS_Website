// Omega Password Manager
// Note: In sandboxed environment, crypto-js needs to be loaded differently
// Using browser-compatible crypto API
let CryptoJS;
try {
    // Try to use crypto-js if available in renderer
    CryptoJS = require('crypto-js');
} catch (e) {
    // Fallback: Use Web Crypto API (available in browser context)
    CryptoJS = {
        SHA256: (text) => {
            // Use Web Crypto API for hashing
            return {
                toString: async () => {
                    const encoder = new TextEncoder();
                    const data = encoder.encode(text);
                    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
                    const hashArray = Array.from(new Uint8Array(hashBuffer));
                    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
                }
            };
        },
        AES: {
            encrypt: (text, key) => {
                // Simple encryption using Web Crypto API
                return {
                    toString: () => btoa(text + '|' + key) // Base64 encoding (simple, not secure - needs proper implementation)
                };
            },
            decrypt: (encrypted, key) => {
                return {
                    toString: (encoding) => {
                        try {
                            const decrypted = atob(encrypted);
                            const parts = decrypted.split('|');
                            if (parts[1] === key) {
                                return parts[0];
                            }
                            return '';
                        } catch (e) {
                            return '';
                        }
                    }
                };
            }
        },
        enc: {
            Utf8: {}
        }
    };
}
let currentWindowId = null;
let masterPassword = null;
let passwords = [];
let selectedPassword = null;
let isUnlocked = false;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Get window ID
    if (window.electronAPI) {
        window.electronAPI.onWindowId((windowId) => {
            currentWindowId = windowId;
        });
    }

    // Window Controls
    setupWindowControls();
    
    // Load saved passwords
    loadPasswords();
    
    // Check if master password is set
    checkMasterPassword();
    
    // Setup event listeners
    setupEventListeners();
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

function checkMasterPassword() {
    const saved = localStorage.getItem('pm_master_password_hash');
    if (!saved) {
        // First time - need to setup master password
        document.getElementById('setupMasterPasswordBtn').addEventListener('click', setupMasterPassword);
    } else {
        // Show unlock modal
        showUnlockModal();
    }
}

async function setupMasterPassword() {
    const password = prompt('Create a master password (you will need this to unlock your passwords):');
    if (password && password.length >= 8) {
        const hash = await hashPassword(password);
        localStorage.setItem('pm_master_password_hash', hash);
        masterPassword = password;
        isUnlocked = true;
        showMainInterface();
    } else if (password) {
        alert('Master password must be at least 8 characters long');
    }
}

function showUnlockModal() {
    const modal = document.getElementById('masterPasswordModal');
    modal.classList.add('active');
    
    const input = document.getElementById('masterPasswordInput');
    const unlockBtn = document.getElementById('unlockBtn');
    
    const unlock = async () => {
        const password = input.value;
        const savedHash = localStorage.getItem('pm_master_password_hash');
        const inputHash = await hashPassword(password);
        
        if (inputHash === savedHash) {
            masterPassword = password;
            isUnlocked = true;
            modal.classList.remove('active');
            input.value = '';
            showMainInterface();
            await loadPasswords();
        } else {
            alert('Incorrect master password');
            input.value = '';
            input.focus();
        }
    };
    
    unlockBtn.onclick = unlock;
    input.onkeypress = async (e) => {
        if (e.key === 'Enter') await unlock();
    };
    
    input.focus();
}

function showMainInterface() {
    document.getElementById('welcomeScreen').style.display = 'none';
    document.getElementById('passwordDetail').style.display = 'none';
    document.getElementById('passwordForm').style.display = 'none';
    updatePasswordList();
}

function setupEventListeners() {
    document.getElementById('addPasswordBtn').addEventListener('click', () => {
        if (!isUnlocked) {
            showUnlockModal();
            return;
        }
        showPasswordForm();
    });

    document.getElementById('closeFormBtn').addEventListener('click', () => {
        hidePasswordForm();
    });

    document.getElementById('cancelBtn').addEventListener('click', () => {
        hidePasswordForm();
    });

    document.getElementById('passwordFormElement').addEventListener('submit', (e) => {
        e.preventDefault();
        savePassword();
    });

    document.getElementById('passwordToggle').addEventListener('click', () => {
        const input = document.getElementById('password');
        input.type = input.type === 'password' ? 'text' : 'password';
    });

    document.getElementById('generatePasswordBtn').addEventListener('click', generatePassword);
    document.getElementById('backBtn').addEventListener('click', () => {
        document.getElementById('passwordDetail').style.display = 'none';
        selectedPassword = null;
    });
    document.getElementById('editBtn').addEventListener('click', () => {
        if (selectedPassword) {
            showPasswordForm(selectedPassword);
        }
    });
    document.getElementById('deleteBtn').addEventListener('click', () => {
        if (selectedPassword && confirm('Delete this password entry?')) {
            deletePassword(selectedPassword.id);
        }
    });
}

function generatePassword() {
    const length = 16;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
        password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    document.getElementById('password').value = password;
    document.getElementById('password').type = 'text';
}

async function encrypt(text) {
    if (window.electronAPI && window.electronAPI.encryptData) {
        return await window.electronAPI.encryptData(text, masterPassword);
    }
    // Fallback: Use Web Crypto API
    return await webEncrypt(text, masterPassword);
}

async function decrypt(encrypted) {
    if (window.electronAPI && window.electronAPI.decryptData) {
        return await window.electronAPI.decryptData(encrypted, masterPassword);
    }
    // Fallback: Use Web Crypto API
    return await webDecrypt(encrypted, masterPassword);
}

async function hashPassword(password) {
    if (window.electronAPI && window.electronAPI.hashPassword) {
        return await window.electronAPI.hashPassword(password);
    }
    // Fallback: Use Web Crypto API
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function webEncrypt(text, key) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(key),
        { name: 'PBKDF2' },
        false,
        ['deriveBits', 'deriveKey']
    );
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const derivedKey = await crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt: salt, iterations: 100000, hash: 'SHA-256' },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt']
    );
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv },
        derivedKey,
        data
    );
    const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(encrypted), salt.length + iv.length);
    return btoa(String.fromCharCode(...combined));
}

async function webDecrypt(encrypted, key) {
    try {
        const combined = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));
        const salt = combined.slice(0, 16);
        const iv = combined.slice(16, 28);
        const data = combined.slice(28);
        const encoder = new TextEncoder();
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            encoder.encode(key),
            { name: 'PBKDF2' },
            false,
            ['deriveBits', 'deriveKey']
        );
        const derivedKey = await crypto.subtle.deriveKey(
            { name: 'PBKDF2', salt: salt, iterations: 100000, hash: 'SHA-256' },
            keyMaterial,
            { name: 'AES-GCM', length: 256 },
            false,
            ['decrypt']
        );
        const decrypted = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: iv },
            derivedKey,
            data
        );
        return new TextDecoder().decode(decrypted);
    } catch (e) {
        console.error('Decryption failed:', e);
        return '';
    }
}

async function loadPasswords() {
    if (!isUnlocked) return;
    
    const encrypted = localStorage.getItem('pm_passwords');
    if (encrypted) {
        try {
            const decrypted = await decrypt(encrypted);
            passwords = JSON.parse(decrypted);
        } catch (e) {
            console.error('Failed to decrypt passwords:', e);
            passwords = [];
        }
    }
    updatePasswordList();
}

async function savePasswords() {
    if (!isUnlocked) return;
    const encrypted = await encrypt(JSON.stringify(passwords));
    localStorage.setItem('pm_passwords', encrypted);
    updatePasswordList();
}

function updatePasswordList() {
    const list = document.getElementById('passwordList');
    list.innerHTML = '';
    
    passwords.forEach(pwd => {
        const item = document.createElement('div');
        item.className = 'password-item';
        item.dataset.id = pwd.id;
        item.innerHTML = `
            <div class="password-item-name">${pwd.service}</div>
            <div class="password-item-user">${pwd.username}</div>
        `;
        item.addEventListener('click', () => {
            document.querySelectorAll('.password-item').forEach(i => i.classList.remove('selected'));
            item.classList.add('selected');
            showPasswordDetail(pwd);
        });
        list.appendChild(item);
    });
}

function showPasswordDetail(password) {
    selectedPassword = password;
    document.getElementById('passwordDetail').style.display = 'flex';
    document.getElementById('passwordForm').style.display = 'none';
    
    const body = document.getElementById('detailBody');
    body.innerHTML = `
        <div class="detail-item">
            <div class="detail-label">Service</div>
            <div class="detail-value">${password.service}</div>
        </div>
        <div class="detail-item">
            <div class="detail-label">Username</div>
            <div class="detail-value">${password.username}</div>
        </div>
        <div class="detail-item">
            <div class="detail-label">Password</div>
            <div class="detail-value">
                <div class="password-value">
                    <input type="password" class="password-display" id="detailPassword" value="${password.password}" readonly>
                    <button class="copy-btn" onclick="copyToClipboard('${password.password}')">Copy</button>
                    <button class="copy-btn" onclick="togglePasswordDisplay()">Show</button>
                </div>
            </div>
        </div>
        ${password.url ? `
        <div class="detail-item">
            <div class="detail-label">URL</div>
            <div class="detail-value"><a href="${password.url}" target="_blank">${password.url}</a></div>
        </div>
        ` : ''}
        ${password.notes ? `
        <div class="detail-item">
            <div class="detail-label">Notes</div>
            <div class="detail-value">${password.notes}</div>
        </div>
        ` : ''}
    `;
}

window.copyToClipboard = function(text) {
    navigator.clipboard.writeText(text).then(() => {
        alert('Password copied to clipboard');
    });
};

window.togglePasswordDisplay = function() {
    const input = document.getElementById('detailPassword');
    input.type = input.type === 'password' ? 'text' : 'password';
};

function showPasswordForm(password = null) {
    document.getElementById('passwordDetail').style.display = 'none';
    document.getElementById('passwordForm').style.display = 'flex';
    
    if (password) {
        document.getElementById('formTitle').textContent = 'Edit Password';
        document.getElementById('serviceName').value = password.service;
        document.getElementById('username').value = password.username;
        document.getElementById('password').value = password.password;
        document.getElementById('url').value = password.url || '';
        document.getElementById('notes').value = password.notes || '';
        selectedPassword = password;
    } else {
        document.getElementById('formTitle').textContent = 'Add New Password';
        document.getElementById('passwordFormElement').reset();
        selectedPassword = null;
    }
}

function hidePasswordForm() {
    document.getElementById('passwordForm').style.display = 'none';
}

async function savePassword() {
    if (!isUnlocked) {
        showUnlockModal();
        return;
    }
    
    const password = {
        id: selectedPassword ? selectedPassword.id : Date.now().toString(),
        service: document.getElementById('serviceName').value,
        username: document.getElementById('username').value,
        password: document.getElementById('password').value,
        url: document.getElementById('url').value,
        notes: document.getElementById('notes').value,
        createdAt: selectedPassword ? selectedPassword.createdAt : Date.now(),
        updatedAt: Date.now()
    };
    
    if (selectedPassword) {
        const index = passwords.findIndex(p => p.id === selectedPassword.id);
        if (index !== -1) {
            passwords[index] = password;
        }
    } else {
        passwords.push(password);
    }
    
    await savePasswords();
    hidePasswordForm();
    showPasswordDetail(password);
}

async function deletePassword(id) {
    passwords = passwords.filter(p => p.id !== id);
    await savePasswords();
    document.getElementById('passwordDetail').style.display = 'none';
    selectedPassword = null;
}
