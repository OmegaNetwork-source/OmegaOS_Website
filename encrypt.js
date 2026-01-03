// Omega Encrypt - File Encryption Tool
let currentWindowId = null;
let selectedFile = null;
let encryptedData = null;
let decryptedData = null;

document.addEventListener('DOMContentLoaded', () => {
    // Get window ID
    if (window.electronAPI) {
        window.electronAPI.onWindowId((windowId) => {
            currentWindowId = windowId;
        });
    }

    // Window Controls
    setupWindowControls();
    
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

function setupEventListeners() {
    // Tab switching
    document.getElementById('encryptTab').addEventListener('click', () => switchTab('encrypt'));
    document.getElementById('decryptTab').addEventListener('click', () => switchTab('decrypt'));

    // Encrypt panel
    document.getElementById('encryptBrowseBtn').addEventListener('click', async () => {
        await browseFile('encrypt');
    });
    // Remove drag/drop for security (must use isolated file dialog)
    document.getElementById('encryptRemoveBtn').addEventListener('click', () => removeFile('encrypt'));
    document.getElementById('encryptPassword').addEventListener('input', checkPasswordStrength);
    document.getElementById('encryptTogglePassword').addEventListener('click', () => togglePassword('encrypt'));
    document.getElementById('encryptBtn').addEventListener('click', encryptFile);
    document.getElementById('encryptSaveBtn').addEventListener('click', saveEncryptedFile);
    document.getElementById('encryptCopyBtn').addEventListener('click', copyEncryptedText);

    // Decrypt panel
    document.getElementById('decryptBrowseBtn').addEventListener('click', async () => {
        await browseFile('decrypt');
    });
    // Remove drag/drop for security (must use isolated file dialog)
    document.getElementById('decryptRemoveBtn').addEventListener('click', () => removeFile('decrypt'));
    document.getElementById('decryptTogglePassword').addEventListener('click', () => togglePassword('decrypt'));
    document.getElementById('decryptBtn').addEventListener('click', decryptFile);
    document.getElementById('decryptSaveBtn').addEventListener('click', saveDecryptedFile);
}

// Browse file using isolated file dialog
async function browseFile(type) {
    if (!window.electronAPI || !window.electronAPI.openFileDialog) {
        alert('File dialog not available. Please refresh the application.');
        return;
    }
    
    try {
        const result = await window.electronAPI.openFileDialog({
            filters: [{ name: 'All Files', extensions: ['*'] }]
        });
        
        if (!result.canceled && result.filePaths && result.filePaths.length > 0) {
            const filePath = result.filePaths[0];
            // Read file info using the file path
            await loadFileFromPath(filePath, type);
        }
    } catch (error) {
        console.error('Error browsing file:', error);
        alert('Failed to browse file: ' + error.message);
    }
}

// Load file from isolated file path
async function loadFileFromPath(filePath, type) {
    if (!window.electronAPI || !window.electronAPI.readFile) {
        alert('File reading not available. Please refresh the application.');
        return;
    }
    
    try {
        // Get file name from path
        const fileName = filePath.split(/[/\\]/).pop();
        const isEncryptedFile = fileName.toLowerCase().endsWith('.encrypted');
        
        let fileContent;
        let fileSize;
        
        if (type === 'decrypt' || isEncryptedFile) {
            // For decryption or encrypted files, always read as text (encrypted files are text strings)
            fileContent = await window.electronAPI.readFile(filePath, 'utf8');
            fileSize = new Blob([fileContent]).size;
            
            selectedFile = {
                name: fileName,
                path: filePath,
                content: fileContent,
                size: fileSize,
                isEncrypted: true
            };
        } else {
            // For encryption, try to read as base64 first (for binary files)
            try {
                fileContent = await window.electronAPI.readFile(filePath, 'base64');
                // Calculate size from base64 (base64 is ~4/3 the size of binary)
                fileSize = Math.round((fileContent.length * 3) / 4);
                
                // Store base64 content for encryption
                selectedFile = {
                    name: fileName,
                    path: filePath,
                    base64: fileContent,
                    content: fileContent, // Keep as base64 for encryption
                    size: fileSize,
                    isEncrypted: false
                };
            } catch (e) {
                // Fallback: read as text (for text files)
                fileContent = await window.electronAPI.readFile(filePath, 'utf8');
                fileSize = new Blob([fileContent]).size;
                
                selectedFile = {
                    name: fileName,
                    path: filePath,
                    content: fileContent,
                    size: fileSize,
                    isEncrypted: false
                };
            }
        }
        
        // Update UI
        const fileInfo = document.getElementById(`${type}FileInfo`);
        const fileNameEl = document.getElementById(`${type}FileName`);
        const fileSizeEl = document.getElementById(`${type}FileSize`);
        const fileArea = document.getElementById(`${type}FileArea`);
        
        fileNameEl.textContent = selectedFile.name;
        fileSizeEl.textContent = formatFileSize(selectedFile.size);
        fileArea.style.display = 'none';
        fileInfo.style.display = 'flex';
        
        updateEncryptButton();
        updateDecryptButton();
    } catch (error) {
        console.error('Error loading file:', error);
        alert('Failed to load file: ' + error.message);
    }
}

function switchTab(tab) {
    document.querySelectorAll('.toolbar-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.content-panel').forEach(panel => panel.classList.remove('active'));
    
    if (tab === 'encrypt') {
        document.getElementById('encryptTab').classList.add('active');
        document.getElementById('encryptPanel').classList.add('active');
    } else {
        document.getElementById('decryptTab').classList.add('active');
        document.getElementById('decryptPanel').classList.add('active');
    }
}

// Removed handleFileSelect and handleFile - using isolated file dialog instead

function removeFile(type) {
    selectedFile = null;
    encryptedData = null;
    decryptedData = null;
    document.getElementById(`${type}FileInfo`).style.display = 'none';
    document.getElementById(`${type}FileArea`).style.display = 'block';
    document.getElementById('encryptResult').style.display = 'none';
    document.getElementById('decryptResult').style.display = 'none';
    document.getElementById('encryptBtn').style.display = 'block';
    document.getElementById('decryptBtn').style.display = 'block';
    updateEncryptButton();
    updateDecryptButton();
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function checkPasswordStrength() {
    const password = document.getElementById('encryptPassword').value;
    const strengthDiv = document.getElementById('encryptPasswordStrength');
    
    if (password.length === 0) {
        strengthDiv.textContent = '';
        return;
    }
    
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z\d]/.test(password)) strength++;
    
    const labels = ['Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
    const colors = ['#e81123', '#ff8c00', '#ffaa00', '#107c10', '#0078d4'];
    
    strengthDiv.textContent = `Password Strength: ${labels[strength - 1] || 'Weak'}`;
    strengthDiv.style.color = colors[strength - 1] || colors[0];
}

function togglePassword(type) {
    const input = document.getElementById(`${type}Password`);
    input.type = input.type === 'password' ? 'text' : 'password';
}

function updateEncryptButton() {
    const password = document.getElementById('encryptPassword').value;
    const btn = document.getElementById('encryptBtn');
    btn.disabled = !selectedFile || !password || password.length < 4;
}

function updateDecryptButton() {
    const password = document.getElementById('decryptPassword').value;
    const btn = document.getElementById('decryptBtn');
    btn.disabled = !selectedFile || !password;
}

document.getElementById('encryptPassword').addEventListener('input', updateEncryptButton);
document.getElementById('decryptPassword').addEventListener('input', updateDecryptButton);

async function encryptFile() {
    if (!selectedFile || !window.electronAPI) {
        alert('No file selected or API not available');
        return;
    }
    
    const password = document.getElementById('encryptPassword').value;
    if (!password || password.length < 4) {
        alert('Please enter a password (at least 4 characters)');
        return;
    }
    
    try {
        // Use file content from isolated file (already in base64 if binary, or plain text)
        let base64Content;
        if (selectedFile.base64) {
            // File was read as base64 (binary file)
            base64Content = selectedFile.base64;
        } else {
            // File was read as text, convert to base64
            base64Content = btoa(unescape(encodeURIComponent(selectedFile.content)));
        }
        
        // Encrypt using IPC
        encryptedData = await window.electronAPI.encryptData(base64Content, password);
        
        if (!encryptedData) {
            throw new Error('Encryption returned no data');
        }
        
        // Show result
        document.getElementById('encryptResult').style.display = 'block';
        document.getElementById('encryptBtn').style.display = 'none';
    } catch (error) {
        console.error('Encryption error:', error);
        alert('Encryption failed: ' + error.message);
    }
}

async function decryptFile() {
    if (!selectedFile || !window.electronAPI) {
        alert('No file selected or API not available');
        return;
    }
    
    const password = document.getElementById('decryptPassword').value;
    if (!password) {
        alert('Please enter the decryption password');
        return;
    }
    
    try {
        // Use file content from isolated file (encrypted files are stored as text)
        const encryptedContent = selectedFile.content;
        
        // Decrypt using IPC
        const decryptedBase64 = await window.electronAPI.decryptData(encryptedContent, password);
        
        if (!decryptedBase64) {
            alert('Decryption failed. Incorrect password or corrupted file.');
            return;
        }
        
        // DecryptedBase64 is the original file content in base64
        // Convert from base64 to binary string
        try {
            decryptedData = atob(decryptedBase64);
        } catch (e) {
            console.error('Base64 decode error:', e);
            alert('Decryption failed: Invalid file format - ' + e.message);
            return;
        }
        
        // Show result
        document.getElementById('decryptResult').style.display = 'block';
        document.getElementById('decryptBtn').style.display = 'none';
    } catch (error) {
        console.error('Decryption error:', error);
        alert('Decryption failed: ' + error.message);
    }
}

async function saveEncryptedFile() {
    if (!encryptedData || !window.electronAPI) return;
    
    try {
        const result = await window.electronAPI.saveFileDialog({
            defaultPath: selectedFile.name + '.encrypted',
            filters: [{ name: 'Encrypted Files', extensions: ['encrypted'] }]
        });
        
        if (!result.canceled && result.filePath) {
            await window.electronAPI.writeFile(result.filePath, encryptedData);
            alert('Encrypted file saved successfully!');
        }
    } catch (error) {
        alert('Failed to save file: ' + error.message);
    }
}

async function copyEncryptedText() {
    if (!encryptedData) {
        alert('No encrypted data to copy');
        return;
    }
    
    try {
        // Try modern clipboard API first
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(encryptedData);
            alert('Encrypted text copied to clipboard!');
            return;
        }
        
        // Fallback: Create a temporary textarea element and copy from it
        const textarea = document.createElement('textarea');
        textarea.value = encryptedData;
        textarea.style.position = 'fixed';
        textarea.style.left = '-999999px';
        textarea.style.top = '-999999px';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        
        try {
            const successful = document.execCommand('copy');
            document.body.removeChild(textarea);
            
            if (successful) {
                alert('Encrypted text copied to clipboard!');
            } else {
                throw new Error('execCommand copy failed');
            }
        } catch (e) {
            document.body.removeChild(textarea);
            throw e;
        }
    } catch (error) {
        console.error('Clipboard copy error:', error);
        alert('Failed to copy to clipboard: ' + (error.message || 'Unknown error'));
    }
}

async function saveDecryptedFile() {
    if (!decryptedData || !window.electronAPI) return;
    
    try {
        // Remove .encrypted extension if present
        const originalName = selectedFile.name.replace(/\.encrypted$/, '');
        const result = await window.electronAPI.saveFileDialog({
            defaultPath: originalName,
            filters: [{ name: 'All Files', extensions: ['*'] }]
        });
        
        if (!result.canceled && result.filePath) {
            // DecryptedData is a binary string, convert to base64 for saving
            const base64Content = btoa(decryptedData);
            await window.electronAPI.writeFile(result.filePath, base64Content, 'base64');
            alert('Decrypted file saved successfully!');
        }
    } catch (error) {
        alert('Failed to save file: ' + error.message);
    }
}

