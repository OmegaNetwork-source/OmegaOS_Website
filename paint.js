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
    aiChatInput.addEventListener('input', function() {
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
                                simpleCommand = [{"type":"circle","x":700,"y":500,"radius":100,"color":color,"fill":true}];
                            } else {
                                simpleCommand = [{"type":"rectangle","x":600,"y":400,"width":200,"height":200,"color":color,"fill":true}];
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
            switch(cmd.type) {
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

