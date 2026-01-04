// Omega Word Application
let currentWindowId = null;
let documentContent = '';
let currentFileName = null;
let hasUnsavedChanges = false;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Get window ID
    if (window.electronAPI) {
        window.electronAPI.onWindowId((windowId) => {
            currentWindowId = windowId;
        });
        
        // Listen for open file event
        window.electronAPI.onOpenFile((filePath) => {
            loadFile(filePath);
        });
    }

    // Window Controls
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
        if (hasUnsavedChanges) {
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

    // Ribbon Interface
    setupRibbon();

    // Editor
    setupEditor();

    // File Operations
    setupFileOperations();

    // Theme Toggle
    setupThemeToggle();

    // AI Features
    setupAIFeatures();
});

// Theme Management
let currentTheme = localStorage.getItem('word-theme') || 'light';
document.documentElement.setAttribute('data-theme', currentTheme);

function setupThemeToggle() {
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    if (!themeToggleBtn) {
        console.warn('[WORD] Theme toggle button not found');
        return;
    }
    
    // Set initial icon
    themeToggleBtn.textContent = currentTheme === 'dark' ? '☀️' : '🌙';
    
    themeToggleBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', currentTheme);
        localStorage.setItem('word-theme', currentTheme);
        themeToggleBtn.textContent = currentTheme === 'dark' ? '☀️' : '🌙';
    });
}

// Ribbon Interface Setup
function setupRibbon() {
    // Tab switching
    const ribbonTabs = document.querySelectorAll('.ribbon-tab');
    const ribbonContents = document.querySelectorAll('.ribbon-content');
    
    ribbonTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.dataset.tab;
            
            // Update active tab
            ribbonTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Show/hide content
            ribbonContents.forEach(content => {
                content.classList.add('hidden');
            });
            
            const targetContent = document.getElementById(`ribbon${targetTab.charAt(0).toUpperCase() + targetTab.slice(1)}`);
            if (targetContent) {
                targetContent.classList.remove('hidden');
            }
        });
    });

    // Clipboard buttons
    const ribbonPaste = document.getElementById('ribbonPaste');
    const ribbonCut = document.getElementById('ribbonCut');
    const ribbonCopy = document.getElementById('ribbonCopy');
    const ribbonFormatPainter = document.getElementById('ribbonFormatPainter');
    
    if (ribbonPaste) {
        ribbonPaste.addEventListener('click', async () => {
            try {
                const text = await navigator.clipboard.readText();
                document.execCommand('insertText', false, text);
            } catch (err) {
                console.error('Failed to paste:', err);
                document.execCommand('paste', false, null);
            }
        });
    }
    
    if (ribbonCut) {
        ribbonCut.addEventListener('click', () => {
            document.execCommand('cut', false, null);
        });
    }
    
    if (ribbonCopy) {
        ribbonCopy.addEventListener('click', () => {
            document.execCommand('copy', false, null);
        });
    }
    
    if (ribbonFormatPainter) {
        let formatPainterActive = false;
        let formatSource = null;
        ribbonFormatPainter.addEventListener('click', () => {
            if (!formatPainterActive) {
                const selection = window.getSelection();
                if (selection.rangeCount > 0) {
                    formatSource = selection.getRangeAt(0).commonAncestorContainer;
                    formatPainterActive = true;
                    ribbonFormatPainter.style.backgroundColor = '#0078d4';
                    ribbonFormatPainter.style.color = 'white';
                }
            } else {
                formatPainterActive = false;
                formatSource = null;
                ribbonFormatPainter.style.backgroundColor = '';
                ribbonFormatPainter.style.color = '';
            }
        });
        
        // Apply format on click in editor when format painter is active
        document.addEventListener('click', (e) => {
            if (formatPainterActive && formatSource && e.target.closest('#editor')) {
                const selection = window.getSelection();
                if (selection.rangeCount > 0 && !selection.isCollapsed) {
                    const sourceEl = formatSource.nodeType === 1 ? formatSource : formatSource.parentElement;
                    const targetEl = selection.getRangeAt(0).commonAncestorContainer;
                    const targetElement = targetEl.nodeType === 1 ? targetEl : targetEl.parentElement;
                    
                    if (sourceEl && targetElement) {
                        const computed = window.getComputedStyle(sourceEl);
                        targetElement.style.fontWeight = computed.fontWeight;
                        targetElement.style.fontStyle = computed.fontStyle;
                        targetElement.style.textDecoration = computed.textDecoration;
                        targetElement.style.fontSize = computed.fontSize;
                        targetElement.style.color = computed.color;
                    }
                    formatPainterActive = false;
                    formatSource = null;
                    ribbonFormatPainter.style.backgroundColor = '';
                    ribbonFormatPainter.style.color = '';
                }
            }
        }, true);
    }
    
    // Font formatting
    const ribbonBold = document.getElementById('ribbonBold');
    const ribbonItalic = document.getElementById('ribbonItalic');
    const ribbonUnderline = document.getElementById('ribbonUnderline');
    const ribbonStrikethrough = document.getElementById('ribbonStrikethrough');
    
    if (ribbonBold) {
        ribbonBold.addEventListener('click', () => {
            document.execCommand('bold', false, null);
            updateRibbonState();
        });
    }
    
    if (ribbonItalic) {
        ribbonItalic.addEventListener('click', () => {
            document.execCommand('italic', false, null);
            updateRibbonState();
        });
    }
    
    if (ribbonUnderline) {
        ribbonUnderline.addEventListener('click', () => {
            document.execCommand('underline', false, null);
            updateRibbonState();
        });
    }
    
    if (ribbonStrikethrough) {
        ribbonStrikethrough.addEventListener('click', () => {
            document.execCommand('strikeThrough', false, null);
            updateRibbonState();
        });
    }
    
    // Font family and size
    const ribbonFontFamily = document.getElementById('ribbonFontFamily');
    const ribbonFontSize = document.getElementById('ribbonFontSize');
    
    if (ribbonFontFamily) {
        ribbonFontFamily.addEventListener('change', (e) => {
            document.execCommand('fontName', false, e.target.value);
        });
    }
    
    if (ribbonFontSize) {
        ribbonFontSize.addEventListener('change', (e) => {
            const selection = window.getSelection();
            if (selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                if (!selection.isCollapsed) {
                    const selectedText = range.extractContents();
                    const span = document.createElement('span');
                    span.style.fontSize = e.target.value + 'pt';
                    span.appendChild(selectedText);
                    range.insertNode(span);
                } else {
                    document.execCommand('fontSize', false, '3');
                    const span = document.querySelector('#editor span[style*="font-size"]');
                    if (span) span.style.fontSize = e.target.value + 'pt';
                }
            }
        });
    }
    
    // Font color
    const ribbonFontColor = document.getElementById('ribbonFontColor');
    const ribbonFontColorPicker = document.getElementById('ribbonFontColorPicker');
    
    if (ribbonFontColor) {
        ribbonFontColor.addEventListener('click', () => {
            ribbonFontColorPicker.click();
        });
    }
    
    if (ribbonFontColorPicker) {
        ribbonFontColorPicker.addEventListener('change', (e) => {
            document.execCommand('foreColor', false, e.target.value);
        });
    }
    
    // Highlight color
    const ribbonHighlight = document.getElementById('ribbonHighlight');
    const ribbonHighlightPicker = document.getElementById('ribbonHighlightPicker');
    
    if (ribbonHighlight) {
        ribbonHighlight.addEventListener('click', () => {
            ribbonHighlightPicker.click();
        });
    }
    
    if (ribbonHighlightPicker) {
        ribbonHighlightPicker.addEventListener('change', (e) => {
            document.execCommand('backColor', false, e.target.value);
        });
    }
    
    // Paragraph formatting
    const ribbonBullets = document.getElementById('ribbonBullets');
    const ribbonNumbering = document.getElementById('ribbonNumbering');
    const ribbonAlignLeft = document.getElementById('ribbonAlignLeft');
    const ribbonAlignCenter = document.getElementById('ribbonAlignCenter');
    const ribbonAlignRight = document.getElementById('ribbonAlignRight');
    const ribbonJustify = document.getElementById('ribbonJustify');
    const ribbonDecreaseIndent = document.getElementById('ribbonDecreaseIndent');
    const ribbonIncreaseIndent = document.getElementById('ribbonIncreaseIndent');
    const ribbonLineSpacing = document.getElementById('ribbonLineSpacing');
    
    if (ribbonBullets) {
        ribbonBullets.addEventListener('click', () => {
            document.execCommand('insertUnorderedList', false, null);
        });
    }
    
    if (ribbonNumbering) {
        ribbonNumbering.addEventListener('click', () => {
            document.execCommand('insertOrderedList', false, null);
        });
    }
    
    if (ribbonAlignLeft) {
        ribbonAlignLeft.addEventListener('click', () => {
            document.execCommand('justifyLeft', false, null);
            updateRibbonState();
        });
    }
    
    if (ribbonAlignCenter) {
        ribbonAlignCenter.addEventListener('click', () => {
            document.execCommand('justifyCenter', false, null);
            updateRibbonState();
        });
    }
    
    if (ribbonAlignRight) {
        ribbonAlignRight.addEventListener('click', () => {
            document.execCommand('justifyRight', false, null);
            updateRibbonState();
        });
    }
    
    if (ribbonJustify) {
        ribbonJustify.addEventListener('click', () => {
            document.execCommand('justifyFull', false, null);
            updateRibbonState();
        });
    }
    
    if (ribbonDecreaseIndent) {
        ribbonDecreaseIndent.addEventListener('click', () => {
            document.execCommand('outdent', false, null);
        });
    }
    
    if (ribbonIncreaseIndent) {
        ribbonIncreaseIndent.addEventListener('click', () => {
            document.execCommand('indent', false, null);
        });
    }
    
    if (ribbonLineSpacing) {
        ribbonLineSpacing.addEventListener('change', (e) => {
            const editor = document.getElementById('editor');
            editor.style.lineHeight = e.target.value;
            const selection = window.getSelection();
            if (selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                const element = range.commonAncestorContainer;
                const blockElement = element.nodeType === 1 ? element : element.parentElement;
                if (blockElement && blockElement !== editor) {
                    blockElement.style.lineHeight = e.target.value;
                }
            }
        });
    }
    
    // Styles
    const ribbonStyles = document.getElementById('ribbonStyles');
    
    if (ribbonStyles) {
        ribbonStyles.addEventListener('change', (e) => {
            const value = e.target.value;
            if (value === '') {
                document.execCommand('formatBlock', false, '<div>');
            } else if (value === 'no-spacing') {
                document.execCommand('formatBlock', false, '<p>');
                const selection = window.getSelection();
                if (selection.rangeCount > 0) {
                    const range = selection.getRangeAt(0);
                    const element = range.commonAncestorContainer;
                    const blockElement = element.nodeType === 1 ? element : element.parentElement;
                    if (blockElement) {
                        blockElement.style.margin = '0';
                        blockElement.style.padding = '0';
                    }
                }
            } else if (value === 'title') {
                const selection = window.getSelection();
                if (selection.rangeCount > 0) {
                    const range = selection.getRangeAt(0);
                    const element = range.commonAncestorContainer;
                    const blockElement = element.nodeType === 1 ? element : element.parentElement;
                    if (blockElement) {
                        blockElement.style.fontSize = '26pt';
                        blockElement.style.fontWeight = 'bold';
                        blockElement.style.marginBottom = '12px';
                    }
                }
            } else if (['h1', 'h2', 'h3'].includes(value)) {
                document.execCommand('formatBlock', false, `<${value}>`);
            }
        });
    }
    
    // Editing buttons
    const ribbonFind = document.getElementById('ribbonFind');
    const ribbonReplace = document.getElementById('ribbonReplace');
    const ribbonSelect = document.getElementById('ribbonSelect');
    
    if (ribbonFind) {
        ribbonFind.addEventListener('click', () => {
            showFindDialog();
        });
    }
    
    if (ribbonReplace) {
        ribbonReplace.addEventListener('click', () => {
            showReplaceDialog();
        });
    }
    
    if (ribbonSelect) {
        ribbonSelect.addEventListener('click', () => {
            const editor = document.getElementById('editor');
            const range = document.createRange();
            range.selectNodeContents(editor);
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
        });
    }
    
    // Update ribbon state on selection change
    const editor = document.getElementById('editor');
    editor.addEventListener('selectionchange', updateRibbonState);
    editor.addEventListener('keyup', updateRibbonState);
    editor.addEventListener('mouseup', updateRibbonState);
}

function updateRibbonState() {
    const ribbonBold = document.getElementById('ribbonBold');
    const ribbonItalic = document.getElementById('ribbonItalic');
    const ribbonUnderline = document.getElementById('ribbonUnderline');
    const ribbonStrikethrough = document.getElementById('ribbonStrikethrough');
    const ribbonFontSize = document.getElementById('ribbonFontSize');
    
    // Check formatting state
    if (ribbonBold) ribbonBold.style.backgroundColor = document.queryCommandState('bold') ? '#e5e5e5' : '';
    if (ribbonItalic) ribbonItalic.style.backgroundColor = document.queryCommandState('italic') ? '#e5e5e5' : '';
    if (ribbonUnderline) ribbonUnderline.style.backgroundColor = document.queryCommandState('underline') ? '#e5e5e5' : '';
    if (ribbonStrikethrough) ribbonStrikethrough.style.backgroundColor = document.queryCommandState('strikeThrough') ? '#e5e5e5' : '';
    
    // Update font size selector based on selected text
    if (ribbonFontSize) {
        const selection = window.getSelection();
        if (selection.rangeCount > 0 && !selection.isCollapsed) {
            const range = selection.getRangeAt(0);
            const editor = document.getElementById('editor');
            let element = range.commonAncestorContainer;
            
            if (element.nodeType === Node.TEXT_NODE) {
                element = element.parentElement;
            }
            
            while (element && element !== editor) {
                const computedStyle = window.getComputedStyle(element);
                const fontSize = computedStyle.fontSize;
                if (fontSize && fontSize !== 'inherit' && fontSize !== 'initial') {
                    const sizeMatch = fontSize.match(/(\d+\.?\d*)/);
                    if (sizeMatch) {
                        const sizeValue = Math.round(parseFloat(sizeMatch[1]));
                        ribbonFontSize.value = sizeValue;
                        break;
                    }
                }
                element = element.parentElement;
            }
        }
    }
}

function setupEditor() {
    const editor = document.getElementById('editor');
    
    // Update word and character count (expose globally so AI can update it)
    window.updateCounts = function() {
        const text = editor.innerText || editor.textContent || '';
        const words = text.trim() ? text.trim().split(/\s+/).filter(word => word.length > 0).length : 0;
        const chars = text.length;
        
        const wordCountEl = document.getElementById('wordCount');
        const charCountEl = document.getElementById('charCount');
        if (wordCountEl) wordCountEl.textContent = words;
        if (charCountEl) charCountEl.textContent = chars;
    };
    
    const updateCounts = window.updateCounts;
    
    editor.addEventListener('input', () => {
        hasUnsavedChanges = true;
        updateWindowTitle();
        updateCounts();
    });
    
    // Also update on paste
    editor.addEventListener('paste', (e) => {
        e.preventDefault();
        const text = e.clipboardData.getData('text/plain');
        document.execCommand('insertText', false, text);
        hasUnsavedChanges = true;
        updateWindowTitle();
        updateCounts();
    });
    
    // Initial count
    updateCounts();
}

// Store file menu handlers to prevent duplicates
let fileMenuCloseHandler = null;
let fileMenuSaveAsHandler = null;

function setupFileOperations() {
    // File menu
    const fileMenuBtn = document.getElementById('fileMenuBtn');
    const fileMenuDropdown = document.getElementById('fileMenuDropdown');
    const fileMenuNew = document.getElementById('fileMenuNew');
    const fileMenuOpen = document.getElementById('fileMenuOpen');
    const fileMenuSave = document.getElementById('fileMenuSave');
    const fileMenuSaveAs = document.getElementById('fileMenuSaveAs');
    const fileMenuPrint = document.getElementById('fileMenuPrint');
    
    // Toggle file menu dropdown
    if (fileMenuBtn && fileMenuDropdown) {
        const fileMenuContainer = fileMenuBtn.closest('.file-menu-container');
        
        // Remove existing close handler if it exists
        if (fileMenuCloseHandler) {
            document.removeEventListener('click', fileMenuCloseHandler);
        }
        
        fileMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            fileMenuDropdown.classList.toggle('show');
        });
        
        // Close menu when clicking outside - but NOT when clicking menu items
        fileMenuCloseHandler = (e) => {
            // Don't close if clicking on menu items or the button
            const isClickOnMenuItem = e.target.closest('.file-menu-item') || 
                                     e.target.closest('.file-menu-dropdown') ||
                                     e.target === fileMenuBtn ||
                                     fileMenuContainer?.contains(e.target);
            
            if (!isClickOnMenuItem) {
                fileMenuDropdown.classList.remove('show');
            }
        };
        document.addEventListener('click', fileMenuCloseHandler);
        
        // File menu actions
        if (fileMenuNew) {
            fileMenuNew.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                fileMenuDropdown.classList.remove('show');
                if (hasUnsavedChanges) {
                    if (!confirm('You have unsaved changes. Create a new document anyway?')) {
                        return;
                    }
                }
                document.getElementById('editor').innerHTML = '';
                currentFileName = null;
                hasUnsavedChanges = false;
                updateWindowTitle();
            });
        }
        
        if (fileMenuOpen) {
            fileMenuOpen.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                fileMenuDropdown.classList.remove('show');
                if (hasUnsavedChanges) {
                    if (!confirm('You have unsaved changes. Open a new file anyway?')) {
                        return;
                    }
                }
                if (window.electronAPI && window.electronAPI.openFileDialog) {
                    try {
                        const result = await window.electronAPI.openFileDialog({
                            filters: [
                                { name: 'HTML Files', extensions: ['html', 'htm'] },
                                { name: 'Text Files', extensions: ['txt'] },
                                { name: 'All Files', extensions: ['*'] }
                            ]
                        });
                        if (result && !result.canceled && result.filePaths && result.filePaths.length > 0) {
                            await loadFile(result.filePaths[0]);
                        }
                    } catch (error) {
                        console.error('Error opening file:', error);
                        alert('Error opening file: ' + error.message);
                    }
                }
            });
        }
        
        if (fileMenuSave) {
            fileMenuSave.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                fileMenuDropdown.classList.remove('show');
                await saveDocument();
            });
        }
        
        // Remove existing Save As handler if it exists
        if (fileMenuSaveAsHandler && fileMenuSaveAs) {
            fileMenuSaveAs.removeEventListener('click', fileMenuSaveAsHandler);
        }
        
        if (fileMenuSaveAs) {
            fileMenuSaveAsHandler = async (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('[WORD] Save As clicked');
                fileMenuDropdown.classList.remove('show');
                await saveDocumentAs();
            };
            fileMenuSaveAs.addEventListener('click', fileMenuSaveAsHandler);
            console.log('[WORD] Save As handler attached');
        } else {
            console.warn('[WORD] Save As button not found!');
        }
        
        if (fileMenuPrint) {
            fileMenuPrint.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                fileMenuDropdown.classList.remove('show');
                window.print();
            });
        }
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Only handle shortcuts if not typing in input fields
        const activeElement = document.activeElement;
        const isInputActive = activeElement && (
            activeElement.tagName === 'INPUT' || 
            activeElement.tagName === 'TEXTAREA' || 
            activeElement.id === 'aiChatInput'
        );
        
        if (isInputActive && e.key !== 'f' && e.key !== 'z' && e.key !== 'y') {
            // Allow shortcuts in input fields for find/undo/redo
            return;
        }
        
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            saveDocument();
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            e.preventDefault();
            // New document
            if (hasUnsavedChanges) {
                if (!confirm('You have unsaved changes. Create a new document anyway?')) {
                    return;
                }
            }
            document.getElementById('editor').innerHTML = '';
            currentFileName = null;
            hasUnsavedChanges = false;
            updateWindowTitle();
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
            e.preventDefault();
            // Open file
            if (hasUnsavedChanges) {
                if (!confirm('You have unsaved changes. Open a new file anyway?')) {
                    return;
                }
            }
            if (window.electronAPI && window.electronAPI.openFileDialog) {
                window.electronAPI.openFileDialog({
                    filters: [
                        { name: 'HTML Files', extensions: ['html', 'htm'] },
                        { name: 'Text Files', extensions: ['txt'] },
                        { name: 'All Files', extensions: ['*'] }
                    ]
                }).then(result => {
                    if (result && !result.canceled && result.filePaths && result.filePaths.length > 0) {
                        loadFile(result.filePaths[0]);
                    }
                }).catch(error => {
                    console.error('Error opening file:', error);
                    alert('Error opening file: ' + error.message);
                });
            }
        }
        // Undo
        if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
            e.preventDefault();
            document.execCommand('undo');
        }
        // Redo (Ctrl+Y or Ctrl+Shift+Z)
        if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
            e.preventDefault();
            document.execCommand('redo');
        }
        // Find
        if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
            e.preventDefault();
            showFindDialog();
        }
    });
}

async function saveDocument() {
    const content = document.getElementById('editor').innerHTML;
    
    if (window.electronAPI && window.electronAPI.saveFileDialog) {
        try {
            // Determine default filename and extension
            let defaultFileName = currentFileName || 'document';
            // Remove existing extension
            defaultFileName = defaultFileName.replace(/\.[^/.]+$/, '');
            
            const result = await window.electronAPI.saveFileDialog({
                defaultPath: defaultFileName + '.docx',
                filters: [
                    { name: 'Word Documents', extensions: ['docx'] },
                    { name: 'HTML Files', extensions: ['html', 'htm'] },
                    { name: 'Text Files', extensions: ['txt'] },
                    { name: 'All Files', extensions: ['*'] }
                ]
            });
            if (result && !result.canceled && result.filePath) {
                let filePath = result.filePath;
                let ext = filePath.toLowerCase().split('.').pop();
                
                // If no extension, default to docx if Word Documents filter was likely selected
                // (This is a best guess - Electron doesn't tell us which filter was selected)
                if (!ext || ext === filePath.toLowerCase()) {
                    // Check if the filename suggests it should be docx
                    filePath = filePath + '.docx';
                    ext = 'docx';
                }
                
                // Check if user wants DOCX format
                if (ext === 'docx' && window.electronAPI.convertToDocx) {
                    const convertResult = await window.electronAPI.convertToDocx(content, filePath);
                    if (convertResult && convertResult.success) {
                        currentFileName = filePath.split(/[\\/]/).pop();
                        hasUnsavedChanges = false;
                        updateWindowTitle();
                        alert('Document saved as Word format (.docx)');
                        // Sync to Omega Network
                        await syncDocumentToOmega(content, currentFileName);
                    } else {
                        alert('Error converting to DOCX: ' + (convertResult?.error || 'Unknown error'));
                    }
                } else {
                    // Save as HTML or text
                    await window.electronAPI.writeFile(filePath, content);
                    currentFileName = filePath.split(/[\\/]/).pop();
                    hasUnsavedChanges = false;
                    updateWindowTitle();
                    // Sync to Omega Network
                    await syncDocumentToOmega(content, currentFileName);
                }
            }
        } catch (error) {
            console.error('Error saving file:', error);
            alert('Error saving file: ' + error.message);
        }
    } else {
        // Fallback to browser download
        const blob = new Blob([content], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = currentFileName || 'document.html';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        hasUnsavedChanges = false;
        updateWindowTitle();
    }
}

async function saveDocumentAs() {
    const content = document.getElementById('editor').innerHTML;
    
    if (window.electronAPI && window.electronAPI.saveFileDialog) {
        try {
            // Always show save dialog, even if file already exists
            const result = await window.electronAPI.saveFileDialog({
                defaultPath: currentFileName || 'document.docx',
                filters: [
                    { name: 'Word Documents', extensions: ['docx'] },
                    { name: 'HTML Files', extensions: ['html', 'htm'] },
                    { name: 'Text Files', extensions: ['txt'] },
                    { name: 'All Files', extensions: ['*'] }
                ]
            });
            
            if (result && !result.canceled && result.filePath) {
                let filePath = result.filePath;
                let ext = filePath.toLowerCase().split('.').pop();
                
                // If no extension, default to docx
                if (!ext || ext === filePath.toLowerCase()) {
                    filePath = filePath + '.docx';
                    ext = 'docx';
                }
                
                // Check if user wants DOCX format
                if (ext === 'docx' && window.electronAPI.convertToDocx) {
                    const convertResult = await window.electronAPI.convertToDocx(content, filePath);
                    if (convertResult && convertResult.success) {
                        currentFileName = filePath.split(/[\\/]/).pop();
                        hasUnsavedChanges = false;
                        updateWindowTitle();
                        alert('Document saved as Word format (.docx)');
                        // Sync to Omega Network
                        await syncDocumentToOmega(content, currentFileName);
                    } else {
                        alert('Error converting to DOCX: ' + (convertResult?.error || 'Unknown error'));
                    }
                } else {
                    // Save as HTML or text
                    await window.electronAPI.writeFile(filePath, content);
                    currentFileName = filePath.split(/[\\/]/).pop();
                    hasUnsavedChanges = false;
                    updateWindowTitle();
                    // Sync to Omega Network
                    await syncDocumentToOmega(content, currentFileName);
                }
            }
        } catch (error) {
            console.error('Error saving file:', error);
            alert('Error saving file: ' + error.message);
        }
    } else {
        // Fallback to browser download
        const blob = new Blob([content], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = currentFileName || 'document.html';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        hasUnsavedChanges = false;
        updateWindowTitle();
    }
}

async function loadFile(filePath) {
    try {
        if (window.electronAPI && window.electronAPI.readFile) {
            const content = await window.electronAPI.readFile(filePath);
            document.getElementById('editor').innerHTML = content;
            currentFileName = filePath.split(/[\\/]/).pop();
            hasUnsavedChanges = false;
            updateWindowTitle();
        }
    } catch (error) {
        console.error('Error loading file:', error);
        alert('Error loading file: ' + error.message);
    }
}

function updateWindowTitle() {
    const title = document.querySelector('.window-title');
    const fileName = currentFileName || 'Untitled';
    title.textContent = hasUnsavedChanges ? `Omega Word - ${fileName} *` : `Omega Word - ${fileName}`;
}

let aiSidebarCollapsed = false;

function setupAIFeatures() {
    // Switch to best DeepSeek model for content generation (Word, PowerPoint)
    if (window.electronAPI && window.electronAPI.aiSwitchModelForApp) {
        window.electronAPI.aiSwitchModelForApp('word').then(result => {
            if (result.success) {
                console.log('[Word] Switched to AI model:', result.model);
            }
        }).catch(err => {
            console.log('[Word] Model switch failed (will use default):', err);
        });
    }

    const aiBtn = document.getElementById('aiBtn');
    const aiSidebar = document.getElementById('aiSidebar');
    const aiChatInput = document.getElementById('aiChatInput');
    const aiChatSend = document.getElementById('aiChatSend');
    const aiChatMessages = document.getElementById('aiChatMessages');
    const aiWelcomeMessage = document.querySelector('.ai-welcome-message');

    if (!aiBtn || !aiSidebar || !aiChatInput || !aiChatSend) {
        console.error('AI elements not found in DOM');
        return;
    }

    // AI button toggle sidebar
    aiBtn.addEventListener('click', () => {
        aiSidebarCollapsed = !aiSidebarCollapsed;
        if (aiSidebarCollapsed) {
            aiSidebar.classList.add('collapsed');
            aiBtn.classList.remove('active');
        } else {
            aiSidebar.classList.remove('collapsed');
            aiBtn.classList.add('active');
            setTimeout(() => {
                if (aiChatInput) aiChatInput.focus();
            }, 100);
        }
    });

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
        aiChatInput.style.height = 'auto'; // Reset height
        aiChatInput.disabled = true;
        aiChatSend.disabled = true;

        // Show thinking indicator
        const thinkingDiv = addAIMessage('assistant', 'Thinking...', true);

        try {
            const editor = document.getElementById('editor');
            const currentText = editor.innerText || editor.textContent || '';
            const lowerMessage = message.toLowerCase();

            // Check if this is a formatting-only request (no text generation needed)
            // Only treat as formatting-only if there's existing text AND no generation keywords
            const formattingInstructions = detectFormattingInstructions(message);
            const hasGenerationKeywords = lowerMessage.includes('write') || lowerMessage.includes('create') || 
                                         lowerMessage.includes('generate') || lowerMessage.includes('need') ||
                                         lowerMessage.includes('words') || lowerMessage.includes('about') ||
                                         lowerMessage.includes('describe') || lowerMessage.includes('tell') ||
                                         lowerMessage.includes('make') || lowerMessage.includes('give');
            const isFormattingOnly = formattingInstructions.hasFormatting && currentText && !hasGenerationKeywords &&
                                   !lowerMessage.includes('improve') && !lowerMessage.includes('rewrite') && 
                                   !lowerMessage.includes('expand');
            
            // If it's formatting-only, apply formatting directly and skip AI
            if (isFormattingOnly) {
                const selection = window.getSelection();
                if (selection.rangeCount > 0 && !selection.isCollapsed) {
                    // Format selected text
                    const range = selection.getRangeAt(0);
                    applyFormattingToSelection(range, formattingInstructions);
                } else {
                    // Format entire document - select all and apply formatting
                    const range = document.createRange();
                    range.selectNodeContents(editor);
                    const sel = window.getSelection();
                    sel.removeAllRanges();
                    sel.addRange(range);
                    applyFormattingToSelection(range, formattingInstructions);
                    sel.removeAllRanges();
                }
                
                // Show success message
                if (thinkingDiv && thinkingDiv.parentElement) {
                    thinkingDiv.remove();
                }
                addAIMessage('assistant', 'Formatting applied ✓', true);
                aiChatInput.disabled = false;
                aiChatSend.disabled = false;
                aiChatInput.focus();
                return; // Exit early
            }
            
            // Determine if this is a continuation request (cut off, incomplete, finish, continue)
            const isContinuation = lowerMessage.includes('cut off') || lowerMessage.includes('incomplete') ||
                                  lowerMessage.includes('finish') || lowerMessage.includes('continue') ||
                                  lowerMessage.includes('it was cut') || lowerMessage.includes('not finished') ||
                                  lowerMessage.includes('was incomplete') || lowerMessage.includes('complete it');
            
            // Determine if this is a generation request (only if no existing content or explicit generation request)
            const isGeneration = !currentText || lowerMessage.includes('write') || lowerMessage.includes('create') || 
                                 lowerMessage.includes('generate') || lowerMessage.includes('paper') ||
                                 lowerMessage.includes('essay') || lowerMessage.includes('article') ||
                                 lowerMessage.includes('paragraph') || lowerMessage.includes('need') ||
                                 lowerMessage.includes('about');

            let result;
            if (isContinuation && currentText) {
                // Continuation request - analyze existing content and continue from where it left off
                const continuationPrompt = `The user says: "${message}"

Here is the existing document content:
${currentText}

Your task: Analyze the content above. If it appears incomplete or cut off, continue writing from where it left off. DO NOT rewrite the existing content. Only provide the continuation/remaining content that should be added. If the document appears complete, acknowledge that but still provide any missing sections if requested.

IMPORTANT: If the user requests formatting changes (bold, italic, underline, font size, color, alignment), include those instructions clearly in your response, but the formatting will be applied automatically.

Continue from the existing content:`;
                
                if (window.electronAPI.aiChat) {
                    result = await window.electronAPI.aiChat(continuationPrompt, []);
                } else {
                    throw new Error('AI chat not available');
                }
            } else if (isGeneration) {
                // Use chat API for generation requests
                if (window.electronAPI.aiChat) {
                    result = await window.electronAPI.aiChat(message, []);
                } else {
                    throw new Error('AI chat not available');
                }
            } else {
                // Use improve text API for improvement requests (but only if not continuation)
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

            if (thinkingDiv && thinkingDiv.parentElement) {
                thinkingDiv.remove();
            }

            if (result && result.success) {
                let response = result.response || result.summary || result.text;
                if (response) {
                    // Clean up common AI prefixes and phrases that aren't part of the actual content
                    response = response.trim();
                    
                    // Remove common AI introduction phrases (very aggressive pattern matching)
                    const prefixes = [
                        /^certainly!?\s*/i,
                        /^here'?s?\s+(an?\s+)?(improved\s+)?(version|text|paragraph|content|story|paper|essay):\s*/i,
                        /^here'?s?\s+(the\s+)?(requested\s+)?(text|paragraph|content|story|paper|essay):\s*/i,
                        /^of\s+course!?\s*/i,
                        /^sure!?\s*/i,
                        /^here'?s\s+(a\s+)?(compelling|detailed|comprehensive)\s+(three-?page|two-?page|multi-?page)?\s*(story|paper|essay|text|content)?:?\s*/i,
                        /^(absolutely|definitely)!?\s*/i,
                        /^i'?d?\s+(be\s+)?(happy\s+)?to\s+(help|assist)!?\s*/i,
                        /^title:\s*/i,
                        /^here'?s\s+(what|how|why|when|where)\s+/i,
                        /^(i'?ll|i\s+can|i\s+will)\s+(write|create|generate|help\s+you)\s+/i,
                        /^(let\s+me|allow\s+me\s+to)\s+(write|create|generate|help)\s+/i
                    ];
                    
                    // Also remove patterns that appear at the start of lines
                    const lineStartPatterns = [
                        /^title:\s*/im,
                        /^introduction:\s*/im,
                        /^here'?s\s+/im
                    ];
                    
                    // Remove prefixes multiple times to catch nested phrases
                    let previousLength = response.length;
                    let iterations = 0;
                    do {
                        previousLength = response.length;
                        for (const prefix of prefixes) {
                            response = response.replace(prefix, '').trim();
                        }
                        for (const pattern of lineStartPatterns) {
                            response = response.replace(pattern, '').trim();
                        }
                        iterations++;
                    } while (response.length !== previousLength && iterations < 10);
                    
                    // Final cleanup: remove any remaining "Title:" at the very start
                    response = response.replace(/^title:\s*/i, '').trim();
                    
                    // Remove the "Thinking..." message and show a brief success message instead
                    if (thinkingDiv && thinkingDiv.parentElement) {
                        thinkingDiv.remove();
                    }
                    addAIMessage('assistant', 'Content added to document ✓', true);

                    // Convert markdown to HTML
                    function markdownToHtml(text) {
                        let html = text;
                        // Convert **bold** to <strong>bold</strong>
                        html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
                        // Convert *italic* to <em>italic</em> (but not **bold** which we already handled)
                        html = html.replace(/(?<!\*)\*([^*]+?)\*(?!\*)/g, '<em>$1</em>');
                        // Convert # Heading to <h1>Heading</h1>
                        html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
                        html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
                        html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
                        // Split by double newlines to create paragraphs
                        const paragraphs = html.split(/\n\n+/).filter(p => p.trim());
                        return paragraphs.map(p => {
                            const trimmed = p.trim();
                            // If it's already a heading, return as-is
                            if (trimmed.startsWith('<h')) return trimmed;
                            // Otherwise wrap in paragraph
                            return `<p>${trimmed}</p>`;
                        }).join('');
                    }
                    
                    // Check if the message contains formatting instructions (re-detect since we need it for new content)
                    const formattingInstructionsForContent = detectFormattingInstructions(message);
                    
                    let htmlContent = markdownToHtml(response.trim());
                    
                    // Apply formatting directly to HTML before inserting
                    if (formattingInstructionsForContent.hasFormatting) {
                        htmlContent = applyFormattingToHTML(htmlContent, formattingInstructionsForContent, message);
                    }
                    
                    // Insert the text into the editor based on request type
                    if (isContinuation) {
                        // For continuation requests, always append to existing content
                        const currentContent = editor.innerHTML || '';
                        editor.innerHTML += htmlContent;
                    } else if (isGeneration) {
                        // For generation requests, append to existing content or replace if empty
                        const currentContent = editor.innerHTML || '';
                        if (currentContent.trim()) {
                            // Append as new content
                            editor.innerHTML += htmlContent;
                        } else {
                            // Replace if document is empty
                            editor.innerHTML = htmlContent;
                        }
                    } else {
                        // For improvement requests, replace selected text or entire document
                        const selection = window.getSelection();
                        if (selection.rangeCount > 0 && !selection.isCollapsed) {
                            // Replace selected text
                            const range = selection.getRangeAt(0);
                            range.deleteContents();
                            const tempDiv = document.createElement('div');
                            tempDiv.innerHTML = htmlContent;
                            const fragment = document.createDocumentFragment();
                            while (tempDiv.firstChild) {
                                fragment.appendChild(tempDiv.firstChild);
                            }
                            range.insertNode(fragment);
                            range.collapse(false);
                            selection.removeAllRanges();
                            selection.addRange(range);
                        } else {
                            // Replace entire document
                            editor.innerHTML = htmlContent;
                        }
                    }
                    
                    // Update counts after inserting content
                    if (window.updateCounts) {
                        window.updateCounts();
                    }
                    
                    hasUnsavedChanges = true;
                    updateWindowTitle();
                    // Update word count after inserting text
                    if (window.updateCounts) window.updateCounts();
                } else {
                    addAIMessage('assistant', 'Error: No response from AI');
                }
            } else {
                const errorMsg = result?.error || result?.message || 'Failed to process request';
                addAIMessage('assistant', 'Error: ' + errorMsg);
            }
        } catch (error) {
            if (thinkingDiv && thinkingDiv.parentElement) {
                thinkingDiv.remove();
            }
            console.error('AI error:', error);
            addAIMessage('assistant', 'Error: ' + error.message);
        } finally {
            aiChatInput.disabled = false;
            aiChatSend.disabled = false;
            aiChatInput.focus();
        }
    }

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

    // Send button click
    aiChatSend.addEventListener('click', sendAIMessage);

    // Enter key to send (Shift+Enter for new line)
    aiChatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendAIMessage();
        }
        // Shift+Enter allows new line (default behavior, don't prevent)
    });
    
    // Auto-resize textarea
    aiChatInput.addEventListener('input', () => {
        aiChatInput.style.height = 'auto';
        aiChatInput.style.height = Math.min(aiChatInput.scrollHeight, 120) + 'px';
    });
}

// Find Dialog
let findDialog = null;
let findMatchIndex = 0;
let findMatches = [];

function showFindDialog() {
    // Remove existing dialog if any
    if (findDialog) {
        findDialog.remove();
    }
    
    // Create find dialog
    findDialog = document.createElement('div');
    findDialog.id = 'findDialog';
    findDialog.style.cssText = `
        position: fixed;
        top: 60px;
        right: 20px;
        background: white;
        border: 1px solid #ccc;
        border-radius: 8px;
        padding: 15px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        min-width: 300px;
    `;
    
    findDialog.innerHTML = `
        <div style="display: flex; gap: 8px; align-items: center;">
            <input type="text" id="findInput" placeholder="Find..." 
                   style="flex: 1; padding: 6px 10px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px;"
                   autocomplete="off">
            <button id="findPrevBtn" style="padding: 6px 12px; border: 1px solid #ccc; background: white; border-radius: 4px; cursor: pointer;">↑</button>
            <button id="findNextBtn" style="padding: 6px 12px; border: 1px solid #ccc; background: white; border-radius: 4px; cursor: pointer;">↓</button>
            <button id="findCloseBtn" style="padding: 6px 12px; border: 1px solid #ccc; background: white; border-radius: 4px; cursor: pointer;">✕</button>
        </div>
        <div id="findStatus" style="margin-top: 8px; font-size: 12px; color: #666;"></div>
    `;
    
    document.body.appendChild(findDialog);
    
    const findInput = document.getElementById('findInput');
    const findNextBtn = document.getElementById('findNextBtn');
    const findPrevBtn = document.getElementById('findPrevBtn');
    const findCloseBtn = document.getElementById('findCloseBtn');
    const findStatus = document.getElementById('findStatus');
    
    // Focus input
    setTimeout(() => findInput.focus(), 100);
    
    // Find function
    function performFind(direction = 'next') {
        const searchTerm = findInput.value.trim();
        if (!searchTerm) {
            findStatus.textContent = '';
            findMatches = [];
            return;
        }
        
        const editor = document.getElementById('editor');
        const text = editor.innerText || editor.textContent || '';
        const regex = new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        
        findMatches = [];
        let match;
        while ((match = regex.exec(text)) !== null) {
            findMatches.push(match.index);
        }
        
        if (findMatches.length === 0) {
            findStatus.textContent = 'No matches found';
            return;
        }
        
        if (direction === 'next') {
            findMatchIndex = (findMatchIndex + 1) % findMatches.length;
        } else {
            findMatchIndex = (findMatchIndex - 1 + findMatches.length) % findMatches.length;
        }
        
        findStatus.textContent = `${findMatchIndex + 1} of ${findMatches.length}`;
        
        // Highlight and scroll to match
        const matchIndex = findMatches[findMatchIndex];
        selectTextInEditor(matchIndex, searchTerm.length);
    }
    
    function selectTextInEditor(startIndex, length) {
        const editor = document.getElementById('editor');
        const range = document.createRange();
        const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT, null, false);
        
        let charIndex = 0;
        let startNode = null;
        let endNode = null;
        let startOffset = 0;
        let endOffset = 0;
        
        while (walker.nextNode()) {
            const node = walker.currentNode;
            const nodeLength = node.textContent.length;
            
            if (!startNode && charIndex + nodeLength >= startIndex) {
                startNode = node;
                startOffset = startIndex - charIndex;
            }
            
            if (startNode && charIndex + nodeLength >= startIndex + length) {
                endNode = node;
                endOffset = (startIndex + length) - charIndex;
                break;
            }
            
            charIndex += nodeLength;
        }
        
        if (startNode && endNode) {
            try {
                range.setStart(startNode, startOffset);
                range.setEnd(endNode, endOffset);
                const selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(range);
                
                // Scroll into view
                range.getBoundingClientRect();
                startNode.parentElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } catch (e) {
                console.error('Error selecting text:', e);
            }
        }
    }
    
    // Event listeners
    findInput.addEventListener('input', () => {
        findMatchIndex = -1;
        performFind('next');
    });
    
    findInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            performFind('next');
        } else if (e.key === 'Escape') {
            closeFindDialog();
        }
    });
    
    findNextBtn.addEventListener('click', () => performFind('next'));
    findPrevBtn.addEventListener('click', () => performFind('prev'));
    findCloseBtn.addEventListener('click', closeFindDialog);
    
    function closeFindDialog() {
        if (findDialog) {
            findDialog.remove();
            findDialog = null;
        }
        // Clear selection
        const selection = window.getSelection();
        selection.removeAllRanges();
    }
}

// Replace Dialog
let replaceDialog = null;
let replaceMatchIndex = 0;
let replaceMatches = [];

function showReplaceDialog() {
    // Remove existing dialog if any
    if (replaceDialog) {
        replaceDialog.remove();
    }
    
    // Also close find dialog if open
    if (findDialog) {
        findDialog.remove();
        findDialog = null;
    }
    
    // Create replace dialog
    replaceDialog = document.createElement('div');
    replaceDialog.id = 'replaceDialog';
    replaceDialog.style.cssText = `
        position: fixed;
        top: 60px;
        right: 20px;
        background: white;
        border: 1px solid #ccc;
        border-radius: 8px;
        padding: 15px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        min-width: 320px;
    `;
    
    replaceDialog.innerHTML = `
        <div style="margin-bottom: 8px;">
            <label style="display: block; margin-bottom: 4px; font-size: 12px; color: #666;">Find:</label>
            <input type="text" id="replaceFindInput" placeholder="Find..." 
                   style="width: 100%; padding: 6px 10px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px;"
                   autocomplete="off">
        </div>
        <div style="margin-bottom: 8px;">
            <label style="display: block; margin-bottom: 4px; font-size: 12px; color: #666;">Replace with:</label>
            <input type="text" id="replaceWithInput" placeholder="Replace with..." 
                   style="width: 100%; padding: 6px 10px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px;"
                   autocomplete="off">
        </div>
        <div style="display: flex; gap: 8px; margin-bottom: 8px;">
            <button id="replaceFindNextBtn" style="flex: 1; padding: 6px 12px; border: 1px solid #ccc; background: white; border-radius: 4px; cursor: pointer; font-size: 13px;">Find Next</button>
            <button id="replaceReplaceBtn" style="flex: 1; padding: 6px 12px; border: 1px solid #0078d4; background: #0078d4; color: white; border-radius: 4px; cursor: pointer; font-size: 13px;">Replace</button>
            <button id="replaceReplaceAllBtn" style="flex: 1; padding: 6px 12px; border: 1px solid #0078d4; background: #0078d4; color: white; border-radius: 4px; cursor: pointer; font-size: 13px;">Replace All</button>
        </div>
        <div style="display: flex; justify-content: flex-end;">
            <button id="replaceCloseBtn" style="padding: 6px 12px; border: 1px solid #ccc; background: white; border-radius: 4px; cursor: pointer; font-size: 13px;">Close</button>
        </div>
        <div id="replaceStatus" style="margin-top: 8px; font-size: 12px; color: #666;"></div>
    `;
    
    document.body.appendChild(replaceDialog);
    
    const findInput = document.getElementById('replaceFindInput');
    const replaceInput = document.getElementById('replaceWithInput');
    const findNextBtn = document.getElementById('replaceFindNextBtn');
    const replaceBtn = document.getElementById('replaceReplaceBtn');
    const replaceAllBtn = document.getElementById('replaceReplaceAllBtn');
    const closeBtn = document.getElementById('replaceCloseBtn');
    const status = document.getElementById('replaceStatus');
    
    // Focus input
    setTimeout(() => findInput.focus(), 100);
    
    // Find function
    function performReplaceFind() {
        const searchTerm = findInput.value.trim();
        if (!searchTerm) {
            status.textContent = '';
            replaceMatches = [];
            return;
        }
        
        const editor = document.getElementById('editor');
        const text = editor.innerText || editor.textContent || '';
        const regex = new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        
        replaceMatches = [];
        let match;
        while ((match = regex.exec(text)) !== null) {
            replaceMatches.push(match.index);
        }
        
        if (replaceMatches.length === 0) {
            status.textContent = 'No matches found';
            return;
        }
        
        replaceMatchIndex = (replaceMatchIndex + 1) % replaceMatches.length;
        status.textContent = `${replaceMatchIndex + 1} of ${replaceMatches.length}`;
        
        // Highlight and scroll to match
        const matchIndex = replaceMatches[replaceMatchIndex];
        selectTextInEditor(matchIndex, searchTerm.length);
    }
    
    // Replace function
    function performReplace() {
        const searchTerm = findInput.value.trim();
        const replaceText = replaceInput.value;
        
        if (!searchTerm || replaceMatches.length === 0) {
            return;
        }
        
        const editor = document.getElementById('editor');
        const text = editor.innerText || editor.textContent || '';
        const matchIndex = replaceMatches[replaceMatchIndex];
        
        // Select the text at this position
        selectTextInEditor(matchIndex, searchTerm.length);
        
        // Replace selected text
        const selection = window.getSelection();
        if (selection.rangeCount > 0 && !selection.isCollapsed) {
            const range = selection.getRangeAt(0);
            range.deleteContents();
            range.insertNode(document.createTextNode(replaceText));
            
            // Remove from matches array
            replaceMatches.splice(replaceMatchIndex, 1);
            if (replaceMatchIndex >= replaceMatches.length) {
                replaceMatchIndex = 0;
            }
            
            // Find next match
            if (replaceMatches.length > 0) {
                performReplaceFind();
            } else {
                status.textContent = 'No more matches';
            }
        }
    }
    
    // Replace all function
    function performReplaceAll() {
        const searchTerm = findInput.value.trim();
        const replaceText = replaceInput.value;
        
        if (!searchTerm) {
            return;
        }
        
        const editor = document.getElementById('editor');
        const html = editor.innerHTML;
        const regex = new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        
        const newHtml = html.replace(regex, replaceText);
        editor.innerHTML = newHtml;
        
        status.textContent = 'Replaced all matches';
        replaceMatches = [];
        replaceMatchIndex = 0;
    }
    
    // Event listeners
    findInput.addEventListener('input', () => {
        replaceMatchIndex = -1;
        performReplaceFind();
    });
    
    findInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            performReplaceFind();
        } else if (e.key === 'Escape') {
            closeReplaceDialog();
        }
    });
    
    replaceInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.ctrlKey) {
            e.preventDefault();
            performReplace();
        } else if (e.key === 'Escape') {
            closeReplaceDialog();
        }
    });
    
    findNextBtn.addEventListener('click', performReplaceFind);
    replaceBtn.addEventListener('click', performReplace);
    replaceAllBtn.addEventListener('click', performReplaceAll);
    closeBtn.addEventListener('click', closeReplaceDialog);
    
    function closeReplaceDialog() {
        if (replaceDialog) {
            replaceDialog.remove();
            replaceDialog = null;
        }
        // Clear selection
        const selection = window.getSelection();
        selection.removeAllRanges();
    }
}

// AI Formatting Functions
function detectFormattingInstructions(message) {
    const lowerMessage = message.toLowerCase();
    const instructions = {
        hasFormatting: false,
        bold: false,
        italic: false,
        underline: false,
        fontSize: null,
        fontFamily: null,
        color: null,
        align: null
    };
    
    // Detect formatting requests in the message - be more specific
    // Check for "bolded", "bold", "make bold", "bold the", "bold it", etc.
    if (lowerMessage.includes('bolded') || lowerMessage.includes('make bold') || lowerMessage.includes('bold it') ||
        (lowerMessage.includes('bold') && (lowerMessage.includes('paragraph') || lowerMessage.includes('intro') || lowerMessage.includes('text') || lowerMessage.includes('the') || lowerMessage.includes('it')))) {
        instructions.hasFormatting = true;
        instructions.bold = true;
    }
    
    if (lowerMessage.includes('italic') || lowerMessage.includes('make italic') || lowerMessage.includes('italicize')) {
        instructions.hasFormatting = true;
        instructions.italic = true;
    }
    
    if (lowerMessage.includes('underline') || lowerMessage.includes('make underline') || lowerMessage.includes('underline the')) {
        instructions.hasFormatting = true;
        instructions.underline = true;
    }
    
    // Font size (more flexible matching - catch "size 6 font", "size 10", "make it size 10", "font size 10", etc.)
    // Try "size X font" pattern first, then other patterns
    let fontSizeMatch = lowerMessage.match(/size\s+(\d+)\s+font/i);
    if (!fontSizeMatch) {
        fontSizeMatch = lowerMessage.match(/(?:font size|size|font size of|make it|text size|size of|needs? to be)\s+(\d+)/);
    }
    if (fontSizeMatch) {
        instructions.hasFormatting = true;
        instructions.fontSize = parseInt(fontSizeMatch[1]);
    }
    
    // Font family
    const fontMatch = lowerMessage.match(/(?:font|font family|use font|change font to|set font to)\s+(arial|times|times new roman|comic sans|verdana|courier|helvetica|georgia|tahoma)/i);
    if (fontMatch) {
        instructions.hasFormatting = true;
        let fontName = fontMatch[1].toLowerCase();
        if (fontName === 'times') fontName = 'Times New Roman';
        instructions.fontFamily = fontName.charAt(0).toUpperCase() + fontName.slice(1);
    }
    
    // Color
    const colorMatch = lowerMessage.match(/(?:color|text color|make it|color it|set color to|text color to)\s+(red|blue|green|black|white|yellow|orange|purple|pink|brown|gray|grey|navy|maroon|teal)/i);
    if (colorMatch) {
        instructions.hasFormatting = true;
        const colorMap = {
            'red': '#FF0000',
            'blue': '#0000FF',
            'green': '#008000',
            'black': '#000000',
            'white': '#FFFFFF',
            'yellow': '#FFFF00',
            'orange': '#FFA500',
            'purple': '#800080',
            'pink': '#FFC0CB',
            'brown': '#A52A2A',
            'gray': '#808080',
            'grey': '#808080',
            'navy': '#000080',
            'maroon': '#800000',
            'teal': '#008080'
        };
        instructions.color = colorMap[colorMatch[1].toLowerCase()] || '#000000';
    }
    
    // Alignment
    if (lowerMessage.includes('center') || lowerMessage.includes('centre') || lowerMessage.includes('center it')) {
        instructions.hasFormatting = true;
        instructions.align = 'center';
    } else if (lowerMessage.includes('left align') || lowerMessage.includes('align left') || lowerMessage.includes('left justify')) {
        instructions.hasFormatting = true;
        instructions.align = 'left';
    } else if (lowerMessage.includes('right align') || lowerMessage.includes('align right') || lowerMessage.includes('right justify')) {
        instructions.hasFormatting = true;
        instructions.align = 'right';
    }
    
    return instructions;
}

function applyFormattingToHTML(html, instructions, originalMessage) {
    // Create a temporary div to parse the HTML
    const temp = document.createElement('div');
    temp.innerHTML = html;
    
    const lowerMessage = originalMessage.toLowerCase();
    const isIntroBold = lowerMessage.includes('intro') && instructions.bold;
    
    // Apply formatting to all elements
    const allElements = temp.querySelectorAll('p, h1, h2, h3, h4, div, span');
    let firstElement = true;
    
    allElements.forEach((el, index) => {
        // Font size - apply to all or just non-intro
        if (instructions.fontSize) {
            if (isIntroBold && firstElement) {
                // Skip intro if we're bolding it separately
            } else {
                el.style.fontSize = instructions.fontSize + 'pt';
            }
        }
        
        // Font family
        if (instructions.fontFamily) {
            el.style.fontFamily = instructions.fontFamily;
        }
        
        // Color
        if (instructions.color) {
            el.style.color = instructions.color;
        }
        
        // Alignment
        if (instructions.align) {
            el.style.textAlign = instructions.align;
        }
        
        // Bold - handle intro paragraph specially
        if (instructions.bold) {
            if (isIntroBold && firstElement) {
                // Bold the intro paragraph
                el.style.fontWeight = 'bold';
            } else if (!isIntroBold) {
                // Bold all if not intro-specific
                el.style.fontWeight = 'bold';
            }
        }
        
        // Italic
        if (instructions.italic) {
            el.style.fontStyle = 'italic';
        }
        
        // Underline
        if (instructions.underline) {
            el.style.textDecoration = 'underline';
        }
        
        firstElement = false;
    });
    
    // If no elements found, wrap in a paragraph and apply formatting
    if (allElements.length === 0 && temp.textContent.trim()) {
        const p = document.createElement('p');
        p.innerHTML = temp.innerHTML;
        if (instructions.fontSize) p.style.fontSize = instructions.fontSize + 'pt';
        if (instructions.fontFamily) p.style.fontFamily = instructions.fontFamily;
        if (instructions.color) p.style.color = instructions.color;
        if (instructions.align) p.style.textAlign = instructions.align;
        if (instructions.bold) p.style.fontWeight = 'bold';
        if (instructions.italic) p.style.fontStyle = 'italic';
        if (instructions.underline) p.style.textDecoration = 'underline';
        temp.innerHTML = '';
        temp.appendChild(p);
    }
    
    return temp.innerHTML;
}

// Apply formatting directly to a selection/range in the editor
function applyFormattingToSelection(range, instructions) {
    const selection = window.getSelection();
    
    // Select the range
    selection.removeAllRanges();
    selection.addRange(range);
    
    // Apply formatting commands
    if (instructions.fontSize) {
        // Font size needs special handling - wrap in span with fontSize style
        const contents = range.extractContents();
        const span = document.createElement('span');
        span.style.fontSize = instructions.fontSize + 'pt';
        
        // Move all nodes into the span
        const fragment = document.createDocumentFragment();
        while (contents.firstChild) {
            fragment.appendChild(contents.firstChild);
        }
        span.appendChild(fragment);
        range.insertNode(span);
        
        // Update selection to the new span
        range.selectNodeContents(span);
        selection.removeAllRanges();
        selection.addRange(range);
    }
    
    if (instructions.fontFamily) {
        document.execCommand('fontName', false, instructions.fontFamily);
    }
    
    if (instructions.color) {
        document.execCommand('foreColor', false, instructions.color);
    }
    
    if (instructions.bold) {
        document.execCommand('bold', false, null);
    }
    
    if (instructions.italic) {
        document.execCommand('italic', false, null);
    }
    
    if (instructions.underline) {
        document.execCommand('underline', false, null);
    }
    
    if (instructions.align) {
        if (instructions.align === 'center') {
            document.execCommand('justifyCenter', false, null);
        } else if (instructions.align === 'left') {
            document.execCommand('justifyLeft', false, null);
        } else if (instructions.align === 'right') {
            document.execCommand('justifyRight', false, null);
        }
    }
}

// Sync document to Omega Network
async function syncDocumentToOmega(content, fileName) {
    try {
        if (!window.electronAPI || !window.electronAPI.identitySyncDocument) {
            return; // Identity API not available
        }

        // Check if identity is initialized
        const hasIdentity = await window.electronAPI.identityHasIdentity();
        if (!hasIdentity) {
            // Silently fail - user can sync manually later
            return;
        }

        // Generate document hash
        const encoder = new TextEncoder();
        const data = encoder.encode(content);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const documentHash = '0x' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        // Create document ID from filename
        const documentId = fileName.replace(/[^a-zA-Z0-9]/g, '_') + '_' + Date.now();

        // Sync to Omega Network
        const result = await window.electronAPI.identitySyncDocument(
            documentId,
            documentHash,
            {
                name: fileName,
                type: 'word',
                timestamp: Date.now()
            }
        );

        if (result && result.success) {
            console.log('Document synced to Omega Network:', result.txHash);
        }
    } catch (error) {
        console.error('Failed to sync document to Omega Network:', error);
        // Don't show error to user - sync is optional
    }
}
