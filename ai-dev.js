// Omega Create - AI Dev Application (Redesigned)
let currentWindowId = null;
let chatHistory = [];
let currentCode = '';

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    currentWindowId = await window.electronAPI.getWindowId();
    setupEventListeners();
    setupWindowControls();
    autoExpandTextarea();
});

function setupEventListeners() {
    const sendBtn = document.getElementById('sendBtn');
    const chatInput = document.getElementById('chatInput');
    const codeEditor = document.getElementById('codeEditor');
    const saveFileBtn = document.getElementById('saveFileBtn');
    const previewToggleBtn = document.getElementById('previewToggleBtn');
    const previewCloseBtn = document.getElementById('previewCloseBtn');
    const previewPane = document.getElementById('previewPane');

    // Send message
    sendBtn.addEventListener('click', () => sendMessage());
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // Preview toggle
    previewToggleBtn.addEventListener('click', () => {
        previewPane.classList.toggle('hidden');
        previewToggleBtn.classList.toggle('active');
        if (!previewPane.classList.contains('hidden')) {
            updatePreview(); // Refresh preview when opened
        }
    });

    previewCloseBtn.addEventListener('click', () => {
        previewPane.classList.add('hidden');
        previewToggleBtn.classList.remove('active');
    });

    // Save file
    saveFileBtn.addEventListener('click', () => saveCode());

    // Live preview update
    codeEditor.addEventListener('input', () => {
        currentCode = codeEditor.value;
        if (!previewPane.classList.contains('hidden')) {
            updatePreview();
        }
    });
}

function setupWindowControls() {
    document.getElementById('minimizeBtn').addEventListener('click', () => {
        window.electronAPI.appWindowMinimize(currentWindowId);
    });
    document.getElementById('maximizeBtn').addEventListener('click', () => {
        window.electronAPI.appWindowMaximize(currentWindowId);
    });
    document.getElementById('closeBtn').addEventListener('click', () => {
        window.electronAPI.appWindowClose(currentWindowId);
    });
}

function autoExpandTextarea() {
    const chatInput = document.getElementById('chatInput');
    chatInput.addEventListener('input', function () {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 150) + 'px';
    });
}

async function sendMessage() {
    const chatInput = document.getElementById('chatInput');
    const message = chatInput.value.trim();

    if (!message) return;

    // Add user message to chat
    addChatMessage('user', message);
    chatInput.value = '';
    chatInput.style.height = 'auto';

    // Show loading
    showLoading(true);
    const typingIndicator = addTypingIndicator();

    try {
        // Call AI with Developer Mode
        const result = await window.electronAPI.aiChat(message, chatHistory, { mode: 'developer' });

        // Remove typing indicator
        typingIndicator.remove();

        // Handle IPC response format: { success: true, response: "..." } or { success: false, error: "..." }
        if (result && result.success && result.response) {
            const response = result.response;

            // Extract code from response FIRST
            const extractedCode = extractCode(response);

            if (extractedCode) {
                // Code found - update editor and preview
                currentCode = extractedCode;
                document.getElementById('codeEditor').value = extractedCode;
                updatePreview();

                // Show brief success message in chat (not the full code)
                addChatMessage('ai', '✓ Code generated! Check the Code/Preview tabs.');
            } else {
                // No code found - show full response in chat
                addChatMessage('ai', response);
            }

            // Update chat history
            chatHistory.push({ role: 'user', content: message });
            chatHistory.push({ role: 'assistant', content: response });
        } else {
            // Handle error response
            const errorMsg = result?.error || 'Unknown error occurred';
            addChatMessage('ai', `Error: ${errorMsg}. Make sure Ollama is running with a code model installed.`);
        }

        showLoading(false);
    } catch (error) {
        typingIndicator.remove();
        showLoading(false);
        addChatMessage('ai', `Error: ${error.message}. Make sure Ollama is running with a code model installed.`);
    }
}

function addChatMessage(role, content) {
    const chatHistory = document.getElementById('chatHistory');
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${role}`;

    const bubble = document.createElement('div');
    bubble.className = 'msg-bubble';
    bubble.textContent = content;

    messageDiv.appendChild(bubble);
    chatHistory.appendChild(messageDiv);

    // Scroll to bottom
    chatHistory.scrollTop = chatHistory.scrollHeight;

    return messageDiv;
}

function addTypingIndicator() {
    const chatHistory = document.getElementById('chatHistory');
    const indicator = document.createElement('div');
    indicator.className = 'typing-indicator';
    indicator.innerHTML = '<div class="dot"></div><div class="dot"></div><div class="dot"></div>';
    chatHistory.appendChild(indicator);
    chatHistory.scrollTop = chatHistory.scrollHeight;
    return indicator;
}

function extractCode(text) {
    // Extract code from markdown code blocks with any language tag
    const codeBlockRegex = /```(\w+)?\n?([\s\S]*?)```/i;
    const match = text.match(codeBlockRegex);

    if (match && match[2]) {
        return match[2].trim();
    }

    // If no code block, check if the entire response looks like HTML
    if (text.includes('<!DOCTYPE') || text.includes('<html')) {
        return text.trim();
    }

    return null;
}

function updatePreview() {
    const previewFrame = document.getElementById('previewFrame');
    const code = currentCode;

    if (!code) return;

    try {
        const iframeDoc = previewFrame.contentDocument || previewFrame.contentWindow.document;
        iframeDoc.open();

        // Check if code is HTML
        if (code.trim().startsWith('<!DOCTYPE') || code.trim().startsWith('<html') || code.includes('</body>')) {
            iframeDoc.write(code);
        } else {
            // Treat as plain text/code for other languages
            // Display comfortably with line wrapping
            const escapedCode = code.replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");

            iframeDoc.write(`
                <!DOCTYPE html>
                <html>
                <body style="margin:0; padding:16px; background:#1e1e1e; color:#d4d4d4; font-family:Consolas, 'Courier New', monospace;">
                    <pre style="white-space: pre-wrap; word-wrap: break-word;">${escapedCode}</pre>
                </body>
                </html>
            `);
        }

        iframeDoc.close();
    } catch (error) {
        console.error('Preview error:', error);
    }
}

function switchTab(tab) {
    const tabCode = document.getElementById('tabCode');
    const tabPreview = document.getElementById('tabPreview');
    const codePane = document.getElementById('codePane');
    const previewPane = document.getElementById('previewPane');

    if (tab === 'code') {
        tabCode.classList.add('active');
        tabPreview.classList.remove('active');
        codePane.style.display = 'flex';
        previewPane.style.display = 'none';
    } else {
        tabCode.classList.remove('active');
        tabPreview.classList.add('active');
        codePane.style.display = 'none';
        previewPane.style.display = 'flex';
    }
}

async function saveCode() {
    if (!currentCode) {
        alert('No code to save');
        return;
    }

    try {
        const result = await window.electronAPI.saveFileDialog({
            title: 'Save Code',
            defaultPath: 'index.html',
            filters: [
                { name: 'HTML Files', extensions: ['html'] },
                { name: 'All Files', extensions: ['*'] }
            ]
        });

        if (result && !result.canceled && result.filePath) {
            await window.electronAPI.writeFile(result.filePath, currentCode, 'utf8');
            alert('File saved successfully!');
        }
    } catch (error) {
        alert('Failed to save file: ' + error.message);
    }
}

function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (show) {
        overlay.classList.remove('hidden');
    } else {
        overlay.classList.add('hidden');
    }
}
