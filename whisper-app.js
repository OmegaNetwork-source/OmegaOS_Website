// Whisper Frontend Logic

let currentContactId = null;
let myOnionAddress = null;
let currentTTL = null; // null = off

// Debug helper - just console logs now (debug panel removed)
function debugLog(msg) {
    console.log('[Whisper Frontend] ' + msg);
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    // Get basic info
    try {
        const info = await window.electronAPI.whisperGetInfo();
        if (info && info.address) {
            myOnionAddress = info.address;
            document.getElementById('myOnionId').textContent = myOnionAddress;
        } else if (info.error) {
            showErrorState(info.error);
        } else {
            document.getElementById('myOnionId').textContent = 'Initializing Tor...';
        }
    } catch (e) {
        console.error('Failed to get info:', e);
        document.getElementById('myOnionId').textContent = 'Error connecting to service';
    }


    // Load contacts
    loadContacts();

    // Event Listeners
    setupEventListeners();

    // TTL UI Handlers
    const ttlBtn = document.getElementById('ttlBtn');
    const ttlMenu = document.getElementById('ttlMenu');
    const ttlOptions = document.querySelectorAll('.ttl-option');

    // Toggle TTL Menu
    ttlBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        ttlMenu.classList.toggle('visible');
    });

    // Close menu when clicking outside
    document.addEventListener('click', () => {
        ttlMenu.classList.remove('visible');
    });

    // Handle TTL Selection
    ttlOptions.forEach(option => {
        option.addEventListener('click', () => {
            const val = parseInt(option.dataset.value);
            currentTTL = val === 0 ? null : val;

            // Update UI
            ttlOptions.forEach(opt => opt.classList.remove('selected'));
            option.classList.add('selected');

            if (currentTTL) {
                ttlBtn.classList.add('active');
            } else {
                ttlBtn.classList.remove('active');
            }

            ttlMenu.classList.remove('visible');
            console.log('TTL set to:', currentTTL);
        });
    });

    // Listen for Message Deletion
    window.electronAPI.onWhisperMessageDeleted((messageId) => {
        console.log('Message deleted:', messageId);
        // Find message in DOM and remove it
        // Note: Since we don't put IDs on message elements in renderMessages, we might need a reload.
        // Or better, let's update renderMessages to include IDs or just blindly reload.
        if (currentContactId) {
            loadMessages(currentContactId);
        }
    });

    // Poll for new messages (simple implementation)
    setInterval(checkNewMessages, 3000);

    // Listen for message deletions (self-destruct)
    window.electronAPI.onWhisperMessageDeleted((messageId) => {
        console.log('[Whisper] Message deleted:', messageId);
        // Reload messages if we're viewing a contact
        if (currentContactId) {
            loadMessages(currentContactId);
        }
    });

    // Setup Tor status checker
    updateTorStatus();
    setInterval(updateTorStatus, 5000);

    // Self-test button
    const testSelfBtn = document.getElementById('testSelfBtn');
    if (testSelfBtn) {
        testSelfBtn.addEventListener('click', async () => {
            debugLog('Self-test button clicked');
            if (!myOnionAddress) {
                debugLog('No onion address yet, cannot test');
                alert('Wait for your Encrypted ID to load first');
                return;
            }

            // Add self as contact if not already
            debugLog('Testing message to self: ' + myOnionAddress);
            await window.electronAPI.whisperAddContact(myOnionAddress, 'Me (Test)');
            await loadContacts();

            // Select self as contact
            currentContactId = myOnionAddress;
            document.getElementById('chatTitle').textContent = 'Me (Test)';
            document.getElementById('chatSubtitle').textContent = myOnionAddress;

            // Send test message
            debugLog('Sending test message...');
            const testContent = 'Test message at ' + new Date().toLocaleTimeString();
            const result = await window.electronAPI.whisperSendMessage(myOnionAddress, testContent, null);
            debugLog('Test result: ' + JSON.stringify(result));

            // Reload messages
            await loadMessages(myOnionAddress);

            if (result.success) {
                debugLog('Self-test SUCCESS!');
            } else {
                debugLog('Self-test FAILED: ' + result.error);
            }
        });
    }
});

async function loadContacts() {
    try {
        const contacts = await window.electronAPI.whisperGetContacts();
        const list = document.getElementById('contactsList');
        list.innerHTML = '';

        contacts.forEach(contact => {
            const el = document.createElement('div');
            el.className = `contact-item ${currentContactId === contact.id ? 'active' : ''}`;
            el.innerHTML = `
                <div class="contact-avatar">${contact.name.substring(0, 2).toUpperCase()}</div>
                <div class="contact-info">
                    <div class="contact-name">${contact.name}</div>
                    <div class="contact-status">${contact.id.substring(0, 16)}...</div>
                </div>
                <button class="contact-edit-btn" title="Edit contact" style="margin-left: auto; background: transparent; border: none; color: #a0a0a0; cursor: pointer; padding: 4px 8px;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                </button>
                <button class="contact-delete-btn" title="Delete contact" style="background: transparent; border: none; color: #ff4444; cursor: pointer; padding: 4px 8px;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </button>
            `;

            // Click contact to select (but not edit/delete buttons)
            el.addEventListener('click', (e) => {
                if (!e.target.closest('.contact-edit-btn') && !e.target.closest('.contact-delete-btn')) {
                    selectContact(contact);
                }
            });

            // Edit button handler
            const editBtn = el.querySelector('.contact-edit-btn');
            editBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                editContactPrompt(contact);
            });

            // Delete button handler
            const deleteBtn = el.querySelector('.contact-delete-btn');
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteContactPrompt(contact);
            });

            list.appendChild(el);
        });
    } catch (e) {
        console.error('Failed to load contacts:', e);
    }
}

async function editContactPrompt(contact) {
    const modal = document.getElementById('editContactModal');
    const nameInput = document.getElementById('editContactNameInput');
    const confirmBtn = document.getElementById('confirmEditContact');
    const cancelBtn = document.getElementById('cancelEditContact');

    nameInput.value = contact.name; // Pre-fill with current name
    modal.style.display = 'flex'; // Show the modal
    nameInput.focus();

    return new Promise((resolve) => {
        const handleConfirm = async () => {
            modal.style.display = 'none';
            confirmBtn.removeEventListener('click', handleConfirm);
            cancelBtn.removeEventListener('click', handleCancel);
            resolve(nameInput.value.trim());
        };

        const handleCancel = () => {
            modal.style.display = 'none';
            confirmBtn.removeEventListener('click', handleConfirm);
            cancelBtn.removeEventListener('click', handleCancel);
            resolve(null); // User cancelled
        };

        confirmBtn.addEventListener('click', handleConfirm);
        cancelBtn.addEventListener('click', handleCancel);
    }).then(async (newName) => {
        if (newName === null) {
            // User cancelled
            return;
        }

        if (newName && newName !== contact.name) {
            try {
                const result = await window.electronAPI.whisperEditContact(contact.id, newName);
                if (result) {
                    loadContacts();
                    // Update header if this is the current contact
                    if (currentContactId === contact.id) {
                        document.getElementById('chatTitle').textContent = newName;
                    }
                }
            } catch (e) {
                console.error('Failed to edit contact:', e);
                alert('Failed to edit contact. Make sure the app is updated.');
            }
        }
    });
}

async function deleteContactPrompt(contact) {
    if (confirm(`Are you sure you want to delete "${contact.name}"?`)) {
        try {
            const result = await window.electronAPI.whisperDeleteContact(contact.id);
            if (result) {
                // If we're viewing this contact, clear the chat
                if (currentContactId === contact.id) {
                    currentContactId = null;
                    document.getElementById('chatTitle').textContent = 'Select a contact';
                    document.getElementById('chatSubtitle').textContent = '';
                    document.getElementById('messagesContainer').innerHTML = '';
                }
                loadContacts();
            }
        } catch (e) {
            console.error('Failed to delete contact:', e);
        }
    }
}

async function selectContact(contact) {
    debugLog('selectContact called with: ' + contact.name + ' / ' + contact.id);
    currentContactId = contact.id;
    debugLog('currentContactId set to: ' + currentContactId);

    // Update UI
    document.querySelectorAll('.contact-item').forEach(el => el.classList.remove('active'));
    // (In a real app, we'd find the specific element to add 'active')
    loadContacts(); // Re-render to show active state properly

    document.getElementById('chatTitle').textContent = contact.name;
    document.getElementById('chatSubtitle').textContent = contact.id;

    await loadMessages(contact.id);
}

async function loadMessages(contactId) {
    if (!contactId) return;

    try {
        debugLog('loadMessages called for: ' + contactId);
        const messages = await window.electronAPI.whisperGetMessages(contactId);
        debugLog('Got ' + messages.length + ' messages from backend');
        if (messages.length > 0) {
            debugLog('Last msg: ' + JSON.stringify(messages[messages.length - 1]).substring(0, 100));
        }
        renderMessages(messages);
    } catch (e) {
        debugLog('loadMessages ERROR: ' + e.message);
        console.error('Failed to load messages:', e);
    }
}

function renderMessages(messages) {
    debugLog('renderMessages called with ' + messages.length + ' messages');
    const container = document.getElementById('messagesContainer');
    debugLog('Container found: ' + !!container);

    // Sort by timestamp
    messages.sort((a, b) => a.timestamp - b.timestamp);

    // Build HTML string using CSS classes (not inline styles which may be blocked by CSP)
    let html = '';
    messages.forEach((msg, idx) => {
        debugLog('Rendering message ' + idx + ': ' + (msg.content || '').substring(0, 30));

        const date = new Date(msg.timestamp);
        const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        let statusText = timeStr;
        if (msg.status === 'failed') {
            // Show error reason if available
            const errorReason = msg.error ? ` (${msg.error})` : '';
            statusText = `⚠ Failed${errorReason} - ${timeStr}`;
        } else if (msg.status === 'sending') {
            statusText = 'Sending...';
        }

        const className = msg.isIncoming ? 'message incoming' : 'message outgoing';
        const bgColor = msg.isIncoming ? '#2a2a35' : '#6366f1';
        const textColor = msg.isIncoming ? '#fff' : '#000';
        const alignSelf = msg.isIncoming ? 'flex-start' : 'flex-end';

        // Use !important inline styles like the working test div
        html += `<div style="
            background-color: ${bgColor} !important;
            color: ${textColor} !important;
            padding: 12px 16px !important;
            margin: 8px 0 !important;
            border-radius: 12px !important;
            max-width: 70% !important;
            align-self: ${alignSelf} !important;
            display: block !important;
            word-wrap: break-word !important;
        ">
            ${msg.content || '[No content]'}
            <div style="font-size: 0.7em !important; opacity: 0.7 !important; margin-top: 5px !important; text-align: right !important;">${statusText}</div>
        </div>`;
    });

    // If no messages, show placeholder
    if (messages.length === 0) {
        html = '<div class="empty-state">No messages yet</div>';
    }

    // Set innerHTML directly
    container.innerHTML = html;
    debugLog('Set innerHTML. Children: ' + container.children.length + ', HTML length: ' + container.innerHTML.length);

    // Scroll to bottom
    container.scrollTop = container.scrollHeight;
}

async function sendMessage() {
    debugLog('sendMessage() called');
    const input = document.getElementById('messageInput');
    const content = input.value.trim();

    debugLog('content: "' + content + '"');
    debugLog('currentContactId: ' + currentContactId);

    if (!content || !currentContactId) {
        debugLog('BLOCKED: content empty=' + !content + ', contact null=' + !currentContactId);
        return;
    }

    input.value = ''; // Clear input immediately for responsiveness

    try {
        debugLog('Calling whisperSendMessage...');
        const result = await window.electronAPI.whisperSendMessage(currentContactId, content, currentTTL);
        debugLog('Send result: ' + JSON.stringify(result));

        // Always reload messages - backend saves them regardless of success/failure
        debugLog('Reloading messages for: ' + currentContactId);
        await loadMessages(currentContactId);

        if (!result.success) {
            debugLog('Send FAILED: ' + result.error);
        }
    } catch (e) {
        debugLog('Send EXCEPTION: ' + e.message);
        console.error('Send failed:', e);
        // Still reload to show any saved messages
        await loadMessages(currentContactId);
    }
}

async function checkNewMessages() {
    if (currentContactId) {
        // Just reload current chat for now
        // In a real app, we'd check for specific updates or use events
        loadMessages(currentContactId);
    }

    // Also check for new contacts/network status info if needed
    try {
        const info = await window.electronAPI.whisperGetInfo();
        console.log('Whisper status:', info); // Debug log

        if (info && info.onionAddress && !myOnionAddress) {
            myOnionAddress = info.onionAddress;
            document.getElementById('myOnionId').textContent = myOnionAddress;
            document.getElementById('myOnionId').style.color = '#03dac6'; // Green/Teal indicating ready
        } else if (info.error) {
            showErrorState(info.error);
        }
    } catch (e) {
        console.error('Polling error:', e);
    }
}

// Update Tor status indicator
async function updateTorStatus() {
    const statusContainer = document.getElementById('torStatus');
    const statusDot = document.getElementById('torStatusDot');
    const statusText = document.getElementById('torStatusText');

    if (!statusContainer || !statusDot || !statusText) return;

    try {
        const info = await window.electronAPI.whisperGetInfo();

        if (info && info.onionAddress) {
            // Tor is connected and hidden service is set up
            statusContainer.style.background = 'rgba(100, 255, 100, 0.2)';
            statusContainer.style.borderColor = '#66ff66';
            statusDot.style.background = '#66ff66';
            statusText.textContent = 'Tor: Connected';
            statusText.style.color = '#66ff66';
        } else if (info && info.error) {
            // Tor has an error
            statusContainer.style.background = 'rgba(255, 100, 100, 0.2)';
            statusContainer.style.borderColor = '#ff6666';
            statusDot.style.background = '#ff6666';
            statusText.textContent = 'Tor: ' + info.error;
            statusText.style.color = '#ff6666';
        } else {
            // Tor is initializing
            statusContainer.style.background = 'rgba(255, 200, 100, 0.2)';
            statusContainer.style.borderColor = '#ffcc66';
            statusDot.style.background = '#ffcc66';
            statusText.textContent = 'Tor: Initializing...';
            statusText.style.color = '#ffcc66';
        }
    } catch (e) {
        statusContainer.style.background = 'rgba(255, 100, 100, 0.2)';
        statusContainer.style.borderColor = '#ff6666';
        statusDot.style.background = '#ff6666';
        statusText.textContent = 'Tor: Error';
        statusText.style.color = '#ff6666';
    }
}

function setupEventListeners() {
    // Send button
    const sendBtn = document.getElementById('sendBtn');
    const messageInput = document.getElementById('messageInput');

    debugLog('SETUP: sendBtn found=' + !!sendBtn);
    debugLog('SETUP: messageInput found=' + !!messageInput);

    if (sendBtn) {
        sendBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            debugLog('CLICK: Send button clicked!');
            sendMessage();
            if (messageInput) messageInput.focus();
        });
        debugLog('SETUP: Click listener attached');
    } else {
        debugLog('ERROR: sendBtn NOT FOUND!');
    }

    if (messageInput) {
        messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                e.stopPropagation();
                debugLog('KEYDOWN: Enter pressed!');
                sendMessage();
            }
        });
        debugLog('SETUP: Keydown listener attached');
    } else {
        debugLog('ERROR: messageInput NOT FOUND!');
    }

    // Add Contact Modal
    const modal = document.getElementById('addContactModal');
    const addContactBtn = document.getElementById('addContactBtn');
    if (addContactBtn) {
        addContactBtn.addEventListener('click', () => {
            modal.style.display = 'flex';
            const nameInput = document.getElementById('newContactName');
            if (nameInput) setTimeout(() => nameInput.focus(), 50);
        });
    }

    const cancelAddBtn = document.getElementById('cancelAddContact');
    if (cancelAddBtn) {
        cancelAddBtn.addEventListener('click', () => {
            modal.style.display = 'none';
            document.getElementById('newContactName').value = '';
            document.getElementById('newContactOnion').value = '';
        });
    }

    const confirmAddBtn = document.getElementById('confirmAddContact');
    if (confirmAddBtn) {
        confirmAddBtn.addEventListener('click', async () => {
            const name = document.getElementById('newContactName').value.trim();
            const onion = document.getElementById('newContactOnion').value.trim();

            if (name && onion) {
                await window.electronAPI.whisperAddContact(onion, name);
                modal.style.display = 'none';
                document.getElementById('newContactName').value = '';
                document.getElementById('newContactOnion').value = '';
                loadContacts();
            }
        });
    }

    // Copy ID on click
    const myOnionId = document.getElementById('myOnionId');
    if (myOnionId) {
        myOnionId.addEventListener('click', () => {
            if (myOnionAddress) {
                window.electronAPI.clipboardWriteText(myOnionAddress);
                const original = myOnionId.textContent;
                myOnionId.textContent = 'Copied!';
                setTimeout(() => {
                    myOnionId.textContent = original;
                }, 1500);
            }
        });
    }

    // Beta Banner Dismiss
    const betaBanner = document.getElementById('betaBanner');
    const betaBannerClose = document.getElementById('betaBannerClose');
    if (betaBannerClose && betaBanner) {
        // Check if user has previously dismissed the banner
        const bannerDismissed = localStorage.getItem('whisperBetaBannerDismissed');
        if (bannerDismissed === 'true') {
            betaBanner.classList.add('hidden');
        }

        betaBannerClose.addEventListener('click', () => {
            betaBanner.classList.add('hidden');
            localStorage.setItem('whisperBetaBannerDismissed', 'true');
        });
    }

    // Window Controls
    setupWindowControls();
}

function showErrorState(error) {
    const idEl = document.getElementById('myOnionId');
    idEl.innerHTML = `<span style="color: #ff5f56">Error: ${error}</span> <button id="retryBtn" style="background:none; border:1px solid #666; color:#fff; cursor:pointer; font-size:0.8em; padding:2px 6px; border-radius:4px;">Retry</button>`;

    const retryBtn = document.getElementById('retryBtn');
    if (retryBtn) {
        retryBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            idEl.textContent = 'Retrying...';
            try {
                const result = await window.electronAPI.whisperRetryInit();
                if (result.success && result.address) {
                    myOnionAddress = result.address;
                    idEl.textContent = myOnionAddress;
                } else {
                    showErrorState(result.error || 'Unknown error');
                }
            } catch (retryErr) {
                showErrorState(retryErr.message);
            }
        });
    }
}

async function setupWindowControls() {
    try {
        const windowId = await window.electronAPI.getWindowId();

        const minBtn = document.getElementById('minBtn');
        if (minBtn) {
            minBtn.addEventListener('click', () => {
                window.electronAPI.appWindowMinimize(windowId);
            });
        }

        const maxBtn = document.getElementById('maxBtn');
        if (maxBtn) {
            maxBtn.addEventListener('click', () => {
                window.electronAPI.appWindowMaximize(windowId);
            });
        }

        const closeBtn = document.getElementById('closeBtn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                window.electronAPI.appWindowClose(windowId);
            });
        }
    } catch (e) {
        console.error('Failed to setup window controls:', e);
    }
}
