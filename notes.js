// Omega Notes Application - Notepad++-like editor
let currentWindowId = null;
let tabs = [];
let activeTabId = null;
let currentTheme = localStorage.getItem('notes-theme') || 'dark';
let wordWrap = localStorage.getItem('notes-word-wrap') === 'true';
let showWhitespace = localStorage.getItem('notes-show-whitespace') === 'true';
let fontSize = parseInt(localStorage.getItem('notes-font-size')) || 14;
let findReplaceDialog = null;
let findMatches = [];
let findMatchIndex = -1;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Get window ID
    if (window.electronAPI) {
        window.electronAPI.onWindowId((windowId) => {
            currentWindowId = windowId;
        });
        
        // Listen for open file event
        window.electronAPI.onOpenFile((filePath) => {
            openFileInNewTab(filePath);
        });
    }

    // Apply saved theme
    applyTheme(currentTheme);
    applyWordWrap(wordWrap);
    applyFontSize(fontSize);

    // Window Controls
    setupWindowControls();

    // Setup menus
    setupMenus();

    // Setup toolbar
    setupToolbar();

    // Setup editor
    setupEditor();

    // Setup tabs
    createNewTab();

    // Setup find/replace
    setupFindReplace();

    // Keyboard shortcuts
    setupKeyboardShortcuts();

    // Multiple ways to create tabs
    setupTabCreation();
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
        if (hasUnsavedTabs()) {
            if (confirm('You have unsaved changes. Close anyway?')) {
                if (currentWindowId && window.electronAPI) {
                    window.electronAPI.appWindowClose(currentWindowId);
                }
            }
        } else {
            if (currentWindowId && window.electronAPI) {
                window.electronAPI.appWindowClose(currentWindowId);
            }
        }
    });
}

function setupMenus() {
    // File menu
    const fileMenuBtn = document.getElementById('fileMenuBtn');
    const fileMenuDropdown = document.getElementById('fileMenuDropdown');
    
    fileMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeAllMenus();
        fileMenuDropdown.classList.toggle('show');
    });

    document.getElementById('fileMenuNew').addEventListener('click', () => {
        closeAllMenus();
        createNewTab();
    });

    document.getElementById('fileMenuOpen').addEventListener('click', () => {
        closeAllMenus();
        openFile();
    });

    document.getElementById('fileMenuSave').addEventListener('click', () => {
        closeAllMenus();
        saveCurrentTab();
    });

    document.getElementById('fileMenuSaveAs').addEventListener('click', () => {
        closeAllMenus();
        saveCurrentTabAs();
    });

    document.getElementById('fileMenuCloseTab').addEventListener('click', () => {
        closeAllMenus();
        closeCurrentTab();
    });

    // Edit menu
    const editMenuBtn = document.getElementById('editMenuBtn');
    const editMenuDropdown = document.getElementById('editMenuDropdown');
    
    editMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeAllMenus();
        editMenuDropdown.classList.toggle('show');
    });

    document.getElementById('editMenuUndo').addEventListener('click', () => {
        closeAllMenus();
        document.execCommand('undo');
    });

    document.getElementById('editMenuRedo').addEventListener('click', () => {
        closeAllMenus();
        document.execCommand('redo');
    });

    document.getElementById('editMenuCut').addEventListener('click', () => {
        closeAllMenus();
        document.execCommand('cut');
    });

    document.getElementById('editMenuCopy').addEventListener('click', () => {
        closeAllMenus();
        document.execCommand('copy');
    });

    document.getElementById('editMenuPaste').addEventListener('click', () => {
        closeAllMenus();
        document.execCommand('paste');
    });

    document.getElementById('editMenuFind').addEventListener('click', () => {
        closeAllMenus();
        showFindReplace('find');
    });

    document.getElementById('editMenuReplace').addEventListener('click', () => {
        closeAllMenus();
        showFindReplace('replace');
    });

    document.getElementById('editMenuSelectAll').addEventListener('click', () => {
        closeAllMenus();
        getCurrentEditor().select();
    });

    // View menu
    const viewMenuBtn = document.getElementById('viewMenuBtn');
    const viewMenuDropdown = document.getElementById('viewMenuDropdown');
    
    viewMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeAllMenus();
        viewMenuDropdown.classList.toggle('show');
    });

    document.getElementById('viewMenuWordWrap').addEventListener('click', () => {
        closeAllMenus();
        toggleWordWrap();
    });

    document.getElementById('viewMenuShowWhitespace').addEventListener('click', () => {
        closeAllMenus();
        toggleShowWhitespace();
    });

    document.getElementById('viewMenuZoomIn').addEventListener('click', () => {
        closeAllMenus();
        zoomIn();
    });

    document.getElementById('viewMenuZoomOut').addEventListener('click', () => {
        closeAllMenus();
        zoomOut();
    });

    document.getElementById('viewMenuZoomReset').addEventListener('click', () => {
        closeAllMenus();
        resetZoom();
    });

    // Theme submenu
    const themeSubmenu = document.getElementById('themeSubmenu');
    themeSubmenu.querySelectorAll('.file-menu-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            const theme = item.dataset.theme;
            applyTheme(theme);
            currentTheme = theme;
            localStorage.setItem('notes-theme', theme);
        });
    });

    // Language menu
    const languageMenuBtn = document.getElementById('languageMenuBtn');
    const languageMenuDropdown = document.getElementById('languageMenuDropdown');
    
    languageMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeAllMenus();
        languageMenuDropdown.classList.toggle('show');
    });

    languageMenuDropdown.querySelectorAll('.file-menu-item').forEach(item => {
        item.addEventListener('click', () => {
            const lang = item.dataset.lang;
            setLanguageForCurrentTab(lang);
            closeAllMenus();
        });
    });

    // Close menus when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.file-menu-container') && 
            !e.target.closest('.edit-menu-container') &&
            !e.target.closest('.view-menu-container') &&
            !e.target.closest('.language-menu-container')) {
            closeAllMenus();
        }
    });
}

function closeAllMenus() {
    document.querySelectorAll('.file-menu-dropdown').forEach(menu => {
        menu.classList.remove('show');
    });
}

function setupToolbar() {
    document.getElementById('newBtn').addEventListener('click', () => createNewTab());
    document.getElementById('openBtn').addEventListener('click', () => openFile());
    document.getElementById('saveBtn').addEventListener('click', () => saveCurrentTab());
    document.getElementById('findBtn').addEventListener('click', () => showFindReplace('find'));
    document.getElementById('replaceBtn').addEventListener('click', () => showFindReplace('replace'));
    document.getElementById('wordWrapBtn').addEventListener('click', () => toggleWordWrap());
    
    document.getElementById('languageSelect').addEventListener('change', (e) => {
        setLanguageForCurrentTab(e.target.value);
    });
}

function setupEditor() {
    const editor = document.getElementById('editor');
    
    editor.addEventListener('input', () => {
        const tab = getCurrentTab();
        if (tab) {
            tab.content = editor.value;
            tab.modified = true;
            updateTabTitle(tab.id);
            updateLineNumbers();
            updateStatusBar();
            applySyntaxHighlighting();
        }
    });

    editor.addEventListener('scroll', () => {
        syncLineNumbers();
    });

    editor.addEventListener('keydown', (e) => {
        // Tab key inserts spaces
        if (e.key === 'Tab') {
            e.preventDefault();
            const start = editor.selectionStart;
            const end = editor.selectionEnd;
            const tabSpaces = '    '; // 4 spaces
            
            // Insert tab spaces
            const beforeText = editor.value.substring(0, start);
            const afterText = editor.value.substring(end);
            editor.value = beforeText + tabSpaces + afterText;
            
            // Set cursor position after the inserted tab
            const newPos = start + tabSpaces.length;
            // Use setTimeout to ensure the value is set before setting selection
            setTimeout(() => {
                editor.setSelectionRange(newPos, newPos);
                editor.focus();
            }, 0);
            
            // Manually trigger input event to update tab content and line numbers
            const inputEvent = new Event('input', { bubbles: true, cancelable: true });
            editor.dispatchEvent(inputEvent);
        }
    });

    editor.addEventListener('selectionchange', updateStatusBar);
    editor.addEventListener('keyup', updateStatusBar);
    editor.addEventListener('click', updateStatusBar);
}

function setupFindReplace() {
    findReplaceDialog = document.getElementById('findReplaceDialog');
    
    // Tab switching
    document.querySelectorAll('.find-replace-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const mode = tab.dataset.mode;
            switchFindReplaceMode(mode);
        });
    });

    // Close button
    document.getElementById('findReplaceClose').addEventListener('click', () => {
        hideFindReplace();
    });

    // Find buttons
    document.getElementById('findNextBtn').addEventListener('click', () => {
        findNext();
    });

    document.getElementById('findPrevBtn').addEventListener('click', () => {
        findPrevious();
    });

    // Find input
    document.getElementById('findInput').addEventListener('input', () => {
        findMatchIndex = -1;
        performFind();
    });

    document.getElementById('findInput').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            findNext();
        } else if (e.key === 'Escape') {
            hideFindReplace();
        }
    });

    // Replace buttons
    document.getElementById('replaceCurrentBtn').addEventListener('click', () => {
        replaceCurrent();
    });

    document.getElementById('replaceAllBtn').addEventListener('click', () => {
        replaceAll();
    });
}

function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        const activeElement = document.activeElement;
        const isInputActive = activeElement && (
            activeElement.tagName === 'INPUT' || 
            activeElement.tagName === 'TEXTAREA'
        );
        
        if (isInputActive && activeElement.id !== 'editor' && activeElement.id !== 'findInput' && activeElement.id !== 'replaceInput') {
            return;
        }

        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            saveCurrentTab();
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            e.preventDefault();
            createNewTab();
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
            e.preventDefault();
            openFile();
        }
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'S') {
            e.preventDefault();
            saveCurrentTabAs();
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'w') {
            e.preventDefault();
            closeCurrentTab();
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
            e.preventDefault();
            showFindReplace('find');
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'h') {
            e.preventDefault();
            showFindReplace('replace');
        }
        if ((e.ctrlKey || e.metaKey) && e.key === '=' || (e.ctrlKey || e.metaKey) && e.key === '+') {
            e.preventDefault();
            zoomIn();
        }
        if ((e.ctrlKey || e.metaKey) && e.key === '-') {
            e.preventDefault();
            zoomOut();
        }
        if ((e.ctrlKey || e.metaKey) && e.key === '0') {
            e.preventDefault();
            resetZoom();
        }
        if ((e.ctrlKey || e.metaKey) && e.altKey && e.key === 'w') {
            e.preventDefault();
            toggleWordWrap();
        }
        // Ctrl+T to create new tab
        if ((e.ctrlKey || e.metaKey) && e.key === 't') {
            e.preventDefault();
            createNewTab();
        }
    });
}

function setupTabCreation() {
    const tabsDiv = document.getElementById('tabs');
    
    // Double-click on empty space in tab bar to create new tab
    tabsDiv.addEventListener('dblclick', (e) => {
        // Only if clicking on empty space, not on a tab
        if (e.target === tabsDiv || !e.target.closest('.tab')) {
            createNewTab();
        }
    });
}

// Tab Management
function createNewTab(filePath = null, content = '', language = 'plaintext') {
    const tabId = Date.now();
    const fileName = filePath ? filePath.split(/[\\/]/).pop() : 'Untitled';
    
    const tab = {
        id: tabId,
        fileName: fileName,
        filePath: filePath,
        content: content,
        language: language,
        modified: false
    };
    
    tabs.push(tab);
    activeTabId = tabId;
    
    createTabElement(tab);
    switchToTab(tabId);
    
    return tabId;
}

function createTabElement(tab) {
    const tabsContainer = document.getElementById('tabs');
    const tabElement = document.createElement('div');
    tabElement.className = 'tab';
    tabElement.dataset.tabId = tab.id;
    tabElement.innerHTML = `
        <span class="tab-title">${tab.fileName}</span>
        <button class="tab-close" data-tab-id="${tab.id}">×</button>
    `;
    
    tabElement.addEventListener('click', (e) => {
        if (!e.target.classList.contains('tab-close')) {
            switchToTab(tab.id);
        }
    });
    
    tabElement.querySelector('.tab-close').addEventListener('click', (e) => {
        e.stopPropagation();
        closeTab(tab.id);
    });
    
    tabsContainer.appendChild(tabElement);
    updateTabTitle(tab.id);
}

function switchToTab(tabId) {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return;
    
    activeTabId = tabId;
    
    // Update tab elements
    document.querySelectorAll('.tab').forEach(el => {
        el.classList.remove('active');
        if (parseInt(el.dataset.tabId) === tabId) {
            el.classList.add('active');
        }
    });
    
    // Update editor
    const editor = document.getElementById('editor');
    editor.value = tab.content;
    editor.dataset.tabId = tabId;
    
    // Update language selector
    document.getElementById('languageSelect').value = tab.language;
    document.getElementById('languageDisplay').textContent = getLanguageName(tab.language);
    
    // Update UI
    updateLineNumbers();
    updateStatusBar();
    applySyntaxHighlighting();
    
    // Focus editor
    editor.focus();
}

function closeTab(tabId) {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return;
    
    if (tab.modified) {
        if (!confirm(`Save changes to ${tab.fileName}?`)) {
            if (!confirm('Close without saving?')) {
                return;
            }
        } else {
            saveTab(tab);
        }
    }
    
    // Remove tab from array
    tabs = tabs.filter(t => t.id !== tabId);
    
    // Remove tab element
    const tabElement = document.querySelector(`.tab[data-tab-id="${tabId}"]`);
    if (tabElement) {
        tabElement.remove();
    }
    
    // Switch to another tab if this was active
    if (activeTabId === tabId) {
        if (tabs.length > 0) {
            switchToTab(tabs[tabs.length - 1].id);
        } else {
            createNewTab();
        }
    }
}

function closeCurrentTab() {
    if (activeTabId) {
        closeTab(activeTabId);
    }
}

function getCurrentTab() {
    return tabs.find(t => t.id === activeTabId);
}

function getCurrentEditor() {
    return document.getElementById('editor');
}

function updateTabTitle(tabId) {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return;
    
    const tabElement = document.querySelector(`.tab[data-tab-id="${tabId}"]`);
    if (tabElement) {
        const titleElement = tabElement.querySelector('.tab-title');
        titleElement.textContent = tab.fileName;
        
        if (tab.modified) {
            tabElement.classList.add('modified');
        } else {
            tabElement.classList.remove('modified');
        }
    }
}

function hasUnsavedTabs() {
    return tabs.some(t => t.modified);
}

// File Operations
async function openFile() {
    if (window.electronAPI && window.electronAPI.openFileDialog) {
        try {
            const result = await window.electronAPI.openFileDialog({
                filters: [
                    { name: 'All Files', extensions: ['*'] },
                    { name: 'Text Files', extensions: ['txt', 'md', 'log'] },
                    { name: 'Code Files', extensions: ['js', 'ts', 'py', 'java', 'cpp', 'c', 'cs', 'html', 'css', 'json', 'xml', 'php', 'rb', 'go', 'rs', 'sh'] }
                ]
            });
            if (result && !result.canceled && result.filePaths && result.filePaths.length > 0) {
                await openFileInNewTab(result.filePaths[0]);
            }
        } catch (error) {
            console.error('Error opening file:', error);
            alert('Error opening file: ' + error.message);
        }
    }
}

async function openFileInNewTab(filePath) {
    try {
        if (window.electronAPI && window.electronAPI.readFile) {
            const content = await window.electronAPI.readFile(filePath);
            const language = detectLanguage(filePath);
            createNewTab(filePath, content, language);
        }
    } catch (error) {
        console.error('Error loading file:', error);
        alert('Error loading file: ' + error.message);
    }
}

async function saveCurrentTab() {
    const tab = getCurrentTab();
    if (!tab) return;
    
    if (tab.filePath) {
        await saveTab(tab);
    } else {
        await saveCurrentTabAs();
    }
}

async function saveCurrentTabAs() {
    const tab = getCurrentTab();
    if (!tab) return;
    
    if (window.electronAPI && window.electronAPI.saveFileDialog) {
        try {
            const result = await window.electronAPI.saveFileDialog({
                defaultPath: tab.fileName,
                filters: [
                    { name: 'All Files', extensions: ['*'] },
                    { name: 'Text Files', extensions: ['txt'] },
                    { name: 'Code Files', extensions: ['js', 'ts', 'py', 'java', 'cpp', 'c', 'cs', 'html', 'css', 'json', 'xml'] }
                ]
            });
            if (result && !result.canceled && result.filePath) {
                tab.filePath = result.filePath;
                tab.fileName = result.filePath.split(/[\\/]/).pop();
                await saveTab(tab);
            }
        } catch (error) {
            console.error('Error saving file:', error);
            alert('Error saving file: ' + error.message);
        }
    }
}

async function saveTab(tab) {
    const editor = getCurrentEditor();
    tab.content = editor.value;
    
    if (window.electronAPI && window.electronAPI.writeFile) {
        try {
            await window.electronAPI.writeFile(tab.filePath, tab.content);
            tab.modified = false;
            updateTabTitle(tab.id);
        } catch (error) {
            console.error('Error saving file:', error);
            alert('Error saving file: ' + error.message);
        }
    }
}

// Line Numbers
function updateLineNumbers() {
    const editor = getCurrentEditor();
    const lineNumbers = document.getElementById('lineNumbers');
    if (!editor || !lineNumbers) return;
    
    const text = editor.value;
    const lines = text.split('\n');
    
    // Calculate the number of lines needed (ensure at least 1 line is shown)
    const lineCount = Math.max(lines.length, 1);
    
    // Build line numbers - use textContent to preserve formatting
    let numbersText = '';
    for (let i = 1; i <= lineCount; i++) {
        numbersText += i + '\n';
    }
    
    // Remove trailing newline if present
    if (numbersText.endsWith('\n')) {
        numbersText = numbersText.slice(0, -1);
    }
    
    // Update line numbers content
    lineNumbers.textContent = numbersText;
    
    // Sync scroll position after DOM update
    requestAnimationFrame(() => {
        syncLineNumbers();
    });
}

function syncLineNumbers() {
    const editor = getCurrentEditor();
    const lineNumbers = document.getElementById('lineNumbers');
    if (!editor || !lineNumbers) return;
    
    // Sync scroll position to keep line numbers aligned with editor
    lineNumbers.scrollTop = editor.scrollTop;
}

// Status Bar
function updateStatusBar() {
    const editor = getCurrentEditor();
    const text = editor.value;
    const cursorPos = editor.selectionStart;
    const textBeforeCursor = text.substring(0, cursorPos);
    const line = textBeforeCursor.split('\n').length;
    const column = textBeforeCursor.split('\n').pop().length + 1;
    
    document.getElementById('lineNumber').textContent = line;
    document.getElementById('columnNumber').textContent = column;
    document.getElementById('charCount').textContent = text.length;
    
    const tab = getCurrentTab();
    if (tab) {
        document.getElementById('languageDisplay').textContent = getLanguageName(tab.language);
    }
}

// Syntax Highlighting
function applySyntaxHighlighting() {
    const tab = getCurrentTab();
    if (!tab || tab.language === 'plaintext') return;
    
    // Basic syntax highlighting using regex
    // This is a simplified version - for production, consider using a library like Prism.js
    const editor = getCurrentEditor();
    const content = editor.value;
    
    // Store cursor position
    const cursorPos = editor.selectionStart;
    
    // Apply basic highlighting patterns based on language
    // Note: This is a basic implementation. For full syntax highlighting, use a library.
    // For now, we'll just update the overlay for visual feedback
    
    // In a real implementation, you'd use a proper syntax highlighter
    // This is a placeholder that shows the structure
}

function setLanguageForCurrentTab(language) {
    const tab = getCurrentTab();
    if (tab) {
        tab.language = language;
        document.getElementById('languageSelect').value = language;
        document.getElementById('languageDisplay').textContent = getLanguageName(language);
        applySyntaxHighlighting();
    }
}

function detectLanguage(filePath) {
    const ext = filePath.toLowerCase().split('.').pop();
    const languageMap = {
        'js': 'javascript',
        'jsx': 'javascript',
        'ts': 'typescript',
        'tsx': 'typescript',
        'py': 'python',
        'java': 'java',
        'cpp': 'cpp',
        'cc': 'cpp',
        'cxx': 'cpp',
        'c': 'c',
        'cs': 'csharp',
        'html': 'html',
        'htm': 'html',
        'css': 'css',
        'json': 'json',
        'xml': 'xml',
        'md': 'markdown',
        'sql': 'sql',
        'sh': 'bash',
        'bash': 'bash',
        'php': 'php',
        'rb': 'ruby',
        'go': 'go',
        'rs': 'rust'
    };
    return languageMap[ext] || 'plaintext';
}

function getLanguageName(language) {
    const names = {
        'plaintext': 'Plain Text',
        'javascript': 'JavaScript',
        'typescript': 'TypeScript',
        'python': 'Python',
        'java': 'Java',
        'cpp': 'C++',
        'c': 'C',
        'csharp': 'C#',
        'html': 'HTML',
        'css': 'CSS',
        'json': 'JSON',
        'xml': 'XML',
        'markdown': 'Markdown',
        'sql': 'SQL',
        'bash': 'Bash',
        'php': 'PHP',
        'ruby': 'Ruby',
        'go': 'Go',
        'rust': 'Rust'
    };
    return names[language] || 'Plain Text';
}

// Find/Replace
function showFindReplace(mode = 'find') {
    findReplaceDialog.classList.add('show');
    switchFindReplaceMode(mode);
    document.getElementById('findInput').focus();
    document.getElementById('findInput').select();
}

function hideFindReplace() {
    findReplaceDialog.classList.remove('show');
    getCurrentEditor().focus();
}

function switchFindReplaceMode(mode) {
    document.querySelectorAll('.find-replace-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.mode === mode);
    });
    
    document.getElementById('findSection').style.display = mode === 'find' ? 'block' : 'block';
    document.getElementById('replaceSection').style.display = mode === 'replace' ? 'block' : 'none';
}

function performFind() {
    const editor = getCurrentEditor();
    const searchTerm = document.getElementById('findInput').value;
    const caseSensitive = document.getElementById('findCaseSensitive').checked;
    const wholeWord = document.getElementById('findWholeWord').checked;
    const useRegex = document.getElementById('findRegex').checked;
    
    if (!searchTerm) {
        document.getElementById('findReplaceStatus').textContent = '';
        findMatches = [];
        return;
    }
    
    const text = editor.value;
    findMatches = [];
    
    try {
        let regex;
        if (useRegex) {
            regex = new RegExp(searchTerm, caseSensitive ? 'g' : 'gi');
        } else {
            const escaped = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            regex = new RegExp(wholeWord ? `\\b${escaped}\\b` : escaped, caseSensitive ? 'g' : 'gi');
        }
        
        let match;
        while ((match = regex.exec(text)) !== null) {
            findMatches.push(match.index);
        }
        
        if (findMatches.length === 0) {
            document.getElementById('findReplaceStatus').textContent = 'No matches found';
        } else {
            document.getElementById('findReplaceStatus').textContent = `${findMatches.length} match${findMatches.length !== 1 ? 'es' : ''} found`;
        }
    } catch (error) {
        document.getElementById('findReplaceStatus').textContent = 'Invalid regex';
    }
}

function findNext() {
    if (findMatches.length === 0) {
        performFind();
    }
    
    if (findMatches.length === 0) return;
    
    findMatchIndex = (findMatchIndex + 1) % findMatches.length;
    selectMatch(findMatches[findMatchIndex], document.getElementById('findInput').value.length);
    document.getElementById('findReplaceStatus').textContent = `${findMatchIndex + 1} of ${findMatches.length}`;
}

function findPrevious() {
    if (findMatches.length === 0) {
        performFind();
    }
    
    if (findMatches.length === 0) return;
    
    findMatchIndex = (findMatchIndex - 1 + findMatches.length) % findMatches.length;
    selectMatch(findMatches[findMatchIndex], document.getElementById('findInput').value.length);
    document.getElementById('findReplaceStatus').textContent = `${findMatchIndex + 1} of ${findMatches.length}`;
}

function selectMatch(index, length) {
    const editor = getCurrentEditor();
    editor.focus();
    editor.setSelectionRange(index, index + length);
    editor.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function replaceCurrent() {
    const editor = getCurrentEditor();
    const findText = document.getElementById('findInput').value;
    const replaceText = document.getElementById('replaceInput').value;
    
    if (editor.selectionStart !== editor.selectionEnd) {
        const selectedText = editor.value.substring(editor.selectionStart, editor.selectionEnd);
        if (selectedText === findText || selectedText.toLowerCase() === findText.toLowerCase()) {
            editor.value = editor.value.substring(0, editor.selectionStart) + 
                         replaceText + 
                         editor.value.substring(editor.selectionEnd);
            editor.setSelectionRange(editor.selectionStart, editor.selectionStart + replaceText.length);
            
            const tab = getCurrentTab();
            if (tab) {
                tab.content = editor.value;
                tab.modified = true;
                updateTabTitle(tab.id);
            }
            
            findMatchIndex = -1;
            performFind();
            findNext();
        }
    }
}

function replaceAll() {
    const editor = getCurrentEditor();
    const findText = document.getElementById('findInput').value;
    const replaceText = document.getElementById('replaceInput').value;
    const caseSensitive = document.getElementById('findCaseSensitive').checked;
    const wholeWord = document.getElementById('findWholeWord').checked;
    const useRegex = document.getElementById('findRegex').checked;
    
    if (!findText) return;
    
    try {
        let regex;
        if (useRegex) {
            regex = new RegExp(findText, caseSensitive ? 'g' : 'gi');
        } else {
            const escaped = findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            regex = new RegExp(wholeWord ? `\\b${escaped}\\b` : escaped, caseSensitive ? 'g' : 'gi');
        }
        
        const newContent = editor.value.replace(regex, replaceText);
        editor.value = newContent;
        
        const tab = getCurrentTab();
        if (tab) {
            tab.content = newContent;
            tab.modified = true;
            updateTabTitle(tab.id);
        }
        
        document.getElementById('findReplaceStatus').textContent = 'Replaced all matches';
        findMatchIndex = -1;
        performFind();
    } catch (error) {
        document.getElementById('findReplaceStatus').textContent = 'Invalid regex';
    }
}

// View Options
function toggleWordWrap() {
    wordWrap = !wordWrap;
    applyWordWrap(wordWrap);
    localStorage.setItem('notes-word-wrap', wordWrap);
    document.getElementById('wordWrapBtn').classList.toggle('active', wordWrap);
}

function applyWordWrap(enabled) {
    const editor = getCurrentEditor();
    if (enabled) {
        editor.classList.add('word-wrap');
    } else {
        editor.classList.remove('word-wrap');
    }
}

function toggleShowWhitespace() {
    showWhitespace = !showWhitespace;
    localStorage.setItem('notes-show-whitespace', showWhitespace);
    // This would require a more complex implementation to show whitespace characters
}

function zoomIn() {
    fontSize = Math.min(fontSize + 2, 48);
    applyFontSize(fontSize);
}

function zoomOut() {
    fontSize = Math.max(fontSize - 2, 8);
    applyFontSize(fontSize);
}

function resetZoom() {
    fontSize = 14;
    applyFontSize(fontSize);
}

function applyFontSize(size) {
    const editor = getCurrentEditor();
    const lineNumbers = document.getElementById('lineNumbers');
    editor.style.fontSize = size + 'px';
    lineNumbers.style.fontSize = size + 'px';
    localStorage.setItem('notes-font-size', size);
    updateLineNumbers();
}

function applyTheme(theme) {
    document.body.className = `theme-${theme}`;
    currentTheme = theme;
}

// Initialize line numbers (will be called after first tab is created)
// updateLineNumbers() is already called in createNewTab() and switchToTab()

