// Omega Paint Application
let canvas, ctx;
let isDrawing = false;
let currentTool = 'brush';
let currentColor = '#000000';
let brushSize = 5;
let startX, startY;
let history = [];
let historyStep = -1;
let savedImageData = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupCanvas();
    setupWindowControls();
    setupToolbar();
    setupFileMenu();
    setupKeyboardShortcuts();
    setupAIFeatures();

    // Initialize canvas with white background
    clearCanvas();
});

function setupCanvas() {
    canvas = document.getElementById('paintCanvas');
    ctx = canvas.getContext('2d');

    // Set default canvas size
    resizeCanvas(1400, 1000);

    // Drawing events
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);

    // Touch events for mobile support
    canvas.addEventListener('touchstart', handleTouch);
    canvas.addEventListener('touchmove', handleTouch);
    canvas.addEventListener('touchend', stopDrawing);
}

let currentCanvasWidth = 1400;
let currentCanvasHeight = 1000;

function resizeCanvas(width, height) {
    const container = document.querySelector('.canvas-container');
    if (!container) return;

    currentCanvasWidth = width;
    currentCanvasHeight = height;

    // Account for AI sidebar if open (sidebar is 400px wide based on CSS)
    const aiSidebar = document.getElementById('aiSidebar');
    const sidebarWidth = (aiSidebar && aiSidebar.classList.contains('active')) ? 400 : 0;

    // Use 98% of available container space, accounting for sidebar
    const availableWidth = (container.clientWidth - sidebarWidth) * 0.98;
    const availableHeight = container.clientHeight * 0.98;

    // Calculate scale to fit
    const scaleX = availableWidth / width;
    const scaleY = availableHeight / height;
    const scale = Math.min(scaleX, scaleY);

    // Set actual canvas size
    canvas.width = width;
    canvas.height = height;

    // Set display size (scaled)
    canvas.style.width = (width * scale) + 'px';
    canvas.style.height = (height * scale) + 'px';

    // Restore white background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Restore saved image if exists
    if (savedImageData) {
        const img = new Image();
        img.onload = () => {
            ctx.drawImage(img, 0, 0);
        };
        img.src = savedImageData;
    }
}

// Handle window resize
function handleCanvasResize() {
    if (canvas && currentCanvasWidth && currentCanvasHeight) {
        resizeCanvas(currentCanvasWidth, currentCanvasHeight);
    }
}

window.addEventListener('resize', handleCanvasResize);

function setupWindowControls() {
    const minimizeBtn = document.getElementById('minimizeBtn');
    const maximizeBtn = document.getElementById('maximizeBtn');
    const closeBtn = document.getElementById('closeBtn');

    if (!window.electronAPI) {
        console.error('Electron API not available');
        return;
    }

    let currentWindowId = null;
    window.electronAPI.getWindowId().then(id => {
        currentWindowId = id;
    }).catch(err => {
        console.error('Error getting window ID:', err);
    });

    if (minimizeBtn) {
        minimizeBtn.addEventListener('click', () => {
            try {
                window.electronAPI.appWindowMinimize(currentWindowId);
            } catch (error) {
                console.error('Error minimizing window:', error);
            }
        });
    }

    if (maximizeBtn) {
        maximizeBtn.addEventListener('click', () => {
            try {
                window.electronAPI.appWindowMaximize(currentWindowId);
            } catch (error) {
                console.error('Error toggling maximize:', error);
            }
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            try {
                window.electronAPI.appWindowClose(currentWindowId);
            } catch (error) {
                console.error('Error closing window:', error);
            }
        });
    }
}

function setupToolbar() {
    // Tool buttons
    document.getElementById('brushTool').addEventListener('click', () => selectTool('brush'));
    document.getElementById('eraserTool').addEventListener('click', () => selectTool('eraser'));
    document.getElementById('lineTool').addEventListener('click', () => selectTool('line'));
    document.getElementById('rectangleTool').addEventListener('click', () => selectTool('rectangle'));
    document.getElementById('circleTool').addEventListener('click', () => selectTool('circle'));
    document.getElementById('fillTool').addEventListener('click', () => selectTool('fill'));

    // Brush size
    const brushSizeSlider = document.getElementById('brushSize');
    const brushSizeValue = document.getElementById('brushSizeValue');
    brushSizeSlider.addEventListener('input', (e) => {
        brushSize = parseInt(e.target.value);
        brushSizeValue.textContent = brushSize;
    });

    // Color picker
    const colorPicker = document.getElementById('colorPicker');
    colorPicker.addEventListener('input', (e) => {
        currentColor = e.target.value;
        updateColorPresets();
    });

    // Color presets
    document.querySelectorAll('.color-preset').forEach(preset => {
        preset.addEventListener('click', () => {
            currentColor = preset.dataset.color;
            colorPicker.value = currentColor;
            updateColorPresets();
        });
    });

    // Undo/Redo/Clear
    document.getElementById('undoBtn').addEventListener('click', undo);
    document.getElementById('redoBtn').addEventListener('click', redo);
    document.getElementById('clearBtn').addEventListener('click', () => {
        if (confirm('Clear the entire canvas?')) {
            clearCanvas();
        }
    });
}

function selectTool(tool) {
    currentTool = tool;

    // Update active button
    document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
    const toolMap = {
        'brush': 'brushTool',
        'eraser': 'eraserTool',
        'line': 'lineTool',
        'rectangle': 'rectangleTool',
        'circle': 'circleTool',
        'fill': 'fillTool'
    };
    document.getElementById(toolMap[tool])?.classList.add('active');

    // Update cursor
    if (tool === 'fill') {
        canvas.style.cursor = 'pointer';
    } else {
        canvas.style.cursor = 'crosshair';
    }
}

function updateColorPresets() {
    document.querySelectorAll('.color-preset').forEach(preset => {
        if (preset.dataset.color === currentColor) {
            preset.classList.add('active');
        } else {
            preset.classList.remove('active');
        }
    });
}

function saveState() {
    try {
        historyStep++;
        if (historyStep < history.length) {
            history = history.slice(0, historyStep);
        }
        // Use getImageData instead of toDataURL to avoid tainted canvas errors
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        history.push(imageData);
        if (history.length > 50) {
            history.shift();
            historyStep--;
        }
    } catch (error) {
        // If saveState fails, just skip it - don't break the drawing
        console.warn('[Paint] saveState failed:', error.message);
        // Reset historyStep if we failed to save
        if (historyStep > 0) historyStep--;
    }
}

function undo() {
    if (historyStep > 0) {
        historyStep--;
        restoreState();
    }
}

function redo() {
    if (historyStep < history.length - 1) {
        historyStep++;
        restoreState();
    }
}

function restoreState() {
    if (history[historyStep]) {
        try {
            const imageData = history[historyStep];
            // Check if it's ImageData (new format) or data URL (old format)
            if (imageData instanceof ImageData) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.putImageData(imageData, 0, 0);
            } else if (typeof imageData === 'string') {
                // Fallback for old format (data URLs)
                const img = new Image();
                img.onload = () => {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(img, 0, 0);
                };
                img.src = imageData;
            }
        } catch (error) {
            console.warn('[Paint] restoreState failed:', error.message);
        }
    }
}

function clearCanvas() {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    saveState();
}

function getEventPos(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
    };
}

function startDrawing(e) {
    isDrawing = true;
    const pos = getEventPos(e);
    startX = pos.x;
    startY = pos.y;

    if (currentTool === 'fill') {
        fillArea(startX, startY);
        saveState();
    } else {
        saveState();
    }
}

function draw(e) {
    if (!isDrawing) return;

    const pos = getEventPos(e);
    const currentX = pos.x;
    const currentY = pos.y;

    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (currentTool === 'brush') {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = currentColor;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(currentX, currentY);
        ctx.stroke();
        startX = currentX;
        startY = currentY;
    } else if (currentTool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(currentX, currentY);
        ctx.stroke();
        startX = currentX;
        startY = currentY;
    } else if (currentTool === 'line') {
        restoreState();
        ctx.strokeStyle = currentColor;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(currentX, currentY);
        ctx.stroke();
    } else if (currentTool === 'rectangle') {
        restoreState();
        ctx.strokeStyle = currentColor;
        ctx.strokeRect(startX, startY, currentX - startX, currentY - startY);
    } else if (currentTool === 'circle') {
        restoreState();
        ctx.strokeStyle = currentColor;
        const radius = Math.sqrt(Math.pow(currentX - startX, 2) + Math.pow(currentY - startY, 2));
        ctx.beginPath();
        ctx.arc(startX, startY, radius, 0, 2 * Math.PI);
        ctx.stroke();
    }
}

function stopDrawing() {
    if (isDrawing) {
        isDrawing = false;
        if (currentTool !== 'brush' && currentTool !== 'eraser') {
            saveState();
        }
    }
}

function fillArea(x, y) {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const targetColor = getPixel(imageData, x, y);
    const fillColor = hexToRgb(currentColor);

    if (targetColor.r === fillColor.r && targetColor.g === fillColor.g && targetColor.b === fillColor.b) {
        return; // Already filled
    }

    const stack = [[Math.floor(x), Math.floor(y)]];
    const visited = new Set();

    while (stack.length > 0) {
        const [px, py] = stack.pop();
        const key = `${px},${py}`;

        if (visited.has(key) || px < 0 || px >= canvas.width || py < 0 || py >= canvas.height) {
            continue;
        }

        const pixel = getPixel(imageData, px, py);
        if (pixel.r !== targetColor.r || pixel.g !== targetColor.g || pixel.b !== targetColor.b) {
            continue;
        }

        visited.add(key);
        setPixel(imageData, px, py, fillColor);

        stack.push([px + 1, py], [px - 1, py], [px, py + 1], [px, py - 1]);
    }

    ctx.putImageData(imageData, 0, 0);
}

function getPixel(imageData, x, y) {
    const index = (Math.floor(y) * imageData.width + Math.floor(x)) * 4;
    return {
        r: imageData.data[index],
        g: imageData.data[index + 1],
        b: imageData.data[index + 2],
        a: imageData.data[index + 3]
    };
}

function setPixel(imageData, x, y, color) {
    const index = (Math.floor(y) * imageData.width + Math.floor(x)) * 4;
    imageData.data[index] = color.r;
    imageData.data[index + 1] = color.g;
    imageData.data[index + 2] = color.b;
    imageData.data[index + 3] = 255;
}

function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
}

function handleTouch(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent(e.type === 'touchstart' ? 'mousedown' :
        e.type === 'touchmove' ? 'mousemove' : 'mouseup', {
        clientX: touch.clientX,
        clientY: touch.clientY
    });
    canvas.dispatchEvent(mouseEvent);
}

function setupFileMenu() {
    const fileMenuBtn = document.getElementById('fileMenuBtn');
    const fileMenuDropdown = document.getElementById('fileMenuDropdown');
    const fileMenuContainer = document.querySelector('.file-menu-container');

    fileMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        fileMenuContainer.classList.toggle('active');
    });

    document.addEventListener('click', () => {
        fileMenuContainer.classList.remove('active');
    });

    // File menu items
    document.getElementById('fileMenuNew').addEventListener('click', () => {
        if (confirm('Create a new canvas? Unsaved changes will be lost.')) {
            clearCanvas();
            savedImageData = null;
        }
        fileMenuContainer.classList.remove('active');
    });

    document.getElementById('fileMenuOpen').addEventListener('click', async () => {
        if (!window.electronAPI || !window.electronAPI.openFileDialog) {
            alert('File operations not available');
            return;
        }

        try {
            const result = await window.electronAPI.openFileDialog({
                filters: [
                    { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'bmp'] }
                ]
            });

            if (result && !result.canceled && result.filePaths && result.filePaths.length > 0) {
                const filePath = result.filePaths[0];
                const fileContent = await window.electronAPI.readFile(filePath, 'base64');

                const img = new Image();
                img.onload = () => {
                    resizeCanvas(img.width, img.height);
                    ctx.drawImage(img, 0, 0);
                    savedImageData = canvas.toDataURL();
                    saveState();
                };
                img.src = `data:image/png;base64,${fileContent}`;
            }
        } catch (error) {
            console.error('Error opening file:', error);
            alert('Failed to open file: ' + error.message);
        }

        fileMenuContainer.classList.remove('active');
    });

    document.getElementById('fileMenuSave').addEventListener('click', async () => {
        await saveFile(false);
        fileMenuContainer.classList.remove('active');
    });

    document.getElementById('fileMenuSaveAs').addEventListener('click', async () => {
        await saveFile(true);
        fileMenuContainer.classList.remove('active');
    });

    document.getElementById('fileMenuPrint').addEventListener('click', () => {
        window.print();
        fileMenuContainer.classList.remove('active');
    });
}

let currentFilePath = null;

async function saveFile(saveAs = false) {
    if (!window.electronAPI || !window.electronAPI.saveFileDialog) {
        alert('File operations not available');
        return;
    }

    try {
        const dataUrl = canvas.toDataURL('image/png');
        const base64Data = dataUrl.split(',')[1]; // Extract base64 data without data:image/png;base64, prefix

        let filePath;
        if (saveAs || !currentFilePath) {
            const result = await window.electronAPI.saveFileDialog({
                defaultPath: currentFilePath || 'untitled.png',
                filters: [
                    { name: 'PNG Image', extensions: ['png'] },
                    { name: 'JPEG Image', extensions: ['jpg', 'jpeg'] }
                ]
            });

            if (result && !result.canceled && result.filePath) {
                filePath = result.filePath;
                currentFilePath = filePath;
            } else {
                return;
            }
        } else {
            filePath = currentFilePath;
        }

        // Pass base64 string directly - the main process will handle Buffer conversion
        await window.electronAPI.writeFile(filePath, base64Data, 'base64');
        savedImageData = dataUrl;
        alert('File saved successfully!');
    } catch (error) {
        console.error('Error saving file:', error);
        alert('Failed to save file: ' + error.message);
    }
}

function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Don't intercept if typing in AI chat
        if (e.target.id === 'aiChatInput') {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendAIMessage();
            }
            return;
        }

        // Tool shortcuts
        if (e.key === 'b' || e.key === 'B') selectTool('brush');
        if (e.key === 'e' || e.key === 'E') selectTool('eraser');
        if (e.key === 'l' || e.key === 'L') selectTool('line');
        if (e.key === 'r' || e.key === 'R') selectTool('rectangle');
        if (e.key === 'c' || e.key === 'C') selectTool('circle');
        if (e.key === 'f' || e.key === 'F') selectTool('fill');

        // File shortcuts
        if (e.ctrlKey || e.metaKey) {
            if (e.key === 'n' || e.key === 'N') {
                e.preventDefault();
                document.getElementById('fileMenuNew').click();
            }
            if (e.key === 'o' || e.key === 'O') {
                e.preventDefault();
                document.getElementById('fileMenuOpen').click();
            }
            if (e.key === 's' || e.key === 'S') {
                e.preventDefault();
                document.getElementById('fileMenuSave').click();
            }
            if (e.key === 'z' || e.key === 'Z') {
                e.preventDefault();
                if (e.shiftKey) {
                    redo();
                } else {
                    undo();
                }
            }
            if (e.key === 'y' || e.key === 'Y') {
                e.preventDefault();
                redo();
            }
            if (e.key === 'p' || e.key === 'P') {
                e.preventDefault();
                document.getElementById('fileMenuPrint').click();
            }
        }
    });
}

// AI Features
let aiSidebarOpen = false;
let isDrawingInProgress = false; // Prevent duplicate drawing executions

// Reset drawing flag on page load and ensure it's never permanently stuck
window.addEventListener('load', () => {
    isDrawingInProgress = false;
});

// Safety: Reset flag if it gets stuck (e.g., after 30 seconds)
setInterval(() => {
    if (isDrawingInProgress) {
        console.warn('Drawing flag has been active for 30+ seconds, auto-resetting');
        isDrawingInProgress = false;
        const aiChatSend = document.getElementById('aiChatSend');
        if (aiChatSend) {
            aiChatSend.disabled = false;
        }
    }
}, 30000);

function setupAIFeatures() {
    const aiToggleBtn = document.getElementById('aiToggleBtn');
    const aiSidebar = document.getElementById('aiSidebar');
    const aiSidebarClose = document.getElementById('aiSidebarClose');
    const aiChatInput = document.getElementById('aiChatInput');
    const aiChatSend = document.getElementById('aiChatSend');

    if (!aiToggleBtn || !aiSidebar) return;

    // Toggle sidebar
    aiToggleBtn.addEventListener('click', () => {
        aiSidebarOpen = !aiSidebarOpen;
        aiSidebar.classList.toggle('active', aiSidebarOpen);
        aiToggleBtn.classList.toggle('active', aiSidebarOpen);
        if (aiSidebarOpen) {
            aiChatInput.focus();
        }
        // Resize canvas when sidebar opens/closes
        setTimeout(() => {
            if (currentCanvasWidth && currentCanvasHeight) {
                resizeCanvas(currentCanvasWidth, currentCanvasHeight);
            }
        }, 100); // Small delay to let CSS transition complete
    });

    // Close sidebar
    aiSidebarClose.addEventListener('click', () => {
        aiSidebarOpen = false;
        aiSidebar.classList.remove('active');
        aiToggleBtn.classList.remove('active');
        // Resize canvas when sidebar closes
        setTimeout(() => {
            if (currentCanvasWidth && currentCanvasHeight) {
                resizeCanvas(currentCanvasWidth, currentCanvasHeight);
            }
        }, 100); // Small delay to let CSS transition complete
    });

    // Send message
    aiChatSend.addEventListener('click', sendAIMessage);

    // Auto-resize textarea
    aiChatInput.addEventListener('input', function () {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 120) + 'px';
    });
}

function addAIMessage(role, content, isThinking = false) {
    const messagesContainer = document.getElementById('aiChatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `ai-message ai-message-${role}`;

    const contentDiv = document.createElement('div');
    contentDiv.className = 'ai-message-content';
    if (isThinking) {
        contentDiv.textContent = content;
        contentDiv.style.fontStyle = 'italic';
        contentDiv.style.opacity = '0.7';
    } else {
        // Convert markdown-style formatting to HTML
        content = content.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        content = content.replace(/\*(.+?)\*/g, '<em>$1</em>');
        content = content.replace(/`(.+?)`/g, '<code style="background: rgba(255,255,255,0.1); padding: 2px 4px; border-radius: 3px;">$1</code>');
        // Convert line breaks
        content = content.replace(/\n/g, '<br>');
        contentDiv.innerHTML = content;
    }

    messageDiv.appendChild(contentDiv);
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    return messageDiv;
}

// Drawing Templates Library - Pre-built high-quality drawings
const DRAWING_TEMPLATES = {
    'christmas tree': [
        // Tree layers (3 triangular sections)
        { "type": "polygon", "points": [[700, 300], [600, 450], [800, 450]], "color": "#228B22", "fill": true },
        { "type": "polygon", "points": [[700, 400], [620, 520], [780, 520]], "color": "#2E8B57", "fill": true },
        { "type": "polygon", "points": [[700, 480], [640, 580], [760, 580]], "color": "#3CB371", "fill": true },
        // Trunk
        { "type": "rectangle", "x": 680, "y": 580, "width": 40, "height": 70, "color": "#8B4513", "fill": true },
        // Star on top
        { "type": "polygon", "points": [[700, 280], [710, 300], [730, 305], [715, 320], [720, 340], [700, 330], [680, 340], [685, 320], [670, 305], [690, 300]], "color": "#FFD700", "fill": true },
        // Ornaments (red, blue, gold)
        { "type": "circle", "x": 680, "y": 420, "radius": 10, "color": "#FF0000", "fill": true },
        { "type": "circle", "x": 720, "y": 440, "radius": 10, "color": "#0000FF", "fill": true },
        { "type": "circle", "x": 700, "y": 490, "radius": 10, "color": "#FFD700", "fill": true },
        { "type": "circle", "x": 660, "y": 510, "radius": 10, "color": "#FF0000", "fill": true },
        { "type": "circle", "x": 740, "y": 530, "radius": 10, "color": "#0000FF", "fill": true },
        { "type": "circle", "x": 700, "y": 550, "radius": 10, "color": "#FFD700", "fill": true },
        { "type": "circle", "x": 670, "y": 560, "radius": 10, "color": "#FF0000", "fill": true },
        { "type": "circle", "x": 730, "y": 570, "radius": 10, "color": "#0000FF", "fill": true }
    ],

    'house': [
        // Walls
        { "type": "rectangle", "x": 550, "y": 400, "width": 300, "height": 250, "color": "#DEB887", "fill": true },
        // Roof
        { "type": "polygon", "points": [[700, 280], [520, 400], [880, 400]], "color": "#8B0000", "fill": true },
        // Door
        { "type": "rectangle", "x": 670, "y": 530, "width": 60, "height": 120, "color": "#654321", "fill": true },
        { "type": "circle", "x": 720, "y": 590, "radius": 4, "color": "#FFD700", "fill": true },
        // Windows
        { "type": "rectangle", "x": 580, "y": 450, "width": 60, "height": 60, "color": "#87CEEB", "fill": true },
        { "type": "rectangle", "x": 760, "y": 450, "width": 60, "height": 60, "color": "#87CEEB", "fill": true },
        // Window frames (cross pattern)
        { "type": "line", "x1": 610, "y1": 450, "x2": 610, "y2": 510, "color": "#000000", "width": 2 },
        { "type": "line", "x1": 580, "y1": 480, "x2": 640, "y2": 480, "color": "#000000", "width": 2 },
        { "type": "line", "x1": 790, "y1": 450, "x2": 790, "y2": 510, "color": "#000000", "width": 2 },
        { "type": "line", "x1": 760, "y1": 480, "x2": 820, "y2": 480, "color": "#000000", "width": 2 },
        // Chimney
        { "type": "rectangle", "x": 750, "y": 320, "width": 40, "height": 80, "color": "#8B0000", "fill": true }
    ],

    'cat': [
        // Body
        { "type": "ellipse", "x": 700, "y": 550, "radiusX": 70, "radiusY": 50, "color": "#FFA500", "fill": true },
        // Head
        { "type": "circle", "x": 700, "y": 470, "radius": 40, "color": "#FFA500", "fill": true },
        // Ears
        { "type": "polygon", "points": [[672, 450], [662, 420], [682, 440]], "color": "#FFA500", "fill": true },
        { "type": "polygon", "points": [[728, 450], [738, 420], [718, 440]], "color": "#FFA500", "fill": true },
        // Inner ears
        { "type": "polygon", "points": [[672, 448], [668, 430], [678, 442]], "color": "#FFB6C1", "fill": true },
        { "type": "polygon", "points": [[728, 448], [732, 430], [722, 442]], "color": "#FFB6C1", "fill": true },
        // Eyes
        { "type": "ellipse", "x": 685, "y": 465, "radiusX": 6, "radiusY": 8, "color": "#228B22", "fill": true },
        { "type": "ellipse", "x": 715, "y": 465, "radiusX": 6, "radiusY": 8, "color": "#228B22", "fill": true },
        { "type": "circle", "x": 685, "y": 466, "radius": 3, "color": "#000000", "fill": true },
        { "type": "circle", "x": 715, "y": 466, "radius": 3, "color": "#000000", "fill": true },
        // Nose
        { "type": "polygon", "points": [[700, 478], [695, 483], [705, 483]], "color": "#FF69B4", "fill": true },
        // Mouth
        { "type": "arc", "x": 700, "y": 483, "radius": 8, "startAngle": 0, "endAngle": Math.PI, "color": "#000000", "width": 2 },
        // Whiskers
        { "type": "line", "x1": 700, "y1": 480, "x2": 650, "y2": 475, "color": "#000000", "width": 1 },
        { "type": "line", "x1": 700, "y1": 483, "x2": 650, "y2": 483, "color": "#000000", "width": 1 },
        { "type": "line", "x1": 700, "y1": 486, "x2": 650, "y2": 491, "color": "#000000", "width": 1 },
        { "type": "line", "x1": 700, "y1": 480, "x2": 750, "y2": 475, "color": "#000000", "width": 1 },
        { "type": "line", "x1": 700, "y1": 483, "x2": 750, "y2": 483, "color": "#000000", "width": 1 },
        { "type": "line", "x1": 700, "y1": 486, "x2": 750, "y2": 491, "color": "#000000", "width": 1 },
        // Legs
        { "type": "rectangle", "x": 660, "y": 590, "width": 15, "height": 40, "color": "#FFA500", "fill": true },
        { "type": "rectangle", "x": 685, "y": 590, "width": 15, "height": 40, "color": "#FFA500", "fill": true },
        { "type": "rectangle", "x": 700, "y": 590, "width": 15, "height": 40, "color": "#FFA500", "fill": true },
        { "type": "rectangle", "x": 725, "y": 590, "width": 15, "height": 40, "color": "#FFA500", "fill": true },
        // Tail
        { "type": "ellipse", "x": 770, "y": 540, "radiusX": 50, "radiusY": 15, "color": "#FFA500", "fill": true }
    ],

    'dog': [
        // Body
        { "type": "ellipse", "x": 700, "y": 550, "radiusX": 80, "radiusY": 55, "color": "#8B4513", "fill": true },
        // Head
        { "type": "ellipse", "x": 640, "y": 490, "radiusX": 45, "radiusY": 40, "color": "#8B4513", "fill": true },
        // Snout
        { "type": "ellipse", "x": 610, "y": 500, "radiusX": 25, "radiusY": 20, "color": "#A0522D", "fill": true },
        // Ears (floppy)
        { "type": "ellipse", "x": 620, "y": 470, "radiusX": 15, "radiusY": 30, "color": "#654321", "fill": true },
        { "type": "ellipse", "x": 660, "y": 470, "radiusX": 15, "radiusY": 30, "color": "#654321", "fill": true },
        // Eyes
        { "type": "circle", "x": 630, "y": 485, "radius": 5, "color": "#000000", "fill": true },
        { "type": "circle", "x": 650, "y": 485, "radius": 5, "color": "#000000", "fill": true },
        // Nose
        { "type": "circle", "x": 605, "y": 500, "radius": 6, "color": "#000000", "fill": true },
        // Legs
        { "type": "rectangle", "x": 660, "y": 595, "width": 18, "height": 50, "color": "#8B4513", "fill": true },
        { "type": "rectangle", "x": 690, "y": 595, "width": 18, "height": 50, "color": "#8B4513", "fill": true },
        { "type": "rectangle", "x": 720, "y": 595, "width": 18, "height": 50, "color": "#8B4513", "fill": true },
        { "type": "rectangle", "x": 750, "y": 595, "width": 18, "height": 50, "color": "#8B4513", "fill": true },
        // Tail (curved up)
        { "type": "arc", "x": 780, "y": 540, "radius": 40, "startAngle": Math.PI, "endAngle": Math.PI * 1.5, "color": "#8B4513", "width": 15 }
    ],

    'car': [
        // Body
        { "type": "rectangle", "x": 550, "y": 500, "width": 300, "height": 80, "color": "#FF0000", "fill": true },
        // Roof
        { "type": "rectangle", "x": 620, "y": 450, "width": 160, "height": 50, "color": "#8B0000", "fill": true },
        // Windows
        { "type": "rectangle", "x": 630, "y": 460, "width": 70, "height": 35, "color": "#87CEEB", "fill": true },
        { "type": "rectangle", "x": 710, "y": 460, "width": 60, "height": 35, "color": "#87CEEB", "fill": true },
        // Wheels
        { "type": "circle", "x": 600, "y": 580, "radius": 35, "color": "#000000", "fill": true },
        { "type": "circle", "x": 600, "y": 580, "radius": 20, "color": "#808080", "fill": true },
        { "type": "circle", "x": 800, "y": 580, "radius": 35, "color": "#000000", "fill": true },
        { "type": "circle", "x": 800, "y": 580, "radius": 20, "color": "#808080", "fill": true },
        // Headlights
        { "type": "circle", "x": 840, "y": 520, "radius": 8, "color": "#FFFF00", "fill": true },
        { "type": "circle", "x": 840, "y": 560, "radius": 8, "color": "#FFFF00", "fill": true },
        // Door line
        { "type": "line", "x1": 700, "y1": 500, "x2": 700, "y2": 580, "color": "#000000", "width": 2 }
    ],

    'sun': [
        // Center circle
        { "type": "circle", "x": 700, "y": 400, "radius": 60, "color": "#FFD700", "fill": true },
        // Inner glow
        { "type": "circle", "x": 700, "y": 400, "radius": 70, "color": "#FFA500", "fill": false },
        // Rays (8 rays around the sun)
        { "type": "line", "x1": 700, "y1": 320, "x2": 700, "y2": 280, "color": "#FFD700", "width": 8 },
        { "type": "line", "x1": 700, "y1": 480, "x2": 700, "y2": 520, "color": "#FFD700", "width": 8 },
        { "type": "line", "x1": 620, "y1": 400, "x2": 580, "y2": 400, "color": "#FFD700", "width": 8 },
        { "type": "line", "x1": 780, "y1": 400, "x2": 820, "y2": 400, "color": "#FFD700", "width": 8 },
        { "type": "line", "x1": 650, "y1": 350, "x2": 620, "y2": 320, "color": "#FFD700", "width": 8 },
        { "type": "line", "x1": 750, "y1": 350, "x2": 780, "y2": 320, "color": "#FFD700", "width": 8 },
        { "type": "line", "x1": 650, "y1": 450, "x2": 620, "y2": 480, "color": "#FFD700", "width": 8 },
        { "type": "line", "x1": 750, "y1": 450, "x2": 780, "y2": 480, "color": "#FFD700", "width": 8 }
    ],

    'flower': [
        // Stem
        { "type": "line", "x1": 700, "y1": 600, "x2": 700, "y2": 450, "color": "#228B22", "width": 8 },
        // Leaves
        { "type": "ellipse", "x": 680, "y": 520, "radiusX": 25, "radiusY": 15, "color": "#32CD32", "fill": true },
        { "type": "ellipse", "x": 720, "y": 550, "radiusX": 25, "radiusY": 15, "color": "#32CD32", "fill": true },
        // Petals (5 petals around center)
        { "type": "circle", "x": 700, "y": 400, "radius": 30, "color": "#FF69B4", "fill": true },
        { "type": "circle", "x": 660, "y": 420, "radius": 30, "color": "#FF69B4", "fill": true },
        { "type": "circle", "x": 740, "y": 420, "radius": 30, "color": "#FF69B4", "fill": true },
        { "type": "circle", "x": 675, "y": 370, "radius": 30, "color": "#FF69B4", "fill": true },
        { "type": "circle", "x": 725, "y": 370, "radius": 30, "color": "#FF69B4", "fill": true },
        // Center
        { "type": "circle", "x": 700, "y": 400, "radius": 20, "color": "#FFD700", "fill": true }
    ],

    'tree': [
        // Trunk
        { "type": "rectangle", "x": 680, "y": 450, "width": 40, "height": 200, "color": "#8B4513", "fill": true },
        // Foliage (3 layers of green circles)
        { "type": "circle", "x": 700, "y": 450, "radius": 80, "color": "#228B22", "fill": true },
        { "type": "circle", "x": 660, "y": 420, "radius": 60, "color": "#2E8B57", "fill": true },
        { "type": "circle", "x": 740, "y": 420, "radius": 60, "color": "#2E8B57", "fill": true },
        { "type": "circle", "x": 700, "y": 380, "radius": 70, "color": "#3CB371", "fill": true },
        { "type": "circle", "x": 670, "y": 360, "radius": 50, "color": "#228B22", "fill": true },
        { "type": "circle", "x": 730, "y": 360, "radius": 50, "color": "#228B22", "fill": true }
    ],

    'heart': [
        // Left half
        { "type": "circle", "x": 670, "y": 450, "radius": 50, "color": "#FF0000", "fill": true },
        // Right half  
        { "type": "circle", "x": 730, "y": 450, "radius": 50, "color": "#FF0000", "fill": true },
        // Bottom point
        { "type": "polygon", "points": [[620, 460], [700, 560], [780, 460], [730, 500], [700, 540], [670, 500]], "color": "#FF0000", "fill": true }
    ],

    'star': [
        // 5-pointed star
        { "type": "polygon", "points": [[700, 350], [720, 410], [785, 420], [735, 460], [755, 525], [700, 490], [645, 525], [665, 460], [615, 420], [680, 410]], "color": "#FFD700", "fill": true },
        // Outline for definition
        { "type": "polygon", "points": [[700, 350], [720, 410], [785, 420], [735, 460], [755, 525], [700, 490], [645, 525], [665, 460], [615, 420], [680, 410]], "color": "#FFA500", "fill": false }
    ],

    'turtle': [
        // Shell (main body)
        { "type": "ellipse", "x": 700, "y": 500, "radiusX": 80, "radiusY": 60, "color": "#228B22", "fill": true },
        // Shell pattern (hexagons)
        { "type": "polygon", "points": [[700, 470], [720, 480], [720, 500], [700, 510], [680, 500], [680, 480]], "color": "#2E8B57", "fill": true },
        { "type": "polygon", "points": [[660, 490], [680, 500], [680, 520], [660, 530], [640, 520], [640, 500]], "color": "#2E8B57", "fill": true },
        { "type": "polygon", "points": [[740, 490], [760, 500], [760, 520], [740, 530], [720, 520], [720, 500]], "color": "#2E8B57", "fill": true },
        // Head
        { "type": "ellipse", "x": 620, "y": 480, "radiusX": 25, "radiusY": 20, "color": "#6B8E23", "fill": true },
        // Eyes
        { "type": "circle", "x": 615, "y": 475, "radius": 3, "color": "#000000", "fill": true },
        { "type": "circle", "x": 625, "y": 475, "radius": 3, "color": "#000000", "fill": true },
        // Legs (4 legs)
        { "type": "ellipse", "x": 650, "y": 540, "radiusX": 15, "radiusY": 25, "color": "#6B8E23", "fill": true },
        { "type": "ellipse", "x": 750, "y": 540, "radiusX": 15, "radiusY": 25, "color": "#6B8E23", "fill": true },
        { "type": "ellipse", "x": 670, "y": 460, "radiusX": 15, "radiusY": 20, "color": "#6B8E23", "fill": true },
        { "type": "ellipse", "x": 730, "y": 460, "radiusX": 15, "radiusY": 20, "color": "#6B8E23", "fill": true },
        // Tail
        { "type": "polygon", "points": [[780, 500], [800, 495], [800, 505]], "color": "#6B8E23", "fill": true }
    ],

    'fish': [
        // Body
        { "type": "ellipse", "x": 700, "y": 500, "radiusX": 60, "radiusY": 40, "color": "#FFA500", "fill": true },
        // Tail
        { "type": "polygon", "points": [[760, 500], [820, 480], [820, 520]], "color": "#FF8C00", "fill": true },
        // Fins
        { "type": "polygon", "points": [[680, 480], [660, 460], [680, 470]], "color": "#FF8C00", "fill": true },
        { "type": "polygon", "points": [[680, 520], [660, 540], [680, 530]], "color": "#FF8C00", "fill": true },
        // Eye
        { "type": "circle", "x": 670, "y": 495, "radius": 8, "color": "#FFFFFF", "fill": true },
        { "type": "circle", "x": 670, "y": 495, "radius": 4, "color": "#000000", "fill": true },
        // Scales pattern
        { "type": "arc", "x": 710, "y": 490, "radius": 10, "startAngle": 0, "endAngle": Math.PI, "color": "#FF6347", "width": 2 },
        { "type": "arc", "x": 730, "y": 490, "radius": 10, "startAngle": 0, "endAngle": Math.PI, "color": "#FF6347", "width": 2 },
        { "type": "arc", "x": 710, "y": 510, "radius": 10, "startAngle": Math.PI, "endAngle": Math.PI * 2, "color": "#FF6347", "width": 2 }
    ],

    'bird': [
        // Body
        { "type": "ellipse", "x": 700, "y": 520, "radiusX": 50, "radiusY": 40, "color": "#4169E1", "fill": true },
        // Head
        { "type": "circle", "x": 680, "y": 480, "radius": 30, "color": "#4169E1", "fill": true },
        // Beak
        { "type": "polygon", "points": [[660, 480], [640, 475], [660, 485]], "color": "#FFA500", "fill": true },
        // Eye
        { "type": "circle", "x": 675, "y": 475, "radius": 5, "color": "#FFFFFF", "fill": true },
        { "type": "circle", "x": 675, "y": 475, "radius": 3, "color": "#000000", "fill": true },
        // Wings
        { "type": "ellipse", "x": 720, "y": 510, "radiusX": 40, "radiusY": 20, "color": "#1E90FF", "fill": true },
        // Tail
        { "type": "polygon", "points": [[750, 520], [780, 510], [780, 530]], "color": "#1E90FF", "fill": true },
        // Legs
        { "type": "line", "x1": 690, "y1": 560, "x2": 685, "y2": 580, "color": "#FFA500", "width": 3 },
        { "type": "line", "x1": 710, "y1": 560, "x2": 715, "y2": 580, "color": "#FFA500", "width": 3 }
    ],

    'butterfly': [
        // Body
        { "type": "ellipse", "x": 700, "y": 500, "radiusX": 8, "radiusY": 40, "color": "#000000", "fill": true },
        // Head
        { "type": "circle", "x": 700, "y": 470, "radius": 10, "color": "#000000", "fill": true },
        // Antennae
        { "type": "line", "x1": 700, "y1": 460, "x2": 690, "y2": 440, "color": "#000000", "width": 2 },
        { "type": "line", "x1": 700, "y1": 460, "x2": 710, "y2": 440, "color": "#000000", "width": 2 },
        { "type": "circle", "x": 690, "y": 440, "radius": 3, "color": "#000000", "fill": true },
        { "type": "circle", "x": 710, "y": 440, "radius": 3, "color": "#000000", "fill": true },
        // Upper wings (left)
        { "type": "ellipse", "x": 650, "y": 480, "radiusX": 40, "radiusY": 35, "color": "#FF69B4", "fill": true },
        { "type": "circle", "x": 650, "y": 480, "radius": 15, "color": "#FFFFFF", "fill": true },
        { "type": "circle", "x": 650, "y": 480, "radius": 8, "color": "#000000", "fill": true },
        // Upper wings (right)
        { "type": "ellipse", "x": 750, "y": 480, "radiusX": 40, "radiusY": 35, "color": "#FF69B4", "fill": true },
        { "type": "circle", "x": 750, "y": 480, "radius": 15, "color": "#FFFFFF", "fill": true },
        { "type": "circle", "x": 750, "y": 480, "radius": 8, "color": "#000000", "fill": true },
        // Lower wings (left)
        { "type": "ellipse", "x": 660, "y": 520, "radiusX": 35, "radiusY": 30, "color": "#FFB6C1", "fill": true },
        { "type": "circle", "x": 660, "y": 520, "radius": 10, "color": "#FFFFFF", "fill": true },
        // Lower wings (right)
        { "type": "ellipse", "x": 740, "y": 520, "radiusX": 35, "radiusY": 30, "color": "#FFB6C1", "fill": true },
        { "type": "circle", "x": 740, "y": 520, "radius": 10, "color": "#FFFFFF", "fill": true }
    ],

    'rocket': [
        // Body
        { "type": "rectangle", "x": 670, "y": 400, "width": 60, "height": 150, "color": "#C0C0C0", "fill": true },
        // Nose cone
        { "type": "polygon", "points": [[700, 350], [670, 400], [730, 400]], "color": "#FF0000", "fill": true },
        // Window
        { "type": "circle", "x": 700, "y": 450, "radius": 20, "color": "#87CEEB", "fill": true },
        { "type": "circle", "x": 700, "y": 450, "radius": 15, "color": "#4682B4", "fill": true },
        // Fins
        { "type": "polygon", "points": [[670, 550], [640, 580], [670, 580]], "color": "#FF0000", "fill": true },
        { "type": "polygon", "points": [[730, 550], [760, 580], [730, 580]], "color": "#FF0000", "fill": true },
        // Flames
        { "type": "polygon", "points": [[680, 550], [690, 580], [690, 550]], "color": "#FFA500", "fill": true },
        { "type": "polygon", "points": [[700, 550], [700, 590], [710, 550]], "color": "#FF4500", "fill": true },
        { "type": "polygon", "points": [[710, 550], [710, 580], [720, 550]], "color": "#FFA500", "fill": true },
        // Details
        { "type": "line", "x1": 670, "y1": 480, "x2": 730, "y2": 480, "color": "#808080", "width": 2 },
        { "type": "line", "x1": 670, "y1": 520, "x2": 730, "y2": 520, "color": "#808080", "width": 2 }
    ],

    'moon': [
        // Main circle
        { "type": "circle", "x": 700, "y": 400, "radius": 70, "color": "#F0E68C", "fill": true },
        // Craters
        { "type": "circle", "x": 680, "y": 380, "radius": 12, "color": "#DAA520", "fill": true },
        { "type": "circle", "x": 720, "y": 390, "radius": 15, "color": "#DAA520", "fill": true },
        { "type": "circle", "x": 690, "y": 420, "radius": 10, "color": "#DAA520", "fill": true },
        { "type": "circle", "x": 710, "y": 410, "radius": 8, "color": "#DAA520", "fill": true },
        { "type": "circle", "x": 670, "y": 410, "radius": 7, "color": "#DAA520", "fill": true },
        // Glow effect
        { "type": "circle", "x": 700, "y": 400, "radius": 75, "color": "#FFFFE0", "fill": false }
    ],

    'cloud': [
        // Cloud puffs
        { "type": "circle", "x": 650, "y": 500, "radius": 40, "color": "#FFFFFF", "fill": true },
        { "type": "circle", "x": 700, "y": 490, "radius": 50, "color": "#FFFFFF", "fill": true },
        { "type": "circle", "x": 750, "y": 500, "radius": 40, "color": "#FFFFFF", "fill": true },
        { "type": "circle", "x": 680, "y": 520, "radius": 35, "color": "#FFFFFF", "fill": true },
        { "type": "circle", "x": 720, "y": 520, "radius": 35, "color": "#FFFFFF", "fill": true },
        // Shadow/outline
        { "type": "ellipse", "x": 700, "y": 530, "radiusX": 80, "radiusY": 20, "color": "#F0F0F0", "fill": true }
    ],

    'rainbow': [
        // Arc layers (7 colors)
        { "type": "arc", "x": 700, "y": 600, "radius": 200, "startAngle": Math.PI, "endAngle": 0, "color": "#FF0000", "width": 20 },
        { "type": "arc", "x": 700, "y": 600, "radius": 180, "startAngle": Math.PI, "endAngle": 0, "color": "#FF7F00", "width": 20 },
        { "type": "arc", "x": 700, "y": 600, "radius": 160, "startAngle": Math.PI, "endAngle": 0, "color": "#FFFF00", "width": 20 },
        { "type": "arc", "x": 700, "y": 600, "radius": 140, "startAngle": Math.PI, "endAngle": 0, "color": "#00FF00", "width": 20 },
        { "type": "arc", "x": 700, "y": 600, "radius": 120, "startAngle": Math.PI, "endAngle": 0, "color": "#0000FF", "width": 20 },
        { "type": "arc", "x": 700, "y": 600, "radius": 100, "startAngle": Math.PI, "endAngle": 0, "color": "#4B0082", "width": 20 },
        { "type": "arc", "x": 700, "y": 600, "radius": 80, "startAngle": Math.PI, "endAngle": 0, "color": "#9400D3", "width": 20 }
    ],

    'mushroom': [
        // Cap
        { "type": "arc", "x": 700, "y": 480, "radius": 60, "startAngle": Math.PI, "endAngle": 0, "color": "#FF0000", "width": 80 },
        { "type": "ellipse", "x": 700, "y": 480, "radiusX": 60, "radiusY": 15, "color": "#FF0000", "fill": true },
        // Spots on cap
        { "type": "circle", "x": 680, "y": 460, "radius": 8, "color": "#FFFFFF", "fill": true },
        { "type": "circle", "x": 710, "y": 455, "radius": 10, "color": "#FFFFFF", "fill": true },
        { "type": "circle", "x": 690, "y": 475, "radius": 6, "color": "#FFFFFF", "fill": true },
        { "type": "circle", "x": 720, "y": 470, "radius": 7, "color": "#FFFFFF", "fill": true },
        // Stem
        { "type": "rectangle", "x": 680, "y": 480, "width": 40, "height": 80, "color": "#F5F5DC", "fill": true },
        // Gills under cap
        { "type": "ellipse", "x": 700, "y": 480, "radiusX": 55, "radiusY": 12, "color": "#FFE4E1", "fill": true },
        // Base
        { "type": "ellipse", "x": 700, "y": 560, "radiusX": 45, "radiusY": 10, "color": "#DEB887", "fill": true }
    ],

    'apple': [
        // Main body
        { "type": "circle", "x": 700, "y": 500, "radius": 60, "color": "#FF0000", "fill": true },
        // Indent at top
        { "type": "arc", "x": 700, "y": 440, "radius": 15, "startAngle": 0, "endAngle": Math.PI, "color": "#8B0000", "width": 8 },
        // Stem
        { "type": "rectangle", "x": 697, "y": 420, "width": 6, "height": 25, "color": "#8B4513", "fill": true },
        // Leaf
        { "type": "ellipse", "x": 720, "y": 430, "radiusX": 20, "radiusY": 10, "color": "#228B22", "fill": true },
        { "type": "line", "x1": 710, "y1": 430, "x2": 730, "y2": 430, "color": "#006400", "width": 2 },
        // Highlight
        { "type": "circle", "x": 680, "y": 480, "radius": 15, "color": "#FF6B6B", "fill": true }
    ],

    'pizza': [
        // Pizza slice triangle
        { "type": "polygon", "points": [[700, 350], [600, 550], [800, 550]], "color": "#FFD700", "fill": true },
        // Crust edge
        { "type": "arc", "x": 700, "y": 350, "radius": 120, "startAngle": Math.PI * 0.75, "endAngle": Math.PI * 0.25, "color": "#D2691E", "width": 15 },
        // Cheese texture
        { "type": "polygon", "points": [[600, 550], [800, 550], [750, 520], [650, 520]], "color": "#FFA500", "fill": true },
        // Pepperoni
        { "type": "circle", "x": 680, "y": 450, "radius": 15, "color": "#8B0000", "fill": true },
        { "type": "circle", "x": 720, "y": 470, "radius": 15, "color": "#8B0000", "fill": true },
        { "type": "circle", "x": 700, "y": 500, "radius": 15, "color": "#8B0000", "fill": true },
        { "type": "circle", "x": 660, "y": 510, "radius": 15, "color": "#8B0000", "fill": true },
        { "type": "circle", "x": 740, "y": 520, "radius": 15, "color": "#8B0000", "fill": true }
    ],

    'dragon': [
        // Body
        { "type": "ellipse", "x": 700, "y": 520, "radiusX": 70, "radiusY": 50, "color": "#228B22", "fill": true },
        // Neck
        { "type": "polygon", "points": [[650, 500], [640, 450], [660, 480]], "color": "#2E8B57", "fill": true },
        // Head
        { "type": "ellipse", "x": 630, "y": 430, "radiusX": 35, "radiusY": 30, "color": "#228B22", "fill": true },
        // Snout
        { "type": "polygon", "points": [[600, 430], [580, 425], [600, 435]], "color": "#2E8B57", "fill": true },
        // Horns
        { "type": "polygon", "points": [[620, 410], [615, 380], [625, 405]], "color": "#8B4513", "fill": true },
        { "type": "polygon", "points": [[640, 410], [645, 380], [635, 405]], "color": "#8B4513", "fill": true },
        // Eye
        { "type": "circle", "x": 625, "y": 425, "radius": 6, "color": "#FFD700", "fill": true },
        { "type": "circle", "x": 625, "y": 425, "radius": 3, "color": "#000000", "fill": true },
        // Spikes on back
        { "type": "polygon", "points": [[680, 500], [690, 480], [700, 500]], "color": "#006400", "fill": true },
        { "type": "polygon", "points": [[700, 505], [710, 485], [720, 505]], "color": "#006400", "fill": true },
        { "type": "polygon", "points": [[720, 510], [730, 490], [740, 510]], "color": "#006400", "fill": true },
        // Wings
        { "type": "polygon", "points": [[720, 510], [780, 480], [760, 530]], "color": "#32CD32", "fill": true },
        { "type": "polygon", "points": [[720, 510], [780, 520], [760, 550]], "color": "#3CB371", "fill": true },
        // Legs
        { "type": "rectangle", "x": 670, "y": 560, "width": 15, "height": 40, "color": "#228B22", "fill": true },
        { "type": "rectangle", "x": 710, "y": 560, "width": 15, "height": 40, "color": "#228B22", "fill": true },
        // Tail
        { "type": "polygon", "points": [[770, 520], [820, 510], [810, 530]], "color": "#2E8B57", "fill": true },
        { "type": "polygon", "points": [[810, 520], [830, 515], [825, 525]], "color": "#FF4500", "fill": true },
        // Fire breath
        { "type": "polygon", "points": [[580, 425], [560, 420], [565, 430]], "color": "#FF4500", "fill": true },
        { "type": "polygon", "points": [[565, 423], [550, 418], [555, 428]], "color": "#FFA500", "fill": true }
    ],

    'robot': [
        // Head
        { "type": "rectangle", "x": 670, "y": 380, "width": 60, "height": 50, "color": "#C0C0C0", "fill": true },
        // Antenna
        { "type": "line", "x1": 700, "y1": 380, "x2": 700, "y2": 360, "color": "#808080", "width": 3 },
        { "type": "circle", "x": 700, "y": 360, "radius": 5, "color": "#FF0000", "fill": true },
        // Eyes
        { "type": "rectangle", "x": 680, "y": 395, "width": 15, "height": 15, "color": "#00FF00", "fill": true },
        { "type": "rectangle", "x": 705, "y": 395, "width": 15, "height": 15, "color": "#00FF00", "fill": true },
        // Mouth
        { "type": "rectangle", "x": 685, "y": 415, "width": 30, "height": 5, "color": "#000000", "fill": true },
        // Body
        { "type": "rectangle", "x": 660, "y": 430, "width": 80, "height": 90, "color": "#A9A9A9", "fill": true },
        // Control panel
        { "type": "circle", "x": 690, "y": 460, "radius": 8, "color": "#FF0000", "fill": true },
        { "type": "circle", "x": 710, "y": 460, "radius": 8, "color": "#0000FF", "fill": true },
        { "type": "rectangle", "x": 675, "y": 485, "width": 50, "height": 3, "color": "#00FF00", "fill": true },
        // Arms
        { "type": "rectangle", "x": 630, "y": 440, "width": 30, "height": 15, "color": "#808080", "fill": true },
        { "type": "rectangle", "x": 740, "y": 440, "width": 30, "height": 15, "color": "#808080", "fill": true },
        // Hands
        { "type": "circle", "x": 625, "y": 447, "radius": 8, "color": "#696969", "fill": true },
        { "type": "circle", "x": 775, "y": 447, "radius": 8, "color": "#696969", "fill": true },
        // Legs
        { "type": "rectangle", "x": 670, "y": 520, "width": 20, "height": 50, "color": "#808080", "fill": true },
        { "type": "rectangle", "x": 710, "y": 520, "width": 20, "height": 50, "color": "#808080", "fill": true },
        // Feet
        { "type": "rectangle", "x": 665, "y": 570, "width": 30, "height": 10, "color": "#696969", "fill": true },
        { "type": "rectangle", "x": 705, "y": 570, "width": 30, "height": 10, "color": "#696969", "fill": true }
    ],

    'snowman': [
        // Bottom ball
        { "type": "circle", "x": 700, "y": 560, "radius": 50, "color": "#FFFFFF", "fill": true },
        // Middle ball
        { "type": "circle", "x": 700, "y": 480, "radius": 40, "color": "#FFFFFF", "fill": true },
        // Top ball (head)
        { "type": "circle", "x": 700, "y": 410, "radius": 30, "color": "#FFFFFF", "fill": true },
        // Hat
        { "type": "rectangle", "x": 680, "y": 380, "width": 40, "height": 10, "color": "#000000", "fill": true },
        { "type": "rectangle", "x": 685, "y": 360, "width": 30, "height": 20, "color": "#000000", "fill": true },
        // Eyes
        { "type": "circle", "x": 690, "y": 405, "radius": 4, "color": "#000000", "fill": true },
        { "type": "circle", "x": 710, "y": 405, "radius": 4, "color": "#000000", "fill": true },
        // Nose (carrot)
        { "type": "polygon", "points": [[700, 415], [720, 418], [700, 421]], "color": "#FF8C00", "fill": true },
        // Mouth
        { "type": "circle", "x": 690, "y": 425, "radius": 3, "color": "#000000", "fill": true },
        { "type": "circle", "x": 700, "y": 428, "radius": 3, "color": "#000000", "fill": true },
        { "type": "circle", "x": 710, "y": 425, "radius": 3, "color": "#000000", "fill": true },
        // Buttons
        { "type": "circle", "x": 700, "y": 470, "radius": 5, "color": "#000000", "fill": true },
        { "type": "circle", "x": 700, "y": 490, "radius": 5, "color": "#000000", "fill": true },
        // Scarf
        { "type": "rectangle", "x": 680, "y": 435, "width": 40, "height": 8, "color": "#FF0000", "fill": true },
        // Arms (sticks)
        { "type": "line", "x1": 660, "y1": 480, "x2": 620, "y2": 460, "color": "#8B4513", "width": 4 },
        { "type": "line", "x1": 740, "y1": 480, "x2": 780, "y2": 460, "color": "#8B4513", "width": 4 }
    ],

    'ice cream': [
        // Cone
        { "type": "polygon", "points": [[700, 550], [650, 650], [750, 650]], "color": "#D2691E", "fill": true },
        // Waffle pattern
        { "type": "line", "x1": 670, "y1": 580, "x2": 730, "y2": 580, "color": "#8B4513", "width": 2 },
        { "type": "line", "x1": 660, "y1": 600, "x2": 740, "y2": 600, "color": "#8B4513", "width": 2 },
        // Ice cream scoops
        { "type": "circle", "x": 700, "y": 520, "radius": 40, "color": "#FFB6C1", "fill": true },
        { "type": "circle", "x": 680, "y": 490, "radius": 35, "color": "#87CEEB", "fill": true },
        { "type": "circle", "x": 720, "y": 490, "radius": 35, "color": "#FFFF00", "fill": true },
        // Cherry on top
        { "type": "circle", "x": 700, "y": 455, "radius": 8, "color": "#FF0000", "fill": true },
        { "type": "line", "x1": 700, "y1": 455, "x2": 705, "y2": 445, "color": "#228B22", "width": 2 }
    ],

    'cupcake': [
        // Wrapper base
        { "type": "polygon", "points": [[650, 550], [750, 550], [730, 600], [670, 600]], "color": "#FF69B4", "fill": true },
        // Wrapper lines
        { "type": "line", "x1": 660, "y1": 550, "x2": 675, "y2": 600, "color": "#FF1493", "width": 2 },
        { "type": "line", "x1": 700, "y1": 550, "x2": 700, "y2": 600, "color": "#FF1493", "width": 2 },
        { "type": "line", "x1": 740, "y1": 550, "x2": 725, "y2": 600, "color": "#FF1493", "width": 2 },
        // Frosting
        { "type": "circle", "x": 700, "y": 530, "radius": 45, "color": "#FFE4E1", "fill": true },
        { "type": "circle", "x": 680, "y": 510, "radius": 30, "color": "#FFC0CB", "fill": true },
        { "type": "circle", "x": 720, "y": 510, "radius": 30, "color": "#FFC0CB", "fill": true },
        { "type": "circle", "x": 700, "y": 490, "radius": 25, "color": "#FFB6C1", "fill": true },
        // Sprinkles
        { "type": "rectangle", "x": 690, "y": 500, "width": 3, "height": 10, "color": "#FF0000", "fill": true },
        { "type": "rectangle", "x": 705, "y": 505, "width": 3, "height": 10, "color": "#0000FF", "fill": true },
        // Cherry
        { "type": "circle", "x": 700, "y": 475, "radius": 8, "color": "#DC143C", "fill": true }
    ],

    'guitar': [
        // Body
        { "type": "ellipse", "x": 700, "y": 520, "radiusX": 60, "radiusY": 70, "color": "#8B4513", "fill": true },
        { "type": "ellipse", "x": 700, "y": 520, "radiusX": 45, "radiusY": 55, "color": "#D2691E", "fill": true },
        // Sound hole
        { "type": "circle", "x": 700, "y": 520, "radius": 20, "color": "#000000", "fill": true },
        // Neck
        { "type": "rectangle", "x": 690, "y": 350, "width": 20, "height": 170, "color": "#654321", "fill": true },
        // Frets
        { "type": "line", "x1": 690, "y1": 380, "x2": 710, "y2": 380, "color": "#C0C0C0", "width": 2 },
        { "type": "line", "x1": 690, "y1": 410, "x2": 710, "y2": 410, "color": "#C0C0C0", "width": 2 },
        { "type": "line", "x1": 690, "y1": 440, "x2": 710, "y2": 440, "color": "#C0C0C0", "width": 2 },
        // Head
        { "type": "rectangle", "x": 685, "y": 330, "width": 30, "height": 20, "color": "#654321", "fill": true },
        // Tuning pegs
        { "type": "circle", "x": 680, "y": 335, "radius": 4, "color": "#FFD700", "fill": true },
        { "type": "circle", "x": 700, "y": 335, "radius": 4, "color": "#FFD700", "fill": true },
        { "type": "circle", "x": 720, "y": 335, "radius": 4, "color": "#FFD700", "fill": true },
        // Strings
        { "type": "line", "x1": 695, "y1": 350, "x2": 695, "y2": 590, "color": "#C0C0C0", "width": 1 },
        { "type": "line", "x1": 700, "y1": 350, "x2": 700, "y2": 590, "color": "#C0C0C0", "width": 1 },
        { "type": "line", "x1": 705, "y1": 350, "x2": 705, "y2": 590, "color": "#C0C0C0", "width": 1 }
    ],

    'boat': [
        // Hull
        { "type": "polygon", "points": [[600, 550], [800, 550], [780, 600], [620, 600]], "color": "#8B4513", "fill": true },
        // Deck
        { "type": "rectangle", "x": 610, "y": 530, "width": 180, "height": 20, "color": "#D2691E", "fill": true },
        // Cabin
        { "type": "rectangle", "x": 660, "y": 480, "width": 80, "height": 50, "color": "#FFFFFF", "fill": true },
        // Cabin roof
        { "type": "polygon", "points": [[650, 480], [750, 480], [740, 460], [660, 460]], "color": "#FF0000", "fill": true },
        // Windows
        { "type": "rectangle", "x": 670, "y": 495, "width": 25, "height": 20, "color": "#87CEEB", "fill": true },
        { "type": "rectangle", "x": 705, "y": 495, "width": 25, "height": 20, "color": "#87CEEB", "fill": true },
        // Mast
        { "type": "rectangle", "x": 697, "y": 380, "width": 6, "height": 100, "color": "#8B4513", "fill": true },
        // Sail
        { "type": "polygon", "points": [[700, 390], [700, 460], [760, 425]], "color": "#FFFFFF", "fill": true },
        // Flag
        { "type": "polygon", "points": [[700, 380], [700, 395], [715, 387]], "color": "#FF0000", "fill": true }
    ],

    'alien': [
        // Head
        { "type": "ellipse", "x": 700, "y": 480, "radiusX": 50, "radiusY": 60, "color": "#7CFC00", "fill": true },
        // Eyes (large)
        { "type": "ellipse", "x": 680, "y": 470, "radiusX": 18, "radiusY": 25, "color": "#000000", "fill": true },
        { "type": "ellipse", "x": 720, "y": 470, "radiusX": 18, "radiusY": 25, "color": "#000000", "fill": true },
        // Eye shine
        { "type": "circle", "x": 685, "y": 465, "radius": 6, "color": "#FFFFFF", "fill": true },
        { "type": "circle", "x": 725, "y": 465, "radius": 6, "color": "#FFFFFF", "fill": true },
        // Antennae
        { "type": "line", "x1": 675, "y1": 440, "x2": 665, "y2": 410, "color": "#7CFC00", "width": 4 },
        { "type": "line", "x1": 725, "y1": 440, "x2": 735, "y2": 410, "color": "#7CFC00", "width": 4 },
        { "type": "circle", "x": 665, "y": 410, "radius": 6, "color": "#FF00FF", "fill": true },
        { "type": "circle", "x": 735, "y": 410, "radius": 6, "color": "#FF00FF", "fill": true },
        // Mouth
        { "type": "arc", "x": 700, "y": 500, "radius": 15, "startAngle": 0, "endAngle": Math.PI, "color": "#006400", "width": 3 },
        // Body
        { "type": "ellipse", "x": 700, "y": 560, "radiusX": 40, "radiusY": 35, "color": "#7CFC00", "fill": true },
        // Arms
        { "type": "line", "x1": 660, "y1": 550, "x2": 630, "y2": 540, "color": "#7CFC00", "width": 8 },
        { "type": "line", "x1": 740, "y1": 550, "x2": 770, "y2": 540, "color": "#7CFC00", "width": 8 },
        // Legs
        { "type": "line", "x1": 685, "y1": 595, "x2": 680, "y2": 630, "color": "#7CFC00", "width": 8 },
        { "type": "line", "x1": 715, "y1": 595, "x2": 720, "y2": 630, "color": "#7CFC00", "width": 8 }
    ],

    'omega': [
        // Main arc (top of Omega)
        { "type": "arc", "x": 700, "y": 450, "radius": 100, "startAngle": Math.PI, "endAngle": 0, "color": "#4169E1", "width": 25 },
        // Left curve
        { "type": "arc", "x": 600, "y": 520, "radius": 70, "startAngle": Math.PI * 1.5, "endAngle": Math.PI * 0.2, "color": "#4169E1", "width": 25 },
        // Right curve
        { "type": "arc", "x": 800, "y": 520, "radius": 70, "startAngle": Math.PI * 0.8, "endAngle": Math.PI * 1.5, "color": "#4169E1", "width": 25 },
        // Left foot (flat bar)
        { "type": "line", "x1": 550, "y1": 550, "x2": 650, "y2": 550, "color": "#4169E1", "width": 25 },
        // Right foot (flat bar)
        { "type": "line", "x1": 750, "y1": 550, "x2": 850, "y2": 550, "color": "#4169E1", "width": 25 },
        // Inner circle (optional style)
        { "type": "circle", "x": 700, "y": 480, "radius": 40, "color": "#4169E1", "fill": false },
        // Glow effect
        { "type": "circle", "x": 700, "y": 480, "radius": 150, "color": "#87CEFA", "fill": false }
    ],

    'omega logo': [
        // Same as omega but triggered by "omega logo"
        { "type": "arc", "x": 700, "y": 450, "radius": 100, "startAngle": Math.PI, "endAngle": 0, "color": "#4169E1", "width": 25 },
        { "type": "arc", "x": 600, "y": 520, "radius": 70, "startAngle": Math.PI * 1.5, "endAngle": Math.PI * 0.2, "color": "#4169E1", "width": 25 },
        { "type": "arc", "x": 800, "y": 520, "radius": 70, "startAngle": Math.PI * 0.8, "endAngle": Math.PI * 1.5, "color": "#4169E1", "width": 25 },
        { "type": "line", "x1": 550, "y1": 550, "x2": 650, "y2": 550, "color": "#4169E1", "width": 25 },
        { "type": "line", "x1": 750, "y1": 550, "x2": 850, "y2": 550, "color": "#4169E1", "width": 25 },
        { "type": "circle", "x": 700, "y": 480, "radius": 40, "color": "#4169E1", "fill": false },
        { "type": "circle", "x": 700, "y": 480, "radius": 150, "color": "#87CEFA", "fill": false }
    ]
};

async function sendAIMessage() {
    const aiChatInput = document.getElementById('aiChatInput');
    const aiChatSend = document.getElementById('aiChatSend');
    const message = aiChatInput.value.trim();

    if (!message) return;

    // Prevent duplicate requests - but allow if it's been stuck
    if (isDrawingInProgress) {
        console.warn('Drawing flag was stuck, resetting...');
        isDrawingInProgress = false;
        // Allow the request to proceed
    }

    if (!window.electronAPI || !window.electronAPI.aiChat) {
        addAIMessage('assistant', 'Error: AI service is not available. Please make sure Ollama is running and restart the app.');
        console.error('[Paint AI] window.electronAPI.aiChat is not available');
        return;
    }

    // Add user message
    addAIMessage('user', message);
    aiChatInput.value = '';
    aiChatInput.style.height = 'auto';
    aiChatSend.disabled = true;
    isDrawingInProgress = true;

    // Show thinking indicator
    const thinkingDiv = addAIMessage('assistant', 'Creating your drawing...', true);

    // Check for template match first
    const lowerMessage = message.toLowerCase().trim();
    let matchedTemplate = null;
    let matchedKey = null;

    for (const [key, template] of Object.entries(DRAWING_TEMPLATES)) {
        if (lowerMessage.includes(key)) {
            matchedTemplate = template;
            matchedKey = key;
            break;
        }
    }

    // If we found a template, use it directly
    if (matchedTemplate) {
        thinkingDiv.remove();
        executeDrawingCommands(matchedTemplate);
        const capitalizedKey = matchedKey.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
        addAIMessage('assistant', `✨ Drawing complete! I've created a beautiful ${capitalizedKey} for you using a professional template.`);
        isDrawingInProgress = false;
        aiChatSend.disabled = false;
        return;
    }

    try {
        // Create drawing-focused prompt with better instructions
        // Extract the actual request from user message
        const userRequest = message.toLowerCase();
        const isSimpleRequest = /^(draw|create|make)\s+(a|an|the)?\s*([^.!?]+)/.test(userRequest);

        const drawingPrompt = `You are a professional digital artist AI assistant. The user wants you to create a high-quality drawing: "${message}"

CRITICAL: This is a NEW, FRESH request. Ignore ALL previous requests. Draw ONLY what is requested: "${message}"

ARTISTIC GUIDELINES:
- Create well-proportioned, visually appealing drawings
- Use proper spacing and positioning - center important elements around (700, 500) on the canvas
- Make shapes the appropriate size - not too small, not too large
- Use realistic or aesthetically pleasing colors
- Ensure shapes connect properly (e.g., head connects to body)
- Draw complete objects with all essential features
- Use appropriate line thickness (2-5 for outlines, 1-2 for details)

COMPOSITION RULES:
- Canvas size: 1400x1000 pixels
- Center point: (700, 500)
- Use the full canvas appropriately - not clustered in one corner
- For simple objects (circle, square): place near center (600-800, 400-600)
- For complex objects (cat, house): spread out appropriately but centered
- Leave appropriate spacing between elements (e.g., between eyes, between windows)

STRICT RULES: 
- Draw ONLY what the user requested in THIS message: "${message}"
- Do NOT add backgrounds unless explicitly requested
- Do NOT add extra objects, decorative elements, or unrelated items
- Each drawing request is completely independent
- You MUST respond with ONLY a valid JSON array. No text before or after. No explanations. Just the JSON array.

CRITICAL INSTRUCTIONS:
1. Break down complex objects into MULTIPLE shapes (circles, rectangles, polygons, lines)
2. Use DETAILED compositions - don't just draw one simple shape
3. Use APPROPRIATE COLORS - cats should be brown/black/orange, houses should have walls and roofs in different colors
4. Create COMPLETE drawings with multiple elements
5. Position elements thoughtfully across the canvas
6. Use polygons for complex shapes (triangles for roofs, irregular shapes for bodies)

Available command types (each MUST be a complete object):
1. "circle" - {"type": "circle", "x": number, "y": number, "radius": number, "color": "string", "fill": boolean}
2. "rectangle" - {"type": "rectangle", "x": number, "y": number, "width": number, "height": number, "color": "string", "fill": boolean}
3. "line" - {"type": "line", "x1": number, "y1": number, "x2": number, "y2": number, "color": "string", "width": number}
4. "ellipse" - {"type": "ellipse", "x": number, "y": number, "radiusX": number, "radiusY": number, "color": "string", "fill": boolean}
5. "polygon" - {"type": "polygon", "points": [[x1,y1], [x2,y2], [x3,y3], ...], "color": "string", "fill": boolean}
6. "text" - {"type": "text", "x": number, "y": number, "text": "string", "color": "string", "size": number}
7. "arc" - {"type": "arc", "x": number, "y": number, "radius": number, "startAngle": number, "endAngle": number, "color": "string", "width": number}

Canvas size: 1400x1000 pixels. Center is around (700, 500).

EXAMPLES:
For a "red circle" at center: [{"type":"circle","x":700,"y":500,"radius":100,"color":"#FF0000","fill":true}]

For a "cat": [
  {"type":"ellipse","x":700,"y":650,"radiusX":80,"radiusY":60,"color":"#FFA500","fill":true},
  {"type":"circle","x":700,"y":550,"radius":50,"color":"#FFA500","fill":true},
  {"type":"polygon","points":[[650,520],[630,480],[670,500]],"color":"#FFA500","fill":true},
  {"type":"polygon","points":[[750,520],[770,480],[730,500]],"color":"#FFA500","fill":true},
  {"type":"circle","x":690,"y":545,"radius":5,"color":"#000000","fill":true},
  {"type":"circle","x":710,"y":545,"radius":5,"color":"#000000","fill":true},
  {"type":"polygon","points":[[700,555],[695,560],[705,560]],"color":"#FF69B4","fill":true}
]

For a "house": [
  {"type":"rectangle","x":500,"y":400,"width":400,"height":300,"color":"#DEB887","fill":true},
  {"type":"polygon","points":[[450,400],[700,250],[950,400]],"color":"#8B0000","fill":true},
  {"type":"rectangle","x":650,"y":550,"width":80,"height":150,"color":"#654321","fill":true},
  {"type":"rectangle","x":550,"y":450,"width":80,"height":80,"color":"#87CEEB","fill":true},
  {"type":"rectangle","x":770,"y":450,"width":80,"height":80,"color":"#87CEEB","fill":true}
]

Colors: Use hex format. "#FF0000"=red, "#0000FF"=blue, "#00FF00"=green, "#FFFF00"=yellow, "#FFA500"=orange, "#8B4513"=brown, "#000000"=black, "#FFFFFF"=white.

Generate a DETAILED drawing with MULTIPLE shapes. Minimum 5-10 commands for simple objects, 15+ for complex scenes.

Respond with ONLY the JSON array, nothing else. Start with [ and end with ].`;

        // Don't pass conversation history - each drawing request is completely independent
        // Add a unique timestamp to make it clear this is a fresh, new request
        const timestamp = Date.now();
        const uniquePrompt = drawingPrompt + `\n\n[Request ID: ${timestamp} - This is a NEW, FRESH request. Ignore any previous requests.]`;

        const result = await window.electronAPI.aiChat(uniquePrompt, []);

        thinkingDiv.remove();

        // Extract AI service debug info if present (and remove it)
        if (result && result.response) {
            if (result.response.startsWith('[AI-SERVICE-DEBUG]')) {
                const newlineIndex = result.response.indexOf('\n');
                if (newlineIndex > 0) {
                    result.response = result.response.substring(newlineIndex + 1);
                }
            }
        }

        if (result && result.success) {
            // Try to parse and execute drawing commands
            try {
                let response = result.response.trim();

                // Remove markdown code blocks if present (more comprehensive)
                response = response.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

                // Remove common prefixes like "Here's the drawing:" or "Here is:"
                response = response.replace(/^(here'?s?|here is|the drawing|drawing commands?):?\s*/i, '').trim();

                // Extract JSON array - look for the first [ and last ]
                const firstBracket = response.indexOf('[');
                const lastBracket = response.lastIndexOf(']');

                if (firstBracket === -1 || lastBracket === -1 || lastBracket <= firstBracket) {
                    console.error('[Paint AI] No brackets found. Response:', response);
                    throw new Error('No valid JSON array found in response');
                }

                let jsonStr = response.substring(firstBracket, lastBracket + 1);

                // Clean up the JSON - remove any stray strings that aren't in objects
                // Fix common issues like incomplete objects or string values mixed in
                jsonStr = jsonStr.replace(/,\s*"[a-z]+"\s*,/gi, ','); // Remove standalone string elements
                jsonStr = jsonStr.replace(/,\s*"[a-z]+"\s*\]/gi, ']'); // Remove trailing string elements
                jsonStr = jsonStr.replace(/\[\s*"[a-z]+"\s*,/gi, '['); // Remove leading string elements

                // Try to parse JSON
                let commands;
                try {
                    commands = JSON.parse(jsonStr);
                } catch (parseErr) {
                    // Try to fix common JSON issues
                    // Remove trailing commas before closing brackets/braces
                    jsonStr = jsonStr.replace(/,(\s*[}\]])/g, '$1');
                    // Try again
                    commands = JSON.parse(jsonStr);
                }

                if (!Array.isArray(commands) || commands.length === 0) {
                    throw new Error('Invalid command array');
                }

                // Filter out any invalid commands (must have type property)
                const validCommands = commands.filter(cmd => cmd && typeof cmd === 'object' && cmd.type);

                if (validCommands.length === 0) {
                    throw new Error('No valid commands found');
                }

                executeDrawingCommands(validCommands);
                addAIMessage('assistant', 'Drawing complete! I\'ve created your artwork on the canvas.');
            } catch (parseError) {
                console.error('[Paint AI] Error parsing AI response:', parseError);
                console.error('[Paint AI] Full raw response:', result.response);
                console.error('[Paint AI] Response length:', result.response?.length);

                // Fallback: try to extract complete valid objects from partial JSON
                try {
                    const response = result.response;
                    // More robust extraction: find complete JSON objects
                    const commands = [];
                    let depth = 0;
                    let startIdx = -1;
                    let inString = false;
                    let escapeNext = false;

                    for (let i = 0; i < response.length; i++) {
                        const char = response[i];

                        if (escapeNext) {
                            escapeNext = false;
                            continue;
                        }

                        if (char === '\\') {
                            escapeNext = true;
                            continue;
                        }

                        if (char === '"') {
                            inString = !inString;
                            continue;
                        }

                        if (inString) continue;

                        if (char === '{') {
                            if (depth === 0) startIdx = i;
                            depth++;
                        } else if (char === '}') {
                            depth--;
                            if (depth === 0 && startIdx >= 0) {
                                // Found a complete object
                                try {
                                    const objStr = response.substring(startIdx, i + 1);
                                    const obj = JSON.parse(objStr);
                                    if (obj && obj.type) {
                                        commands.push(obj);
                                    }
                                } catch (e) {
                                    // Skip invalid objects
                                }
                                startIdx = -1;
                            }
                        }
                    }

                    if (commands.length > 0) {
                        executeDrawingCommands(commands);
                        addAIMessage('assistant', `Drawing complete! I've created your artwork with ${commands.length} shapes (response was truncated, but I used what was available).`);
                        isDrawingInProgress = false;
                        aiChatSend.disabled = false;
                        return;
                    } else {
                        throw new Error('Could not extract valid drawing commands');
                    }
                } catch (fallbackError) {
                    console.error('[Paint AI] Fallback parsing also failed:', fallbackError);

                    // Last resort: Try to generate a simple command for basic requests
                    const lowerMsg = message.toLowerCase();
                    const simpleCircleMatch = lowerMsg.match(/draw\s+(?:a\s+)?(?:green|red|blue|yellow|orange|purple|black|white|brown|pink|cyan|magenta)?\s*circle/i);
                    const simpleSquareMatch = lowerMsg.match(/draw\s+(?:a\s+)?(?:green|red|blue|yellow|orange|purple|black|white|brown|pink|cyan|magenta)?\s*(?:square|rectangle)/i);

                    if (simpleCircleMatch || simpleSquareMatch) {
                        try {
                            // Extract color
                            let color = '#000000'; // default black
                            if (lowerMsg.includes('green')) color = '#00FF00';
                            else if (lowerMsg.includes('red')) color = '#FF0000';
                            else if (lowerMsg.includes('blue')) color = '#0000FF';
                            else if (lowerMsg.includes('yellow')) color = '#FFFF00';
                            else if (lowerMsg.includes('orange')) color = '#FFA500';
                            else if (lowerMsg.includes('purple')) color = '#800080';
                            else if (lowerMsg.includes('white')) color = '#FFFFFF';
                            else if (lowerMsg.includes('brown')) color = '#8B4513';
                            else if (lowerMsg.includes('pink')) color = '#FF69B4';
                            else if (lowerMsg.includes('cyan')) color = '#00FFFF';
                            else if (lowerMsg.includes('magenta')) color = '#FF00FF';

                            let simpleCommand;
                            if (simpleCircleMatch) {
                                simpleCommand = [{ "type": "circle", "x": 700, "y": 500, "radius": 100, "color": color, "fill": true }];
                            } else {
                                simpleCommand = [{ "type": "rectangle", "x": 600, "y": 400, "width": 200, "height": 200, "color": color, "fill": true }];
                            }

                            executeDrawingCommands(simpleCommand);
                            addAIMessage('assistant', 'Drawing complete! I\'ve created your artwork on the canvas.');
                            isDrawingInProgress = false;
                            aiChatSend.disabled = false;
                            return;
                        } catch (simpleError) {
                            console.error('[Paint AI] Simple command generation failed:', simpleError);
                        }
                    }

                    addAIMessage('assistant', 'Sorry, I couldn\'t parse the drawing commands. Please try rephrasing your request or ask for something simpler like "draw a red circle". The AI response was: ' + (result.response?.substring(0, 100) || 'No response'));
                    isDrawingInProgress = false;
                    aiChatSend.disabled = false;
                }
            }
        } else {
            const errorMsg = result?.error || 'Failed to get AI response';
            console.error('[Paint AI] Error response:', result);
            addAIMessage('assistant', `Error: ${errorMsg}. Make sure Ollama is running at http://127.0.0.1:11434`);
            isDrawingInProgress = false;
            aiChatSend.disabled = false;
        }
    } catch (error) {
        thinkingDiv.remove();
        console.error('[Paint AI] Exception:', error);
        addAIMessage('assistant', `Error: ${error.message}. Make sure Ollama is running at http://127.0.0.1:11434`);
        isDrawingInProgress = false;
        aiChatSend.disabled = false;
    } finally {
        // Always re-enable button after a short delay to allow for any async operations
        // The drawing animation handles its own state separately
        setTimeout(() => {
            const btn = document.getElementById('aiChatSend');
            if (btn) {
                btn.disabled = false;
            }
            // Reset flag if no drawing animation is happening
            if (isDrawingInProgress) {
                // Check if there's actually a drawing in progress by checking for active timers
                // If we're here, the API call is done, so reset the flag
                isDrawingInProgress = false;
            }
        }, 100);
    }
}

function executeDrawingCommands(commands) {
    if (!Array.isArray(commands)) return;

    // Set flag at the start
    isDrawingInProgress = true;

    saveState();

    // Filter valid commands
    const validCommands = commands.filter(cmd => cmd && cmd.type && typeof cmd === 'object');

    if (validCommands.length === 0) return;

    // Draw commands progressively with animation
    let currentIndex = 0;
    const delayBetweenShapes = 100; // milliseconds between each shape

    function drawNextShape() {
        if (currentIndex >= validCommands.length) {
            // All shapes drawn, save final state
            saveState();
            return;
        }

        const cmd = validCommands[currentIndex];

        ctx.strokeStyle = cmd.color || currentColor;
        ctx.fillStyle = cmd.color || currentColor;
        ctx.lineWidth = cmd.width || brushSize;

        // Validate and execute drawing command - use ACTUAL values from command, not defaults
        try {
            switch (cmd.type) {
                case 'circle':
                    // Require all necessary parameters
                    if (typeof cmd.x === 'number' && typeof cmd.y === 'number' && typeof cmd.radius === 'number' && cmd.radius > 0) {
                        ctx.beginPath();
                        ctx.arc(cmd.x, cmd.y, cmd.radius, 0, Math.PI * 2);
                        if (cmd.fill !== false) {
                            ctx.fill();
                        } else {
                            ctx.stroke();
                        }
                    }
                    break;

                case 'rectangle':
                    // Require all necessary parameters
                    if (typeof cmd.x === 'number' && typeof cmd.y === 'number' &&
                        typeof cmd.width === 'number' && typeof cmd.height === 'number' &&
                        cmd.width > 0 && cmd.height > 0) {
                        if (cmd.fill !== false) {
                            ctx.fillRect(cmd.x, cmd.y, cmd.width, cmd.height);
                        } else {
                            ctx.strokeRect(cmd.x, cmd.y, cmd.width, cmd.height);
                        }
                    }
                    break;

                case 'line':
                    // Require all necessary parameters
                    if (typeof cmd.x1 === 'number' && typeof cmd.y1 === 'number' &&
                        typeof cmd.x2 === 'number' && typeof cmd.y2 === 'number') {
                        ctx.beginPath();
                        ctx.moveTo(cmd.x1, cmd.y1);
                        ctx.lineTo(cmd.x2, cmd.y2);
                        ctx.stroke();
                    }
                    break;

                case 'ellipse':
                    // Require all necessary parameters
                    if (typeof cmd.x === 'number' && typeof cmd.y === 'number' &&
                        typeof cmd.radiusX === 'number' && typeof cmd.radiusY === 'number' &&
                        cmd.radiusX > 0 && cmd.radiusY > 0) {
                        ctx.beginPath();
                        ctx.ellipse(cmd.x, cmd.y, cmd.radiusX, cmd.radiusY, 0, 0, Math.PI * 2);
                        if (cmd.fill !== false) {
                            ctx.fill();
                        } else {
                            ctx.stroke();
                        }
                    }
                    break;

                case 'polygon':
                    // Validate points array
                    if (cmd.points && Array.isArray(cmd.points) && cmd.points.length >= 3) {
                        // Validate all points are valid [x, y] arrays
                        const validPoints = cmd.points.filter(pt =>
                            Array.isArray(pt) && pt.length >= 2 &&
                            typeof pt[0] === 'number' && typeof pt[1] === 'number'
                        );

                        if (validPoints.length >= 3) {
                            ctx.beginPath();
                            ctx.moveTo(validPoints[0][0], validPoints[0][1]);
                            for (let i = 1; i < validPoints.length; i++) {
                                ctx.lineTo(validPoints[i][0], validPoints[i][1]);
                            }
                            ctx.closePath();
                            if (cmd.fill !== false) {
                                ctx.fill();
                            } else {
                                ctx.stroke();
                            }
                        }
                    }
                    break;

                case 'text':
                    // Require text and position
                    if (typeof cmd.x === 'number' && typeof cmd.y === 'number' && cmd.text && typeof cmd.text === 'string') {
                        ctx.font = `${cmd.size || 20}px Arial`;
                        ctx.fillText(cmd.text, cmd.x, cmd.y);
                    }
                    break;

                case 'arc':
                    // Require all necessary parameters
                    if (typeof cmd.x === 'number' && typeof cmd.y === 'number' &&
                        typeof cmd.radius === 'number' && cmd.radius > 0) {
                        ctx.beginPath();
                        ctx.arc(cmd.x, cmd.y, cmd.radius,
                            typeof cmd.startAngle === 'number' ? cmd.startAngle : 0,
                            typeof cmd.endAngle === 'number' ? cmd.endAngle : Math.PI * 2);
                        ctx.lineWidth = typeof cmd.width === 'number' ? cmd.width : brushSize;
                        ctx.stroke();
                    }
                    break;
            }
        } catch (drawError) {
            console.error('Error drawing shape:', drawError, cmd);
            // Continue with next shape even if one fails
        }

        currentIndex++;

        // Draw next shape after delay
        if (currentIndex < validCommands.length) {
            setTimeout(drawNextShape, delayBetweenShapes);
        } else {
            // All done
            saveState();
            isDrawingInProgress = false;
        }
    }

    // Start drawing animation
    drawNextShape();
}

