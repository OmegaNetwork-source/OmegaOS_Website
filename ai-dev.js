// AI Dev Application
let currentWindowId = null;
let currentLanguage = 'html';
let generatedCode = '';
let isFullscreen = false;

// Working game templates - provides complete, functional code instead of broken AI generation
function getSpaceInvadersTemplate() {
    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Space Invaders Game</title>
    <style>
        body {
            margin: 0;
            padding: 20px;
            background: #000;
            color: #fff;
            font-family: Arial, sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        #gameCanvas {
            border: 2px solid #0f0;
            background: #001;
        }
        #score {
            font-size: 24px;
            margin: 10px;
        }
        #instructions {
            margin: 10px;
            text-align: center;
        }
    </style>
</head>
<body>
    <div id="score">Score: 0</div>
    <canvas id="gameCanvas" width="800" height="600"></canvas>
    <div id="instructions">Arrow keys to move, Spacebar to shoot</div>
    
    <script>
        const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');
        const scoreEl = document.getElementById('score');
        
        // Game state
        let gameRunning = false;
        let score = 0;
        
        const player = {
            x: canvas.width / 2 - 20,
            y: canvas.height - 50,
            width: 40,
            height: 40,
            speed: 5
        };
        
        const bullets = [];
        const enemies = [];
        const keys = {};
        
        // Spawn enemies
        function spawnEnemy() {
            enemies.push({
                x: Math.random() * (canvas.width - 30),
                y: -30,
                width: 30,
                height: 30,
                speed: 1 + Math.random() * 2
            });
        }
        
        // Initialize game
        function initGame() {
            gameRunning = true;
            score = 0;
            bullets.length = 0;
            enemies.length = 0;
            
            // Spawn initial enemies
            for (let i = 0; i < 5; i++) {
                setTimeout(() => spawnEnemy(), i * 500);
            }
            
            // Keep spawning enemies
            setInterval(() => {
                if (gameRunning) spawnEnemy();
            }, 2000);
            
            gameLoop();
        }
        
        // Game loop
        function gameLoop() {
            if (!gameRunning) return;
            
            // Update player position
            if (keys[37] || keys[65]) { // Left
                player.x = Math.max(0, player.x - player.speed);
            }
            if (keys[39] || keys[68]) { // Right
                player.x = Math.min(canvas.width - player.width, player.x + player.speed);
            }
            if (keys[38] || keys[87]) { // Up
                player.y = Math.max(0, player.y - player.speed);
            }
            if (keys[40] || keys[83]) { // Down
                player.y = Math.min(canvas.height - player.height, player.y + player.speed);
            }
            
            // Update bullets
            for (let i = bullets.length - 1; i >= 0; i--) {
                bullets[i].y -= bullets[i].speed;
                if (bullets[i].y < 0) {
                    bullets.splice(i, 1);
                }
            }
            
            // Update enemies
            for (let i = enemies.length - 1; i >= 0; i--) {
                enemies[i].y += enemies[i].speed;
                if (enemies[i].y > canvas.height) {
                    enemies.splice(i, 1);
                }
            }
            
            // Check collisions
            checkCollisions();
            
            // Draw everything
            drawGame();
            
            requestAnimationFrame(gameLoop);
        }
        
        // Draw game
        function drawGame() {
            // Clear canvas
            ctx.fillStyle = '#001';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Draw stars background
            ctx.fillStyle = '#fff';
            for (let i = 0; i < 50; i++) {
                ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 2, 2);
            }
            
            // Draw player (rocket emoji)
            ctx.font = '30px Arial';
            ctx.fillText('🚀', player.x, player.y + 30);
            
            // Draw bullets
            ctx.fillStyle = '#ff0';
            for (let bullet of bullets) {
                ctx.fillRect(bullet.x, bullet.y, 5, 10);
            }
            
            // Draw enemies (alien emojis)
            ctx.font = '25px Arial';
            for (let enemy of enemies) {
                ctx.fillText('👾', enemy.x, enemy.y + 25);
            }
            
            // Draw score
            scoreEl.textContent = 'Score: ' + score;
        }
        
        // Check collisions
        function checkCollisions() {
            // Bullets vs Enemies
            for (let i = bullets.length - 1; i >= 0; i--) {
                for (let j = enemies.length - 1; j >= 0; j--) {
                    if (bullets[i].x < enemies[j].x + enemies[j].width &&
                        bullets[i].x + 5 > enemies[j].x &&
                        bullets[i].y < enemies[j].y + enemies[j].height &&
                        bullets[i].y + 10 > enemies[j].y) {
                        // Hit!
                        bullets.splice(i, 1);
                        enemies.splice(j, 1);
                        score += 10;
                        break;
                    }
                }
            }
            
            // Player vs Enemies
            for (let i = enemies.length - 1; i >= 0; i--) {
                if (player.x < enemies[i].x + enemies[i].width &&
                    player.x + player.width > enemies[i].x &&
                    player.y < enemies[i].y + enemies[i].height &&
                    player.y + player.height > enemies[i].y) {
                    // Game over
                    gameOver();
                    return;
                }
            }
        }
        
        // Shoot bullet
        function shoot() {
            bullets.push({
                x: player.x + player.width / 2 - 2.5,
                y: player.y,
                speed: 7
            });
        }
        
        // Game over
        function gameOver() {
            gameRunning = false;
            ctx.fillStyle = 'rgba(0,0,0,0.8)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#f00';
            ctx.font = '48px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 50);
            ctx.fillStyle = '#fff';
            ctx.font = '24px Arial';
            ctx.fillText('Final Score: ' + score, canvas.width / 2, canvas.height / 2 + 20);
            ctx.fillText('Refresh to play again', canvas.width / 2, canvas.height / 2 + 60);
            ctx.textAlign = 'left';
        }
        
        // Event listeners
        document.addEventListener('keydown', (e) => {
            keys[e.keyCode] = true;
            if (e.keyCode === 32) { // Spacebar
                e.preventDefault();
                if (gameRunning) shoot();
            }
        });
        
        document.addEventListener('keyup', (e) => {
            keys[e.keyCode] = false;
        });
        
        // Start game
        initGame();
    </script>
</body>
</html>`;
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

async function initializeApp() {
    // Get window ID
    if (window.electronAPI) {
        const id = await window.electronAPI.getWindowId();
        currentWindowId = id;
    }

    // Setup window controls
    setupWindowControls();

    // Setup event listeners
    setupEventListeners();

    // Check Ollama status
    checkOllamaStatus();
    
    // Load available models
    loadAvailableModels();
    
    // Initialize line count display
    setTimeout(updateLineCount, 100);
}

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
    // Language tabs
    document.querySelectorAll('.lang-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.lang-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentLanguage = tab.dataset.lang;
            updateUIForLanguage();
        });
    });

    // Project type change - update UI
    document.getElementById('projectType').addEventListener('change', () => {
        updateUIForLanguage();
    });

    // Load website template button
    const loadWebsiteTemplateBtn = document.getElementById('loadWebsiteTemplateBtn');
    if (loadWebsiteTemplateBtn) {
        loadWebsiteTemplateBtn.addEventListener('click', loadWebsiteTemplate);
    }

    // Settings toggle
    const settingsToggle = document.getElementById('settingsToggle');
    if (settingsToggle) {
        settingsToggle.addEventListener('click', () => {
            const content = document.getElementById('settingsContent');
            const card = settingsToggle.closest('.sidebar-card');
            if (content && card) {
                const isHidden = content.style.display === 'none';
                content.style.display = isHidden ? 'block' : 'none';
                card.classList.toggle('sidebar-card-collapsed', !isHidden);
            }
        });
    }

    // Generate button
    document.getElementById('generateBtn').addEventListener('click', generateCode);
    

    // Auto-fix button
    document.getElementById('autoFixBtn').addEventListener('click', autoFixCode);

    // Fix with feedback button
    document.getElementById('fixWithFeedbackBtn').addEventListener('click', fixWithFeedback);

    // Audit button
    document.getElementById('auditBtn').addEventListener('click', auditCode);

    // Clear button
    document.getElementById('clearBtn').addEventListener('click', clearAll);
    
    // File menu
    const fileMenuBtn = document.getElementById('fileMenuBtn');
    const fileMenuDropdown = document.getElementById('fileMenuDropdown');
    const fileMenuNew = document.getElementById('fileMenuNew');
    const fileMenuSave = document.getElementById('fileMenuSave');
    const fileMenuSaveAs = document.getElementById('fileMenuSaveAs');
    
    if (fileMenuBtn && fileMenuDropdown) {
        const fileMenuContainer = fileMenuBtn.closest('.file-menu-container');
        
        fileMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            fileMenuDropdown.classList.toggle('show');
        });
        
        document.addEventListener('click', (e) => {
            if (fileMenuContainer && !fileMenuContainer.contains(e.target)) {
                fileMenuDropdown.classList.remove('show');
            }
        });
        
        if (fileMenuNew) {
            fileMenuNew.addEventListener('click', () => {
                fileMenuDropdown.classList.remove('show');
                clearAll();
            });
        }
        
        if (fileMenuSave || fileMenuSaveAs) {
            const saveHandler = async () => {
                fileMenuDropdown.classList.remove('show');
                await saveCode();
            };
            if (fileMenuSave) fileMenuSave.addEventListener('click', saveHandler);
            if (fileMenuSaveAs) fileMenuSaveAs.addEventListener('click', saveHandler);
        }
    }

    // Fullscreen preview button
    document.getElementById('fullscreenPreviewBtn').addEventListener('click', toggleFullscreenPreview);

    // Exit fullscreen button
    document.getElementById('exitFullscreenBtn').addEventListener('click', toggleFullscreenPreview);

    // Copy code button
    document.getElementById('copyCodeBtn').addEventListener('click', copyCode);

    // Save code button
    document.getElementById('saveCodeBtn').addEventListener('click', saveCode);

    // Refresh preview button
    document.getElementById('refreshPreviewBtn').addEventListener('click', refreshPreview);

    // Auto-update preview for HTML and line count
    const codeEditor = document.getElementById('codeEditor');
    codeEditor.addEventListener('input', () => {
        updateLineCount();
        if (currentLanguage === 'html') {
            updatePreview();
        }
    });
}

function updateUIForLanguage() {
    const previewPanel = document.getElementById('previewPanel');
    const codeTitle = document.getElementById('codeTitle');
    const auditBtn = document.getElementById('auditBtn');
    const autoFixBtn = document.getElementById('autoFixBtn');
    const projectType = document.getElementById('projectType').value;
    const gameTemplateSection = document.getElementById('gameTemplateSection');
    const websiteTemplateSection = document.getElementById('websiteTemplateSection');
    
    const feedbackSection = document.getElementById('feedbackSection');
    
    // Show/hide templates card and appropriate template section
    const templatesCard = document.getElementById('templatesCard');
    if (currentLanguage === 'html' && (projectType === 'game' || projectType === 'website')) {
        if (templatesCard) templatesCard.style.display = 'block';
        if (currentLanguage === 'html' && projectType === 'game') {
            if (gameTemplateSection) gameTemplateSection.style.display = 'block';
            if (websiteTemplateSection) websiteTemplateSection.style.display = 'none';
            populateGameTemplates();
        } else if (currentLanguage === 'html' && projectType === 'website') {
            if (gameTemplateSection) gameTemplateSection.style.display = 'none';
            if (websiteTemplateSection) websiteTemplateSection.style.display = 'block';
        }
    } else {
        if (templatesCard) templatesCard.style.display = 'none';
        if (gameTemplateSection) gameTemplateSection.style.display = 'none';
        if (websiteTemplateSection) websiteTemplateSection.style.display = 'none';
    }
    
    if (currentLanguage === 'html') {
        previewPanel.classList.remove('hidden');
        codeTitle.textContent = 'HTML Code';
        auditBtn.style.display = 'block';
        autoFixBtn.style.display = 'block';
        // Show/hide code actions card
        const codeActionsCard = document.getElementById('codeActionsCard');
        if (generatedCode) {
            if (codeActionsCard) codeActionsCard.style.display = 'block';
            if (feedbackSection) feedbackSection.style.display = 'block';
            document.getElementById('fixWithFeedbackBtn').style.display = 'block';
        } else {
            if (codeActionsCard) codeActionsCard.style.display = 'none';
            if (feedbackSection) feedbackSection.style.display = 'none';
            document.getElementById('fixWithFeedbackBtn').style.display = 'none';
        }
    } else if (currentLanguage === 'python') {
        previewPanel.classList.add('hidden');
        codeTitle.textContent = 'Python Code';
        auditBtn.style.display = 'block';
        autoFixBtn.style.display = 'none';
        feedbackSection.style.display = 'none';
    } else if (currentLanguage === 'solidity') {
        previewPanel.classList.add('hidden');
        codeTitle.textContent = 'Solidity Code';
        auditBtn.style.display = 'block';
        autoFixBtn.style.display = 'none';
        feedbackSection.style.display = 'none';
    }
    
    // Clear previous code
    const codeEditor = document.getElementById('codeEditor');
    if (codeEditor) {
        codeEditor.textContent = '';
    }
    generatedCode = '';
    updateLineCount();
}

// Update line count display
function updateLineCount() {
    const codeEditor = document.getElementById('codeEditor');
    const lineCountEl = document.getElementById('lineCount');
    if (!codeEditor || !lineCountEl) return;
    
    const code = codeEditor.textContent || '';
    const lines = code.split('\n').length;
    const chars = code.length;
    
    // Format: "1,234 lines (56,789 chars)"
    const formattedLines = lines.toLocaleString();
    const formattedChars = chars.toLocaleString();
    lineCountEl.textContent = `${formattedLines} line${lines !== 1 ? 's' : ''} (${formattedChars} chars)`;
}

// Populate game templates grid
function populateGameTemplates() {
    const grid = document.getElementById('gameTemplatesGrid');
    if (!grid) return;
    
    // Check if templates are loaded
    if (typeof window.GAME_TEMPLATES === 'undefined') {
        grid.innerHTML = '<div style="color: #888; padding: 10px; grid-column: 1 / -1;">Loading templates...</div>';
        // Retry after a moment
        setTimeout(populateGameTemplates, 100);
        return;
    }
    
    grid.innerHTML = '';
    
    Object.entries(window.GAME_TEMPLATES).forEach(([key, template]) => {
        const card = document.createElement('div');
        card.className = 'game-template-card';
        card.innerHTML = `
            <span class="game-template-emoji">${template.emoji}</span>
            <div class="game-template-name">${template.name}</div>
        `;
        card.addEventListener('click', () => loadGameTemplate(key));
        grid.appendChild(card);
    });
}

// Load a game template
async function loadGameTemplate(templateKey) {
    if (typeof window.GAME_TEMPLATES === 'undefined') {
        alert('Templates not loaded yet. Please wait a moment and try again.');
        return;
    }
    
    const template = window.GAME_TEMPLATES[templateKey];
    if (!template) {
        alert('Template not found');
        return;
    }
    
    const code = template.getTemplate();
    generatedCode = code;
    
    // Display code
    document.getElementById('codeEditor').textContent = code;
    updateLineCount();
    
    // Update preview
    if (currentLanguage === 'html') {
        await updatePreview();
        const feedbackSection = document.getElementById('feedbackSection');
        const fixWithFeedbackBtn = document.getElementById('fixWithFeedbackBtn');
        if (feedbackSection) feedbackSection.style.display = 'block';
        if (fixWithFeedbackBtn) fixWithFeedbackBtn.style.display = 'block';
    }
    
    updateStatusIndicator('ready');
    
    // Clear prompt input
    document.getElementById('promptInput').value = '';
}

// Load website template from URL
async function loadWebsiteTemplate() {
    const urlInput = document.getElementById('websiteTemplateInput');
    const url = urlInput.value.trim();
    
    if (!url) {
        alert('Please enter a website URL first.');
        return;
    }
    
    // Validate URL format
    let validUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        validUrl = 'https://' + url;
    }
    
    try {
        const btn = document.getElementById('loadWebsiteTemplateBtn');
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="8" r="6"/><path d="M8 2 L8 6 L10 8"/></svg> Extracting...';
        
        updateStatusIndicator('loading');
        
        // Use Electron API to fetch the website HTML
        if (!window.electronAPI) {
            throw new Error('Electron API not available');
        }
        
        // Try to fetch via Electron API if available, otherwise use CORS proxy
        let htmlContent;
        if (window.electronAPI.fetchWebsite) {
            const result = await window.electronAPI.fetchWebsite(validUrl);
            if (!result.success) {
                throw new Error(result.error || 'Failed to fetch website');
            }
            htmlContent = result.html;
        } else {
            // Fallback to CORS proxy
            const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(validUrl)}`);
            const data = await response.json();
            
            if (!data.contents) {
                throw new Error('Failed to fetch website content');
            }
            
            htmlContent = data.contents;
        }
        
        // Load the template into the editor
        const codeEditor = document.getElementById('codeEditor');
        codeEditor.textContent = htmlContent;
        generatedCode = htmlContent;
        updateLineCount();
        
        // Update preview if HTML
        if (currentLanguage === 'html') {
            updatePreview();
        }
        
        // Show code actions card
        const codeActionsCard = document.getElementById('codeActionsCard');
        const feedbackSection = document.getElementById('feedbackSection');
        const fixWithFeedbackBtn = document.getElementById('fixWithFeedbackBtn');
        if (codeActionsCard) codeActionsCard.style.display = 'block';
        if (feedbackSection) feedbackSection.style.display = 'block';
        if (fixWithFeedbackBtn) fixWithFeedbackBtn.style.display = 'block';
        
        updateStatusIndicator('ready');
        
        // Show success message
        btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 8 L6 12 L14 4"/></svg> ✓ Loaded!';
        btn.style.backgroundColor = '#10b981';
        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.style.backgroundColor = '';
            btn.disabled = false;
        }, 2000);
        
    } catch (error) {
        console.error('Error fetching website:', error);
        alert(`Failed to extract HTML from website: ${error.message}\n\nNote: This feature requires CORS-enabled access. Some websites may block this.`);
        updateStatusIndicator('error');
        
        const btn = document.getElementById('loadWebsiteTemplateBtn');
        btn.disabled = false;
        btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M8 2 L8 10 M4 6 L8 2 L12 6"/><path d="M2 12 L2 14 L14 14 L14 12"/></svg> Extract & Load HTML';
    }
}

function updateDeploymentInstructions() {
    const deploymentSection = document.getElementById('deploymentSection');
    const instructions = document.getElementById('deploymentInstructions');
    
    let content = '';
    
    switch(currentLanguage) {
        case 'html':
            content = `
                <div class="deployment-step">
                    <strong>1.</strong> Save your HTML file (e.g., <code>index.html</code>)
                </div>
                <div class="deployment-step">
                    <strong>2.</strong> Option A: Open directly in a browser
                </div>
                <div class="deployment-step">
                    <strong>3.</strong> Option B: Deploy to hosting:
                    <ul>
                        <li><strong>GitHub Pages:</strong> Push to GitHub repo, enable Pages in settings</li>
                        <li><strong>Netlify:</strong> Drag & drop your HTML file</li>
                        <li><strong>Vercel:</strong> Import your project</li>
                        <li><strong>Surge.sh:</strong> <code>surge</code> command line tool</li>
                    </ul>
                </div>
            `;
            break;
        case 'python':
            content = `
                <div class="deployment-step">
                    <strong>1.</strong> Download Python from <a href="https://www.python.org/downloads/" target="_blank">python.org</a>
                </div>
                <div class="deployment-step">
                    <strong>2.</strong> Install Python (check "Add to PATH" during installation)
                </div>
                <div class="deployment-step">
                    <strong>3.</strong> Open terminal/command prompt
                </div>
                <div class="deployment-step">
                    <strong>4.</strong> Navigate to your file: <code>cd path/to/your/file</code>
                </div>
                <div class="deployment-step">
                    <strong>5.</strong> Run: <code>python your_file.py</code>
                </div>
                <div class="deployment-step">
                    <strong>6.</strong> For web apps, install Flask/Django: <code>pip install flask</code>
                </div>
            `;
            break;
        case 'solidity':
            content = `
                <div class="deployment-step">
                    <strong>1.</strong> Go to <a href="https://remix.ethereum.org" target="_blank">Remix IDE</a>
                </div>
                <div class="deployment-step">
                    <strong>2.</strong> Create a new file (e.g., <code>Contract.sol</code>)
                </div>
                <div class="deployment-step">
                    <strong>3.</strong> Paste your Solidity code
                </div>
                <div class="deployment-step">
                    <strong>4.</strong> Compile using the Solidity compiler (Ctrl+S or click Compile)
                </div>
                <div class="deployment-step">
                    <strong>5.</strong> Go to "Deploy & Run Transactions" tab
                </div>
                <div class="deployment-step">
                    <strong>6.</strong> Select your environment (Remix VM for testing, or connect wallet for mainnet/testnet)
                </div>
                <div class="deployment-step">
                    <strong>7.</strong> Click "Deploy" button
                </div>
                <div class="deployment-step">
                    <strong>8.</strong> For production: Use Hardhat, Truffle, or Foundry
                </div>
            `;
            break;
    }
    
    instructions.innerHTML = content;
}

async function loadAvailableModels() {
    if (!window.electronAPI) return;
    
    try {
        const modelSelect = document.getElementById('modelSelect');
        const modelStatus = document.getElementById('modelStatus');
        
        // Get recommended models first
        const recommended = await window.electronAPI.aiGetRecommendedModels();
        const recommendedModels = recommended.models || [];
        
        // Get available models
        const response = await window.electronAPI.aiGetModels();
        const availableModels = response.models || [];
        
        // Get current model
        const current = await window.electronAPI.aiGetCurrentModel();
        const currentModel = current.model || 'qwen2.5:1.5b';
        
        // Clear select
        modelSelect.innerHTML = '<option value="auto">Auto (Best for Code)</option>';
        
        // Add recommended models that are available
        const modelMap = {};
        availableModels.forEach(m => {
            const name = m.name || m.model || m;
            modelMap[name] = true;
        });
        
        // Auto-select best code model for AI Dev (deepseek-coder if available)
        const goodCodeModels = recommendedModels.slice(0, 3); // First 3 are best for code
        const hasGoodCodeModel = goodCodeModels.some(m => modelMap[m]);
        
        if (hasGoodCodeModel && currentLanguage === 'html') {
            // Auto-select the best available code model for HTML generation
            for (const model of goodCodeModels) {
                if (modelMap[model]) {
                    await window.electronAPI.aiSetModel(model);
                    modelStatus.textContent = `Using: ${model} (Best for code)`;
                    break;
                }
            }
        }
        
        let foundRecommended = false;
        for (const model of recommendedModels) {
            if (modelMap[model]) {
                const option = document.createElement('option');
                option.value = model;
                option.textContent = model + (model === currentModel ? ' (Current)' : '');
                if (model === currentModel) {
                    option.selected = true;
                }
                modelSelect.appendChild(option);
                foundRecommended = true;
            }
        }
        
        // Add other available models
        availableModels.forEach(m => {
            const name = m.name || m.model || m;
            if (!recommendedModels.includes(name)) {
                const option = document.createElement('option');
                option.value = name;
                option.textContent = name + (name === currentModel ? ' (Current)' : '');
                if (name === currentModel) {
                    option.selected = true;
                }
                modelSelect.appendChild(option);
            }
        });
        
        if (availableModels.length === 0) {
            modelStatus.textContent = 'No models found. Install models in Ollama.';
        } else {
            modelStatus.textContent = `${availableModels.length} model(s) available`;
        }
        
        // Auto-select best code model for AI Dev when HTML is selected
        if (currentLanguage === 'html') {
            const codeModels = recommendedModels.slice(0, 3); // Best code models
            for (const model of codeModels) {
                if (modelMap[model]) {
                    await window.electronAPI.aiSetModel(model);
                    modelStatus.textContent = `Using: ${model} (Best for code)`;
                    // Update select to show selected model
                    modelSelect.value = model;
                    break;
                }
            }
        }
        
        // Add change listener
        modelSelect.addEventListener('change', async (e) => {
            const selectedModel = e.target.value;
            if (selectedModel === 'auto') {
                // Auto-select best available code model for AI Dev
                const codeModels = recommendedModels.slice(0, 3); // Best code models
                let selected = false;
                for (const model of codeModels) {
                    if (modelMap[model]) {
                        await window.electronAPI.aiSetModel(model);
                        modelStatus.textContent = `Using: ${model} (Best for code)`;
                        selected = true;
                        break;
                    }
                }
                if (!selected) {
                    // Fallback to default
                    await window.electronAPI.aiSetModel('qwen2.5:1.5b');
                    modelStatus.textContent = `Using: qwen2.5:1.5b (Default)`;
                }
            } else {
                await window.electronAPI.aiSetModel(selectedModel);
                modelStatus.textContent = `Using: ${selectedModel}`;
            }
        });
        
    } catch (error) {
        console.error('Error loading models:', error);
        document.getElementById('modelStatus').textContent = 'Error loading models';
    }
}

async function downloadModel(modelName) {
    if (!window.electronAPI) return false;
    
    try {
        const modelStatus = document.getElementById('modelStatus');
        modelStatus.textContent = `Starting download of ${modelName}...`;
        
        // Start pull via IPC
        const result = await window.electronAPI.aiPullModel(modelName);
        if (!result.success) {
            throw new Error(result.error || 'Failed to start download');
        }
        
        // Poll for completion
        let attempts = 0;
        const maxAttempts = 120; // 10 minutes max (5s intervals)
        
        while (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            const modelsResponse = await window.electronAPI.aiGetModels();
            const models = modelsResponse.models || [];
            const modelExists = models.some(m => {
                const name = m.name || m.model || m;
                return name === modelName;
            });
            
            if (modelExists) {
                modelStatus.textContent = `Model downloaded! Using: ${modelName}`;
                await window.electronAPI.aiSetModel(modelName);
                return true;
            }
            
            attempts++;
            const progress = Math.min(100, (attempts / maxAttempts) * 100);
            modelStatus.textContent = `Downloading ${modelName}... ${Math.round(progress)}%`;
        }
        
        throw new Error('Download timeout');
    } catch (error) {
        console.error('Model download error:', error);
        document.getElementById('modelStatus').textContent = `Download failed: ${error.message}`;
        return false;
    }
}

async function checkOllamaStatus() {
    if (!window.electronAPI) return;
    
    try {
        const status = await window.electronAPI.aiCheckReady();
        updateStatusIndicator(status.ready ? 'ready' : 'error');
    } catch (error) {
        updateStatusIndicator('error');
    }
}

function updateStatusIndicator(status) {
    const statusEl = document.getElementById('statusIndicator');
    statusEl.className = `status-indicator ${status}`;
    
    const statusText = statusEl.querySelector('span');
    switch(status) {
        case 'ready':
            statusText.textContent = 'Ready';
            break;
        case 'loading':
            statusText.textContent = 'Generating...';
            break;
        case 'error':
            statusText.textContent = 'Ollama not available';
            break;
    }
}

async function generateCode() {
    const promptInput = document.getElementById('promptInput');
    const prompt = promptInput.value.trim();
    
    if (!prompt) {
        alert('Please enter a prompt describing what you want to build.');
        return;
    }

    const projectType = document.getElementById('projectType').value;
    
    // Check if there's existing code in the editor (from template or previous generation)
    const codeEditor = document.getElementById('codeEditor');
    const existingCode = codeEditor.textContent.trim();
    const hasExistingCode = existingCode && existingCode.length > 100; // Only consider substantial code
    
    // Use AI generation (templates are now selected via UI)
    // If there's existing code, we'll modify it instead of replacing it
    const fullPrompt = buildPrompt(prompt, currentLanguage, projectType, hasExistingCode ? existingCode : null);

    // Show loading
    showLoading(true);
    updateStatusIndicator('loading');
    document.getElementById('generateBtn').disabled = true;

    try {
        if (!window.electronAPI) {
            throw new Error('Electron API not available');
        }

        // Use AI chat to generate code
        const response = await window.electronAPI.aiChat(fullPrompt, []);
        
        if (response.success) {
            code = extractCode(response.response);
            
            // Check if code is incomplete and auto-fix if needed
            if (currentLanguage === 'html' && !isCodeComplete(code)) {
                // Show message and auto-trigger fix
                const loadingText = document.querySelector('.loading-text');
                if (loadingText) loadingText.textContent = 'Code appears incomplete, auto-fixing...';
                
                // Auto-fix the incomplete code (will retry until complete)
                const fixedCode = await autoFixIncompleteCode(code);
                if (fixedCode && isCodeComplete(fixedCode)) {
                    code = fixedCode;
                } else if (fixedCode) {
                    // Still incomplete, but use it anyway
                    code = fixedCode;
                    console.warn('Code still incomplete after auto-fix attempts');
                }
            }
            
    generatedCode = code;
    
    // Display code
    const codeEditor = document.getElementById('codeEditor');
    codeEditor.textContent = code;
    updateLineCount();
            updateLineCount();
            
            // Update preview if HTML
            if (currentLanguage === 'html') {
                await updatePreview();
                // Show feedback section after successful generation
                const feedbackSection = document.getElementById('feedbackSection');
                const fixWithFeedbackBtn = document.getElementById('fixWithFeedbackBtn');
                if (feedbackSection) feedbackSection.style.display = 'block';
                if (fixWithFeedbackBtn) fixWithFeedbackBtn.style.display = 'block';
            }
            
            updateStatusIndicator('ready');
        } else {
            throw new Error(response.error || 'Failed to generate code');
        }
    } catch (error) {
        console.error('Code generation error:', error);
        alert(`Error generating code: ${error.message}`);
        updateStatusIndicator('error');
    } finally {
        showLoading(false);
        document.getElementById('generateBtn').disabled = false;
    }
}

function buildPrompt(userPrompt, language, projectType, existingCode = null) {
    // If there's existing code, modify it instead of generating new code
    if (existingCode) {
        let prompt = `You are modifying existing ${language.toUpperCase()} code. The user wants: "${userPrompt}"\n\n`;
        prompt += `IMPORTANT: You must PRESERVE all existing functionality and only make the specific change requested.\n`;
        prompt += `Do NOT rewrite the entire code. Only modify what needs to be changed.\n\n`;
        prompt += `Here is the existing code:\n\n\`\`\`${language}\n${existingCode}\n\`\`\`\n\n`;
        prompt += `Now modify ONLY the parts needed to: "${userPrompt}"\n`;
        prompt += `Return the COMPLETE modified code (not just the changes). Keep all existing features working.\n`;
        return prompt;
    }
    
    // Build a clear, focused prompt - less repetition, more direct
    let prompt = `Generate a complete, working ${language.toUpperCase()} ${projectType} based on: "${userPrompt}"\n\n`;
    
    if (language === 'html' && projectType === 'game') {
        // Very explicit prompt - no placeholders allowed
        prompt += `Create a COMPLETE, WORKING HTML5 game. CRITICAL: Every function must be FULLY IMPLEMENTED with actual code, not comments or placeholders.

EXAMPLE STRUCTURE (you must implement ALL of this):
<!DOCTYPE html>
<html>
<head>
<style>
/* Complete CSS styling */
</style>
</head>
<body>
<canvas id="gameCanvas" width="800" height="600"></canvas>
<script>
// ALL VARIABLES INITIALIZED
var canvas = document.getElementById('gameCanvas');
var ctx = canvas.getContext('2d');
var player = {x: 400, y: 550, width: 40, height: 40, speed: 5};
var bullets = [];
var enemies = [];
var score = 0;
var gameRunning = false;
var keys = {};

// ENEMY SPAWNING - MUST BE IMPLEMENTED
function spawnEnemy() {
    enemies.push({
        x: Math.random() * (canvas.width - 30),
        y: -30,
        width: 30,
        height: 30,
        speed: 2 + Math.random() * 2
    });
}

// INITIALIZE ENEMIES - MUST CREATE ENEMIES
function initGame() {
    enemies = [];
    bullets = [];
    score = 0;
    gameRunning = true;
    // Spawn initial enemies
    for (var i = 0; i < 5; i++) {
        setTimeout(() => spawnEnemy(), i * 500);
    }
    // Keep spawning enemies
    setInterval(spawnEnemy, 2000);
    gameLoop();
}

// GAME LOOP - MUST UPDATE EVERYTHING
function gameLoop() {
    if (!gameRunning) return;
    
    // Update player position based on keys
    if (keys[37] || keys[65]) player.x = Math.max(0, player.x - player.speed);
    if (keys[39] || keys[68]) player.x = Math.min(canvas.width - player.width, player.x + player.speed);
    
    // Update bullets
    for (var i = bullets.length - 1; i >= 0; i--) {
        bullets[i].y -= bullets[i].speed;
        if (bullets[i].y < 0) bullets.splice(i, 1);
    }
    
    // Update enemies
    for (var i = enemies.length - 1; i >= 0; i--) {
        enemies[i].y += enemies[i].speed;
        if (enemies[i].y > canvas.height) enemies.splice(i, 1);
    }
    
    // Check collisions
    checkCollisions();
    
    // Draw everything
    drawGame();
    
    requestAnimationFrame(gameLoop);
}

// DRAW FUNCTION - MUST DRAW EVERYTHING
function drawGame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw player (use emoji or shape)
    ctx.fillStyle = '#00f';
    ctx.fillRect(player.x, player.y, player.width, player.height);
    ctx.fillText('🚀', player.x + 10, player.y + 25);
    
    // Draw bullets
    ctx.fillStyle = '#f00';
    for (var i = 0; i < bullets.length; i++) {
        ctx.fillRect(bullets[i].x, bullets[i].y, 5, 10);
    }
    
    // Draw enemies (use emojis)
    for (var i = 0; i < enemies.length; i++) {
        ctx.fillStyle = '#0f0';
        ctx.fillRect(enemies[i].x, enemies[i].y, enemies[i].width, enemies[i].height);
        ctx.fillText('👾', enemies[i].x + 5, enemies[i].y + 20);
    }
    
    // Draw score
    ctx.fillStyle = '#fff';
    ctx.font = '20px Arial';
    ctx.fillText('Score: ' + score, 10, 30);
}

// COLLISION DETECTION - MUST BE FULLY IMPLEMENTED
function checkCollisions() {
    // Bullets vs Enemies
    for (var i = bullets.length - 1; i >= 0; i--) {
        for (var j = enemies.length - 1; j >= 0; j--) {
            if (bullets[i].x < enemies[j].x + enemies[j].width &&
                bullets[i].x + 5 > enemies[j].x &&
                bullets[i].y < enemies[j].y + enemies[j].height &&
                bullets[i].y + 10 > enemies[j].y) {
                // Collision!
                bullets.splice(i, 1);
                enemies.splice(j, 1);
                score += 10;
                break;
            }
        }
    }
    
    // Player vs Enemies
    for (var i = enemies.length - 1; i >= 0; i--) {
        if (player.x < enemies[i].x + enemies[i].width &&
            player.x + player.width > enemies[i].x &&
            player.y < enemies[i].y + enemies[i].height &&
            player.y + player.height > enemies[i].y) {
            // Game over
            gameRunning = false;
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#fff';
            ctx.font = '40px Arial';
            ctx.fillText('GAME OVER', 250, 250);
            ctx.fillText('Score: ' + score, 300, 300);
            return;
        }
    }
}

// SHOOT FUNCTION - MUST CREATE BULLETS FROM PLAYER
function shoot() {
    bullets.push({
        x: player.x + player.width / 2 - 2.5,
        y: player.y,
        speed: 7
    });
}

// EVENT LISTENERS - MUST BE SET UP
document.addEventListener('keydown', function(e) {
    keys[e.keyCode] = true;
    if (e.keyCode === 32) { // Spacebar
        e.preventDefault();
        shoot();
    }
});

document.addEventListener('keyup', function(e) {
    keys[e.keyCode] = false;
});

// START GAME
initGame();
</script>
</body>
</html>

ABSOLUTE REQUIREMENTS:
1. EVERY function must have REAL code, not "// implement here" or "// TODO"
2. Enemies MUST spawn (use setInterval or setTimeout)
3. Collision detection MUST check actual rectangle overlaps
4. Shooting MUST create bullets from player position
5. Game loop MUST update positions every frame
6. Score MUST increase when enemies are hit
7. Game over MUST trigger when player collides with enemy
8. Use emojis (🚀👾💥⭐) as visual elements
9. Code must be 300+ lines minimum for a complete game
10. NO placeholder functions, NO empty implementations

Generate the COMPLETE game code following this structure. Every function must be fully written out with working logic.\n\n`;
    } else if (language === 'html' && projectType !== 'game') {
        // Website prompt - concise and focused
        prompt += `Create a complete, standalone HTML page with:
- Modern design (gradients, shadows, animations)
- Inline CSS in <style> tag
- Inline JavaScript in <script> tag if needed
- Use emojis for visual elements (no external images)
- Responsive layout
- All content from user request

Generate complete HTML from <!DOCTYPE html> to </html>. No markdown, just code.`;
    } else if (language === 'python') {
        prompt += `Requirements:
- Generate complete, runnable Python code
- Include all necessary imports
- Add comments for clarity
- Handle edge cases appropriately
- Make the code clean and well-structured

Generate ONLY the Python code, no explanations or markdown formatting.`;
    } else if (language === 'solidity') {
        prompt += `Requirements:
- Generate complete, working Solidity smart contract code
- Include SPDX license identifier (e.g., // SPDX-License-Identifier: MIT)
- Use appropriate Solidity version pragma
- Include all necessary functions and events
- Follow Solidity best practices and security patterns
- Add comments for clarity

Generate ONLY the Solidity code, no explanations or markdown formatting. Start with pragma and license.`;
    }
    
    return prompt;
}

function extractCode(response) {
    let code = response.trim();
    
    // Try to extract from markdown code blocks first (most reliable)
    const codeBlockRegex = /```(?:html|python|javascript|css|solidity)?\s*\n?([\s\S]*?)```/;
    const match = code.match(codeBlockRegex);
    
    if (match && match[1]) {
        code = match[1].trim();
    } else {
        // If no code block found, try to extract HTML directly
        if (currentLanguage === 'html') {
            // Look for complete HTML document (use greedy matching to get full document)
            const htmlDocMatch = code.match(/<!DOCTYPE\s+html[\s\S]*<\/html>/i);
            if (htmlDocMatch) {
                code = htmlDocMatch[0].trim();
            } else {
                // Look for HTML tag structure (greedy to get full structure)
                const htmlTagMatch = code.match(/<html[\s\S]*<\/html>/i);
                if (htmlTagMatch) {
                    code = htmlTagMatch[0].trim();
                } else if (code.includes('<!DOCTYPE') || code.includes('<html')) {
                    // Find start of HTML and take everything from there
                    const startIdx = Math.max(
                        code.indexOf('<!DOCTYPE'),
                        code.indexOf('<html')
                    );
                    if (startIdx >= 0) {
                        code = code.substring(startIdx).trim();
                    }
                }
            }
        } else if (currentLanguage === 'solidity' && code.includes('pragma')) {
            const solidityMatch = code.match(/pragma[\s\S]*?\}/);
            if (solidityMatch) {
                code = solidityMatch[0].trim();
            }
        }
    }
    
    // Final cleanup - remove any remaining markdown markers at start/end only
    code = code.replace(/^```[a-z]*\s*\n?/m, '').replace(/```\s*$/m, '').trim();
    
    return code;
}

async function updatePreview() {
    const codeEditor = document.getElementById('codeEditor');
    const previewFrame = document.getElementById('previewFrame');
    const fullscreenFrame = document.getElementById('fullscreenPreviewFrame');
    
    let htmlCode = codeEditor.textContent || generatedCode;
    
    if (!htmlCode || htmlCode.trim().length === 0) {
        return;
    }
    
    // Clean up the code - remove any markdown artifacts
    htmlCode = htmlCode.trim();
    
    // Remove markdown code block markers if present
    htmlCode = htmlCode.replace(/^```(?:html)?\s*\n?/gm, '').replace(/```\s*$/gm, '').trim();
    
    // Ensure we have valid HTML
    if (!htmlCode.includes('<!DOCTYPE') && !htmlCode.includes('<html')) {
        // Try to find HTML content
        const htmlStart = htmlCode.indexOf('<');
        if (htmlStart > 0) {
            htmlCode = htmlCode.substring(htmlStart);
        }
    }
    
    try {
        // Process HTML to fix image URLs and external resources
        const processedHtml = await processHtmlForPreview(htmlCode);
        
        // Update regular preview
        try {
            const iframeDoc = previewFrame.contentDocument || previewFrame.contentWindow.document;
            if (iframeDoc) {
                iframeDoc.open();
                iframeDoc.write(processedHtml);
                iframeDoc.close();
            }
        } catch (e) {
            console.error('Error writing to preview frame:', e);
            // Try alternative method
            previewFrame.srcdoc = processedHtml;
        }
        
        // Update fullscreen preview if open
        if (isFullscreen) {
            try {
                const fullscreenDoc = fullscreenFrame.contentDocument || fullscreenFrame.contentWindow.document;
                if (fullscreenDoc) {
                    fullscreenDoc.open();
                    fullscreenDoc.write(processedHtml);
                    fullscreenDoc.close();
                }
            } catch (e) {
                console.error('Error writing to fullscreen frame:', e);
                fullscreenFrame.srcdoc = processedHtml;
            }
        }
    } catch (error) {
        console.error('Preview update error:', error);
        // Fallback: try using srcdoc
        try {
            previewFrame.srcdoc = htmlCode;
            if (isFullscreen) {
                fullscreenFrame.srcdoc = htmlCode;
            }
        } catch (e) {
            console.error('Fallback preview error:', e);
        }
    }
}

async function processHtmlForPreview(htmlCode) {
    // Create a temporary DOM to parse HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlCode, 'text/html');
    
    // Process all images
    const images = Array.from(doc.querySelectorAll('img'));
    const imagePromises = images.map(async (img) => {
        const src = img.getAttribute('src');
        if (src && !src.startsWith('data:') && !src.startsWith('blob:') && !src.startsWith('http://localhost') && !src.startsWith('https://localhost')) {
            try {
                // Try to fetch and convert to data URI
                const response = await fetch(src, { mode: 'cors' }).catch(() => null);
                if (response && response.ok) {
                    const blob = await response.blob();
                    const reader = new FileReader();
                    return new Promise((resolve) => {
                        reader.onload = () => {
                            img.src = reader.result;
                            resolve();
                        };
                        reader.onerror = () => {
                            // Use placeholder on error
                            img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2VlZSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZSBub3QgYXZhaWxhYmxlPC90ZXh0Pjwvc3ZnPg==';
                            resolve();
                        };
                        reader.readAsDataURL(blob);
                    });
                } else {
                    // If fetch fails, use a placeholder
                    img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2VlZSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZSBub3QgYXZhaWxhYmxlPC90ZXh0Pjwvc3ZnPg==';
                }
            } catch (error) {
                console.warn('Failed to load image:', src, error);
                // Use placeholder on error
                img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2VlZSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZSBub3QgYXZhaWxhYmxlPC90ZXh0Pjwvc3ZnPg==';
            }
        }
    });
    
    // Wait for all images to process
    await Promise.all(imagePromises);
    
    // Note: CSS background images are harder to process async, so we'll leave them as-is
    // The iframe sandbox should handle most cases
    
    return doc.documentElement.outerHTML;
}

function refreshPreview() {
    updatePreview();
}

function copyCode() {
    const code = document.getElementById('codeEditor').textContent || generatedCode;
    
    if (!code) {
        alert('No code to copy.');
        return;
    }
    
    navigator.clipboard.writeText(code).then(() => {
        // Show feedback
        const btn = document.getElementById('copyCodeBtn');
        const originalHTML = btn.innerHTML;
        btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M13 4 L6 4 L6 13 L13 13 Z"/></svg>';
        setTimeout(() => {
            btn.innerHTML = originalHTML;
        }, 1000);
    }).catch(err => {
        alert('Failed to copy code: ' + err.message);
    });
}

async function saveCode() {
    const code = document.getElementById('codeEditor').textContent || generatedCode;
    
    if (!code) {
        alert('No code to save.');
        return;
    }
    
    if (!window.electronAPI) {
        alert('Save functionality requires Electron API.');
        return;
    }
    
    try {
        let extension = '.txt';
        let fileType = 'All Files';
        
        if (currentLanguage === 'html') {
            extension = '.html';
            fileType = 'HTML Files';
        } else if (currentLanguage === 'python') {
            extension = '.py';
            fileType = 'Python Files';
        } else if (currentLanguage === 'solidity') {
            extension = '.sol';
            fileType = 'Solidity Files';
        }
        
        const defaultName = `ai-generated-${Date.now()}${extension}`;
        
        const result = await window.electronAPI.saveFileDialog({
            defaultPath: defaultName,
            filters: [
                { name: fileType, extensions: [extension.substring(1)] },
                { name: 'All Files', extensions: ['*'] }
            ]
        });
        
        if (!result.canceled && result.filePath) {
            await window.electronAPI.writeFile(result.filePath, code);
            alert('Code saved successfully!');
        }
    } catch (error) {
        alert('Failed to save code: ' + error.message);
    }
}

async function auditCode() {
    const code = document.getElementById('codeEditor').textContent || generatedCode;
    
    if (!code) {
        alert('No code to audit. Please generate or enter code first.');
        return;
    }

    // Show loading
    showLoading(true);
    updateStatusIndicator('loading');
    document.getElementById('auditBtn').disabled = true;

    try {
        if (!window.electronAPI) {
            throw new Error('Electron API not available');
        }

        let auditPrompt = '';
        
        if (currentLanguage === 'html') {
            auditPrompt = `Review the following HTML code and provide a detailed audit. Check for:
1. Security vulnerabilities (XSS, injection risks)
2. Accessibility issues (ARIA labels, semantic HTML)
3. Performance (unused CSS/JS, large images)
4. Best practices (valid HTML5, responsive design)
5. Browser compatibility issues
6. Code quality and maintainability

Provide specific issues found and how to fix them. Be detailed and actionable.

HTML Code:
\`\`\`html
${code}
\`\`\`

Audit Report:`;
        } else if (currentLanguage === 'python') {
            auditPrompt = `Review the following Python code and provide a detailed audit. Check for:
1. Security vulnerabilities (injection, unsafe eval, file operations)
2. Error handling and edge cases
3. Code quality (PEP 8, naming conventions)
4. Performance issues (inefficient algorithms, memory leaks)
5. Best practices (type hints, documentation)
6. Potential bugs and logic errors

Provide specific issues found and how to fix them. Be detailed and actionable.

Python Code:
\`\`\`python
${code}
\`\`\`

Audit Report:`;
        } else if (currentLanguage === 'solidity') {
            auditPrompt = `Review the following Solidity smart contract code and provide a detailed audit. Check for:
1. Security vulnerabilities (reentrancy, overflow, access control)
2. Gas optimization opportunities
3. Best practices (checks-effects-interactions pattern)
4. Common Solidity pitfalls (unchecked external calls, timestamp dependence)
5. Code quality and documentation
6. Compliance with ERC standards if applicable

Provide specific issues found and how to fix them. Be detailed and actionable. Include severity levels (Critical, High, Medium, Low).

Solidity Code:
\`\`\`solidity
${code}
\`\`\`

Audit Report:`;
        }

        const response = await window.electronAPI.aiChat(auditPrompt, []);
        
        if (response.success) {
            // Display audit results in a new section or modal
            showAuditResults(response.response);
            updateStatusIndicator('ready');
        } else {
            throw new Error(response.error || 'Failed to audit code');
        }
    } catch (error) {
        console.error('Code audit error:', error);
        alert(`Error auditing code: ${error.message}`);
        updateStatusIndicator('error');
    } finally {
        showLoading(false);
        document.getElementById('auditBtn').disabled = false;
    }
}

function showAuditResults(auditText) {
    // Create or update audit results section
    let auditSection = document.getElementById('auditResults');
    if (!auditSection) {
        auditSection = document.createElement('div');
        auditSection.id = 'auditResults';
        auditSection.className = 'audit-results';
        auditSection.innerHTML = `
            <div class="audit-header">
                <h3>Code Audit Results</h3>
                <button id="closeAuditBtn" class="icon-btn">×</button>
            </div>
            <div class="audit-content" id="auditContent"></div>
        `;
        document.body.appendChild(auditSection);
        
        document.getElementById('closeAuditBtn').addEventListener('click', () => {
            auditSection.style.display = 'none';
        });
    }
    
    document.getElementById('auditContent').textContent = auditText;
    auditSection.style.display = 'block';
}

function toggleFullscreenPreview() {
    const fullscreenModal = document.getElementById('fullscreenPreview');
    const previewFrame = document.getElementById('previewFrame');
    const fullscreenFrame = document.getElementById('fullscreenPreviewFrame');
    
    if (!isFullscreen) {
        // Enter fullscreen
        isFullscreen = true;
        fullscreenModal.style.display = 'flex';
        
        // Copy current preview content to fullscreen
        const htmlCode = document.getElementById('codeEditor').textContent || generatedCode;
        if (htmlCode && currentLanguage === 'html') {
            processHtmlForPreview(htmlCode).then(processedHtml => {
                const fullscreenDoc = fullscreenFrame.contentDocument || fullscreenFrame.contentWindow.document;
                fullscreenDoc.open();
                fullscreenDoc.write(processedHtml);
                fullscreenDoc.close();
            });
        }
    } else {
        // Exit fullscreen
        isFullscreen = false;
        fullscreenModal.style.display = 'none';
    }
}

function clearAll() {
    if (confirm('Clear all code and prompt?')) {
        document.getElementById('promptInput').value = '';
        const codeEditor = document.getElementById('codeEditor');
        if (codeEditor) {
            codeEditor.textContent = '';
        }
        generatedCode = '';
        updateLineCount();
        
        if (currentLanguage === 'html') {
            const previewFrame = document.getElementById('previewFrame');
            try {
                const iframeDoc = previewFrame.contentDocument || previewFrame.contentWindow.document;
                iframeDoc.open();
                iframeDoc.write('');
                iframeDoc.close();
            } catch (e) {}
        }
    }
}

function isCodeComplete(code) {
    if (!code || code.trim().length === 0) return false;
    
    // Must have <!DOCTYPE html> or <html>
    if (!code.includes('<!DOCTYPE') && !code.includes('<html')) return false;
    
    // Must end with </html>
    const trimmed = code.trim();
    if (!trimmed.endsWith('</html>')) return false;
    
    // Check for balanced HTML tags
    const openHtml = (code.match(/<html/gi) || []).length;
    const closeHtml = (code.match(/<\/html>/gi) || []).length;
    if (openHtml !== closeHtml) return false;
    
    // Check for balanced style tags
    if (code.includes('<style')) {
        const openStyle = (code.match(/<style/gi) || []).length;
        const closeStyle = (code.match(/<\/style>/gi) || []).length;
        if (openStyle !== closeStyle) return false;
    }
    
    // Check for balanced script tags
    if (code.includes('<script')) {
        const openScript = (code.match(/<script/gi) || []).length;
        const closeScript = (code.match(/<\/script>/gi) || []).length;
        if (openScript !== closeScript) return false;
    }
    
    // Check for balanced braces in CSS/JS
    const openBraces = (code.match(/{/g) || []).length;
    const closeBraces = (code.match(/}/g) || []).length;
    if (openBraces !== closeBraces) return false;
    
    // Check for balanced brackets
    const openBrackets = (code.match(/\[/g) || []).length;
    const closeBrackets = (code.match(/\]/g) || []).length;
    if (openBrackets !== closeBrackets) return false;
    
    // Check for balanced parentheses
    const openParens = (code.match(/\(/g) || []).length;
    const closeParens = (code.match(/\)/g) || []).length;
    if (openParens !== closeParens) return false;
    
    // Must have </head> and </body>
    if (code.includes('<head') && !code.includes('</head>')) return false;
    if (code.includes('<body') && !code.includes('</body>')) return false;
    
    // Check for placeholder functions (common patterns that indicate incomplete code)
    const placeholderPatterns = [
        /\/\/\s*(implement|todo|here|placeholder)/i,
        /\/\/\s*Implement.*logic/i,
        /function\s+\w+\s*\([^)]*\)\s*\{\s*\/\/.*\}/,
        /function\s+\w+\s*\([^)]*\)\s*\{\s*\}/,
        /\/\/\s*Add.*here/i,
        /\/\/\s*Create.*here/i
    ];
    
    for (const pattern of placeholderPatterns) {
        if (pattern.test(code)) {
            console.warn('Found placeholder pattern:', pattern);
            return false; // Code has placeholders
        }
    }
    
    // For games, check that key functions have actual implementation
    if (code.includes('game') || code.includes('Game') || code.includes('canvas')) {
        // Check for empty function bodies
        const emptyFunctions = code.match(/function\s+\w+\s*\([^)]*\)\s*\{\s*\}/g);
        if (emptyFunctions && emptyFunctions.length > 0) {
            console.warn('Found empty functions:', emptyFunctions);
            return false;
        }
        
        // Check that critical game functions exist and have content
        const criticalFunctions = ['updateGame', 'drawGame', 'checkCollisions', 'initGame', 'gameLoop'];
        for (const funcName of criticalFunctions) {
            const funcRegex = new RegExp(`function\\s+${funcName}\\s*\\([^)]*\\)\\s*\\{`, 'i');
            if (funcRegex.test(code)) {
                // Function exists, check if it has minimal content (more than just comments)
                const funcMatch = code.match(new RegExp(`function\\s+${funcName}\\s*\\([^)]*\\)\\s*\\{([^}]+)\\}`, 'i'));
                if (funcMatch) {
                    const funcBody = funcMatch[1];
                    // Check if body is mostly comments or empty
                    const nonCommentLines = funcBody.split('\n').filter(line => {
                        const trimmed = line.trim();
                        return trimmed && !trimmed.startsWith('//') && !trimmed.startsWith('/*');
                    });
                    if (nonCommentLines.length < 2) {
                        console.warn(`Function ${funcName} appears to be mostly empty`);
                        return false;
                    }
                }
            }
        }
    }
    
    return true;
}

function manuallyCompleteCode(incompleteCode) {
    // Try to manually complete common incomplete patterns
    let code = incompleteCode.trim();
    
    // If it ends with incomplete CSS, try to close it
    if (code.endsWith(':') || code.endsWith('{')) {
        // Find the last incomplete CSS rule and close it
        const lastOpenBrace = code.lastIndexOf('{');
        const lastCloseBrace = code.lastIndexOf('}');
        
        if (lastOpenBrace > lastCloseBrace) {
            // We have an unclosed brace
            if (code.endsWith(':')) {
                code += ' 0;'; // Complete the property
            }
            if (code.endsWith('{') || !code.substring(lastOpenBrace).includes('}')) {
                code += '\n}'; // Close the CSS rule
            }
        }
    }
    
    // Add missing closing tags
    if (code.includes('<style') && !code.includes('</style>')) {
        code += '\n</style>';
    }
    
    if (code.includes('<head') && !code.includes('</head>')) {
        code += '\n</head>';
    }
    
    if (code.includes('<body') && !code.includes('</body>')) {
        code += '\n</body>';
    }
    
    if (!code.endsWith('</html>')) {
        if (code.includes('<html') && !code.includes('</html>')) {
            code += '\n</html>';
        }
    }
    
    return code;
}

async function autoFixIncompleteCode(incompleteCode) {
    // Quick fix function for incomplete code during generation
    if (!window.electronAPI) {
        // Fallback: try manual completion
        return manuallyCompleteCode(incompleteCode);
    }
    
    const projectType = document.getElementById('projectType').value;
    const userPrompt = document.getElementById('promptInput').value.trim();
    
    // First, try manual completion
    let currentCode = manuallyCompleteCode(incompleteCode);
    if (isCodeComplete(currentCode)) {
        return currentCode;
    }
    
    let attempts = 0;
    const maxAttempts = 5; // Increased attempts
    
    while (attempts < maxAttempts && !isCodeComplete(currentCode)) {
        attempts++;
        
        // Create a more focused prompt - ask to continue from where it left off
        const fixPrompt = `The HTML code below is INCOMPLETE - it was cut off. You MUST complete it by adding the missing parts.

ORIGINAL REQUEST: "${userPrompt}"
PROJECT TYPE: ${projectType}

INCOMPLETE CODE (ends abruptly):
\`\`\`html
${currentCode}
\`\`\`

TASK: Complete this code by:
1. Finishing any incomplete CSS rules (add missing properties and closing braces)
2. Adding ALL missing closing tags: </style>, </head>, </body>, </html>
3. If it's a game, add the game board HTML, JavaScript for gameplay, and make it playable
4. Ensure the code is a complete, working HTML document

Generate the COMPLETE code starting from <!DOCTYPE html> and ending with </html>. Include everything needed to make it work. No explanations - just the complete HTML code.`;

        try {
            const response = await window.electronAPI.aiChat(fixPrompt, []);
            if (response.success) {
                const fixedCode = extractCode(response.response);
                
                // Validate it's actually complete
                if (isCodeComplete(fixedCode)) {
                    return fixedCode;
                } else {
                    // Try manual completion on the fixed code
                    const manuallyFixed = manuallyCompleteCode(fixedCode);
                    if (isCodeComplete(manuallyFixed)) {
                        return manuallyFixed;
                    }
                    currentCode = fixedCode; // Try again with this version
                }
            }
        } catch (e) {
            console.error('Auto-fix incomplete code error:', e);
            // Try manual completion as fallback
            const manual = manuallyCompleteCode(currentCode);
            if (isCodeComplete(manual)) {
                return manual;
            }
        }
    }
    
    // Final attempt: manual completion
    const finalManual = manuallyCompleteCode(currentCode);
    return finalManual;
}

async function autoFixCode() {
    const code = document.getElementById('codeEditor').textContent || generatedCode;
    
    if (!code) {
        alert('No code to fix. Please generate code first.');
        return;
    }

    if (currentLanguage !== 'html') {
        alert('Auto-fix is currently only available for HTML.');
        return;
    }

    // Show loading
    showLoading(true);
    updateStatusIndicator('loading');
    document.getElementById('autoFixBtn').disabled = true;
    const loadingText = document.querySelector('.loading-text');
    
    let iteration = 1;
    const maxIterations = 3;
    let currentCode = code;
    
    try {
        if (!window.electronAPI) {
            throw new Error('Electron API not available');
        }

        // First, analyze the current code and preview
        loadingText.textContent = `Analyzing code and preview (iteration ${iteration}/${maxIterations})...`;
        
        // Check if code is incomplete
        const isIncomplete = !code.includes('</html>') || 
                            code.trim().endsWith('padding') || 
                            code.trim().endsWith('{') ||
                            code.trim().endsWith(':') ||
                            code.split('{').length !== code.split('}').length;
        
        // Get preview state by checking if it renders
        const previewFrame = document.getElementById('previewFrame');
        let previewAnalysis = '';
        
        try {
            const iframeDoc = previewFrame.contentDocument || previewFrame.contentWindow.document;
            if (iframeDoc) {
                const hasErrors = iframeDoc.querySelector('parsererror') !== null;
                let bodyContent = '';
                
                if (iframeDoc.body) {
                    bodyContent = iframeDoc.body.innerHTML.trim();
                }
                
                const hasContent = bodyContent.length > 50 && !bodyContent.includes('```');
                
                if (isIncomplete) {
                    previewAnalysis = `CRITICAL: Code is INCOMPLETE - missing closing tags or cut off mid-declaration. `;
                } else if (hasErrors) {
                    previewAnalysis = `Preview has parsing errors. `;
                } else if (!hasContent) {
                    previewAnalysis = `Preview is empty or not rendering. `;
                } else {
                    previewAnalysis = `Preview renders but may need improvements. `;
                }
            }
        } catch (e) {
            previewAnalysis = isIncomplete ? 'CRITICAL: Code appears incomplete. ' : 'Preview analysis: Unable to access preview. ';
        }

        while (iteration <= maxIterations) {
            loadingText.textContent = `Auto-fixing code (iteration ${iteration}/${maxIterations})...`;
            
            const projectType = document.getElementById('projectType').value;
            const userPrompt = document.getElementById('promptInput').value.trim();
            
            let fixPrompt = `You are an expert web developer. The following HTML code is INCOMPLETE or has errors. You MUST complete it and make it fully functional.

ORIGINAL USER REQUEST: ${userPrompt}
PROJECT TYPE: ${projectType}

CURRENT CODE (INCOMPLETE/BROKEN):
\`\`\`html
${currentCode}
\`\`\`

${previewAnalysis}

CRITICAL ISSUES TO FIX:
1. COMPLETE THE CODE - it's cut off or incomplete. Add all missing closing tags, CSS properties, and JavaScript
2. Ensure the code is a complete, valid HTML document from <!DOCTYPE html> to </html>
3. Fix any syntax errors, broken tags, or incomplete CSS/JavaScript
4. If it's a game: Make sure all game mechanics work with emojis as actual game elements
5. Ensure emojis are used as actual game sprites/characters, NOT as placeholders
6. Fix any CSS or JavaScript errors
7. Ensure the preview renders correctly
8. Make sure interactive elements actually work
9. If it's a game, ensure it's fully playable with working controls, score, and game logic

REQUIREMENTS:
- Generate COMPLETE, working HTML code from start to finish
- All CSS and JavaScript must be inline
- Use emojis as actual game elements (for games) - they ARE the game graphics
- Ensure the code is valid and renders properly
- Complete any incomplete CSS rules, JavaScript functions, or HTML tags
- Make it fully functional and playable (for games)

Generate ONLY the complete, fixed HTML code starting with <!DOCTYPE html> and ending with </html>. Include ALL necessary code to make it work. Do not include explanations or markdown formatting - just the raw complete HTML code.`;

            const response = await window.electronAPI.aiChat(fixPrompt, []);
            
            if (response.success) {
                const fixedCode = extractCode(response.response);
                
                // Validate code is actually complete
                if (!isCodeComplete(fixedCode)) {
                    // Code is still incomplete, continue fixing
                    currentCode = fixedCode;
                    iteration++;
                    if (iteration <= maxIterations) {
                        previewAnalysis = `Code still incomplete, fixing again (missing tags/braces detected). `;
                        continue; // Try again
                    }
                }
                
                // Update the code
                currentCode = fixedCode;
                generatedCode = fixedCode;
                const codeEditor = document.getElementById('codeEditor');
                if (codeEditor) {
                    codeEditor.textContent = fixedCode;
                    updateLineCount();
                }
                
                // Update preview
                await updatePreview();
                
                // Wait a moment for preview to render
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // Check if code is complete
                if (isCodeComplete(fixedCode)) {
                    // Code is complete, but do one more polish iteration if we have attempts left
                    if (iteration < maxIterations) {
                        iteration++;
                        previewAnalysis = `Code is complete, doing final polish. `;
                    } else {
                        break; // Done
                    }
                } else {
                    // Still incomplete, continue
                    iteration++;
                    if (iteration > maxIterations) {
                        break;
                    }
                    previewAnalysis = `Code still incomplete, continuing to fix. `;
                }
                
                // Re-analyze preview for next iteration
                try {
                    const iframeDoc = previewFrame.contentDocument || previewFrame.contentWindow.document;
                    if (iframeDoc && iframeDoc.body) {
                        const bodyContent = iframeDoc.body.innerHTML.trim();
                        const hasContent = bodyContent.length > 50; // Meaningful content
                        const hasErrors = iframeDoc.querySelector('parsererror') !== null;
                        
                        if (hasContent && !hasErrors && isCodeComplete(fixedCode)) {
                            // Looks good
                            previewAnalysis = `Preview looks good, doing final polish. `;
                        } else {
                            previewAnalysis = `Preview still has issues: ${hasContent ? 'Has content' : 'Empty'}, ${hasErrors ? 'Has errors' : 'No errors'}, ${isCodeComplete(fixedCode) ? 'Code complete' : 'Code incomplete'}. `;
                        }
                    }
                } catch (e) {
                    previewAnalysis = 'Continuing to improve code. ';
                }
            } else {
                throw new Error(response.error || 'Failed to fix code');
            }
        }
        
        updateStatusIndicator('ready');
        alert(`Auto-fix completed after ${iteration - 1} iteration(s). Check the preview to see the improvements!`);
    } catch (error) {
        console.error('Auto-fix error:', error);
        alert(`Error during auto-fix: ${error.message}`);
        updateStatusIndicator('error');
    } finally {
        showLoading(false);
        document.getElementById('autoFixBtn').disabled = false;
    }
}

async function fixWithFeedback() {
    const code = document.getElementById('codeEditor').textContent || generatedCode;
    const feedback = document.getElementById('feedbackInput').value.trim();
    
    if (!code) {
        alert('No code to fix. Please generate code first.');
        return;
    }
    
    if (!feedback) {
        alert('Please describe what\'s wrong with the code.');
        return;
    }
    
    if (currentLanguage !== 'html') {
        alert('Fix with feedback is currently only available for HTML.');
        return;
    }
    
    // Show loading
    showLoading(true);
    updateStatusIndicator('loading');
    document.getElementById('fixWithFeedbackBtn').disabled = true;
    const loadingText = document.querySelector('.loading-text');
    loadingText.textContent = 'Fixing code based on your feedback...';
    
    try {
        if (!window.electronAPI) {
            throw new Error('Electron API not available');
        }
        
        const projectType = document.getElementById('projectType').value;
        const userPrompt = document.getElementById('promptInput').value.trim();
        
        const fixPrompt = `You are an expert web developer. Fix the following HTML code based on the user's specific feedback.

ORIGINAL USER REQUEST: "${userPrompt}"
PROJECT TYPE: ${projectType}
USER FEEDBACK ABOUT WHAT'S WRONG: "${feedback}"

CURRENT CODE:
\`\`\`html
${code}
\`\`\`

SPECIFIC ISSUES TO FIX (from user feedback):
${feedback}

REQUIREMENTS:
1. Fix the specific issues mentioned in the user feedback
2. Ensure the code is complete and functional
3. Make it look AMAZING - use modern design, gradients, shadows, animations, vibrant colors
4. If it's a game: Make sure buttons work, game mechanics function, and it's actually playable
5. If it's a website: Make it visually stunning with modern design trends
6. Fix any broken JavaScript, missing event handlers, or incomplete functionality
7. Ensure all interactive elements work properly and look great
8. If buttons don't work: Add proper onclick handlers or event listeners
9. If game doesn't start: Implement the full startGame() function with actual game logic
10. If variables are undefined: Initialize all variables (canvas, ctx, aliens, etc.)
11. If canvas is referenced but missing: Add the <canvas> element to HTML
12. Use modern CSS: gradients, shadows, transforms, animations, filters
13. Make buttons and UI elements look premium and clickable
14. Add smooth animations and transitions throughout
15. Use vibrant colors and visual effects to make it stand out
16. Make sure the code is a complete, valid HTML document from <!DOCTYPE html> to </html>

Generate ONLY the fixed HTML code starting with <!DOCTYPE html> and ending with </html>. Address the user's specific concerns. No explanations - just the complete fixed HTML code.`;

        const response = await window.electronAPI.aiChat(fixPrompt, []);
        
        if (response.success) {
            const fixedCode = extractCode(response.response);
            
            // Try to complete if still incomplete
            let finalCode = fixedCode;
            if (!isCodeComplete(finalCode)) {
                const completed = await autoFixIncompleteCode(finalCode);
                if (completed) finalCode = completed;
            }
            
            generatedCode = finalCode;
            const codeEditor = document.getElementById('codeEditor');
            if (codeEditor) {
                codeEditor.textContent = finalCode;
                updateLineCount();
            }
            
            await updatePreview();
            
            updateStatusIndicator('ready');
            alert('Code has been fixed based on your feedback! Check the preview.');
            
            // Keep feedback section visible, but clear the input
            document.getElementById('feedbackInput').value = '';
        } else {
            throw new Error(response.error || 'Failed to fix code');
        }
    } catch (error) {
        console.error('Fix with feedback error:', error);
        alert(`Error fixing code: ${error.message}`);
        updateStatusIndicator('error');
    } finally {
        showLoading(false);
        document.getElementById('fixWithFeedbackBtn').disabled = false;
    }
}

function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    overlay.style.display = show ? 'flex' : 'none';
}


function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Initialize language UI
updateUIForLanguage();

