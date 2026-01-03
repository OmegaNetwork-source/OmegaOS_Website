let aiSidebarCollapsed = false;

function setupAIFeatures() {
    const aiImproveBtn = document.getElementById('aiImproveBtn');
    const aiSidebar = document.getElementById('aiSidebar');
    const aiSidebarToggle = document.getElementById('aiSidebarToggle');
    const aiChatInput = document.getElementById('aiChatInput');
    const aiChatSend = document.getElementById('aiChatSend');
    const aiChatMessages = document.getElementById('aiChatMessages');
    const aiWelcomeMessage = document.querySelector('.ai-welcome-message');

    if (!aiImproveBtn || !aiSidebar || !aiSidebarToggle || !aiChatInput || !aiChatSend) {
        console.error('AI elements not found in DOM');
        return;
    }

    // Toggle sidebar when AI button is clicked
    aiImproveBtn.addEventListener('click', () => {
        aiSidebarCollapsed = !aiSidebarCollapsed;
        if (aiSidebarCollapsed) {
            aiSidebar.classList.add('collapsed');
        } else {
            aiSidebar.classList.remove('collapsed');
            aiChatInput.focus();
        }
    });

    // Toggle sidebar with toggle button
    aiSidebarToggle.addEventListener('click', () => {
        aiSidebarCollapsed = !aiSidebarCollapsed;
        if (aiSidebarCollapsed) {
            aiSidebar.classList.add('collapsed');
        } else {
            aiSidebar.classList.remove('collapsed');
            aiChatInput.focus();
        }
    });

    // Add message to chat
    function addAIMessage(role, content, isThinking = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `ai-chat-message ${role} ${isThinking ? 'thinking' : ''}`;
        const contentDiv = document.createElement('div');
        contentDiv.className = 'ai-chat-message-content';
        contentDiv.textContent = content;
        messageDiv.appendChild(contentDiv);
        aiChatMessages.appendChild(messageDiv);
        aiChatMessages.scrollTop = aiChatMessages.scrollHeight;
        return messageDiv;
    }

    // Send message function
    async function sendAIMessage() {
        const message = aiChatInput.value.trim();
        if (!message || !window.electronAPI) return;

        // Remove welcome message
        if (aiWelcomeMessage && aiWelcomeMessage.parentElement) {
            aiWelcomeMessage.remove();
        }

        // Add user message
        addAIMessage('user', message);
        aiChatInput.value = '';
        aiChatInput.disabled = true;
        aiChatSend.disabled = true;

        // Show thinking indicator
        const thinkingDiv = addAIMessage('assistant', 'Thinking...', true);

        try {
            const editor = document.getElementById('editor');
            const currentText = editor.innerText || editor.textContent || '';

            // Determine if this is a generation request or improvement request
            const lowerMessage = message.toLowerCase();
            const isGeneration = lowerMessage.includes('write') || lowerMessage.includes('create') || 
                                 lowerMessage.includes('generate') || lowerMessage.includes('paper') ||
                                 lowerMessage.includes('essay') || lowerMessage.includes('article');

            let result;
            if (isGeneration) {
                // Use chat API for generation requests
                if (window.electronAPI.aiChat) {
                    result = await window.electronAPI.aiChat(message, []);
                } else {
                    throw new Error('AI chat not available');
                }
            } else {
                // Use improve text API for improvement requests
                if (currentText) {
                    // Determine task type from message
                    let taskType = 'improve';
                    let style = 'neutral';
                    if (lowerMessage.includes('rewrite')) taskType = 'rewrite';
                    if (lowerMessage.includes('expand')) taskType = 'expand';
                    if (lowerMessage.includes('summarize') || lowerMessage.includes('shorter')) taskType = 'summarize';
                    if (lowerMessage.includes('professional')) style = 'professional';
                    
                    result = await window.electronAPI.aiImproveText(currentText, style, taskType);
                } else {
                    // No text to improve, use chat API
                    result = await window.electronAPI.aiChat(message, []);
                }
            }

            thinkingDiv.remove();

            if (result && result.success) {
                const response = result.response || result.summary;
                addAIMessage('assistant', response);

                // If it's a generation request, insert the text into the editor
                if (isGeneration && response) {
                    editor.textContent = response;
                    hasUnsavedChanges = true;
                    updateWindowTitle();
                }
            } else {
                addAIMessage('assistant', 'Error: ' + (result?.error || 'Failed to process request'));
            }
        } catch (error) {
            thinkingDiv.remove();
            console.error('AI error:', error);
            addAIMessage('assistant', 'Error: ' + error.message);
        } finally {
            aiChatInput.disabled = false;
            aiChatSend.disabled = false;
            aiChatInput.focus();
        }
    }

    // Send button click
    aiChatSend.addEventListener('click', sendAIMessage);

    // Enter key to send
    aiChatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendAIMessage();
        }
    });
}

