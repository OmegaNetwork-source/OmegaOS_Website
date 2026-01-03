// Game templates for AI Dev - provides working skeletons that models can customize

const GAME_TEMPLATES = {
    'space-invaders': `<!DOCTYPE html>
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
</html>`
};

// Get template for a game type
function getGameTemplate(gameType) {
    const normalized = gameType.toLowerCase().replace(/[^a-z0-9]/g, '-');
    
    // Check for space invaders variations
    if (normalized.includes('space') && normalized.includes('invader')) {
        return GAME_TEMPLATES['space-invaders'];
    }
    
    // Default to space invaders for now
    return GAME_TEMPLATES['space-invaders'];
}

// Check if user request matches a template
function shouldUseTemplate(userPrompt) {
    const prompt = userPrompt.toLowerCase();
    return prompt.includes('space invader') || 
           prompt.includes('spaceinvader') ||
           (prompt.includes('space') && prompt.includes('invader'));
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getGameTemplate, shouldUseTemplate, GAME_TEMPLATES };
}

