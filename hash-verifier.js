// Omega Hash Verifier
let currentWindowId = null;
let currentFile = null;
let currentHash = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    if (window.electronAPI) {
        window.electronAPI.getWindowId().then(id => {
            currentWindowId = id;
        });
    }

    setupWindowControls();
    setupFileHashing();
    setupHashComparison();
    setupBlockchainVerification();
    loadSyncedDocuments();
});

function setupWindowControls() {
    document.getElementById('minimizeBtn')?.addEventListener('click', () => {
        if (currentWindowId && window.electronAPI) {
            window.electronAPI.appWindowMinimize(currentWindowId);
        }
    });

    document.getElementById('maximizeBtn')?.addEventListener('click', () => {
        if (currentWindowId && window.electronAPI) {
            window.electronAPI.appWindowMaximize(currentWindowId);
        }
    });

    document.getElementById('closeBtn')?.addEventListener('click', () => {
        if (currentWindowId && window.electronAPI) {
            window.electronAPI.appWindowClose(currentWindowId);
        }
    });
}

function setupFileHashing() {
    const fileDropZone = document.getElementById('fileDropZone');
    const fileInput = document.getElementById('fileInput');
    const fileInfo = document.getElementById('fileInfo');
    const hashResult = document.getElementById('hashResult');
    const hashFileBtn = document.getElementById('hashFileBtn');
    const syncHashBtn = document.getElementById('syncHashBtn');
    const copyHashBtn = document.getElementById('copyHashBtn');

    // Click to browse
    fileDropZone.addEventListener('click', () => {
        fileInput.click();
    });

    // File input change
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFileSelect(e.target.files[0]);
        }
    });

    // Drag and drop
    fileDropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        fileDropZone.classList.add('dragover');
    });

    fileDropZone.addEventListener('dragleave', () => {
        fileDropZone.classList.remove('dragover');
    });

    fileDropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        fileDropZone.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    });

    // Hash file button
    hashFileBtn.addEventListener('click', async () => {
        if (!currentFile) return;
        await calculateHash(currentFile);
    });

    // Sync to blockchain button
    syncHashBtn.addEventListener('click', async () => {
        if (!currentHash || !currentFile) return;
        await syncHashToBlockchain(currentFile.name, currentHash);
    });

    // Copy hash button
    copyHashBtn.addEventListener('click', async () => {
        if (!currentHash) return;
        await copyToClipboard(currentHash);
    });
}

async function handleFileSelect(file) {
    currentFile = file;
    const fileInfo = document.getElementById('fileInfo');
    const hashFileBtn = document.getElementById('hashFileBtn');
    const hashResult = document.getElementById('hashResult');
    
    fileInfo.style.display = 'block';
    fileInfo.innerHTML = `
        <strong>File:</strong> ${file.name}<br>
        <strong>Size:</strong> ${formatFileSize(file.size)}<br>
        <strong>Type:</strong> ${file.type || 'Unknown'}
    `;
    
    hashFileBtn.disabled = false;
    hashResult.style.display = 'none';
    currentHash = null;
    document.getElementById('syncHashBtn').disabled = true;
    document.getElementById('copyHashBtn').disabled = true;
}

async function calculateHash(file) {
    const hashResult = document.getElementById('hashResult');
    const hashFileBtn = document.getElementById('hashFileBtn');
    const syncHashBtn = document.getElementById('syncHashBtn');
    const copyHashBtn = document.getElementById('copyHashBtn');
    
    hashFileBtn.disabled = true;
    hashResult.style.display = 'block';
    hashResult.className = 'hash-result';
    hashResult.textContent = 'Calculating hash...';
    
    try {
        const arrayBuffer = await file.arrayBuffer();
        const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        currentHash = '0x' + hashHex;
        
        hashResult.className = 'hash-result success';
        hashResult.innerHTML = `
            <strong>SHA-256 Hash:</strong><br>
            <code style="word-break: break-all; display: block; margin-top: 8px;">${currentHash}</code>
        `;
        
        syncHashBtn.disabled = false;
        copyHashBtn.disabled = false;
    } catch (error) {
        hashResult.className = 'hash-result error';
        hashResult.textContent = 'Error calculating hash: ' + error.message;
    } finally {
        hashFileBtn.disabled = false;
    }
}

async function syncHashToBlockchain(fileName, hash) {
    const syncHashBtn = document.getElementById('syncHashBtn');
    const hashResult = document.getElementById('hashResult');
    
    if (!window.electronAPI || !window.electronAPI.identityHasIdentity) {
        alert('Identity not initialized. Please register your Omega OS identity first.');
        return;
    }
    
    const hasIdentity = await window.electronAPI.identityHasIdentity();
    if (!hasIdentity) {
        alert('Please register your Omega OS identity first in the Omega Identity app.');
        return;
    }
    
    // Show confirmation dialog
    const confirmMessage = `Sync document hash to blockchain?\n\n` +
        `File: ${fileName}\n` +
        `Hash: ${hash.substring(0, 20)}...\n\n` +
        `This will cost a small gas fee (~0.001-0.01 OMEGA tokens).\n` +
        `Make sure your wallet is unlocked and has Omega tokens.`;
    
    if (!confirm(confirmMessage)) {
        return; // User cancelled
    }
    
    syncHashBtn.disabled = true;
    syncHashBtn.textContent = 'Preparing transaction...';
    hashResult.style.display = 'block';
    hashResult.className = 'hash-result';
    hashResult.textContent = 'Preparing transaction... Please approve in your wallet if prompted.';
    
    try {
        // Determine document type from file extension
        const ext = fileName.split('.').pop()?.toLowerCase();
        let docType = 'file';
        if (['doc', 'docx', 'txt', 'rtf'].includes(ext)) docType = 'word';
        else if (['xls', 'xlsx', 'csv'].includes(ext)) docType = 'sheets';
        else if (['ppt', 'pptx'].includes(ext)) docType = 'slides';
        
        // Create document ID
        const documentId = fileName.replace(/[^a-zA-Z0-9]/g, '_') + '_' + Date.now();
        
        syncHashBtn.textContent = 'Waiting for approval...';
        hashResult.textContent = 'Waiting for wallet approval... Please check your wallet window.';
        
        const result = await window.electronAPI.identitySyncDocument(
            documentId,
            hash,
            {
                name: fileName,
                type: docType,
                timestamp: Date.now()
            }
        );
        
        if (result.success) {
            hashResult.className = 'hash-result success';
            hashResult.innerHTML = `
                <strong>✓ Hash synced to blockchain!</strong><br>
                <code style="word-break: break-all; display: block; margin-top: 8px;">${hash}</code><br>
                <small style="color: rgba(255, 255, 255, 0.6); margin-top: 8px; display: block;">
                    Transaction: ${result.txHash?.substring(0, 20)}...${result.txHash?.substring(result.txHash.length - 8)}<br>
                    ${result.blockNumber ? `Block: ${result.blockNumber}` : 'Pending confirmation'}
                </small>
            `;
            // Refresh synced documents list
            loadSyncedDocuments();
        } else {
            throw new Error(result.error || 'Failed to sync hash');
        }
    } catch (error) {
        hashResult.className = 'hash-result error';
        let errorMessage = error.message;
        
        // Provide helpful error messages
        if (errorMessage.includes('Wallet not loaded')) {
            errorMessage = 'Please unlock your wallet first in Omega Wallet app.';
        } else if (errorMessage.includes('EVM wallet not available')) {
            errorMessage = 'EVM wallet not available. Please make sure your wallet is properly initialized.';
        } else if (errorMessage.includes('Provider not initialized')) {
            errorMessage = 'Wallet connection error. Please unlock your wallet and try again.';
        } else if (errorMessage.includes('Identity not initialized')) {
            errorMessage = 'Please register your Omega OS identity first in the Omega Identity app.';
        }
        
        hashResult.innerHTML = `
            <strong>Error syncing hash:</strong><br>
            ${errorMessage}
        `;
    } finally {
        syncHashBtn.disabled = false;
        syncHashBtn.textContent = 'Sync to Blockchain';
    }
}

function setupHashComparison() {
    const hash1Input = document.getElementById('hash1Input');
    const hash2Input = document.getElementById('hash2Input');
    const compareBtn = document.getElementById('compareHashesBtn');
    const comparisonResult = document.getElementById('comparisonResult');
    
    compareBtn.addEventListener('click', () => {
        const hash1 = normalizeHash(hash1Input.value.trim());
        const hash2 = normalizeHash(hash2Input.value.trim());
        
        if (!hash1 || !hash2) {
            comparisonResult.style.display = 'block';
            comparisonResult.className = 'comparison-result error';
            comparisonResult.textContent = 'Please enter both hashes';
            return;
        }
        
        comparisonResult.style.display = 'block';
        
        if (hash1.toLowerCase() === hash2.toLowerCase()) {
            comparisonResult.className = 'comparison-result match';
            comparisonResult.textContent = '✓ Hashes Match - Files are identical!';
        } else {
            comparisonResult.className = 'comparison-result mismatch';
            comparisonResult.textContent = '✗ Hashes Don\'t Match - Files are different!';
        }
    });
}

function setupBlockchainVerification() {
    const verifyFileDropZone = document.getElementById('verifyFileDropZone');
    const verifyFileInput = document.getElementById('verifyFileInput');
    const verifyFileBtn = document.getElementById('verifyFileBtn');
    const verifyResult = document.getElementById('verifyResult');
    let verifyFile = null;
    
    verifyFileDropZone.addEventListener('click', () => {
        verifyFileInput.click();
    });
    
    verifyFileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            verifyFile = e.target.files[0];
            verifyFileBtn.disabled = false;
            verifyFileDropZone.querySelector('p').textContent = `📁 ${verifyFile.name}`;
        }
    });
    
    verifyFileDropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        verifyFileDropZone.classList.add('dragover');
    });
    
    verifyFileDropZone.addEventListener('dragleave', () => {
        verifyFileDropZone.classList.remove('dragover');
    });
    
    verifyFileDropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        verifyFileDropZone.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) {
            verifyFile = e.dataTransfer.files[0];
            verifyFileBtn.disabled = false;
            verifyFileDropZone.querySelector('p').textContent = `📁 ${verifyFile.name}`;
        }
    });
    
    verifyFileBtn.addEventListener('click', async () => {
        if (!verifyFile) return;
        
        verifyFileBtn.disabled = true;
        verifyResult.style.display = 'block';
        verifyResult.className = 'hash-result';
        verifyResult.textContent = 'Calculating hash and checking blockchain...';
        
        try {
            // Calculate file hash
            const arrayBuffer = await verifyFile.arrayBuffer();
            const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const fileHash = '0x' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            
            // Get synced documents from blockchain
            if (!window.electronAPI || !window.electronAPI.identityGetSyncedDocuments) {
                throw new Error('Identity API not available');
            }
            
            const result = await window.electronAPI.identityGetSyncedDocuments();
            
            if (!result.success || !result.documents || result.documents.length === 0) {
                verifyResult.className = 'hash-result error';
                verifyResult.innerHTML = `
                    <strong>No synced documents found</strong><br>
                    This file's hash is not in your blockchain records.
                `;
                return;
            }
            
            // Find matching hash
            const match = result.documents.find(doc => 
                doc.documentHash.toLowerCase() === fileHash.toLowerCase()
            );
            
            if (match) {
                verifyResult.className = 'hash-result success';
                verifyResult.innerHTML = `
                    <strong>✓ File Verified!</strong><br>
                    This file matches a document synced to blockchain.<br><br>
                    <strong>Document:</strong> ${match.fileName || match.documentId}<br>
                    <strong>Type:</strong> ${match.documentType || 'file'}<br>
                    <strong>Synced:</strong> ${new Date(match.timestamp).toLocaleString()}<br>
                    <strong>Hash:</strong> <code style="word-break: break-all; display: block; margin-top: 4px;">${fileHash}</code>
                `;
            } else {
                verifyResult.className = 'hash-result error';
                verifyResult.innerHTML = `
                    <strong>✗ File Not Found</strong><br>
                    This file's hash does not match any document in your blockchain records.<br>
                    The file may have been modified or was never synced.<br><br>
                    <strong>File Hash:</strong> <code style="word-break: break-all; display: block; margin-top: 4px;">${fileHash}</code>
                `;
            }
        } catch (error) {
            verifyResult.className = 'hash-result error';
            verifyResult.textContent = 'Error verifying file: ' + error.message;
        } finally {
            verifyFileBtn.disabled = false;
        }
    });
}

async function loadSyncedDocuments() {
    const syncedDocumentsList = document.getElementById('syncedDocumentsList');
    
    if (!window.electronAPI || !window.electronAPI.identityGetSyncedDocuments) {
        syncedDocumentsList.innerHTML = '<p style="text-align: center; color: rgba(255, 255, 255, 0.5);">Identity API not available</p>';
        return;
    }
    
    try {
        const result = await window.electronAPI.identityGetSyncedDocuments();
        
        if (!result.success || !result.documents || result.documents.length === 0) {
            syncedDocumentsList.innerHTML = '<p style="text-align: center; color: rgba(255, 255, 255, 0.5);">No synced documents yet</p>';
            return;
        }
        
        syncedDocumentsList.innerHTML = result.documents.map(doc => {
            const date = new Date(doc.timestamp);
            return `
                <div class="synced-document-item">
                    <div class="synced-document-info">
                        <div class="synced-document-name">${doc.fileName || doc.documentId}</div>
                        <div class="synced-document-hash">${doc.documentHash.substring(0, 20)}...${doc.documentHash.substring(doc.documentHash.length - 8)}</div>
                        <div style="font-size: 11px; color: rgba(255, 255, 255, 0.5); margin-top: 4px;">
                            ${doc.documentType || 'file'} • ${date.toLocaleDateString()}
                        </div>
                    </div>
                    <button class="copy-hash-btn" data-hash="${doc.documentHash}">Copy Hash</button>
                </div>
            `;
        }).join('');
        
        // Add copy button listeners
        syncedDocumentsList.querySelectorAll('.copy-hash-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const hash = btn.dataset.hash;
                await copyToClipboard(hash);
                btn.textContent = 'Copied!';
                setTimeout(() => {
                    btn.textContent = 'Copy Hash';
                }, 2000);
            });
        });
    } catch (error) {
        syncedDocumentsList.innerHTML = `<p style="text-align: center; color: rgba(255, 0, 0, 0.7);">Error loading documents: ${error.message}</p>`;
    }
}

document.getElementById('refreshSyncedBtn')?.addEventListener('click', () => {
    loadSyncedDocuments();
});

// Helper functions
function normalizeHash(hash) {
    // Remove 0x prefix if present, convert to lowercase
    return hash.replace(/^0x/i, '').toLowerCase();
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

async function copyToClipboard(text) {
    try {
        if (window.electronAPI && window.electronAPI.clipboardWriteText) {
            const result = await window.electronAPI.clipboardWriteText(text);
            if (result.success) {
                return;
            }
        }
        
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(text);
            return;
        }
        
        // Fallback
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.left = '-999999px';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
    } catch (error) {
        console.error('Failed to copy:', error);
        alert('Failed to copy to clipboard: ' + error.message);
    }
}

