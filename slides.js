// Omega Slides Application
let currentWindowId = null;
let slides = [];
let currentSlideIndex = 0;
let currentFileName = null;
let hasUnsavedChanges = false;
let isPresenting = false;
let selectedElement = null;
let isDragging = false;
let dragOffset = { x: 0, y: 0 };
let currentTheme = 'default';

// Professional PowerPoint-style Themes
const themes = {
    default: {
        name: 'Default',
        background: 'white',
        textColor: '#333333',
        accentColor: '#0078d4',
        headingFont: 'Segoe UI',
        bodyFont: 'Segoe UI',
        category: 'basic'
    },
    corporate: {
        name: 'Corporate Blue',
        background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 50%, #7e8ba3 100%)',
        textColor: '#ffffff',
        accentColor: '#ffd700',
        headingFont: 'Georgia',
        bodyFont: 'Arial',
        category: 'professional'
    },
    modern: {
        name: 'Modern Gradient',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        textColor: '#ffffff',
        accentColor: '#fbbf24',
        headingFont: 'Helvetica',
        bodyFont: 'Helvetica',
        category: 'modern'
    },
    nature: {
        name: 'Nature Green',
        background: 'linear-gradient(135deg, #134e5e 0%, #71b280 100%)',
        textColor: '#ffffff',
        accentColor: '#f4d03f',
        headingFont: 'Trebuchet MS',
        bodyFont: 'Verdana',
        category: 'nature'
    },
    sunset: {
        name: 'Sunset Orange',
        background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 50%, #ff6b6b 100%)',
        textColor: '#ffffff',
        accentColor: '#fff9c4',
        headingFont: 'Arial Black',
        bodyFont: 'Arial',
        category: 'vibrant'
    },
    ocean: {
        name: 'Ocean Depth',
        background: 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)',
        textColor: '#ffffff',
        accentColor: '#00d4ff',
        headingFont: 'Calibri',
        bodyFont: 'Calibri',
        category: 'dark'
    },
    minimal: {
        name: 'Minimal Light',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        textColor: '#2c3e50',
        accentColor: '#3498db',
        headingFont: 'Segoe UI',
        bodyFont: 'Segoe UI',
        category: 'minimal'
    },
    tech: {
        name: 'Tech Dark',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        textColor: '#e94560',
        accentColor: '#00d9ff',
        headingFont: 'Courier New',
        bodyFont: 'Courier New',
        category: 'tech'
    },
    elegant: {
        name: 'Elegant Purple',
        background: 'linear-gradient(135deg, #434343 0%, #000000 100%)',
        textColor: '#ffffff',
        accentColor: '#9b59b6',
        headingFont: 'Times New Roman',
        bodyFont: 'Times New Roman',
        category: 'elegant'
    },
    fresh: {
        name: 'Fresh Mint',
        background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
        textColor: '#ffffff',
        accentColor: '#2c3e50',
        headingFont: 'Arial',
        bodyFont: 'Arial',
        category: 'fresh'
    },
    royal: {
        name: 'Royal Gold',
        background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
        textColor: '#ffd700',
        accentColor: '#ffffff',
        headingFont: 'Georgia',
        bodyFont: 'Georgia',
        category: 'royal'
    },
    vibrant: {
        name: 'Vibrant Rainbow',
        background: 'linear-gradient(135deg, #ff6b6b 0%, #4ecdc4 50%, #45b7d1 100%)',
        textColor: '#ffffff',
        accentColor: '#ffe66d',
        headingFont: 'Comic Sans MS',
        bodyFont: 'Arial',
        category: 'vibrant'
    },
    professional: {
        name: 'Professional Gray',
        background: 'linear-gradient(135deg, #bdc3c7 0%, #2c3e50 100%)',
        textColor: '#ffffff',
        accentColor: '#3498db',
        headingFont: 'Arial',
        bodyFont: 'Arial',
        category: 'professional'
    },
    warm: {
        name: 'Warm Sunset',
        background: 'linear-gradient(135deg, #ff9a56 0%, #ff6a88 100%)',
        textColor: '#ffffff',
        accentColor: '#fff5e6',
        headingFont: 'Trebuchet MS',
        bodyFont: 'Trebuchet MS',
        category: 'warm'
    },
    cool: {
        name: 'Cool Blue',
        background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
        textColor: '#ffffff',
        accentColor: '#ffd700',
        headingFont: 'Helvetica',
        bodyFont: 'Helvetica',
        category: 'cool'
    },
    forest: {
        name: 'Forest Green',
        background: 'linear-gradient(135deg, #0ba360 0%, #3cba92 100%)',
        textColor: '#ffffff',
        accentColor: '#f4d03f',
        headingFont: 'Verdana',
        bodyFont: 'Verdana',
        category: 'nature'
    },
    midnight: {
        name: 'Midnight Blue',
        background: 'linear-gradient(135deg, #0c0c0c 0%, #1a1a2e 50%, #16213e 100%)',
        textColor: '#00d4ff',
        accentColor: '#ff6b6b',
        headingFont: 'Arial',
        bodyFont: 'Arial',
        category: 'dark'
    },
    pastel: {
        name: 'Pastel Dream',
        background: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
        textColor: '#5a5a5a',
        accentColor: '#ff6b9d',
        headingFont: 'Segoe UI',
        bodyFont: 'Segoe UI',
        category: 'pastel'
    },
    energy: {
        name: 'Energy Red',
        background: 'linear-gradient(135deg, #eb3349 0%, #f45c43 100%)',
        textColor: '#ffffff',
        accentColor: '#ffd700',
        headingFont: 'Arial Black',
        bodyFont: 'Arial',
        category: 'energetic'
    }
};


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
        
        // Switch to best DeepSeek model for content generation (PowerPoint)
        if (window.electronAPI.aiSwitchModelForApp) {
            window.electronAPI.aiSwitchModelForApp('powerpoint').then(result => {
                if (result.success) {
                    console.log('[PowerPoint] Switched to AI model:', result.model);
                }
            }).catch(err => {
                console.log('[PowerPoint] Model switch failed (will use default):', err);
            });
        }
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

    // Initialize slides
    addNewSlide();
    updateSlideCounter();
    renderSlidesList();

    // Setup toolbar
    setupToolbar();

    // Setup slide management
    setupSlideManagement();

    // Setup file operations
    setupFileOperations();

    // Setup new features
    setupImageInsertion();
    setupTextBoxes();
    setupShapes();
    setupThemes();
    setupAlignment();
    setupDuplicateSlide();
    setupContextMenu();
    
    // Setup AI features
    setupAIFeatures();
    
    // Global click handler to close dropdowns when clicking outside
    // Use mousedown instead of click to avoid conflicts
    document.addEventListener('mousedown', (e) => {
        // Don't close if clicking inside a dropdown or its button
        if (e.target.closest('.dropdown-menu') || e.target.closest('.toolbar-dropdown')) {
            return;
        }
        
        // Close all dropdowns when clicking outside
        const allDropdowns = document.querySelectorAll('.dropdown-menu');
        allDropdowns.forEach(dropdown => {
            dropdown.style.display = 'none';
        });
    });

    // Keyboard navigation
    setupKeyboardShortcuts();
});

function setupToolbar() {
    const editor = document.getElementById('currentSlide');
    const boldBtn = document.getElementById('boldBtn');
    const italicBtn = document.getElementById('italicBtn');
    const underlineBtn = document.getElementById('underlineBtn');
    const fontFamilySelect = document.getElementById('fontFamilySelect');
    const fontSizeSelect = document.getElementById('fontSizeSelect');
    const fontColorPicker = document.getElementById('fontColorPicker');
    const alignLeftBtn = document.getElementById('alignLeftBtn');
    const alignCenterBtn = document.getElementById('alignCenterBtn');
    const alignRightBtn = document.getElementById('alignRightBtn');

    // Format buttons
    boldBtn.addEventListener('click', () => {
        document.execCommand('bold', false, null);
        updateToolbarState();
    });

    italicBtn.addEventListener('click', () => {
        document.execCommand('italic', false, null);
        updateToolbarState();
    });

    underlineBtn.addEventListener('click', () => {
        document.execCommand('underline', false, null);
        updateToolbarState();
    });

    // Font family
    fontFamilySelect.addEventListener('change', (e) => {
        document.execCommand('fontName', false, e.target.value);
    });

    // Font size
    fontSizeSelect.addEventListener('change', (e) => {
        document.execCommand('fontSize', false, '3');
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const selectedText = range.extractContents();
            const span = document.createElement('span');
            span.style.fontSize = e.target.value + 'pt';
            span.appendChild(selectedText);
            range.insertNode(span);
        }
    });

    // Font color
    fontColorPicker.addEventListener('change', (e) => {
        document.execCommand('foreColor', false, e.target.value);
    });

    // Alignment
    alignLeftBtn.addEventListener('click', () => {
        document.execCommand('justifyLeft', false, null);
    });

    alignCenterBtn.addEventListener('click', () => {
        document.execCommand('justifyCenter', false, null);
    });

    alignRightBtn.addEventListener('click', () => {
        document.execCommand('justifyRight', false, null);
    });

    // Update toolbar state on selection change
    editor.addEventListener('selectionchange', updateToolbarState);
    editor.addEventListener('keyup', updateToolbarState);
    editor.addEventListener('mouseup', updateToolbarState);
}

function updateToolbarState() {
    const boldBtn = document.getElementById('boldBtn');
    const italicBtn = document.getElementById('italicBtn');
    const underlineBtn = document.getElementById('underlineBtn');

    boldBtn.classList.toggle('active', document.queryCommandState('bold'));
    italicBtn.classList.toggle('active', document.queryCommandState('italic'));
    underlineBtn.classList.toggle('active', document.queryCommandState('underline'));
}

function setupSlideManagement() {
    const addSlideBtn = document.getElementById('addSlideBtn');
    const deleteSlideBtn = document.getElementById('deleteSlideBtn');
    const prevSlideBtn = document.getElementById('prevSlideBtn');
    const nextSlideBtn = document.getElementById('nextSlideBtn');
    const presentBtn = document.getElementById('presentBtn');

    addSlideBtn.addEventListener('click', () => {
        addNewSlide();
        switchToSlide(slides.length - 1);
    });

    deleteSlideBtn.addEventListener('click', () => {
        if (slides.length > 1) {
            deleteCurrentSlide();
        } else {
            alert('Cannot delete the last slide. Presentations must have at least one slide.');
        }
    });

    prevSlideBtn.addEventListener('click', () => {
        if (currentSlideIndex > 0) {
            switchToSlide(currentSlideIndex - 1);
        }
    });

    nextSlideBtn.addEventListener('click', () => {
        if (currentSlideIndex < slides.length - 1) {
            switchToSlide(currentSlideIndex + 1);
        }
    });

    presentBtn.addEventListener('click', () => {
        startPresentation();
    });
}

function setupDuplicateSlide() {
    const duplicateBtn = document.getElementById('duplicateSlideBtn');
    duplicateBtn.addEventListener('click', () => {
        // Save current slide
        saveCurrentSlide();
        
        // Duplicate current slide
        const currentSlide = JSON.parse(JSON.stringify(slides[currentSlideIndex]));
        currentSlide.id = Date.now() + Math.random();
        slides.splice(currentSlideIndex + 1, 0, currentSlide);
        switchToSlide(currentSlideIndex + 1);
        hasUnsavedChanges = true;
        updateWindowTitle();
    });
}

function setupImageInsertion() {
    const imageBtn = document.getElementById('imageBtn');
    const imageInput = document.getElementById('imageInput');
    
    imageBtn.addEventListener('click', () => {
        imageInput.click();
    });
    
    imageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (event) => {
                insertImage(event.target.result);
            };
            reader.readAsDataURL(file);
        }
        // Reset input so same file can be selected again
        imageInput.value = '';
    });
    
    // Drag and drop support
    const slideCanvas = document.getElementById('slideCanvas');
    slideCanvas.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
    });
    
    slideCanvas.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const files = e.dataTransfer.files;
        if (files.length > 0 && files[0].type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (event) => {
                insertImage(event.target.result, e.offsetX - 200, e.offsetY - 100);
            };
            reader.readAsDataURL(files[0]);
        }
    });
}

function insertImage(src, x = null, y = null) {
    const slide = document.getElementById('currentSlide');
    const img = document.createElement('img');
    img.src = src;
    img.className = 'slide-image';
    img.draggable = true;
    img.style.maxWidth = '300px';
    img.style.maxHeight = '300px';
    img.style.cursor = 'move';
    
    if (x !== null && y !== null) {
        img.style.position = 'absolute';
        img.style.left = x + 'px';
        img.style.top = y + 'px';
    } else {
        img.style.display = 'block';
        img.style.margin = '0 auto';
    }
    
    // Make image draggable
    makeElementDraggable(img);
    
    slide.appendChild(img);
    hasUnsavedChanges = true;
    updateWindowTitle();
    renderSlidesList();
}

function setupTextBoxes() {
    const textBoxBtn = document.getElementById('textBoxBtn');
    textBoxBtn.addEventListener('click', () => {
        addTextBox();
    });
}

function addTextBox(x = null, y = null) {
    const slide = document.getElementById('currentSlide');
    const textBox = document.createElement('div');
    textBox.className = 'slide-textbox';
    textBox.contentEditable = true;
    textBox.style.minWidth = '200px';
    textBox.style.minHeight = '50px';
    textBox.style.padding = '10px';
    textBox.style.border = '2px dashed #0078d4';
    textBox.style.borderRadius = '4px';
    textBox.style.outline = 'none';
    textBox.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
    textBox.textContent = 'Text Box';
    
    if (x !== null && y !== null) {
        textBox.style.position = 'absolute';
        textBox.style.left = x + 'px';
        textBox.style.top = y + 'px';
    } else {
        textBox.style.position = 'absolute';
        textBox.style.left = '50%';
        textBox.style.top = '50%';
        textBox.style.transform = 'translate(-50%, -50%)';
    }
    
    // Make textbox draggable
    makeElementDraggable(textBox);
    
    // Focus on the textbox
    textBox.addEventListener('click', (e) => {
        e.stopPropagation();
        textBox.style.border = '2px solid #0078d4';
        selectedElement = textBox;
    });
    
    textBox.addEventListener('blur', () => {
        textBox.style.border = '2px dashed #0078d4';
    });
    
    textBox.addEventListener('input', () => {
        hasUnsavedChanges = true;
        updateWindowTitle();
    });
    
    slide.appendChild(textBox);
    textBox.focus();
    hasUnsavedChanges = true;
    updateWindowTitle();
    renderSlidesList();
}


function makeElementDraggable(element) {
    let isDown = false;
    let startX, startY, startLeft, startTop;
    
    element.addEventListener('mousedown', (e) => {
        if (e.target === element || element.contains(e.target)) {
            isDown = true;
            element.style.cursor = 'grabbing';
            startX = e.clientX;
            startY = e.clientY;
            
            const rect = element.getBoundingClientRect();
            const slideRect = document.getElementById('currentSlide').getBoundingClientRect();
            startLeft = rect.left - slideRect.left;
            startTop = rect.top - slideRect.top;
            
            element.style.position = 'absolute';
            element.style.left = startLeft + 'px';
            element.style.top = startTop + 'px';
            if (element.style.transform && element.style.transform.includes('translate')) {
                element.style.transform = '';
            }
        }
    });
    
    document.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        e.preventDefault();
        
        const slideRect = document.getElementById('currentSlide').getBoundingClientRect();
        const newLeft = startLeft + (e.clientX - startX);
        const newTop = startTop + (e.clientY - startY);
        
        // Constrain to slide bounds
        const maxLeft = slideRect.width - element.offsetWidth;
        const maxTop = slideRect.height - element.offsetHeight;
        
        element.style.left = Math.max(0, Math.min(newLeft, maxLeft)) + 'px';
        element.style.top = Math.max(0, Math.min(newTop, maxTop)) + 'px';
        
        hasUnsavedChanges = true;
        updateWindowTitle();
    });
    
    document.addEventListener('mouseup', () => {
        if (isDown) {
            isDown = false;
            element.style.cursor = 'move';
        }
    });
}


function setupAlignment() {
    // Already handled in setupToolbar
}

function setupFileOperations() {
    const newBtn = document.getElementById('newBtn');
    const openBtn = document.getElementById('openBtn');
    const saveBtn = document.getElementById('saveBtn');
    
    // File menu
    const fileMenuBtn = document.getElementById('fileMenuBtn');
    const fileMenuDropdown = document.getElementById('fileMenuDropdown');
    const fileMenuNew = document.getElementById('fileMenuNew');
    const fileMenuOpen = document.getElementById('fileMenuOpen');
    const fileMenuSave = document.getElementById('fileMenuSave');
    const fileMenuSaveAs = document.getElementById('fileMenuSaveAs');
    
    // Toggle file menu dropdown
    if (fileMenuBtn && fileMenuDropdown) {
        const fileMenuContainer = fileMenuBtn.closest('.file-menu-container');
        
        fileMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            fileMenuDropdown.classList.toggle('show');
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (fileMenuContainer && !fileMenuContainer.contains(e.target)) {
                fileMenuDropdown.classList.remove('show');
            }
        });
        
        // File menu actions
        if (fileMenuNew) {
            fileMenuNew.addEventListener('click', () => {
                fileMenuDropdown.classList.remove('show');
                if (newBtn) newBtn.click();
            });
        }
        
        if (fileMenuOpen) {
            fileMenuOpen.addEventListener('click', () => {
                fileMenuDropdown.classList.remove('show');
                if (openBtn) openBtn.click();
            });
        }
        
        if (fileMenuSave) {
            fileMenuSave.addEventListener('click', async () => {
                fileMenuDropdown.classList.remove('show');
                await savePresentation();
            });
        }
        
        if (fileMenuSaveAs) {
            fileMenuSaveAs.addEventListener('click', async () => {
                fileMenuDropdown.classList.remove('show');
                await savePresentationAs();
            });
        }
    }

    newBtn.addEventListener('click', async () => {
        if (hasUnsavedChanges) {
            if (!confirm('You have unsaved changes. Create a new presentation anyway?')) {
                return;
            }
        }
        slides = [];
        currentSlideIndex = 0;
        currentTheme = 'default';
        addNewSlide();
        renderSlidesList();
        updateSlideCounter();
        currentFileName = null;
        hasUnsavedChanges = false;
        updateWindowTitle();
    });

    openBtn.addEventListener('click', async () => {
        if (hasUnsavedChanges) {
            if (!confirm('You have unsaved changes. Open a new file anyway?')) {
                return;
            }
        }
        if (window.electronAPI && window.electronAPI.openFileDialog) {
            try {
                const result = await window.electronAPI.openFileDialog({
                    filters: [
                        { name: 'JSON Files', extensions: ['json'] },
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

    saveBtn.addEventListener('click', async () => {
        await savePresentation();
    });

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
            return;
        }
        
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            savePresentation();
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            e.preventDefault();
            newBtn.click();
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
            e.preventDefault();
            openBtn.click();
        }
        // Undo (for contenteditable elements)
        if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
            const slide = document.getElementById('currentSlide');
            const textBoxes = slide.querySelectorAll('.slide-textbox');
            const focused = Array.from(textBoxes).find(box => box === activeElement);
            if (focused || activeElement === slide) {
                // Only prevent default if we're in a text box or slide
                if (activeElement.isContentEditable) {
                    e.preventDefault();
                    document.execCommand('undo');
                }
            }
        }
        // Redo
        if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
            const slide = document.getElementById('currentSlide');
            const textBoxes = slide.querySelectorAll('.slide-textbox');
            const focused = Array.from(textBoxes).find(box => box === activeElement);
            if (focused || activeElement === slide) {
                if (activeElement.isContentEditable) {
                    e.preventDefault();
                    document.execCommand('redo');
                }
            }
        }
        // Find
        if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
            e.preventDefault();
            showFindDialog();
        }
        if (e.key === 'Delete' && selectedElement) {
            selectedElement.remove();
            selectedElement = null;
            hasUnsavedChanges = true;
            updateWindowTitle();
            renderSlidesList();
        }
    });
}

function saveCurrentSlide() {
    if (slides[currentSlideIndex]) {
        const slide = document.getElementById('currentSlide');
        slides[currentSlideIndex].content = slide.innerHTML;
        slides[currentSlideIndex].theme = currentTheme;
    }
}

function addNewSlide() {
    const slide = {
        id: Date.now() + Math.random(),
        content: '',
        theme: 'default'
    };
    slides.push(slide);
    renderSlidesList();
    updateSlideCounter();
}

function deleteCurrentSlide() {
    slides.splice(currentSlideIndex, 1);
    if (currentSlideIndex >= slides.length) {
        currentSlideIndex = slides.length - 1;
    }
    switchToSlide(currentSlideIndex);
    renderSlidesList();
    updateSlideCounter();
    hasUnsavedChanges = true;
    updateWindowTitle();
}

function switchToSlide(index) {
    // Save current slide content
    saveCurrentSlide();

    // Switch to new slide
    currentSlideIndex = index;
    const currentSlideData = slides[currentSlideIndex];
    const slideElement = document.getElementById('currentSlide');
    slideElement.innerHTML = currentSlideData.content || '';
    
    // Apply theme
    const themeName = currentSlideData.theme || 'default';
    currentTheme = themeName;
    applyTheme(themeName, false); // false = don't save (already saved)
    
    // Reinitialize draggable elements
    reinitializeDraggableElements();

    // Update UI
    renderSlidesList();
    updateSlideCounter();
    hasUnsavedChanges = true;
    updateWindowTitle();
}

function reinitializeDraggableElements() {
    const slide = document.getElementById('currentSlide');
    const images = slide.querySelectorAll('.slide-image');
    const textBoxes = slide.querySelectorAll('.slide-textbox');
    const shapes = slide.querySelectorAll('.slide-shape');
    
    [...images, ...textBoxes, ...shapes].forEach(el => {
        makeElementDraggable(el);
    });
}

// Setup Shapes with Modal
function setupShapes() {
    const shapeBtn = document.getElementById('shapeBtn');
    const shapeModal = document.getElementById('shapeModal');
    const closeShapeModal = document.getElementById('closeShapeModal');
    
    if (!shapeBtn || !shapeModal) {
        console.error('Shape elements not found');
        return;
    }
    
    // Open modal
    shapeBtn.addEventListener('click', () => {
        shapeModal.style.display = 'flex';
    });
    
    // Close modal
    closeShapeModal.addEventListener('click', () => {
        shapeModal.style.display = 'none';
    });
    
    // Close on overlay click
    shapeModal.addEventListener('click', (e) => {
        if (e.target === shapeModal) {
            shapeModal.style.display = 'none';
        }
    });
    
    // Handle shape selection
    const shapeOptions = shapeModal.querySelectorAll('.shape-option');
    shapeOptions.forEach(option => {
        option.addEventListener('click', () => {
            const shapeType = option.getAttribute('data-shape');
            if (shapeType) {
                addShape(shapeType);
                shapeModal.style.display = 'none';
            }
        });
    });
}

function addShape(shapeType) {
    const slide = document.getElementById('currentSlide');
    if (!slide) {
        console.error('Current slide not found');
        return;
    }
    
    const shape = document.createElement('div');
    shape.className = 'slide-shape';
    shape.style.position = 'absolute';
    shape.style.cursor = 'move';
    shape.style.zIndex = '10';
    
    // Get slide dimensions for centering
    const slideRect = slide.getBoundingClientRect();
    const centerX = slideRect.width / 2;
    const centerY = slideRect.height / 2;
    
    // Center the shape
    shape.style.left = centerX + 'px';
    shape.style.top = centerY + 'px';
    shape.style.transform = 'translate(-50%, -50%)';
    
    switch(shapeType) {
        case 'rect':
            shape.style.width = '150px';
            shape.style.height = '100px';
            shape.style.backgroundColor = '#0078d4';
            shape.style.border = 'none';
            shape.style.borderRadius = '4px';
            shape.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2)';
            break;
        case 'circle':
            shape.style.width = '100px';
            shape.style.height = '100px';
            shape.style.backgroundColor = '#0078d4';
            shape.style.border = 'none';
            shape.style.borderRadius = '50%';
            shape.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2)';
            break;
        case 'line':
            shape.style.width = '200px';
            shape.style.height = '4px';
            shape.style.backgroundColor = '#333';
            shape.style.border = 'none';
            shape.style.borderRadius = '2px';
            shape.style.transform = 'translate(-50%, -50%)';
            break;
        case 'arrow':
            shape.innerHTML = '→';
            shape.style.width = '100px';
            shape.style.height = '100px';
            shape.style.fontSize = '60px';
            shape.style.textAlign = 'center';
            shape.style.lineHeight = '100px';
            shape.style.color = '#0078d4';
            shape.style.fontWeight = 'bold';
            shape.style.backgroundColor = 'transparent';
            break;
        default:
            console.warn('Unknown shape type:', shapeType);
            return;
    }
    
    // Make shape draggable
    makeElementDraggable(shape);
    
    // Handle selection
    shape.addEventListener('click', (e) => {
        e.stopPropagation();
        // Remove outline from previously selected element
        if (selectedElement && selectedElement !== shape) {
            selectedElement.style.outline = '';
        }
        selectedElement = shape;
        shape.style.outline = '2px solid #0078d4';
        shape.style.outlineOffset = '2px';
    });
    
    slide.appendChild(shape);
    hasUnsavedChanges = true;
    updateWindowTitle();
    renderSlidesList();
    
    // Select the newly added shape
    setTimeout(() => shape.click(), 100);
}

// Setup Themes with Modal
function setupThemes() {
    const themeBtn = document.getElementById('themeBtn');
    const themeModal = document.getElementById('themeModal');
    const closeThemeModal = document.getElementById('closeThemeModal');
    
    if (!themeBtn || !themeModal) {
        console.error('Theme elements not found');
        return;
    }
    
    // Open modal
    themeBtn.addEventListener('click', () => {
        themeModal.style.display = 'flex';
    });
    
    // Close modal
    closeThemeModal.addEventListener('click', () => {
        themeModal.style.display = 'none';
    });
    
    // Close on overlay click
    themeModal.addEventListener('click', (e) => {
        if (e.target === themeModal) {
            themeModal.style.display = 'none';
        }
    });
    
    // Handle theme selection
    const themeOptions = themeModal.querySelectorAll('.theme-option');
    themeOptions.forEach(option => {
        option.addEventListener('click', () => {
            const themeName = option.getAttribute('data-theme');
            if (themeName) {
                applyTheme(themeName);
                themeModal.style.display = 'none';
            }
        });
    });
}

function applyTheme(themeName, saveToSlide = true) {
    currentTheme = themeName;
    const theme = themes[themeName];
    const slide = document.getElementById('currentSlide');
    const slideCanvas = document.getElementById('slideCanvas');
    
    if (!slide || !slideCanvas) {
        console.error('Slide elements not found');
        return;
    }
    
    if (!theme) {
        console.error('Theme not found:', themeName);
        return;
    }
    
    // Apply theme to slide canvas background
    if (typeof theme.background === 'string' && theme.background.includes('gradient')) {
        slideCanvas.style.background = theme.background;
        slide.style.background = 'transparent';
    } else {
        slideCanvas.style.background = theme.background;
        slide.style.background = theme.background;
    }
    
    // Apply text color
    slide.style.color = theme.textColor;
    
    // Apply fonts
    if (theme.headingFont) {
        slide.style.setProperty('--heading-font', theme.headingFont);
    }
    if (theme.bodyFont) {
        slide.style.setProperty('--body-font', theme.bodyFont);
    }
    
    // Update all text elements in the slide to match theme
    setTimeout(() => {
        const textElements = slide.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, .slide-textbox');
        textElements.forEach(el => {
            const computedColor = window.getComputedStyle(el).color;
            // Only update if it's the default color or close to it
            if (!el.style.color || computedColor === 'rgb(51, 51, 51)' || computedColor === 'rgb(0, 0, 0)') {
                el.style.color = theme.textColor;
            }
            
            // Apply fonts based on element type
            if (theme.headingFont && (el.tagName === 'H1' || el.tagName === 'H2' || el.tagName === 'H3' || el.tagName === 'H4' || el.tagName === 'H5' || el.tagName === 'H6')) {
                el.style.fontFamily = theme.headingFont;
            } else if (theme.bodyFont) {
                el.style.fontFamily = theme.bodyFont;
            }
        });
    }, 10);
    
    // Update slide data
    if (saveToSlide && slides[currentSlideIndex]) {
        slides[currentSlideIndex].theme = themeName;
    }
    
    hasUnsavedChanges = true;
    updateWindowTitle();
    renderSlidesList();
}

function renderSlidesList() {
    const slidesList = document.getElementById('slidesList');
    slidesList.innerHTML = '';

    slides.forEach((slide, index) => {
        const slideItem = document.createElement('div');
        slideItem.className = 'slide-thumbnail' + (index === currentSlideIndex ? ' active' : '');
        
        // Create a temporary element to extract text preview
        const temp = document.createElement('div');
        temp.innerHTML = slide.content || '';
        const textContent = temp.textContent || temp.innerText || '';
        
        slideItem.innerHTML = `
            <div class="slide-thumbnail-number">${index + 1}</div>
            <div class="slide-thumbnail-preview">${textContent.substring(0, 50)}</div>
        `;
        slideItem.addEventListener('click', () => {
            switchToSlide(index);
        });
        slidesList.appendChild(slideItem);
    });
}

function updateSlideCounter() {
    document.getElementById('slideCounter').textContent = `Slide ${currentSlideIndex + 1} of ${slides.length}`;
}

function setupKeyboardShortcuts() {
    // Arrow key navigation
    document.addEventListener('keydown', (e) => {
        if (isPresenting) {
            if (e.key === 'ArrowRight' || e.key === 'PageDown') {
                e.preventDefault();
                if (currentSlideIndex < slides.length - 1) {
                    switchToSlide(currentSlideIndex + 1);
                }
            } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
                e.preventDefault();
                if (currentSlideIndex > 0) {
                    switchToSlide(currentSlideIndex - 1);
                }
            } else if (e.key === 'Escape') {
                e.preventDefault();
                stopPresentation();
            }
        } else {
            // Only handle navigation if not editing text
            const activeElement = document.activeElement;
            if (!activeElement || !activeElement.isContentEditable) {
                if (e.key === 'ArrowRight' || e.key === 'PageDown') {
                    if (currentSlideIndex < slides.length - 1) {
                        switchToSlide(currentSlideIndex + 1);
                    }
                } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
                    if (currentSlideIndex > 0) {
                        switchToSlide(currentSlideIndex - 1);
                    }
                }
            }
        }
    });
}

function startPresentation() {
    // Save current slide
    saveCurrentSlide();

    isPresenting = true;
    document.body.classList.add('presentation-mode');
    
    // Hide sidebar and toolbar
    document.querySelector('.slides-sidebar').style.display = 'none';
    document.querySelector('.toolbar').style.display = 'none';
    
    // Make slide fullscreen
    document.querySelector('.slide-editor-area').style.width = '100%';
}

function stopPresentation() {
    isPresenting = false;
    document.body.classList.remove('presentation-mode');
    
    // Show sidebar and toolbar
    document.querySelector('.slides-sidebar').style.display = 'block';
    document.querySelector('.toolbar').style.display = 'flex';
    
    // Restore slide editor width
    document.querySelector('.slide-editor-area').style.width = '';
}

async function savePresentation() {
    // If file already has a name, save directly; otherwise use Save As
    if (currentFileName && window.electronAPI && window.electronAPI.writeFile) {
        try {
            // Save current slide content
            saveCurrentSlide();
            const data = {
                slides: slides,
                version: '1.0'
            };
            const content = JSON.stringify(data, null, 2);
            await window.electronAPI.writeFile(currentFileName, content);
            hasUnsavedChanges = false;
            updateWindowTitle();
            return;
        } catch (error) {
            console.error('Error saving file:', error);
            // Fall through to Save As dialog
        }
    }
    // Use Save As dialog
    await savePresentationAs();
}

async function savePresentationAs() {
    // Save current slide content
    saveCurrentSlide();

    const data = {
        slides: slides,
        version: '1.0'
    };
    const content = JSON.stringify(data, null, 2);
    
    if (window.electronAPI && window.electronAPI.saveFileDialog) {
        try {
            // Determine default filename and extension
            let defaultFileName = currentFileName || 'presentation';
            // Remove existing extension
            defaultFileName = defaultFileName.replace(/\.[^/.]+$/, '');
            
            const result = await window.electronAPI.saveFileDialog({
                defaultPath: defaultFileName + '.pptx',
                filters: [
                    { name: 'PowerPoint Presentations', extensions: ['pptx'] },
                    { name: 'JSON Files', extensions: ['json'] },
                    { name: 'All Files', extensions: ['*'] }
                ]
            });
            if (result && !result.canceled && result.filePath) {
                let filePath = result.filePath;
                let ext = filePath.toLowerCase().split('.').pop();
                
                // If no extension, default to pptx if PowerPoint filter was likely selected
                if (!ext || ext === filePath.toLowerCase()) {
                    filePath = filePath + '.pptx';
                    ext = 'pptx';
                }
                
                // Check if user wants PPTX format
                if (ext === 'pptx' && window.electronAPI.convertToPptx) {
                    const convertResult = await window.electronAPI.convertToPptx(slides, filePath);
                    if (convertResult && convertResult.success) {
                        currentFileName = filePath;
                        hasUnsavedChanges = false;
                        updateWindowTitle();
                        alert('Presentation saved as PowerPoint format (.pptx)');
                    } else {
                        alert('Error converting to PPTX: ' + (convertResult?.error || 'Unknown error'));
                    }
                } else {
                    // Save as JSON
                    await window.electronAPI.writeFile(filePath, content);
                    currentFileName = filePath;
                    hasUnsavedChanges = false;
                    updateWindowTitle();
                }
            }
        } catch (error) {
            console.error('Error saving file:', error);
            alert('Error saving file: ' + error.message);
        }
    } else {
        // Fallback to browser download
        const blob = new Blob([content], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = currentFileName || 'presentation.json';
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
            const data = JSON.parse(content);
            slides = data.slides || [];
            if (slides.length === 0) {
                addNewSlide();
            }
            currentSlideIndex = 0;
            switchToSlide(0);
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
    title.textContent = hasUnsavedChanges ? `Omega Slides - ${fileName} *` : `Omega Slides - ${fileName}`;
}

// Context Menu
function setupContextMenu() {
    const slide = document.getElementById('currentSlide');
    const slideCanvas = document.getElementById('slideCanvas');
    
    // Create context menu
    const contextMenu = document.createElement('div');
    contextMenu.id = 'slideContextMenu';
    contextMenu.className = 'context-menu';
    contextMenu.innerHTML = `
        <div class="context-menu-item" id="contextPaste">Paste</div>
        <div class="context-menu-item" id="contextCopy">Copy</div>
        <div class="context-menu-item" id="contextCut">Cut</div>
        <div class="context-menu-divider"></div>
        <div class="context-menu-item" id="contextDelete">Delete</div>
        <div class="context-menu-divider"></div>
        <div class="context-menu-item" id="contextSelectAll">Select All</div>
    `;
    document.body.appendChild(contextMenu);
    
    let contextMenuVisible = false;
    
    // Show context menu on right-click
    [slide, slideCanvas].forEach(element => {
        element.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const x = e.clientX;
            const y = e.clientY;
            
            contextMenu.style.display = 'block';
            contextMenu.style.left = x + 'px';
            contextMenu.style.top = y + 'px';
            contextMenuVisible = true;
            
            // Adjust if menu goes off screen
            setTimeout(() => {
                const rect = contextMenu.getBoundingClientRect();
                if (rect.right > window.innerWidth) {
                    contextMenu.style.left = (x - rect.width) + 'px';
                }
                if (rect.bottom > window.innerHeight) {
                    contextMenu.style.top = (y - rect.height) + 'px';
                }
            }, 0);
        });
    });
    
    // Hide context menu when clicking elsewhere
    document.addEventListener('click', (e) => {
        if (contextMenuVisible && !contextMenu.contains(e.target)) {
            contextMenu.style.display = 'none';
            contextMenuVisible = false;
        }
    });
    
    // Context menu actions
    document.getElementById('contextPaste').addEventListener('click', async () => {
        contextMenu.style.display = 'none';
        contextMenuVisible = false;
        
        try {
            // Try to get clipboard text
            const text = await navigator.clipboard.readText();
            if (text) {
                const selection = window.getSelection();
                if (selection.rangeCount > 0) {
                    const range = selection.getRangeAt(0);
                    range.deleteContents();
                    const textNode = document.createTextNode(text);
                    range.insertNode(textNode);
                    range.setStartAfter(textNode);
                    range.collapse(true);
                    selection.removeAllRanges();
                    selection.addRange(range);
                } else {
                    // Insert at cursor or end
                    const slide = document.getElementById('currentSlide');
                    const textNode = document.createTextNode(text);
                    slide.appendChild(textNode);
                }
                hasUnsavedChanges = true;
                updateWindowTitle();
            }
        } catch (err) {
            // Fallback: use document.execCommand
            document.execCommand('paste');
            hasUnsavedChanges = true;
            updateWindowTitle();
        }
    });
    
    document.getElementById('contextCopy').addEventListener('click', () => {
        contextMenu.style.display = 'none';
        contextMenuVisible = false;
        document.execCommand('copy');
    });
    
    document.getElementById('contextCut').addEventListener('click', () => {
        contextMenu.style.display = 'none';
        contextMenuVisible = false;
        document.execCommand('cut');
        hasUnsavedChanges = true;
        updateWindowTitle();
    });
    
    document.getElementById('contextDelete').addEventListener('click', () => {
        contextMenu.style.display = 'none';
        contextMenuVisible = false;
        
        if (selectedElement) {
            selectedElement.remove();
            selectedElement = null;
        } else {
            document.execCommand('delete');
        }
        hasUnsavedChanges = true;
        updateWindowTitle();
        renderSlidesList();
    });
    
    document.getElementById('contextSelectAll').addEventListener('click', () => {
        contextMenu.style.display = 'none';
        contextMenuVisible = false;
        document.execCommand('selectAll', false, null);
    });
}

// AI Features
let aiSidebarCollapsed = false;

function setupAIFeatures() {
    const aiBtn = document.getElementById('aiBtn');
    const aiSidebar = document.getElementById('aiSidebar');
    const aiSidebarToggle = document.getElementById('aiSidebarToggle');
    const aiChatInput = document.getElementById('aiChatInput');
    const aiChatSend = document.getElementById('aiChatSend');
    const aiChatMessages = document.getElementById('aiChatMessages');
    const aiWelcomeMessage = document.querySelector('.ai-welcome-message');

    if (!aiBtn || !aiSidebar || !aiSidebarToggle || !aiChatInput || !aiChatSend) {
        console.error('AI elements not found in DOM');
        if (aiBtn) aiBtn.style.display = 'none';
        return;
    }

    // Toggle sidebar when AI button is clicked
    aiBtn.addEventListener('click', () => {
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

        // Convert markdown to HTML with proper slide formatting (compact and organized for slides)
        function markdownToHtml(text) {
            let html = text;
            // Split into lines first
            const lines = html.split('\n');
            const processedLines = [];
            
            for (let i = 0; i < lines.length; i++) {
                let line = lines[i].trim();
                if (!line) {
                    // Skip empty lines for tighter spacing
                    continue;
                }
                
                // Convert headings (must be at start of line) - make them smaller for slides
                if (line.startsWith('### ')) {
                    processedLines.push('<h3 style="font-size: 20pt; font-weight: 600; margin: 10px 0 6px 0; line-height: 1.3;">' + line.substring(4) + '</h3>');
                } else if (line.startsWith('## ')) {
                    processedLines.push('<h2 style="font-size: 24pt; font-weight: 600; margin: 12px 0 8px 0; line-height: 1.3;">' + line.substring(3) + '</h2>');
                } else if (line.startsWith('# ') || (line.startsWith('**') && line.endsWith('**') && !line.includes('•') && !line.includes('-') && line.split('**').length === 3)) {
                    // Title (either # Title or **Title**)
                    const titleText = line.startsWith('# ') ? line.substring(2) : line.replace(/\*\*/g, '');
                    processedLines.push('<h1 style="font-size: 32pt; font-weight: 600; margin: 0 0 14px 0; line-height: 1.2;">' + titleText + '</h1>');
                } else if (line.match(/^[•\-\*]\s+/)) {
                    // Bullet point - remove the bullet marker and convert
                    const content = line.replace(/^[•\-\*]\s+/, '');
                    // Convert **bold** in content
                    const boldContent = content.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
                    processedLines.push('<div style="margin: 3px 0; padding-left: 20px; line-height: 1.35; font-size: 12pt;">• ' + boldContent + '</div>');
                } else if (line.match(/^\d+\.\s+/)) {
                    // Numbered list
                    processedLines.push('<div style="margin: 3px 0; padding-left: 20px; line-height: 1.35; font-size: 12pt;">' + line + '</div>');
                } else {
                    // Regular text - convert **bold** first
                    line = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
                    line = line.replace(/(?<!\*)\*([^*]+?)\*(?!\*)/g, '<em>$1</em>');
                    processedLines.push('<p style="margin: 3px 0; line-height: 1.35; font-size: 12pt;">' + line + '</p>');
                }
            }
            
            return processedLines.join('');
        }

        try {
            // Determine if this is a continuation request (cut off, incomplete, finish, continue)
            const lowerMessage = message.toLowerCase();
            const isContinuation = lowerMessage.includes('cut off') || lowerMessage.includes('incomplete') ||
                                  lowerMessage.includes('finish') || lowerMessage.includes('continue') ||
                                  lowerMessage.includes('it was cut') || lowerMessage.includes('not finished') ||
                                  lowerMessage.includes('was incomplete') || lowerMessage.includes('complete it') ||
                                  lowerMessage.includes('still looks bad') || lowerMessage.includes('fix it');
            
            // Determine if this is a generation request
            const isGeneration = lowerMessage.includes('write') || lowerMessage.includes('create') || 
                                 lowerMessage.includes('generate') || lowerMessage.includes('about') ||
                                 lowerMessage.includes('need') || lowerMessage.includes('content');

            // Detect if user wants multiple slides
            const slideCountMatch = lowerMessage.match(/(\d+)\s+slides?/);
            const slideCount = slideCountMatch ? parseInt(slideCountMatch[1]) : 1;
            
            // Detect if message specifies different content for different slides
            const hasSlideSpecs = lowerMessage.includes('slide 1') || lowerMessage.includes('slide 2') || 
                                  lowerMessage.includes('slide 3') || lowerMessage.includes('slide 4') ||
                                  lowerMessage.includes('slide 5') || lowerMessage.match(/slide\s+\d+/i);

            let result;
            if (isGeneration && (slideCount > 1 || hasSlideSpecs)) {
                // Multiple slides requested - generate content for each slide separately
                const actualSlideCount = slideCount > 1 ? slideCount : (hasSlideSpecs ? 2 : 1);
                
                addAIMessage('assistant', `Creating ${actualSlideCount} slides...`, true);
                
                // Generate content for each slide
                const slideContents = [];
                for (let i = 1; i <= actualSlideCount; i++) {
                    // Extract specific content for this slide if mentioned
                    let slideSpecificPrompt = message;
                    if (hasSlideSpecs) {
                        // Try multiple patterns to extract slide-specific content
                        // Pattern 1: "slide 1 is about X" or "slide 1 about X"
                        let slidePattern = new RegExp(`slide\\s+${i}\\s+(?:is\\s+)?(?:about|on|for|regarding)\\s+(.+?)(?=\\s+slide\\s+${i+1}|$)`, 'i');
                        let match = message.match(slidePattern);
                        if (match && match[1]) {
                            slideSpecificPrompt = match[1].trim();
                        } else {
                            // Pattern 2: "slide 1: X" or "slide 1 - X"
                            slidePattern = new RegExp(`slide\\s+${i}\\s*[:\\-]\\s*(.+?)(?=\\s+slide\\s+${i+1}|$)`, 'i');
                            match = message.match(slidePattern);
                            if (match && match[1]) {
                                slideSpecificPrompt = match[1].trim();
                            } else {
                                // Pattern 3: "slide 1 X" (direct topic)
                                slidePattern = new RegExp(`slide\\s+${i}\\s+(.+?)(?=\\s+slide\\s+${i+1}|$)`, 'i');
                                match = message.match(slidePattern);
                                if (match && match[1]) {
                                    slideSpecificPrompt = match[1].trim();
                                }
                            }
                        }
                    } else if (actualSlideCount > 1) {
                        // If multiple slides but no explicit specs, try to split the topic
                        // This is a simple heuristic - could be improved
                        slideSpecificPrompt = `Content for slide ${i} of ${actualSlideCount}: ${message}`;
                    }
                    
                    const slidePrompt = `You are creating content for slide ${i} of ${actualSlideCount} in a presentation.

User's request: "${slideSpecificPrompt}"

IMPORTANT FORMATTING RULES:
1. Create concise, slide-appropriate content (not long paragraphs)
2. Use a clear title/heading at the top (use **Title** format)
3. Use bullet points for main ideas (use • or - for bullets)
4. Keep each bullet point short (1-2 lines max)
5. Use **bold** for emphasis on key terms
6. NO long paragraphs or full sentences - this is for slides!
7. Maximum 5-7 bullet points per slide
8. Start directly with the content, no introductions or explanations like "Slide 1:" or "Here's slide 1:"

Format your response EXACTLY as:
**Title Here**
• Bullet point 1
• Bullet point 2
• Bullet point 3

FORMATTING: If the user requests formatting (bold, italic, underline, font size, color), apply it to the content. Use **bold** for bold text, *italic* for italic text.

Generate ONLY the slide content now (title and bullets, nothing else):`;
                    
                    const slideResult = await window.electronAPI.aiChat(slidePrompt, []);
                    if (slideResult && slideResult.success) {
                        let content = slideResult.response || slideResult.text || '';
                        slideContents.push(content);
                    }
                }
                
                // Remove the "Creating X slides..." message
                const messages = aiChatMessages.querySelectorAll('.ai-chat-message');
                if (messages.length > 0) {
                    messages[messages.length - 1].remove();
                }
                
                // Create slides and populate them
                if (slideContents.length > 0) {
                    // Save current slide first
                    saveCurrentSlide();
                    
                    // Determine if we should clear existing slides (new empty presentation)
                    const shouldClearExisting = slides.length === 1 && slides[0] && (!slides[0].content || !slides[0].content.trim());
                    
                    if (shouldClearExisting) {
                        slides = [];
                        currentSlideIndex = 0;
                    }
                    
                    const startingSlideIndex = slides.length;
                    
                    // Create slides and populate
                    for (let i = 0; i < slideContents.length; i++) {
                        let content = slideContents[i].trim();
                        
                        // Clean up prefixes
                        const prefixes = [
                            /^slide\s+\d+:?\s*/i,
                            /^certainly!?\s*/i,
                            /^here'?s?\s+(slide\s+\d+\s+)?(content|text|information):\s*/i,
                            /^of\s+course!?\s*/i,
                        ];
                        for (const prefix of prefixes) {
                            content = content.replace(prefix, '').trim();
                        }
                        
                        // Always create new slide for each content
                        addNewSlide();
                        
                        // Switch to the newly created slide (it's at the end of the array)
                        const targetSlideIndex = slides.length - 1;
                        switchToSlide(targetSlideIndex);
                        
                        // Check if the message contains formatting instructions
                        const formattingInstructions = detectSlideFormattingInstructions(message);
                        
                        // Convert markdown to HTML
                        let htmlContent = markdownToHtml(content);
                        
                        // Apply formatting to HTML before inserting
                        if (formattingInstructions.hasFormatting) {
                            htmlContent = applyFormattingToSlideHTML(htmlContent, formattingInstructions);
                        }
                        
                        // Get the slide element and CLEAR it first (remove any existing content)
                        const slide = document.getElementById('currentSlide');
                        slide.innerHTML = ''; // Clear any existing content to ensure clean slide
                        
                        // Create text box with content - make it larger and better styled for slide content
                        const targetTextBox = document.createElement('div');
                        targetTextBox.className = 'slide-textbox';
                        targetTextBox.contentEditable = true;
                        // Use most of the slide area (leave margins)
                        targetTextBox.style.width = '85%';
                        targetTextBox.style.maxWidth = '800px';
                        targetTextBox.style.minHeight = '200px';
                        targetTextBox.style.padding = '30px 40px';
                        targetTextBox.style.border = '2px solid #0078d4';
                        targetTextBox.style.borderRadius = '4px';
                        targetTextBox.style.outline = 'none';
                        targetTextBox.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
                        targetTextBox.style.position = 'absolute';
                        targetTextBox.style.left = '50%';
                        targetTextBox.style.top = '50%';
                        targetTextBox.style.transform = 'translate(-50%, -50%)';
                        // Better font sizing for slide content - use formatting instruction if available
                        targetTextBox.style.fontSize = (formattingInstructions.fontSize || 12) + 'pt';
                        targetTextBox.style.lineHeight = '1.4';
                        targetTextBox.style.color = '#333';
                        targetTextBox.innerHTML = htmlContent;
                        
                        makeElementDraggable(targetTextBox);
                        targetTextBox.addEventListener('click', (e) => {
                            e.stopPropagation();
                            targetTextBox.style.border = '2px solid #0078d4';
                            selectedElement = targetTextBox;
                        });
                        targetTextBox.addEventListener('blur', () => {
                            targetTextBox.style.border = '2px dashed #0078d4';
                        });
                        
                        slide.appendChild(targetTextBox);
                        selectedElement = targetTextBox;
                        saveCurrentSlide();
                    }
                    
                    // Switch back to first new slide
                    switchToSlide(startingSlideIndex);
                    
                    // Show success message
                    addAIMessage('assistant', `Created ${slideContents.length} slides successfully!`);
                    
                    hasUnsavedChanges = true;
                    updateWindowTitle();
                    renderSlidesList();
                    
                    // Return early - we've handled multiple slides
                    aiChatInput.disabled = false;
                    aiChatSend.disabled = false;
                    aiChatInput.focus();
                    return;
                }
                
                // Fallback to single slide if generation failed
                result = { success: false, error: 'Failed to generate slides' };
            } else if (isGeneration) {
                // Single slide generation
                const slidePrompt = `You are creating content for a presentation slide. The user wants: "${message}"

IMPORTANT FORMATTING RULES:
1. Create concise, slide-appropriate content (not long paragraphs)
2. Use a clear title/heading at the top (use **Title** format)
3. Use bullet points for main ideas (use • or - for bullets)
4. Keep each bullet point short (1-2 lines max)
5. Use **bold** for emphasis on key terms
6. NO long paragraphs or full sentences - this is for slides!
7. Maximum 5-7 bullet points per slide
8. Start directly with the content, no introductions or explanations

Format your response as:
**Title Here**
• Bullet point 1
• Bullet point 2
• Bullet point 3

Generate the slide content now:`;
                
                result = await window.electronAPI.aiChat(slidePrompt, []);
            } else if (isContinuation) {
                // Continuation request - get current slide content and continue it
                const slide = document.getElementById('currentSlide');
                const currentText = slide.innerText || slide.textContent || '';
                
                if (currentText) {
                    const continuationPrompt = `The user says: "${message}"

Here is the current slide content:
${currentText}

Your task: Analyze the content above. If it appears incomplete or cut off, continue writing from where it left off. DO NOT rewrite the existing content. Only provide the continuation/remaining content that should be added. Keep it concise and slide-appropriate with bullet points.

Continue from the existing content:`;
                    
                    result = await window.electronAPI.aiChat(continuationPrompt, []);
                } else {
                    // No content, treat as generation
                    result = await window.electronAPI.aiChat(message, []);
                }
            } else {
                // For improvement, get selected text
                const slide = document.getElementById('currentSlide');
                let currentText = '';
                if (selectedElement && selectedElement.classList.contains('slide-textbox')) {
                    currentText = selectedElement.textContent || selectedElement.innerText || '';
                } else {
                    // Try to get selection
                    const selection = window.getSelection();
                    if (selection.rangeCount > 0 && !selection.isCollapsed) {
                        currentText = selection.toString();
                    }
                }

                if (currentText) {
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
                let response = result.response || result.text || result.summary;
                if (response) {
                    // Clean up common AI prefixes
                    response = response.trim();
                    const prefixes = [
                        /^certainly!?\s*/i,
                        /^here'?s?\s+(an?\s+)?(improved\s+)?(version|text|paragraph|content):\s*/i,
                        /^of\s+course!?\s*/i,
                    ];
                    for (const prefix of prefixes) {
                        response = response.replace(prefix, '').trim();
                    }

                    addAIMessage('assistant', response);

                    const htmlContent = markdownToHtml(response);

                    // Insert into selected text box or create new one
                    const slide = document.getElementById('currentSlide');
                    let targetTextBox = selectedElement;
                    
                    // For continuation, try to find existing textbox on the slide
                    if (isContinuation && (!targetTextBox || !targetTextBox.classList.contains('slide-textbox'))) {
                        const existingTextBoxes = slide.querySelectorAll('.slide-textbox');
                        if (existingTextBoxes.length > 0) {
                            targetTextBox = existingTextBoxes[existingTextBoxes.length - 1]; // Use the last one
                            selectedElement = targetTextBox;
                        }
                    }
                    
                    if (!targetTextBox || !targetTextBox.classList.contains('slide-textbox')) {
                        // Create new text box
                        targetTextBox = document.createElement('div');
                        targetTextBox.className = 'slide-textbox';
                        targetTextBox.contentEditable = true;
                        targetTextBox.style.minWidth = '200px';
                        targetTextBox.style.minHeight = '50px';
                        targetTextBox.style.padding = '10px';
                        targetTextBox.style.border = '2px solid #0078d4';
                        targetTextBox.style.borderRadius = '4px';
                        targetTextBox.style.outline = 'none';
                        targetTextBox.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
                        targetTextBox.style.position = 'absolute';
                        targetTextBox.style.left = '50%';
                        targetTextBox.style.top = '50%';
                        targetTextBox.style.transform = 'translate(-50%, -50%)';
                        
                        makeElementDraggable(targetTextBox);
                        targetTextBox.addEventListener('click', (e) => {
                            e.stopPropagation();
                            targetTextBox.style.border = '2px solid #0078d4';
                            selectedElement = targetTextBox;
                        });
                        targetTextBox.addEventListener('blur', () => {
                            targetTextBox.style.border = '2px dashed #0078d4';
                        });
                        
                        slide.appendChild(targetTextBox);
                        selectedElement = targetTextBox;
                    }

                    // Check if the message contains formatting instructions
                    const formattingInstructions = detectSlideFormattingInstructions(message);
                    
                    // Apply formatting to HTML before inserting
                    if (formattingInstructions.hasFormatting) {
                        htmlContent = applyFormattingToSlideHTML(htmlContent, formattingInstructions);
                    }
                    
                    // Insert HTML content - append for continuation, replace otherwise
                    if (isContinuation && targetTextBox.innerHTML) {
                        // Append continuation content
                        targetTextBox.innerHTML += htmlContent;
                    } else {
                        // Replace content
                        targetTextBox.innerHTML = htmlContent;
                    }
                    
                    // Also apply formatting to textbox itself (for font-size on textbox)
                    if (formattingInstructions.hasFormatting && formattingInstructions.fontSize) {
                        targetTextBox.style.fontSize = formattingInstructions.fontSize + 'pt';
                    }
                    
                    targetTextBox.focus();

                    hasUnsavedChanges = true;
                    updateWindowTitle();
                    renderSlidesList();
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

// Find Dialog for Slides
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
            <input type="text" id="findInput" placeholder="Find in slides..." 
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
        
        // Search through all slides
        findMatches = [];
        slides.forEach((slide, slideIndex) => {
            const temp = document.createElement('div');
            temp.innerHTML = slide.content || '';
            const text = temp.textContent || temp.innerText || '';
            if (text.toLowerCase().includes(searchTerm.toLowerCase())) {
                findMatches.push({ slideIndex, text });
            }
        });
        
        if (findMatches.length === 0) {
            findStatus.textContent = 'No matches found';
            return;
        }
        
        if (direction === 'next') {
            findMatchIndex = (findMatchIndex + 1) % findMatches.length;
        } else {
            findMatchIndex = (findMatchIndex - 1 + findMatches.length) % findMatches.length;
        }
        
        findStatus.textContent = `${findMatchIndex + 1} of ${findMatches.length} (Slide ${findMatches[findMatchIndex].slideIndex + 1})`;
        
        // Switch to the matching slide
        const match = findMatches[findMatchIndex];
        switchToSlide(match.slideIndex);
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
    }
}

// AI Formatting Functions for Slides
function detectSlideFormattingInstructions(message) {
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
    
    // Detect formatting requests
    if (lowerMessage.includes('bold') || lowerMessage.includes('make bold') || lowerMessage.includes('bold the')) {
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
    
    // Font size (more flexible matching) - also handle "smaller", "too large", etc.
    const fontSizeMatch = lowerMessage.match(/(?:font size|size|font size of|make it|text size|size of|needs? to be)\s+(\d+)/);
    if (fontSizeMatch) {
        instructions.hasFormatting = true;
        instructions.fontSize = parseInt(fontSizeMatch[1]);
    } else if (lowerMessage.includes('smaller') || lowerMessage.includes('too large') || lowerMessage.includes('font is to') || lowerMessage.includes('make it smaller')) {
        // Default to smaller size if user says "smaller" or "too large"
        instructions.hasFormatting = true;
        instructions.fontSize = 10; // Default smaller size
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
    } else if (lowerMessage.includes('left align') || lowerMessage.includes('align left')) {
        instructions.hasFormatting = true;
        instructions.align = 'left';
    } else if (lowerMessage.includes('right align') || lowerMessage.includes('align right')) {
        instructions.hasFormatting = true;
        instructions.align = 'right';
    }
    
    return instructions;
}

function applyFormattingToSlideContent(textBox, instructions) {
    // Apply formatting to the textbox and its content
    if (instructions.fontSize) {
        textBox.style.fontSize = instructions.fontSize + 'pt';
        // Also apply to all child elements
        const allChildren = textBox.querySelectorAll('*');
        allChildren.forEach(child => {
            child.style.fontSize = instructions.fontSize + 'pt';
        });
    }
    
    if (instructions.fontFamily) {
        textBox.style.fontFamily = instructions.fontFamily;
        const allChildren = textBox.querySelectorAll('*');
        allChildren.forEach(child => {
            child.style.fontFamily = instructions.fontFamily;
        });
    }
    
    if (instructions.color) {
        textBox.style.color = instructions.color;
        const allChildren = textBox.querySelectorAll('*');
        allChildren.forEach(child => {
            child.style.color = instructions.color;
        });
    }
    
    if (instructions.align) {
        textBox.style.textAlign = instructions.align;
    }
    
    // For bold, italic, underline - apply to all text content via CSS
    if (instructions.bold) {
        textBox.style.fontWeight = 'bold';
        const allChildren = textBox.querySelectorAll('*');
        allChildren.forEach(child => {
            if (!child.style.fontWeight || child.style.fontWeight === 'normal') {
                child.style.fontWeight = 'bold';
            }
        });
    }
    if (instructions.italic) {
        textBox.style.fontStyle = 'italic';
        const allChildren = textBox.querySelectorAll('*');
        allChildren.forEach(child => {
            child.style.fontStyle = 'italic';
        });
    }
    if (instructions.underline) {
        textBox.style.textDecoration = 'underline';
        const allChildren = textBox.querySelectorAll('*');
        allChildren.forEach(child => {
            child.style.textDecoration = 'underline';
        });
    }
}

// Apply formatting directly to HTML string for slides (before insertion)
function applyFormattingToSlideHTML(html, instructions) {
    const temp = document.createElement('div');
    temp.innerHTML = html;
    
    // Get all elements
    let allElements = temp.querySelectorAll('*');
    
    // If no elements, wrap content in a div and apply formatting
    if (allElements.length === 0 && temp.textContent.trim()) {
        const wrapper = document.createElement('div');
        wrapper.innerHTML = temp.innerHTML;
        temp.innerHTML = '';
        temp.appendChild(wrapper);
        allElements = temp.querySelectorAll('*');
    }
    
    // Apply formatting to all elements
    allElements.forEach(el => {
        if (instructions.fontSize) {
            el.style.fontSize = instructions.fontSize + 'pt';
        }
        if (instructions.fontFamily) {
            el.style.fontFamily = instructions.fontFamily;
        }
        if (instructions.color) {
            el.style.color = instructions.color;
        }
        if (instructions.align) {
            el.style.textAlign = instructions.align;
        }
        if (instructions.bold) {
            if (!el.style.fontWeight || el.style.fontWeight === 'normal') {
                el.style.fontWeight = 'bold';
            }
        }
        if (instructions.italic) {
            el.style.fontStyle = 'italic';
        }
        if (instructions.underline) {
            el.style.textDecoration = 'underline';
        }
    });
    
    return temp.innerHTML;
}
