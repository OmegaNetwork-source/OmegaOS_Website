// Game Templates - Real working HTML5 games from OmegaNetwork repositories
// These are loaded when user selects "Game" project type

const GAME_TEMPLATES = {
    'flappy-bird': {
        name: 'Flappy Bird',
        emoji: '🐦',
        getTemplate: () => getFlappyBirdTemplate()
    },
    'snake': {
        name: 'Snake',
        emoji: '🐍',
        getTemplate: () => getSnakeTemplate()
    },
    'space-invaders': {
        name: 'Space Invaders',
        emoji: '👾',
        getTemplate: () => getSpaceInvadersTemplate()
    },
    'pong': {
        name: 'Pong',
        emoji: '🏓',
        getTemplate: () => getPongTemplate()
    },
    'pac-man': {
        name: 'Pac Man',
        emoji: '👻',
        getTemplate: () => getPacManTemplate()
    },
    'brick-breaker': {
        name: 'Brick Breaker',
        emoji: '🎯',
        getTemplate: () => getBrickBreakerTemplate()
    },
};

// Flappy Bird - from https://github.com/OmegaNetwork-source/flappybird
function getFlappyBirdTemplate() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <title>Flappy Omega</title>
    <style>
        body {
            margin: 0;
            padding: 20px 0;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            display: flex;
            flex-direction: column; /* Align items vertically */
            justify-content: flex-start; /* Align to the top */
            align-items: center;
            min-height: 100vh;
            background-color: #121212;
            color: #ffffff;
            overflow-y: auto; /* Allow scrolling */
        }
        .game-container {
            position: relative;
            width: 95vw; /* Use viewport width for responsiveness */
            max-width: 380px; /* Keep original max size on larger screens */
            height: 600px;
            background-color: #000000;
            border: 2px solid #333;
            border-radius: 10px;
            box-shadow: 0 0 20px rgba(0, 255, 255, 0.2);
            overflow: hidden;
            transition: width 0.4s, height 0.4s;
        }
        .game-container.extended-view {
            width: 90vw;
            height: 80vh;
            max-width: 1200px;
        }
        canvas {
            display: block;
            width: 100%;
            height: 100%;
        }
        .ui-overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            align-items: center;
        }
        .score {
            font-size: 48px;
            font-weight: bold;
            margin-top: 50px;
            text-shadow: 0 0 10px #00ffff;
        }
        .message-box {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background-color: rgba(0, 0, 0, 0.75);
            padding: 20px 30px;
            border-radius: 10px;
            text-align: center;
            display: none; /* Hidden by default */
            pointer-events: all; /* Allow clicks on buttons inside */
        }
        .message-box h2 {
            margin: 0 0 10px;
            color: #00ffff;
        }
        .message-box button {
            background-color: #00b894;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 1em;
            transition: background-color 0.3s;
            margin-top: 10px;
        }
        .message-box button:hover {
            background-color: #00a884;
        }
        .wallet-controls {
            position: absolute;
            bottom: 20px;
            left: 50%;
            width: 90%;
            transform: translateX(-50%);
            z-index: 10;
            text-align: center;
            pointer-events: all;
        }
        #walletStatus {
            color: #00ffff;
            margin: 5px 0 0;
            font-size: 0.9em;
            background-color: rgba(0, 0, 0, 0.5);
            padding: 5px;
            border-radius: 5px;
        }
        .leaderboard-section {
            margin-top: 30px;
            width: 95vw; /* Match the game container's responsive width */
            max-width: 380px;
            text-align: center;
        }
        .leaderboard-section h2 {
            color: #00ffff;
        }
        .leaderboard-section table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
            background-color: rgba(0,0,0,0.3);
            border: 1px solid #333;
            border-radius: 5px;
        }
        .leaderboard-section th, .leaderboard-section td {
            padding: 12px;
            border-bottom: 1px solid #333;
            text-align: center !important; /* Force center alignment */
        }
        .leaderboard-section tr:last-child td {
            border-bottom: none;
        }
        .web3-btn {
             background-color: #00b894;
            color: white;
            border: none;
            padding: 10px 15px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 1em;
            transition: background-color 0.3s;
            margin-top: 10px;
        }
    </style>
</head>
<body>
    <div class="game-container">
        <canvas id="gameCanvas"></canvas>
        <div class="ui-overlay">
            <div id="scoreDisplay" class="score">0</div>
            <div id="startMessage" class="message-box" style="display: block;">
                <h2>Flappy Omega</h2>
                <p>Click or Tap to Start</p>
            </div>
            <div id="gameOverMessage" class="message-box">
                <h2>Game Over</h2>
                <p>Score: <span id="finalScore">0</span></p>
                <button id="playAgainBtn" class="web3-btn">Play Again</button>
                <button id="submitScoreBtn" class="web3-btn" style="display: none;">Submit Score</button>
                <p style="font-size: 0.8em; color: #999; margin-top: 10px;">Note: Wallet must be reconnected for a new game.</p>
            </div>
            <div class="wallet-controls">
                <button id="connectWalletBtn" class="web3-btn">Connect Wallet</button>
                <button id="toggleSizeBtn" class="web3-btn">Extend Size</button>
                <p id="walletStatus" style="display: none;"></p>
            </div>
        </div>
    </div>
    <div class="leaderboard-section">
        <h2>Leaderboard</h2>
        <table>
            <thead><tr><th>Rank</th><th>Wallet</th><th>Score</th></tr></thead>
            <tbody id="leaderboardBody"></tbody>
        </table>
        <button id="exportCsvBtn" class="web3-btn">Export as CSV</button>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/ethers@5.2.0/dist/ethers.umd.min.js" type="text/javascript"></script>
    <script>
    document.addEventListener('DOMContentLoaded', () => {
        const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');
        const gameContainer = document.querySelector('.game-container');

        const toggleSizeBtn = document.getElementById('toggleSizeBtn');
        if (localStorage.getItem('extendedView') === 'true') {
            gameContainer.classList.add('extended-view');
            toggleSizeBtn.textContent = 'Normal Size';
        } else {
            toggleSizeBtn.textContent = 'Extend Size';
        }

        canvas.width = gameContainer.clientWidth;
        canvas.height = gameContainer.clientHeight;

        // Game state
        let gameState = 'start'; // 'start', 'playing', 'over'

        // Time-based physics for consistent speed across devices
        let lastTime = 0;
        const BIRD_GRAVITY = 800;  // pixels per second per second
        const BIRD_LIFT = -320;     // pixels per second
        const PIPE_SPEED = 140;      // pixels per second
        const PIPE_SPAWN_INTERVAL = 2.2; // seconds

        // Game variables
        const bird = {
            x: 60,
            y: canvas.height / 2,
            radius: 15,
            velocity: 0,
            color: '#00ffff',
            shadowColor: 'rgba(0, 255, 255, 0.7)'
        };

        const pipes = {
            list: [],
            width: 50,
            gap: 250,      // A reasonably challenging gap
            spawnTimer: 0,
            color: '#ffffff',
            shadowColor: 'rgba(255, 255, 255, 0.7)'
        };
        
        let score = 0;
        let provider, signer, contract, userAddress;

        const contractAddress = "0x6b451b71f1540972d7fd5aae76b5e683246ade9e";
        const contractABI = [ { "anonymous": false, "inputs": [ { "indexed": true, "internalType": "address", "name": "player", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "score", "type": "uint256" } ], "name": "ScoreSubmitted", "type": "event" }, { "inputs": [ { "internalType": "uint256", "name": "_score", "type": "uint256" } ], "name": "submitScore", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [], "name": "getLeaderboard", "outputs": [ { "components": [ { "internalType": "address", "name": "player", "type": "address" }, { "internalType": "uint256", "name": "score", "type": "uint256" } ], "internalType": "struct Leaderboard.ScoreEntry[]", "name": "", "type": "tuple[]" } ], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "getPlayerCount", "outputs": [ { "internalType": "uint256", "name": "", "type": "uint256" } ], "stateMutability": "view", "type": "function" }, { "inputs": [ { "internalType": "address", "name": "", "type": "address" } ], "name": "highScores", "outputs": [ { "internalType": "uint256", "name": "", "type": "uint256" } ], "stateMutability": "view", "type": "function" }, { "inputs": [ { "internalType": "uint256", "name": "", "type": "uint256" } ], "name": "players", "outputs": [ { "internalType": "address", "name": "", "type": "address" } ], "stateMutability": "view", "type": "function" } ];

        const connectWalletBtn = document.getElementById('connectWalletBtn');
        const submitScoreBtn = document.getElementById('submitScoreBtn');
        const exportCsvBtn = document.getElementById('exportCsvBtn');
        const leaderboardBody = document.getElementById('leaderboardBody');
        const walletStatusP = document.getElementById('walletStatus');

        function drawBird() {
            ctx.save();
            ctx.beginPath();
            ctx.arc(bird.x, bird.y, bird.radius, 0, Math.PI * 2);
            ctx.fillStyle = bird.color;
            ctx.shadowColor = bird.shadowColor;
            ctx.shadowBlur = 15;
            ctx.fill();
            ctx.closePath();
            ctx.restore();
        }

        function updateBird(deltaTime) {
            bird.velocity += BIRD_GRAVITY * deltaTime;
            bird.y += bird.velocity * deltaTime;

            // Stop bird from falling off screen
            if (bird.y + bird.radius > canvas.height) {
                bird.y = canvas.height - bird.radius;
                bird.velocity = 0;
                setGameOver();
            }
            if (bird.y - bird.radius < 0) {
                bird.y = bird.radius;
                bird.velocity = 0;
            }
        }

        function flap() {
            bird.velocity = BIRD_LIFT;
        }

        function drawPipes() {
            ctx.save();
            ctx.fillStyle = pipes.color;
            ctx.shadowColor = pipes.shadowColor;
            ctx.shadowBlur = 10;
            for (const p of pipes.list) {
                // Top pipe
                ctx.fillRect(p.x, 0, p.width, p.topHeight);
                // Bottom pipe
                ctx.fillRect(p.x, p.topHeight + pipes.gap, p.width, canvas.height - p.topHeight - pipes.gap);
            }
            ctx.restore();
        }

        function updatePipes(deltaTime) {
            pipes.spawnTimer += deltaTime;
            if (pipes.spawnTimer > PIPE_SPAWN_INTERVAL) {
                pipes.spawnTimer = 0;
                const topHeight = Math.random() * (canvas.height - pipes.gap - 150) + 75;
                pipes.list.push({ x: canvas.width, topHeight: topHeight, passed: false, width: pipes.width, gap: pipes.gap });
            }

            for (let i = pipes.list.length - 1; i >= 0; i--) {
                const p = pipes.list[i];
                p.x -= PIPE_SPEED * deltaTime;

                // Remove pipes that are off-screen
                if (p.x + p.width < 0) {
                    pipes.list.splice(i, 1);
                }
                
                // Score
                if (!p.passed && p.x + p.width < bird.x) {
                    p.passed = true;
                    score++;
                    document.getElementById('scoreDisplay').textContent = score;
                }
            }
        }
        
        function checkCollisions() {
            for (const p of pipes.list) {
                // Check if bird is within the pipe's x-range
                if (bird.x + bird.radius > p.x && bird.x - bird.radius < p.x + p.width) {
                    // Check for collision with top or bottom pipe
                    if (bird.y - bird.radius < p.topHeight || bird.y + bird.radius > p.topHeight + p.gap) {
                        setGameOver();
                    }
                }
            }
        }
        
        function setGameOver() {
            if(gameState === 'over') return;
            gameState = 'over';
            document.getElementById('finalScore').textContent = score;
            document.getElementById('gameOverMessage').style.display = 'block';

            if (userAddress) {
                submitScoreBtn.style.display = 'inline-block';
            }
        }

        function resetGame() {
            gameState = 'playing';
            bird.y = canvas.height / 2;
            bird.velocity = 0;
            pipes.list = [];
            pipes.spawnTimer = 0;
            score = 0;
            document.getElementById('scoreDisplay').textContent = score;
            document.getElementById('startMessage').style.display = 'none';
            document.getElementById('gameOverMessage').style.display = 'none';
            flap(); // Give an initial flap to avoid instant drop
        }

        function gameLoop(timestamp) {
            // Guard against NaN on the first frame.
            if (!lastTime) {
                lastTime = timestamp;
            }
            const deltaTime = (timestamp - lastTime) / 1000;
            lastTime = timestamp;

            // Clear canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            if (gameState === 'playing') {
                updateBird(deltaTime);
                updatePipes(deltaTime);
                checkCollisions();
            } else {
                // Make bird hover in start/over state
                bird.y = canvas.height / 2 + Math.sin(Date.now() / 200) * 5;
            }

            drawPipes();
            drawBird();

            requestAnimationFrame(gameLoop);
        }

        // Event listeners
        function handleUserInput() {
            if (gameState === 'start') {
                // Deduct 5 credits from localStorage
                let credits = parseInt(localStorage.getItem('omega_arcade_credits') || '0', 10);
                credits = Math.max(0, credits - 5);
                localStorage.setItem('omega_arcade_credits', credits);
                resetGame();
            } else if (gameState === 'playing') {
                flap();
            }
        }

        window.addEventListener('click', handleUserInput);
        window.addEventListener('touchstart', (e) => {
            e.preventDefault();
            handleUserInput();
        }, { passive: false });

        toggleSizeBtn.addEventListener('click', (event) => {
            event.stopPropagation(); // Prevent click from starting the game
            if (localStorage.getItem('extendedView') === 'true') {
                localStorage.setItem('extendedView', 'false');
            } else {
                localStorage.setItem('extendedView', 'true');
            }
            location.reload();
        });

        const playAgainBtn = document.getElementById('playAgainBtn');
        playAgainBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            location.reload();
        });
        playAgainBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            e.stopPropagation();
            location.reload();
        });

        async function connectWallet() {
            if (typeof window.ethereum === 'undefined') {
                return alert('MetaMask is not detected. Please use a browser with MetaMask installed, and ensure you are running this from a local server.');
            }
            try {
                provider = new ethers.providers.Web3Provider(window.ethereum);
                await provider.send("eth_requestAccounts", []);
                signer = provider.getSigner();
                userAddress = await signer.getAddress();
                contract = new ethers.Contract(contractAddress, contractABI, signer);
                
                updateWalletStatus(true, userAddress);
                alert('Wallet connected!');
                
                // If game is over, re-evaluate button visibility
                if (gameState === 'over') {
                    setGameOver();
                }
            } catch (error) {
                console.error("Wallet connection failed:", error);
                alert("Failed to connect wallet.");
            }
        }
        
        function updateWalletStatus(isConnected, address) {
            if (isConnected) {
                walletStatusP.textContent = \`Connected: \${address.substring(0, 6)}...\${address.substring(address.length - 4)}\`;
                walletStatusP.style.display = 'block';
                connectWalletBtn.style.display = 'none';
            } else {
                walletStatusP.style.display = 'none';
                connectWalletBtn.style.display = 'block';
            }
        }

        async function submitScore() {
            if (!contract) return alert('Please connect your wallet first.');
            submitScoreBtn.disabled = true;
            submitScoreBtn.textContent = 'Submitting...';
            try {
                const tx = await contract.submitScore(score);
                await tx.wait();
                alert('Score submitted successfully!');
                fetchLeaderboard();
            } catch (error) {
                console.error("Failed to submit score:", error);
                alert('Error submitting score.');
            } finally {
                submitScoreBtn.disabled = false;
                submitScoreBtn.textContent = 'Submit Score';
            }
        }

        async function fetchLeaderboard() {
            if (typeof ethers === 'undefined') {
                console.error("Ethers.js not loaded. Leaderboard cannot be fetched.");
                leaderboardBody.innerHTML = '<tr><td colspan="3" style="text-align:center;">Error loading Web3 library.</td></tr>';
                return;
            }
            if (typeof window.ethereum === 'undefined') {
                leaderboardBody.innerHTML = '<tr><td colspan="3" style="text-align:center;">MetaMask not detected.</td></tr>';
                return;
            }
            try {
                const localProvider = new ethers.providers.Web3Provider(window.ethereum);
                const readOnlyContract = new ethers.Contract(contractAddress, contractABI, localProvider);
                const leaderboardData = await readOnlyContract.getLeaderboard();
                
                const sorted = [...leaderboardData].sort((a, b) => b.score - a.score);

                leaderboardBody.innerHTML = '';
                sorted.forEach((entry, index) => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = \`<td>\${index + 1}</td><td>\${entry.player}</td><td>\${entry.score.toString()}</td>\`;
                    leaderboardBody.appendChild(tr);
                });
            } catch (error) {
                leaderboardBody.innerHTML = '<tr><td colspan="3" style="text-align:center;">Could not load leaderboard.</td></tr>';
                console.error("Failed to fetch leaderboard:", error);
            }
        }

        function exportToCSV() {
            let csvContent = "data:text/csv;charset=utf-8,Rank,Wallet,Score\n";
            leaderboardBody.querySelectorAll('tr').forEach(row => {
                const rowData = Array.from(row.querySelectorAll('td')).map(col => \`"\${col.innerText}"\`).join(',');
                csvContent += rowData + "\n";
            });
            const link = document.createElement("a");
            link.setAttribute("href", encodeURI(csvContent));
            link.setAttribute("download", "flappy-omega-leaderboard.csv");
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }

        connectWalletBtn.addEventListener('click', (event) => {
            event.stopPropagation(); // Prevent click from starting the game
            connectWallet();
        });
        submitScoreBtn.addEventListener('click', (event) => {
            event.stopPropagation(); // Prevent click from bubbling up
            submitScore();
        });
        exportCsvBtn.addEventListener('click', (event) => {
            event.stopPropagation(); // Prevent click from bubbling up
            exportToCSV();
        });

        // Arcade credit check: redirect if not enough credits
        (function() {
            const credits = parseInt(localStorage.getItem('omega_arcade_credits') || '0', 10);
            if (!credits || credits < 5) {
                window.location.href = 'https://omega-arcade.vercel.app/';
            }
        })();

        // Initial load
        window.addEventListener('load', () => {
            fetchLeaderboard();
            requestAnimationFrame(gameLoop);
        });
    });
    </script>
</body>
</html> 
`;
}

// Snake - from https://github.com/OmegaNetwork-source/snake
function getSnakeTemplate() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Omega Snake.io</title>
  <style>
    :root {
      color-scheme: dark;
      font-family: "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      --bg-primary: #080b13;
      --bg-secondary: #11182a;
      --accent: #3cf5ff;
      --danger: #ff4f6d;
      --success: #45ffb1;
      --text-primary: #f6fbff;
      --text-muted: #6b7c90;
    }

    * {
      box-sizing: border-box;
      user-select: none;
    }

    body {
      margin: 0;
      width: 100vw;
      height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      background: radial-gradient(circle at 20% 20%, #0d1c33, var(--bg-primary));
      color: var(--text-primary);
      overflow: hidden;
    }

    .frame {
      width: 100vw;
      height: 100vh;
      position: relative;
      border-radius: 0;
      background: linear-gradient(160deg, rgba(23, 34, 53, 0.88), rgba(7, 11, 18, 0.88));
      box-shadow: inset 0 24px 70px rgba(0, 0, 0, 0.35);
      overflow: hidden;
      backdrop-filter: blur(12px);
    }

    canvas {
      width: 100%;
      height: 100%;
      display: block;
    }

    .hud {
      position: absolute;
      inset: clamp(12px, 2vw, 30px);
      pointer-events: none;
      display: flex;
      justify-content: space-between;
    }

    .panel {
      width: 260px;
      background: rgba(9, 14, 22, 0.78);
      border-radius: 18px;
      padding: 18px 20px 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      border: 1px solid rgba(60, 245, 255, 0.12);
      backdrop-filter: blur(10px);
    }

    .panel h2 {
      margin: 0;
      font-size: 1rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--accent);
    }

    .panel p {
      margin: 0;
      font-size: 0.85rem;
      color: var(--text-muted);
      line-height: 1.4;
    }

    .panel strong {
      color: var(--text-primary);
      font-weight: 600;
      font-size: 1.1rem;
    }

    .scoreboard {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: 6px;
    }

    .score-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 10px;
      border-radius: 10px;
      font-size: 0.9rem;
      background: rgba(21, 32, 48, 0.7);
    }

    .score-row span {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .score-row.you {
      border: 1px solid rgba(60, 245, 255, 0.35);
      background: rgba(60, 245, 255, 0.12);
    }

    .score-empty {
      font-size: 0.82rem;
      color: var(--text-muted);
      padding: 12px 10px;
      border-radius: 10px;
      background: rgba(21, 32, 48, 0.5);
    }

    .color-chip {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      box-shadow: 0 0 6px rgba(255, 255, 255, 0.35);
    }

    .color-select {
      pointer-events: auto;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .color-select span {
      font-size: 0.75rem;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--text-muted);
    }

    .color-picker {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .color-option {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      border: 2px solid transparent;
      background: var(--swatch-color);
      box-shadow: 0 0 12px rgba(0, 0, 0, 0.4);
      cursor: pointer;
      transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
      pointer-events: auto;
    }

    .color-option:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 14px rgba(0, 0, 0, 0.6);
    }

    .color-option.active {
      border-color: var(--text-primary);
      box-shadow: 0 0 0 2px rgba(60, 245, 255, 0.35), 0 6px 20px rgba(60, 245, 255, 0.3);
    }

    .cta {
      pointer-events: auto;
      align-self: flex-start;
      margin-top: 14px;
      display: inline-flex;
      align-items: center;
      gap: 10px;
      padding: 12px 26px;
      border-radius: 999px;
      background: var(--accent);
      color: #001b2c;
      font-weight: 600;
      letter-spacing: 0.04em;
      cursor: pointer;
      border: none;
      box-shadow: 0 8px 24px rgba(60, 245, 255, 0.35);
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }

    .cta:hover {
      transform: translateY(-1px);
      box-shadow: 0 14px 32px rgba(60, 245, 255, 0.5);
    }

    .cta.secondary {
      margin-top: 4px;
      background: rgba(60, 245, 255, 0.14);
      color: var(--text-primary);
      box-shadow: none;
      border: 1px solid rgba(60, 245, 255, 0.35);
    }

    .cta.secondary:hover {
      box-shadow: 0 10px 24px rgba(60, 245, 255, 0.35);
    }

    .submit-status {
      pointer-events: none;
      align-self: flex-start;
      font-size: 0.8rem;
      letter-spacing: 0.04em;
      color: var(--text-muted);
    }

    .submit-status.tone-info {
      color: var(--accent);
    }

    .submit-status.tone-success {
      color: var(--success);
    }

    .submit-status.tone-error {
      color: var(--danger);
    }

    .status-chip {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 12px;
      border-radius: 999px;
      background: rgba(69, 255, 177, 0.12);
      color: var(--success);
      font-size: 0.8rem;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }

    .status-chip::before {
      content: "";
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: currentColor;
      box-shadow: 0 0 8px currentColor;
    }

    .help {
      display: flex;
      flex-direction: column;
      gap: 8px;
      font-size: 0.85rem;
      color: var(--text-muted);
    }

    .help code {
      background: rgba(19, 28, 43, 0.85);
      padding: 2px 6px;
      border-radius: 6px;
      color: var(--text-primary);
      font-size: 0.78rem;
    }

    @media (max-width: 980px) {
      .hud {
        flex-direction: column;
        gap: 16px;
        align-items: center;
      }

      .panel {
        width: min(320px, 90%);
        align-items: center;
        text-align: center;
      }

      .score-row {
        justify-content: center;
        gap: 16px;
      }

      .cta {
        align-self: center;
      }
    }
  </style>
</head>
<body>
  <div class="frame">
    <canvas id="arena"></canvas>
    <div class="hud">
      <div class="panel" style="gap: 16px;">
        <div class="status-chip" id="status-chip">Spectating</div>
        <div>
          <h2>Your Stats</h2>
          <p>Score: <strong id="score">0</strong></p>
          <p>Length: <strong id="length">0</strong></p>
        </div>
        <div class="color-select">
          <span>Snake Color</span>
          <div class="color-picker" id="color-picker"></div>
        </div>
        <button id="start-btn" class="cta">Play</button>
        <div class="help">
          <span>Move with <code>W A S D</code> or <code>▲ ▼ ◄ ►</code></span>
          <span>Fine aim with your mouse cursor</span>
          <span>Bump rival snakes to convert them into energy</span>
        </div>
        <button id="submit-btn" class="cta secondary" style="display: none;">Submit Score</button>
        <div id="submit-status" class="submit-status" style="display: none;"></div>
      </div>
      <div class="panel">
        <h2>Leaderboard</h2>
        <div class="scoreboard" id="leaderboard"></div>
        <p>Collect luminous energy to grow. Bigger snakes dominate the arena and drop more food when defeated.</p>
      </div>
    </div>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/ethers@5.7.2/dist/ethers.umd.min.js"></script>
  <script>
    const canvas = document.getElementById("arena");
    const ctx = canvas.getContext("2d");

    const startBtn = document.getElementById("start-btn");
    const scoreLabel = document.getElementById("score");
    const lengthLabel = document.getElementById("length");
    const leaderboardEl = document.getElementById("leaderboard");
    const statusChip = document.getElementById("status-chip");
    const colorPicker = document.getElementById("color-picker");
    const submitBtn = document.getElementById("submit-btn");
    const submitStatus = document.getElementById("submit-status");

    const LEADERBOARD_CONFIG = {
      address: "0xd7c39ebd50ce6f12cc4711e934f387d64140a249",
      chainId: 5031,
      chainHex: "0x13A7",
      rpcUrl: "https://api.infra.mainnet.somnia.network/",
      blockExplorer: "https://explorer.somnia.network/"
    };

    const LEADERBOARD_ABI = [
      "error InvalidScore()",
      "error ScoreNotImproved()",
      "event ScoreSubmitted(address indexed player, uint256 score)",
      "function submitScore(uint256 score) external",
      "function getEntry(uint256 index) external view returns (address player, uint256 score)",
      "function getTop(uint256 limit) external view returns (address[] memory players, uint256[] memory scores)",
      "function highScores(address) external view returns (uint256)",
      "function MAX_ENTRIES() external view returns (uint256)",
      "function totalEntries() external view returns (uint256)"
    ];

    let walletAddress = null;
    let web3Provider = null;
    let writeContract = null;
    let readContract = null;
    let chainLeaderboard = [];
    let submittingScore = false;
    let walletListenersAttached = false;

    const WORLD = {
      width: 0,
      height: 0,
      botCount: 7,
      foodDensity: 1 / 14000
    };

    const PLAYER_COLORS = [
      "#3cf5ff",
      "#ff7bf3",
      "#ffc857",
      "#8b95ff",
      "#64f58d",
      "#ff6b6b",
      "#4dd0e1",
      "#ffe66d",
      "#9b5de5",
      "#00f5d4",
      "#f15bb5",
      "#fee440",
      "#caffbf",
      "#ff8fa3",
      "#ffffff"
    ];
    let selectedColor = PLAYER_COLORS[0];

    function resizeCanvas() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      WORLD.width = canvas.width;
      WORLD.height = canvas.height;
    }

    function isLeaderboardConfigured() {
      return /^0x[a-fA-F0-9]{40}$/.test(LEADERBOARD_CONFIG.address) && LEADERBOARD_CONFIG.address !== "0x0000000000000000000000000000000000000000";
    }

    const INPUT = {
      up: false,
      down: false,
      left: false,
      right: false,
      mouseAngle: null
    };

    const COLORS = [
      "#3cf5ff",
      "#ff7bf3",
      "#ffc857",
      "#8b95ff",
      "#64f58d",
      "#ff6b6b",
      "#4dd0e1"
    ];

    class Food {
      constructor(x, y, energy = 16, persistSeconds = null) {
        this.x = x;
        this.y = y;
        this.energy = energy;
        this.pulse = Math.random() * Math.PI * 2;
        this.decayTimer = typeof persistSeconds === "number" && persistSeconds > 0 ? persistSeconds : null;
        this.staleTime = 0;
      }

      update(dt) {
        this.pulse += dt * 4;
        if (this.decayTimer !== null) {
          if (this.decayTimer > 0) {
            this.decayTimer = Math.max(0, this.decayTimer - dt);
          } else {
            this.staleTime += dt;
          }
        }
      }

      draw(ctx) {
        const pulseScale = 1 + Math.sin(this.pulse) * 0.15;
        const radius = (5 + this.energy * 0.07) * pulseScale;
        const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, radius);
        gradient.addColorStop(0, "rgba(255,255,255,0.95)");
        gradient.addColorStop(0.35, "rgba(60,245,255,0.9)");
        gradient.addColorStop(1, "rgba(60,245,255,0)");

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    class Snake {
      constructor(options) {
        this.id = options.id;
        this.isPlayer = options.isPlayer ?? false;
        this.color = options.color ?? COLORS[Math.floor(Math.random() * COLORS.length)];
        this.radius = options.radius ?? 10;
        this.speed = options.speed ?? 120;
        this.turnSpeed = options.turnSpeed ?? 5;
        this.heading = options.heading ?? Math.random() * Math.PI * 2;
        this.segments = [];
        this.trail = [];
        this.baseLength = options.length ?? 20;
        this.targetLength = this.baseLength;
        this.score = 0;
        this.alive = true;
        this.collisionCooldown = 0;
        this.respawnTimer = 0;
        this.spawnFade = 0;
        this.spawn();
      }

      spawn() {
        const point = randomSpawnPoint();
        const x = point.x;
        const y = point.y;
        this.position = { x, y };
        this.trail = [{ x, y }];
        this.segments = [];
        this.score = 0;
        this.targetLength = this.baseLength;
        this.alive = true;
        this.collisionCooldown = 0;
        this.respawnTimer = 0;
        this.spawnFade = 0;
        const spacing = this.radius * 0.9;
        const totalPoints = Math.max(8, Math.round(this.targetLength * 3));
        const dirX = Math.cos(this.heading + Math.PI);
        const dirY = Math.sin(this.heading + Math.PI);
        for (let i = 1; i <= totalPoints; i++) {
          const px = (x + dirX * spacing * i + WORLD.width) % WORLD.width;
          const py = (y + dirY * spacing * i + WORLD.height) % WORLD.height;
          this.trail.push({ x: px, y: py });
        }
        this.updateSegments();
      }

      steer(dt) {
        if (this.isPlayer) {
          if (INPUT.mouseAngle !== null) {
            const diff = shortestAngleDiff(this.heading, INPUT.mouseAngle);
            this.heading += diff * Math.min(1, dt * this.turnSpeed * 2.2);
          } else {
            let targetAngle = null;
            if (INPUT.up) targetAngle = -Math.PI / 2;
            if (INPUT.down) targetAngle = Math.PI / 2;
            if (INPUT.left) targetAngle = Math.PI;
            if (INPUT.right) targetAngle = 0;
            if (targetAngle !== null) {
              const diff = shortestAngleDiff(this.heading, targetAngle);
              this.heading += diff * Math.min(1, dt * this.turnSpeed);
            }
          }
        } else {
          // Lightweight AI: wander with mild bias toward nearest food
          this.aiTimer = (this.aiTimer ?? 0) - dt;
          if (this.aiTimer <= 0) {
            this.aiTimer = 1.2 + Math.random();
            const food = getNearestFood(this.position);
            if (food) {
              const angleToFood = Math.atan2(food.y - this.position.y, food.x - this.position.x);
              const diff = shortestAngleDiff(this.heading, angleToFood);
              this.heading += diff * (0.4 + Math.random() * 0.6);
            }
          }
          this.heading += (Math.random() - 0.5) * dt * 0.9;
        }
      }

      move(dt) {
        const dx = Math.cos(this.heading) * this.speed * dt;
        const dy = Math.sin(this.heading) * this.speed * dt;
        this.position.x += dx;
        this.position.y += dy;

        // World wrap
        this.position.x = (this.position.x + WORLD.width) % WORLD.width;
        this.position.y = (this.position.y + WORLD.height) % WORLD.height;

        this.trail.unshift({ x: this.position.x, y: this.position.y });
        const targetTrailLength = this.targetLength * this.radius * 0.9;
        let currentLength = 0;
        for (let i = 1; i < this.trail.length; i++) {
          const seg = this.trail[i];
          const prev = this.trail[i - 1];
          currentLength += distance(seg, prev);
          if (currentLength > targetTrailLength) {
            this.trail.length = i;
            break;
          }
        }

        this.updateSegments();

        if (this.collisionCooldown > 0) {
          this.collisionCooldown -= dt;
        }

        if (this.spawnFade < 1) {
          this.spawnFade = Math.min(1, this.spawnFade + dt * 1.8);
        }
      }

      updateSegments() {
        const spacing = this.radius * 0.85;
        let distanceCovered = 0;
        const segments = [];
        let prevPoint = this.trail[0];
        segments.push({ x: prevPoint.x, y: prevPoint.y });
        for (let i = 1; i < this.trail.length; i++) {
          const point = this.trail[i];
          const segmentDistance = distance(prevPoint, point);
          distanceCovered += segmentDistance;
          while (distanceCovered >= spacing) {
            const t = (distanceCovered - spacing) / segmentDistance;
            const x = lerp(point.x, prevPoint.x, t);
            const y = lerp(point.y, prevPoint.y, t);
            segments.push({ x, y });
            distanceCovered -= spacing;
          }
          prevPoint = point;
        }
        this.segments = segments;
      }

      grow(amount) {
        this.targetLength += amount;
        this.score += Math.round(amount * 5);
        if (this.isPlayer) {
          updatePlayerStats();
        }
      }

      draw(ctx) {
        if (!this.alive) return;

        const originalAlpha = ctx.globalAlpha;
        const fade = this.isPlayer ? 1 : Math.min(1, this.spawnFade);
        if (!this.isPlayer && fade <= 0.05) {
          ctx.globalAlpha = originalAlpha;
          return;
        }
        ctx.globalAlpha = originalAlpha * (this.isPlayer ? 1 : 0.1 + fade * 0.9);

        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        if (this.isPlayer) {
          ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
          ctx.lineWidth = this.radius * 1.9;
          ctx.beginPath();
          for (let i = this.segments.length - 1; i >= 0; i--) {
            const seg = this.segments[i];
            if (i === this.segments.length - 1) {
              ctx.moveTo(seg.x, seg.y);
            } else {
              ctx.lineTo(seg.x, seg.y);
            }
          }
          ctx.stroke();
        }

        ctx.save();
        if (this.isPlayer) {
          ctx.shadowColor = this.color;
          ctx.shadowBlur = 18;
        }

        // Body blend
        ctx.strokeStyle = this.color;
        ctx.lineWidth = this.radius * 1.3;
        ctx.beginPath();
        for (let i = this.segments.length - 1; i >= 0; i--) {
          const seg = this.segments[i];
          if (i === this.segments.length - 1) {
            ctx.moveTo(seg.x, seg.y);
          } else {
            ctx.lineTo(seg.x, seg.y);
          }
        }
        ctx.stroke();

        // Inner spine
        ctx.strokeStyle = "rgba(8, 11, 19, 0.65)";
        ctx.lineWidth = this.radius * 0.5;
        ctx.beginPath();
        for (let i = this.segments.length - 1; i >= 0; i--) {
          const seg = this.segments[i];
          if (i === this.segments.length - 1) {
            ctx.moveTo(seg.x, seg.y);
          } else {
            ctx.lineTo(seg.x, seg.y);
          }
        }
        ctx.stroke();

        // Head glow
        const head = this.segments[0];
        const gradient = ctx.createRadialGradient(head.x, head.y, this.radius * 0.2, head.x, head.y, this.radius * 1.5);
        gradient.addColorStop(0, "#ffffff");
        gradient.addColorStop(0.25, this.color);
        gradient.addColorStop(1, "rgba(0,0,0,0)");

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(head.x, head.y, this.radius * 1.4, 0, Math.PI * 2);
        ctx.fill();

        // Eyes
        const eyeOffset = this.radius * 0.7;
        const eyeAngle = this.heading;
        const ex = Math.cos(eyeAngle) * this.radius * 0.6;
        const ey = Math.sin(eyeAngle) * this.radius * 0.6;
        const eyeSide = Math.PI / 2;
        const eyeRadius = this.radius * 0.2;

        ctx.fillStyle = "#030b16";
        for (const side of [-1, 1]) {
          ctx.beginPath();
          ctx.arc(
            head.x + ex + Math.cos(eyeAngle + side * eyeSide) * eyeOffset,
            head.y + ey + Math.sin(eyeAngle + side * eyeSide) * eyeOffset,
            eyeRadius,
            0,
            Math.PI * 2
          );
          ctx.fill();
        }

        ctx.restore();

        if (this.isPlayer) {
          ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
          ctx.font = \`\${Math.max(12, this.radius * 1.4)}px "Segoe UI", sans-serif\`;
          ctx.textAlign = "center";
          ctx.fillText("YOU", head.x, head.y - this.radius * 1.8);
        }

        ctx.globalAlpha = originalAlpha;
      }

      dropFood(extraBurst = 0) {
        const food = [];
        for (let i = 0; i < this.segments.length; i += 3) {
          const seg = this.segments[i];
          const energy = Math.max(8, Math.min(32, this.targetLength / 6));
          food.push(new Food(seg.x, seg.y, energy + 6, 12));
        }
        for (let j = 0; j < extraBurst; j++) {
          const seg = this.segments[Math.min(this.segments.length - 1, j * 3)] ?? this.segments[0];
          if (!seg) continue;
          const dispersion = (Math.random() - 0.5) * this.radius * 6;
          const angle = Math.random() * Math.PI * 2;
          food.push(
            new Food(
              seg.x + Math.cos(angle) * dispersion,
              seg.y + Math.sin(angle) * dispersion,
              Math.max(18, this.targetLength / 2.5),
              18
            )
          );
        }
        return food;
      }
    }

    const snakes = [];
    const foodItems = [];

    let lastTime = performance.now();
    let playerSnake = null;
    let running = false;

    function shortestAngleDiff(a, b) {
      const diff = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
      return diff < -Math.PI ? diff + Math.PI * 2 : diff;
    }

    function distance(a, b) {
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      return Math.hypot(dx, dy);
    }

    function lerp(a, b, t) {
      return a + (b - a) * t;
    }

    function randomSpawnPoint() {
      let attempts = 0;
      let x;
      let y;
      do {
        x = Math.random() * (WORLD.width * 0.6) + WORLD.width * 0.2;
        y = Math.random() * (WORLD.height * 0.6) + WORLD.height * 0.2;
        attempts++;
      } while (
        playerSnake &&
        playerSnake.alive &&
        distance({ x, y }, playerSnake.position) < 220 &&
        attempts < 12
      );
      return { x, y };
    }

    function getNearestFood(position) {
      if (!foodItems.length) return null;
      let closest = null;
      let bestDist = Infinity;
      for (const food of foodItems) {
        const dist = distance(position, food);
        if (dist < bestDist) {
          bestDist = dist;
          closest = food;
        }
      }
      return closest;
    }

    function addSnake(options) {
      const snake = new Snake(options);
      snakes.push(snake);
      return snake;
    }

    function desiredFoodCount() {
      const target = Math.round(WORLD.width * WORLD.height * WORLD.foodDensity);
      return Math.max(50, target);
    }

    function populateFood() {
      const target = desiredFoodCount();
      while (foodItems.length < target) {
        foodItems.push(new Food(Math.random() * WORLD.width, Math.random() * WORLD.height, 14 + Math.random() * 10));
      }
      const maxExtra = target + 120;
      if (foodItems.length > maxExtra) {
        foodItems.splice(0, foodItems.length - maxExtra);
      }
    }

    function buildColorPicker() {
      if (!colorPicker) return;
      colorPicker.innerHTML = "";
      PLAYER_COLORS.forEach((color, index) => {
        const option = document.createElement("button");
        option.type = "button";
        option.className = "color-option";
        option.style.setProperty("--swatch-color", color);
        option.dataset.color = color;
        if (index === 0) option.classList.add("active");
        option.addEventListener("click", () => setPlayerColor(color));
        colorPicker.appendChild(option);
      });
    }

    function setPlayerColor(color) {
      selectedColor = color;
      if (colorPicker) {
        Array.from(colorPicker.children).forEach((btn) => {
          btn.classList.toggle("active", btn.dataset.color === color);
        });
      }
      if (playerSnake) {
        playerSnake.color = color;
      }
    }

    function setSpectatingStatus() {
      statusChip.textContent = "Spectating - press Play to deploy";
      statusChip.style.background = "rgba(60, 245, 255, 0.12)";
      statusChip.style.color = "var(--accent)";
      hideScoreSubmission();
      startBtn.disabled = false;
      startBtn.textContent = "Play";
    }

    function hideScoreSubmission() {
      submitBtn.style.display = "none";
      submitBtn.disabled = false;
      submitBtn.dataset.score = "";
      submitStatus.style.display = "none";
      submitStatus.textContent = "";
      submitStatus.className = "submit-status";
    }

    function prepareScoreSubmission(score) {
      if (!LEADERBOARD_CONFIG || !isLeaderboardConfigured()) return;
      submitBtn.dataset.score = String(score);
      submitBtn.disabled = false;
      submitBtn.style.display = "inline-flex";
      submitStatus.style.display = "none";
    }

    function setSubmitFeedback(text, tone = "info") {
      submitStatus.textContent = text;
      submitStatus.className = \`submit-status tone-\${tone}\`;
      if (submitBtn.style.display !== "none") {
        submitStatus.style.display = "block";
      }
    }

    function shortenAddress(address) {
      return \`\${address.slice(0, 6)}…\${address.slice(-4)}\`;
    }

    function processRespawns(dt) {
      snakes.forEach((snake) => {
        if (snake.alive || snake.isPlayer) return;
        if (snake.respawnTimer > 0) {
          snake.respawnTimer -= dt;
        }
        if (snake.respawnTimer <= 0) {
          snake.heading = Math.random() * Math.PI * 2;
          snake.spawn();
        }
      });
    }

    function handleFoodConsumption(snake) {
      for (let i = foodItems.length - 1; i >= 0; i--) {
        const food = foodItems[i];
        if (distance(snake.segments[0], food) < snake.radius + 6) {
          const growth = snake.isPlayer ? food.energy * 0.18 : food.energy * 0.15;
          snake.grow(Math.max(0.6, growth / 4));
          foodItems.splice(i, 1);
        }
      }
    }

    function handleSnakeCollisions(snake) {
      if (!snake.alive || snake.collisionCooldown > 0) return;
      const head = snake.segments[0];
      for (const other of snakes) {
        if (!other.alive) continue;
        for (let i = other.isPlayer && snake === other ? 6 : 3; i < other.segments.length; i++) {
          const seg = other.segments[i];
          const minDist = snake.radius + other.radius * 0.8;
          if ((snake.spawnFade !== undefined && snake.spawnFade < 0.55) || (other.spawnFade !== undefined && other.spawnFade < 0.55)) {
            continue;
          }
          if (distance(head, seg) < minDist) {
            if (snake === other && i < 6) continue;
            snake.alive = false;
            const isPlayer = snake.isPlayer;
            const dropped = snake.dropFood(isPlayer ? 6 : 4);
            foodItems.push(...dropped);
            if (isPlayer) {
              statusChip.textContent = "Eliminated - tap Play to try again";
              statusChip.style.background = "rgba(255,79,109,0.12)";
              statusChip.style.color = "var(--danger)";
              if (snake.score > 0) {
                prepareScoreSubmission(snake.score);
              }
              running = false;
              INPUT.up = INPUT.down = INPUT.left = INPUT.right = false;
              INPUT.mouseAngle = null;
              startBtn.disabled = false;
              startBtn.textContent = "Play Again";
            } else {
              snake.respawnTimer = 1.6 + Math.random() * 1.4;
            }
            return;
          }
        }
      }
    }

    function updateLeaderboard() {
      leaderboardEl.innerHTML = "";
      if (isLeaderboardConfigured() && chainLeaderboard.length) {
        chainLeaderboard.slice(0, 5).forEach((entry, idx) => {
          const row = document.createElement("div");
          row.className = "score-row";
          const isYou =
            walletAddress && entry.address && walletAddress.toLowerCase() === entry.address.toLowerCase();
          if (isYou) {
            row.classList.add("you");
          }

          const colorChip = document.createElement("span");
          colorChip.className = "color-chip";
          colorChip.style.background = isYou ? "#ffffff" : "rgba(60,245,255,0.6)";

          const label = document.createElement("span");
          const displayName = isYou ? "You" : shortenAddress(entry.address);
          label.innerHTML = \`\${idx + 1}. \${displayName}\`;
          label.prepend(colorChip);

          const score = document.createElement("strong");
          score.textContent = entry.score.toString();

          row.appendChild(label);
          row.appendChild(score);
          leaderboardEl.appendChild(row);
        });

        if (!leaderboardEl.children.length) {
          const empty = document.createElement("div");
          empty.className = "score-empty";
          empty.textContent = "No on-chain scores yet. Be the first!";
          leaderboardEl.appendChild(empty);
        }
        return;
      }

      const ranked = snakes
        .filter((s) => s.alive)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

      if (!ranked.length) {
        const empty = document.createElement("div");
        empty.className = "score-empty";
        empty.textContent = "Play to populate the leaderboard.";
        leaderboardEl.appendChild(empty);
        return;
      }

      ranked.forEach((snake, idx) => {
        const row = document.createElement("div");
        row.className = "score-row";
        if (snake.isPlayer) {
          row.classList.add("you");
        }
        const colorChip = document.createElement("span");
        colorChip.className = "color-chip";
        colorChip.style.background = snake.color;

        const label = document.createElement("span");
        label.innerHTML = \`\${idx + 1}. \${snake.isPlayer ? "You" : "Bot " + snake.id}\`;
        label.prepend(colorChip);

        const score = document.createElement("strong");
        score.textContent = snake.score;

        row.appendChild(label);
        row.appendChild(score);
        leaderboardEl.appendChild(row);
      });
    }

    function somniaNetworkParams() {
      return {
        chainId: LEADERBOARD_CONFIG.chainHex,
        chainName: "Somnia Mainnet",
        nativeCurrency: { name: "Somnia", symbol: "SOMI", decimals: 18 },
        rpcUrls: [LEADERBOARD_CONFIG.rpcUrl],
        blockExplorerUrls: [LEADERBOARD_CONFIG.blockExplorer]
      };
    }

    async function ensureWriteContract() {
      if (!isLeaderboardConfigured()) {
        throw new Error("Leaderboard contract address not configured yet.");
      }
      if (typeof window.ethereum === "undefined") {
        throw new Error("No Web3 wallet detected. Install MetaMask or a compatible wallet.");
      }

      if (!web3Provider) {
        web3Provider = new ethers.providers.Web3Provider(window.ethereum, "any");
      }

      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: LEADERBOARD_CONFIG.chainHex }]
        });
      } catch (error) {
        if (error.code === 4902) {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [somniaNetworkParams()]
          });
        } else {
          throw error;
        }
      }

      const accounts = await web3Provider.send("eth_requestAccounts", []);
      handleAccountsChanged(accounts);

      if (!walletListenersAttached) {
        walletListenersAttached = true;
        window.ethereum.on("accountsChanged", handleAccountsChanged);
        window.ethereum.on("chainChanged", () => {
          web3Provider = null;
          writeContract = null;
          setTimeout(refreshChainLeaderboard, 500);
        });
      }

      if (!writeContract) {
        writeContract = new ethers.Contract(LEADERBOARD_CONFIG.address, LEADERBOARD_ABI, web3Provider.getSigner());
      }

      return writeContract;
    }

    function handleAccountsChanged(accounts) {
      if (!accounts || !accounts.length) {
        walletAddress = null;
        writeContract = null;
        return;
      }
      walletAddress = ethers.utils.getAddress(accounts[0]);
      setSubmitFeedback(\`Connected: \${shortenAddress(walletAddress)}\`, "info");
      updateLeaderboard();
    }

    async function refreshChainLeaderboard() {
      if (!isLeaderboardConfigured() || typeof ethers === "undefined") return;
      if (!readContract) {
        const provider = new ethers.providers.JsonRpcProvider(LEADERBOARD_CONFIG.rpcUrl);
        readContract = new ethers.Contract(LEADERBOARD_CONFIG.address, LEADERBOARD_ABI, provider);
      }
      try {
        const [players, scores] = await readContract.getTop(25);
        chainLeaderboard = players
          .map((player, idx) => {
            if (!player || player === ethers.constants.AddressZero) return null;
            const raw = scores[idx];
            let value = 0;
            try {
              value = raw.toNumber();
            } catch {
              value = parseInt(raw.toString(), 10);
            }
            return { address: player, score: value };
          })
          .filter(Boolean)
          .filter((entry) => entry.score > 0)
          .sort((a, b) => b.score - a.score);
      } catch (error) {
        console.warn("Failed to load on-chain leaderboard:", error.message || error);
      }
      updateLeaderboard();
    }

    async function submitScoreOnChain() {
      if (submittingScore) return;
      if (!isLeaderboardConfigured()) {
        setSubmitFeedback("Leaderboard contract not configured yet.", "error");
        return;
      }
      const score = Number(submitBtn.dataset.score || "0");
      if (!score) {
        setSubmitFeedback("No score to submit yet.", "error");
        return;
      }

      submittingScore = true;
      submitBtn.disabled = true;
      setSubmitFeedback("Preparing transaction…", "info");

      try {
        const contract = await ensureWriteContract();
        setSubmitFeedback("Submitting score to Somnia…", "info");
        const tx = await contract.submitScore(score);
        setSubmitFeedback("Waiting for confirmation…", "info");
        await tx.wait();
        setSubmitFeedback("Score submitted!", "success");
        submitBtn.style.display = "none";
        await refreshChainLeaderboard();
      } catch (error) {
        const message =
          error?.data?.message ||
          error?.error?.message ||
          error?.message ||
          "Failed to submit score.";
        setSubmitFeedback(message.replace("execution reverted: ", ""), "error");
        submitBtn.disabled = false;
      } finally {
        submittingScore = false;
      }
    }

    function updatePlayerStats() {
      if (!playerSnake) return;
      scoreLabel.textContent = playerSnake.score.toString();
      lengthLabel.textContent = Math.round(playerSnake.targetLength).toString();
    }

    function startGame() {
      snakes.length = 0;
      foodItems.length = 0;
      populateFood();
      hideScoreSubmission();
      for (let i = 0; i < WORLD.botCount; i++) {
        addSnake({
          id: i + 1,
          isPlayer: false,
          speed: 95 + Math.random() * 20,
          radius: 8.5 + Math.random() * 1.5,
          heading: Math.random() * Math.PI * 2,
          length: 9 + Math.random() * 4,
          color: COLORS[i % COLORS.length]
        });
      }
      playerSnake = addSnake({
        id: "player",
        isPlayer: true,
        speed: 130,
        radius: 11,
        heading: -Math.PI / 2,
        length: 6,
        color: selectedColor
      });
      setPlayerColor(selectedColor);
      updatePlayerStats();
      statusChip.textContent = "Deployed";
      statusChip.style.background = "rgba(69,255,177,0.12)";
      statusChip.style.color = "var(--success)";
      startBtn.textContent = "Restart";
      startBtn.disabled = false;
      INPUT.up = INPUT.down = INPUT.left = INPUT.right = false;
      INPUT.mouseAngle = null;
      running = true;
    }

    function update(dt) {
      if (!running) return;

      populateFood();

      snakes.forEach((snake) => {
        if (!snake.alive) return;
        snake.steer(dt);
        snake.move(dt);
        handleFoodConsumption(snake);
        handleSnakeCollisions(snake);
      });

      processRespawns(dt);
      for (let i = foodItems.length - 1; i >= 0; i--) {
        const food = foodItems[i];
        food.update(dt);
        if (food.decayTimer !== null && food.decayTimer === 0 && food.staleTime > 18) {
          foodItems.splice(i, 1);
        }
      }
      updateLeaderboard();
      updatePlayerStats();
    }

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Background grid
      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgba(60, 245, 255, 0.08)";
      const gridSize = 50;
      ctx.beginPath();
      for (let x = 0; x <= canvas.width; x += gridSize) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
      }
      for (let y = 0; y <= canvas.height; y += gridSize) {
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
      }
      ctx.stroke();

      foodItems.forEach((food) => food.draw(ctx));
      snakes.forEach((snake) => snake.draw(ctx));
    }

    function gameLoop(timestamp) {
      const dt = Math.min(0.05, (timestamp - lastTime) / 1000);
      lastTime = timestamp;
      update(dt);
      draw();
      requestAnimationFrame(gameLoop);
    }

    // Input listeners
    window.addEventListener("keydown", (event) => {
      const key = event.key.toLowerCase();
      if (key === "arrowup" || key === "w") {
        INPUT.up = true;
        INPUT.mouseAngle = null; // Clear mouse control when using keyboard
      }
      if (key === "arrowdown" || key === "s") {
        INPUT.down = true;
        INPUT.mouseAngle = null;
      }
      if (key === "arrowleft" || key === "a") {
        INPUT.left = true;
        INPUT.mouseAngle = null;
      }
      if (key === "arrowright" || key === "d") {
        INPUT.right = true;
        INPUT.mouseAngle = null;
      }
    });

    window.addEventListener("keyup", (event) => {
      const key = event.key.toLowerCase();
      if (key === "arrowup" || key === "w") INPUT.up = false;
      if (key === "arrowdown" || key === "s") INPUT.down = false;
      if (key === "arrowleft" || key === "a") INPUT.left = false;
      if (key === "arrowright" || key === "d") INPUT.right = false;
    });

    canvas.addEventListener("mousemove", (event) => {
      if (!playerSnake || !playerSnake.alive) return;
      // Only use mouse control if no keyboard keys are pressed
      if (INPUT.up || INPUT.down || INPUT.left || INPUT.right) {
        INPUT.mouseAngle = null;
        return;
      }
      const rect = canvas.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * canvas.width;
      const y = ((event.clientY - rect.top) / rect.height) * canvas.height;
      const dx = x - playerSnake.position.x;
      const dy = y - playerSnake.position.y;
      INPUT.mouseAngle = Math.atan2(dy, dx);
    });

    canvas.addEventListener("mouseleave", () => {
      INPUT.mouseAngle = null;
    });

    startBtn.addEventListener("click", () => {
      startGame();
    });

    submitBtn.addEventListener("click", submitScoreOnChain);

    // Touch control support
    canvas.addEventListener("touchmove", (event) => {
      if (!playerSnake || !playerSnake.alive) return;
      const touch = event.touches[0];
      const rect = canvas.getBoundingClientRect();
      const x = ((touch.clientX - rect.left) / rect.width) * canvas.width;
      const y = ((touch.clientY - rect.top) / rect.height) * canvas.height;
      INPUT.mouseAngle = Math.atan2(y - playerSnake.position.y, x - playerSnake.position.x);
    }, { passive: true });

    canvas.addEventListener("touchend", () => {
      INPUT.mouseAngle = null;
    });

    window.addEventListener("resize", () => {
      resizeCanvas();
      populateFood();
    });

    resizeCanvas();
    buildColorPicker();
    setSpectatingStatus();
    populateFood();
    if (isLeaderboardConfigured()) {
      refreshChainLeaderboard();
      setInterval(refreshChainLeaderboard, 60000);
    }
    updateLeaderboard();
    requestAnimationFrame(gameLoop);
  </script>
</body>
</html>


`;
}

// Space Invaders - from https://github.com/OmegaNetwork-source/spaceinvaders
function getSpaceInvadersTemplate() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Space Escape</title>
  <style>
    html, body {
      width: 100vw;
      height: 100vh;
      overflow: hidden;
    }
    body {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      width: 100vw;
      height: 100vh;
      background: radial-gradient(ellipse at center, #181830 0%, #050510 100%);
      color: #90f9ff;
      font-family: 'Orbitron', Arial, sans-serif;
      margin: 0;
      padding: 0;
      overflow-x: hidden;
    }
    .title {
      text-align: center;
      font-size: 3em;
      letter-spacing: 0.1em;
      margin-top: 60px;
      text-shadow: 0 0 20px #08f, 0 0 40px #fff8;
      font-weight: bold;
    }
    .subtitle {
      text-align: center;
      font-size: 1.5em;
      color: #a0e0ff;
      margin-bottom: 40px;
      text-shadow: 0 0 10px #070e22;
    }
    .ship-select {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 30px;
      margin: 0 auto 40px auto;
      max-width: 900px;
    }
    .ship {
      background: none;
      border: none;
      border-radius: 0;
      padding: 0;
      box-shadow: none;
      cursor: pointer;
      transition: none;
      position: relative;
    }
    .ship img {
      width: 70px;
      height: 70px;
      object-fit: contain;
      filter: none;
      pointer-events: none;
      background: none;
      border-radius: 0;
    }
    .ship.selected {
      border: 2.5px solid #6ffeff;
      box-shadow: 0 0 32px #91e6ff, 0 0 8px #fffbb7c7;
      transform: scale(1.11);
      z-index: 2;
    }
    .ship:hover {
      /* No hover styling at all */
    }
    .play-btn {
      display: block;
      margin: 40px auto 0 auto;
      background: linear-gradient(90deg, #25caff 40%, #ccfe55 100%);
      color: #18313a;
      font-family: 'Orbitron', Arial, sans-serif;
      font-size: 1.5em;
      font-weight: 900;
      padding: 16px 56px;
      border-radius: 14px;
      border: none;
      cursor: pointer;
      box-shadow: 0 0 24px #80faff70, 0 0 4px #faffabcc;
      transition: background 0.2s, box-shadow 0.2s, transform 0.1s;
      outline: none;
    }
    .play-btn:active {
      transform: scale(0.97);
      box-shadow: 0 0 10px #83ffd9bb;
    }
    .control-scheme-selector {
      display: flex;
      gap: 16px;
      justify-content: center;
      margin: 20px auto 0 auto;
      max-width: 500px;
    }
    .control-option {
      flex: 1;
      padding: 12px 20px;
      background: rgba(16, 32, 48, 0.6);
      border: 2px solid #4a7a9a;
      border-radius: 12px;
      cursor: pointer;
      text-align: center;
      font-family: 'Orbitron', Arial, sans-serif;
      font-size: 0.95em;
      color: #a0d0ff;
      transition: all 0.2s;
    }
    .control-option.selected {
      border-color: #6ffeff;
      background: rgba(46, 252, 255, 0.15);
      box-shadow: 0 0 20px #91e6ff66;
      color: #fff;
    }
    .control-option:hover {
      border-color: #8ffeff;
      background: rgba(46, 252, 255, 0.1);
    }
    .top-right-buttons {
      position: fixed;
      top: 20px;
      right: 20px;
      display: flex;
      gap: 12px;
      z-index: 200;
    }
    #leaderboardBtnTop {
      padding: 10px 20px;
      font-size: 0.95em;
      margin: 0;
      min-width: 140px;
    }
    #connectWalletBtnTop {
      padding: 10px 20px;
      font-size: 0.95em;
      margin: 0;
      min-width: 160px;
    }
    #gameCanvas {
      position: absolute;
      left: 0; top: 0;
      width: 100vw; height: 100vh;
      margin: 0; border: none; z-index: 10;
      box-shadow: none; background: none; display:none;
    }
    #gameOverOverlay {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(5, 6, 15, 0.86);
      z-index: 900;
      align-items: center;
      justify-content: center;
      backdrop-filter: blur(4px);
    }
    #gameOverOverlay .panel {
      text-align: center;
      padding: 32px 40px;
      border-radius: 24px;
      background: rgba(13,24,48,0.95);
      border: 1.5px solid #5bf4ff80;
      box-shadow: 0 0 44px #5ffaff82;
      color: #d0faff;
      min-width: 280px;
    }
    #gameOverOverlay .panel h2 {
      margin: 0 0 12px 0;
      font-size: 2.4em;
      color: #ffe05b;
    }
    #gameOverOverlay .panel .stat {
      font-size: 1.25em;
      margin-bottom: 12px;
    }
    #goSubmitBtn,
    #goConnectBtn,
    #goPlayAgainBtn {
      display: block;
      width: 100%;
      margin-top: 14px;
      font-size: 1.05em;
      background: linear-gradient(90deg, #25caff 40%, #ccfe55 100%);
      color: #122838;
      border: none;
      border-radius: 14px;
      padding: 14px;
      cursor: pointer;
      font-family: 'Orbitron', Arial, sans-serif;
      font-weight: 700;
      box-shadow: 0 0 16px #7ef7ff6b;
    }
    #goPlayAgainBtn {
      background: linear-gradient(90deg, #ffe55b 20%, #ffaf3d 100%);
      color: #2a1c00;
    }
    .menu {
      width: 90%;
      max-width: 1100px;
      background: #151536cc;
      border-radius: 28px;
      box-shadow: 0 0 66px 0 #0ff8, 0 0 6px 2px #90f8ff44;
      padding: 38px 8px 22px 8px;
      border: 1.5px solid #49f3fb55;
      z-index: 15;
      margin: 0;
      /* Remove margin-top to allow centering via flexbox */
    }
    .title, .subtitle, .ship-select, .play-btn { position: relative; z-index: 20; }
    #leaderboardOverlay {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(5, 6, 15, 0.88);
      z-index: 850;
      align-items: center;
      justify-content: center;
      backdrop-filter: blur(3px);
    }
    #leaderboardOverlay .panel {
      background: rgba(12, 26, 52, 0.96);
      border-radius: 24px;
      padding: 28px 36px;
      border: 1.5px solid #64f3ff80;
      box-shadow: 0 0 42px #5bf6ff77;
      color: #d9f9ff;
      min-width: 320px;
      max-height: 70vh;
      overflow-y: auto;
      text-align: center;
    }
    #leaderboardOverlay h2 {
      margin: 0 0 14px 0;
      color: #ffe05b;
      font-size: 2em;
    }
    #leaderboardList {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    #leaderboardList li {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 0;
      border-bottom: 1px solid #3a536b;
      font-family: 'Orbitron', Arial, sans-serif;
      font-size: 0.95em;
    }
    #leaderboardClose {
      margin-top: 18px;
      width: 100%;
      padding: 12px;
      border: none;
      border-radius: 12px;
      cursor: pointer;
      font-family: 'Orbitron', Arial, sans-serif;
      font-weight: 600;
      background: linear-gradient(90deg, #ff8c5b 0%, #ffd05b 100%);
      color: #1d1302;
      box-shadow: 0 0 18px #ffdf8a63;
    }
  </style>
  <link href="https://fonts.googleapis.com/css?family=Orbitron:700&display=swap" rel="stylesheet">
</head>
<body>
  <div class="top-right-buttons">
    <button id="connectWalletBtnTop" class="play-btn">CONNECT METAMASK</button>
    <button id="leaderboardBtnTop" class="play-btn">LEADERBOARD</button>
  </div>
  <div id="walletStatus" style="position:fixed;top:70px;right:20px;font-size:0.9em;color:#9cf;z-index:200;display:none;background:rgba(0,0,0,0.7);padding:8px 12px;border-radius:8px;"></div>
  <div class="menu">
    <div class="title">SPACE ESCAPE</div>
    <div class="subtitle">Select Your Spaceship</div>
    <div class="ship-select" id="shipSelect">
      <div class="ship"><img src="assets/ship1redone.png" alt="Ship 1"></div>
      <div class="ship"><img src="assets/8.png" alt="Ship 8"></div>
      <div class="ship"><img src="assets/9.png" alt="Ship 9"></div>
    </div>
    <div class="control-scheme-selector" style="margin-top:30px;">
      <div class="control-option selected" data-scheme="arrows" id="controlArrows">
        <div style="font-weight:bold;margin-bottom:4px;">Arrow Keys</div>
        <div style="font-size:0.85em;opacity:0.8;">↑↓←→ Move, Space Shoot</div>
      </div>
      <div class="control-option" data-scheme="wasd" id="controlWASD">
        <div style="font-weight:bold;margin-bottom:4px;">WASD</div>
        <div style="font-size:0.85em;opacity:0.8;">WASD Move, Space Shoot</div>
      </div>
    </div>
    <button id="playBtn" class="play-btn" style="margin-top:30px;display:none;opacity:0.45;pointer-events:none;">PLAY</button>
  </div>
  <canvas id="gameCanvas"></canvas>
  <div id="gameOverOverlay">
    <div class="panel">
      <h2>GAME OVER</h2>
      <div class="stat">Time Survived: <span id="goTime">0.0s</span></div>
      <div class="stat">Level: <span id="goLevel">1</span></div>
      <button id="goConnectBtn">Connect Wallet to Submit</button>
      <button id="goSubmitBtn">Submit Score</button>
      <button id="goPlayAgainBtn">Play Again</button>
    </div>
  </div>
  <div id="leaderboardOverlay">
    <div class="panel">
      <h2>Top Pilots</h2>
      <ul id="leaderboardList"></ul>
      <button id="leaderboardClose">Close</button>
    </div>
  </div>
  <!-- Mute Toggle Button -->
  <div id="muteToggle" style="position: fixed; bottom: 20px; left: 20px; z-index: 200; cursor: pointer; background: rgba(0,0,0,0.7); padding: 10px; border-radius: 8px; border: 2px solid #49f3fb;">
    <span id="muteIcon" style="font-size: 24px; color: #49f3fb;">🔊</span>
  </div>
  <script src="https://cdn.jsdelivr.net/npm/ethers@5.7.2/dist/ethers.umd.min.js"></script>
  <script>
    let muted = false;
    let currentShipImg = null;
    let selectedShipImg = '';
    let controlScheme = localStorage.getItem('spaceEscapeControls') || 'arrows';
    
    // Web Audio API for sound generation
    let audioContext = null;
    let audioInitialized = false;
    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      console.warn('Web Audio API not supported');
    }
    
    // Resume audio context on first user interaction (required by some browsers)
    function initAudio() {
      if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume().then(() => {
          audioInitialized = true;
        }).catch(e => {
          console.warn('Could not resume audio context:', e);
        });
      } else if (audioContext) {
        audioInitialized = true;
      }
    }
    
    // Initialize audio on any user interaction
    ['click', 'keydown', 'touchstart'].forEach(event => {
      document.addEventListener(event, initAudio, { once: true });
    });
    
    function playSound(type) {
      if (muted || !audioContext) return;
      
      // Try to resume if suspended
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }
      
      try {
        const now = audioContext.currentTime;
        
        if (type === 'sfxLaser') {
          // Player laser sound - high pitched beep
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          oscillator.frequency.setValueAtTime(800, now);
          oscillator.frequency.exponentialRampToValueAtTime(200, now + 0.1);
          oscillator.type = 'sine';
          
          gainNode.gain.setValueAtTime(0.3, now);
          gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
          
          oscillator.start(now);
          oscillator.stop(now + 0.1);
          
        } else if (type === 'sfxExplosion') {
          // Explosion sound - deep rumble
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          const filter = audioContext.createBiquadFilter();
          
          oscillator.connect(filter);
          filter.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(200, now);
          
          oscillator.frequency.setValueAtTime(100, now);
          oscillator.frequency.exponentialRampToValueAtTime(50, now + 0.3);
          oscillator.type = 'sawtooth';
          
          gainNode.gain.setValueAtTime(0.4, now);
          gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
          
          oscillator.start(now);
          oscillator.stop(now + 0.3);
          
        } else if (type === 'sfxEnemyShoot') {
          // Enemy bullet sound - lower pitch than player
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          oscillator.frequency.setValueAtTime(400, now);
          oscillator.frequency.exponentialRampToValueAtTime(150, now + 0.08);
          oscillator.type = 'square';
          
          gainNode.gain.setValueAtTime(0.2, now);
          gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
          
          oscillator.start(now);
          oscillator.stop(now + 0.08);
          
        } else if (type === 'sfxPowerUp') {
          // Power-up collection - ascending chime
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          oscillator.frequency.setValueAtTime(400, now);
          oscillator.frequency.linearRampToValueAtTime(800, now + 0.15);
          oscillator.type = 'sine';
          
          gainNode.gain.setValueAtTime(0.3, now);
          gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
          
          oscillator.start(now);
          oscillator.stop(now + 0.15);
          
        } else if (type === 'sfxShield') {
          // Shield hit - metallic ping
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          const filter = audioContext.createBiquadFilter();
          
          oscillator.connect(filter);
          filter.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          filter.type = 'bandpass';
          filter.frequency.setValueAtTime(1000, now);
          filter.Q.setValueAtTime(10, now);
          
          oscillator.frequency.setValueAtTime(600, now);
          oscillator.frequency.exponentialRampToValueAtTime(1200, now + 0.2);
          oscillator.type = 'sine';
          
          gainNode.gain.setValueAtTime(0.25, now);
          gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
          
          oscillator.start(now);
          oscillator.stop(now + 0.2);
          
        } else if (type === 'sfxLevelUp') {
          // Level up - triumphant chord
          for (let i = 0; i < 3; i++) {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            const freq = 400 + (i * 200);
            oscillator.frequency.setValueAtTime(freq, now + (i * 0.1));
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.2, now + (i * 0.1));
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.4 + (i * 0.1));
            
            oscillator.start(now + (i * 0.1));
            oscillator.stop(now + 0.4 + (i * 0.1));
          }
        }
      } catch (e) {
        console.warn('Error playing sound:', e);
      }
    }
    
    // Initialize mute toggle
    document.addEventListener('DOMContentLoaded', function() {
      const muteToggle = document.getElementById('muteToggle');
      const muteIcon = document.getElementById('muteIcon');
      if (muteToggle && muteIcon) {
        muteToggle.onclick = function() {
          muted = !muted;
          muteIcon.textContent = muted ? '🔇' : '🔊';
          muteIcon.style.color = muted ? '#888' : '#49f3fb';
        };
      }
    });
    
    // Initialize when DOM is ready
    document.addEventListener('DOMContentLoaded', function() {
      try {
        // --- Menu Ship Selection ---
        const ships = document.querySelectorAll('.ship');
        const playBtn = document.getElementById('playBtn');
        if (!playBtn) {
          console.error('Play button not found!');
          return;
        }
        
        ships.forEach((ship) => {
          ship.addEventListener('click', () => {
            ships.forEach(s => s.classList.remove('selected'));
            ship.classList.add('selected');
            const imgElem = ship.querySelector('img');
            if (imgElem) {
              selectedShipImg = imgElem.getAttribute('src');
              if (playBtn) {
                playBtn.style.display = 'block';
                playBtn.style.opacity = '1';
                playBtn.style.pointerEvents = 'auto';
              }
            }
          });
        });
        
        if (playBtn) {
          playBtn.addEventListener('click', () => {
            if (!selectedShipImg) {
              alert('Please select a spaceship first!');
              return;
            }
            document.querySelector('.menu').style.display = 'none';
            const gameCanvas = document.getElementById('gameCanvas');
            if (gameCanvas) {
              gameCanvas.style.display = 'block';
              currentShipImg = selectedShipImg;
              startGame(selectedShipImg);
            }
          });
        }

        // Control Scheme Selection
        const controlArrows = document.getElementById('controlArrows');
        const controlWASD = document.getElementById('controlWASD');
        if (controlArrows && controlWASD) {
          [controlArrows, controlWASD].forEach(opt => {
            opt.addEventListener('click', function() {
              [controlArrows, controlWASD].forEach(o => o.classList.remove('selected'));
              this.classList.add('selected');
              controlScheme = this.dataset.scheme;
              localStorage.setItem('spaceEscapeControls', controlScheme);
            });
          });
          if (controlScheme === 'wasd') {
            controlWASD.classList.add('selected');
            controlArrows.classList.remove('selected');
          }
        }
        // Initialize wallet connection buttons
        connectBtn = document.getElementById('connectWalletBtnTop');
        walletStatus = document.getElementById('walletStatus');
        
        if (connectBtn) {
          connectBtn.onclick = async function() {
            try {
              await connectWallet();
              if (userAddress) await getContract();
            } catch (e) {
              console.error('Connect wallet error:', e);
              if (walletStatus) {
                walletStatus.innerText = 'Error: ' + (e.message || e);
                walletStatus.style.display = 'block';
              }
            }
          };
        } else {
          console.error('Connect wallet button not found!');
        }
        
        // Initialize leaderboard button
        const leaderboardBtn = document.getElementById('leaderboardBtnTop');
        const leaderboardOverlay = document.getElementById('leaderboardOverlay');
        const leaderboardList = document.getElementById('leaderboardList');
        const leaderboardClose = document.getElementById('leaderboardClose');
        if (leaderboardBtn && leaderboardOverlay) {
          leaderboardBtn.onclick = async function(){
            await showLeaderboard();
          };
          if (leaderboardClose) {
            leaderboardClose.onclick = function(){
              leaderboardOverlay.style.display = 'none';
            };
          }
        }
        
      } catch (e) {
        console.error('Error initializing menu:', e);
      }
    });

    let userAddress = null;
    
    // MetaMask connect logic
    async function connectWallet() {
      console.log('[Wallet] connectWallet called');
      if (!window.ethereum) {
        if (walletStatus) {
          walletStatus.innerText = 'MetaMask not detected. Please install MetaMask.';
          walletStatus.style.display = 'block';
        }
        if (connectBtn) connectBtn.style.display = 'block';
        if (typeof goConnectBtn !== 'undefined' && goConnectBtn) {
          goConnectBtn.disabled = false;
          goConnectBtn.innerText = 'MetaMask Required';
        }
        if (typeof updateOverlayButtons === 'function') updateOverlayButtons();
        return;
      }
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        console.log('[Wallet] Accounts returned:', accounts);
        if (accounts && accounts[0]) {
          userAddress = accounts[0];
          if (walletStatus) {
            walletStatus.innerText = 'Connected: ' + userAddress.substring(0,6) + '...' + userAddress.substring(userAddress.length-4);
            walletStatus.style.display = 'block';
          }
          if (connectBtn) connectBtn.style.display = 'none';
          // Try to set up contract, but don't fail if network switch is rejected
          try {
            await getContract();
          } catch (contractErr) {
            console.warn('[Wallet] Contract setup failed (network switch may have been rejected):', contractErr);
            if (walletStatus) {
              walletStatus.innerText = 'Connected: ' + userAddress.substring(0,6) + '...' + userAddress.substring(userAddress.length-4) + ' (Switch to Somnia to submit scores)';
            }
          }
        }
      } catch (err) {
        console.warn('[Wallet] Connection rejected or failed:', err);
        if (walletStatus) {
          walletStatus.innerText = err && err.message ? err.message : 'Connection rejected.';
          walletStatus.style.display = 'block';
        }
      } finally {
        if (typeof goConnectBtn !== 'undefined' && goConnectBtn) {
          goConnectBtn.disabled = false;
          goConnectBtn.innerText = 'Connect Wallet to Submit';
        }
        if (typeof updateOverlayButtons === 'function') updateOverlayButtons();
      }
    }
    // --- Smart contract integration ---
    const CONTRACT_ADDRESS = "0x4ea34737f049214ea1cefe0212da2dfd6bcccfbc";
    const CONTRACT_ABI = [
      {
        "anonymous": false,
        "inputs": [
          {"indexed": true, "internalType": "address", "name": "player", "type": "address"},
          {"indexed": false, "internalType": "uint256", "name": "centiSeconds", "type": "uint256"}
        ],
        "name": "NewHighScore",
        "type": "event"
      },
      {"inputs": [{"internalType": "uint256", "name": "centiSeconds", "type": "uint256"}], "name": "submitScore", "outputs": [], "stateMutability": "nonpayable", "type": "function"},
      {"inputs": [{"internalType": "address", "name": "", "type": "address"}], "name": "bestScore", "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}], "stateMutability": "view", "type": "function"},
      {"inputs": [], "name": "getAllBestScores", "outputs": [ {"internalType": "address[]","name": "","type": "address[]"}, {"internalType": "uint256[]","name": "","type": "uint256[]"} ], "stateMutability": "view", "type": "function" },
      {"inputs": [{"internalType": "uint256","name": "","type": "uint256"}], "name": "leaderboardPlayers", "outputs": [{"internalType": "address", "name": "", "type": "address"}], "stateMutability": "view", "type": "function"}
    ];
    const SOMNIA_PARAMS = {
      chainId: '0x13A7',
      chainName: 'Somnia Mainnet',
      nativeCurrency: {
        name: 'Somnia',
        symbol: 'SOMI',
        decimals: 18
      },
      rpcUrls: ['https://api.infra.mainnet.somnia.network/'],
      blockExplorerUrls: ['https://explorer.somnia.network']
    };
    let contractInstance = null, provider = null;
    let lastGameOverScore = 0;
    let readonlyProvider = new ethers.providers.JsonRpcProvider(SOMNIA_PARAMS.rpcUrls[0]);
    let cleanupCurrentGame = null;

    async function ensureSomniaNetwork() {
      if (!window.ethereum) throw new Error('MetaMask required');
      const currentChain = await window.ethereum.request({ method: 'eth_chainId' });
      if (currentChain === SOMNIA_PARAMS.chainId) return;
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: SOMNIA_PARAMS.chainId }]
        });
      } catch (switchError) {
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [SOMNIA_PARAMS]
          });
        } else {
          throw switchError;
        }
      }
    }
    async function getContract() {
      if (!window.ethereum) throw new Error('MetaMask required');
      await ensureSomniaNetwork();
      provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      contractInstance = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
    }
    
    // On page load, try autoconnect if already authorized (runs after main DOMContentLoaded)
    setTimeout(async () => {
      if (window.ethereum && window.ethereum.selectedAddress && connectBtn && walletStatus) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts[0]) {
            userAddress = accounts[0];
            walletStatus.innerText = 'Connected: ' + userAddress.substring(0,6) + '...' + userAddress.substring(userAddress.length-4);
            walletStatus.style.display = 'block';
            connectBtn.style.display = 'none';
            await getContract();
            if (typeof updateOverlayButtons === 'function') updateOverlayButtons();
          }
        } catch (e) {
          console.warn('Auto-connect failed:', e);
        }
      }
    }, 100);

    // ---- SPACE ESCAPE GAME CORE ----
    function startGame(shipImgSrc) {
      if (!shipImgSrc) return;
      currentShipImg = shipImgSrc;
      if (cleanupCurrentGame) {
        cleanupCurrentGame();
      }
      const canvas = document.getElementById('gameCanvas');
      // --- Responsive canvas ---
      function resize() {
        // Maintain 16:9 or fill window if smaller
        const w = window.innerWidth, h = window.innerHeight;
        let arw = w, arh = h;
        if(w/h > 16/9) arw = h*16/9;
        else arh = w*9/16;
        canvas.width = arw; canvas.height = arh;
        canvas.style.width = w+'px';
        canvas.style.height = h+'px';
      }
      window.addEventListener('resize', resize);
      resize();
      const ctx = canvas.getContext('2d');
      const shipImg = new Image();
      shipImg.src = shipImgSrc;

      let enemySpawnInt;
      let hazardSpawnInt;
      let keyHandlers = { down: null, up: null };

      // Player ship state
      let player = {
        x: canvas.width/2,
        y: canvas.height-100,
        w: 66,
        h: 66,
        speed: 7,
        img: shipImg,
      };
      let score = 0;
      let gameOver = false;
      let timeStart = Date.now();
      let timeSurvived = 0;
      let pausedTime = 0; // Accumulated paused time
      let pauseStartTime = 0; // When the pause started
      let isPaused = false; // Whether the game is currently paused
      let level = 1;
      let nextLevelTime = 60000; // 1 minute in ms

      // Keyboard input
      let keys = {};
      keyHandlers.down = e => { keys[e.code] = true; };
      keyHandlers.up = e => { keys[e.code] = false; };
      document.addEventListener('keydown', keyHandlers.down);
      document.addEventListener('keyup', keyHandlers.up);

      // Handle window/tab visibility changes to pause timer
      // Use only visibility API for reliability
      function handleVisibilityChange() {
        if (document.hidden || document.visibilityState === 'hidden') {
          // Window/tab became hidden - pause timer
          if (!isPaused) {
            pauseStartTime = Date.now();
            isPaused = true;
          }
        } else {
          // Window/tab became visible - resume timer
          if (isPaused && pauseStartTime > 0) {
            pausedTime += Date.now() - pauseStartTime;
            isPaused = false;
            pauseStartTime = 0;
          }
        }
      }
      document.addEventListener('visibilitychange', handleVisibilityChange);

      // Initialize enemy state before spawner logic
      const enemyImg = new Image();
      enemyImg.src = 'assets/evil.png';
      enemyImg.onerror = () => { console.error('Could not load enemy image at: assets/evil.png'); };
      let enemies = [];

      // Villain ship system
      const villainImg = new Image();
      villainImg.src = 'assets/villian.png';
      villainImg.onerror = () => { console.error('Could not load villain image at: assets/villian.png'); };
      let villain = null;
      let lastVillainSpawnCheck = 0;
      const VILLAIN_SPAWN_CHANCE = 0.002; // 0.2% chance per frame (roughly every 10-15 seconds)
      const VILLAIN_MAX_HEALTH = 5; // Takes 5 hits to destroy

      // Lasers
      let lasers = [];
      let canShoot = true;
      let shootInterval;
      function shoot() {
        const currentTime = Date.now();
        const hasRapidFire = activePowerUps.rapidFire > currentTime;
        const hasTripleShot = activePowerUps.tripleShot > currentTime;
        const cooldown = hasRapidFire ? 60 : 120;
        if (canShoot) {
          if (hasTripleShot) {
            lasers.push({ x: player.x - 15, y: player.y - 40, w: 5, h: 20, color: '#fffd30' });
            lasers.push({ x: player.x, y: player.y - 40, w: 5, h: 20, color: '#fffd30' });
            lasers.push({ x: player.x + 15, y: player.y - 40, w: 5, h: 20, color: '#fffd30' });
          } else {
            lasers.push({ x: player.x, y: player.y - 40, w: 5, h: 20, color: '#fffd30' });
          }
          canShoot = false;
          shootInterval = setTimeout(() => canShoot = true, cooldown);
          playSound('sfxLaser');
        }
      }

      // Enemies - use adjustable speed/spawn for scaling
      let enemySpeed = 1.8;
      let enemySpawnRate = 1200;
      let enemyBullets = [];
      function spawnEnemy() {
        enemies.push({
          x: Math.random() * (canvas.width-46) + 23,
          y: -40,
          w: 50,
          h: 50,
          vy: enemySpeed + Math.random()*0.8,
          alive: true,
          lastShot: Date.now() - 1000, // Start with some time already passed so they shoot sooner
          shootCooldown: 1500 + Math.random() * 1000
        });
      }
      // Enemy spawner: always clear interval first, even if not set
      function setEnemySpawner() {
        if (enemySpawnInt) { clearInterval(enemySpawnInt); enemySpawnInt = null; }
        enemySpawnInt = setInterval(spawnEnemy, enemySpawnRate);
      }
      setEnemySpawner();

      // Power-ups
      let powerUps = [];
      let activePowerUps = {
        shield: 0,
        rapidFire: 0,
        tripleShot: 0
      };
      function dropPowerUp(x, y) {
        const type = Math.random();
        if (type < 0.4) {
          powerUps.push({ x, y, w: 40, h: 40, type: 'shield', color: '#00ffff', collected: false });
        } else if (type < 0.7) {
          powerUps.push({ x, y, w: 40, h: 40, type: 'rapidFire', color: '#ffff00', collected: false });
        } else {
          powerUps.push({ x, y, w: 40, h: 40, type: 'tripleShot', color: '#ff00ff', collected: false });
        }
      }

      // Space debris/asteroids/comets
      let hazards = [];
      // Hazards - use adjustable speed/spawn for scaling
      let hazardSpeed = 2.2;
      let hazardSpawnRate = 1100;
      function spawnHazard() {
        const type = Math.random();
        let speedAdj = hazardSpeed + Math.random();
        if (type < 1/3) {
          // Comet
          hazards.push({ x: Math.random()*canvas.width, y: -24, r: 28+Math.random()*12, vy: speedAdj+0.9, comet: true });
        } else if (type < 2/3) {
          // Satellite
          hazards.push({ x: Math.random()*canvas.width, y: -24, r: 35+Math.random()*16, vy: speedAdj+0.7, sat: true });
        } else {
          // Alien
          let rotInit = Math.random() * Math.PI * 2;
          let rotSpeed = 0.015 + Math.random() * 0.008;
          hazards.push({ x: Math.random()*canvas.width, y: -28, r: 32+Math.random()*17, vy: speedAdj+0.5, alien: true, rot: rotInit, rotSpeed });
        }
      }
      // Hazards
      function setHazardSpawner() {
        if (hazardSpawnInt) { clearInterval(hazardSpawnInt); hazardSpawnInt = null; }
        hazardSpawnInt = setInterval(spawnHazard, hazardSpawnRate);
      }
      setHazardSpawner();

      // Star field for scrolling effect
      let stars = Array.from({length: 48}, () => ({
        x: Math.random()*canvas.width,
        y: Math.random()*canvas.height,
        r: Math.random()*2+0.5,
        v: Math.random()*1+0.2
      }));
      function drawStars() {
        ctx.save();
        ctx.globalAlpha = 0.75;
        ctx.fillStyle = '#bfffff';
        for (let s of stars) {
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r, 0, Math.PI*2);
          ctx.fill();
          s.y += s.v;
          if (s.y > canvas.height) { s.y = 0; s.x = Math.random()*canvas.width; }
        }
        ctx.restore();
      }

      function isColliding(a, b) {
        return a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y;
      }
      function isCircleShipColliding(circle, ship) {
        // Ship = rect. Closest point
        let rx = Math.max(ship.x-ship.w/2, Math.min(circle.x, ship.x+ship.w/2));
        let ry = Math.max(ship.y-ship.h/2, Math.min(circle.y, ship.y+ship.h/2));
        let dx = circle.x - rx, dy = circle.y - ry;
        return (dx*dx + dy*dy) <= circle.r*circle.r;
      }
      function isRectCircleColliding(rect, circle) {
        // rect: {x, y, w, h}; circle: {x, y, r}
        let rx = Math.max(rect.x, Math.min(circle.x, rect.x+rect.w));
        let ry = Math.max(rect.y, Math.min(circle.y, rect.y+rect.h));
        let dx = circle.x - rx, dy = circle.y - ry;
        return (dx*dx + dy*dy) <= (circle.r+2)*(circle.r+2); // +2 "padding" for generosity
      }

      // Hold game over score globally to use in button
      // Helper: always get latest connected account
      async function getMetaMaskAccount() {
        if (!window.ethereum) return null;
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        return accounts && accounts[0] ? accounts[0] : null;
      }
      // Listen for account change
      if (window.ethereum) {
        window.ethereum.on('accountsChanged', async function(accounts) {
          userAddress = accounts[0] || null;
          if (userAddress) await getContract();
        });
      }
      // Utility to remove submit button always
      function removeSubmitButton() {
        let btn=document.getElementById('submitScoreBtn');
        if(btn) btn.remove();
      }
      // Utility to remove both buttons
      function removeGameOverButtons() {
        let b1 = document.getElementById('submitScoreBtn');
        let b2 = document.getElementById('connectWalletBtnGo');
        if(b1) b1.remove();
        if(b2) b2.remove();
      }
      // Update showGameOver for clean logic
      function showGameOver() {
        console.log('[GameOver] Display overlay with score', timeSurvived, 'level', level);
        if (cleanupCurrentGame) {
          cleanupCurrentGame();
          cleanupCurrentGame = null;
        }
        lastGameOverScore = timeSurvived;
        goTime.innerText = timeSurvived.toFixed(1)+'s';
        goLevel.innerText = level;
        updateOverlayButtons();
        goOverlay.style.display = 'flex';
      }
      function restart() {window.location.reload();}

      let explosions = []; // {x, y, start, duration}

      function gameLoop() {
        try {
          ctx.clearRect(0,0,canvas.width,canvas.height);
          drawStars();
        // Score/Time/Level display - account for paused time
        let currentPausedTime = pausedTime || 0;
        if (isPaused && pauseStartTime > 0) {
          currentPausedTime += Date.now() - pauseStartTime;
        }
        timeSurvived = Math.max(0, (Date.now() - timeStart - currentPausedTime) / 1000);
        ctx.save();
        ctx.font = '1.22em Orbitron, Arial';
        ctx.fillStyle = '#cfffff';
        ctx.textAlign = 'left';
        ctx.fillText('Time Survived: '+timeSurvived.toFixed(1)+'s', 28, 44);
        ctx.fillText('Level: '+level, 28, 72);
        // Power-up status
        const currentTime = Date.now();
        let puY = 100;
        if (activePowerUps.shield > currentTime) {
          ctx.fillStyle = '#00ffff';
          ctx.fillText('🛡️ Shield', 28, puY);
          puY += 28;
        }
        if (activePowerUps.rapidFire > currentTime) {
          ctx.fillStyle = '#ffff00';
          ctx.fillText('⚡ Rapid Fire', 28, puY);
          puY += 28;
        }
        if (activePowerUps.tripleShot > currentTime) {
          ctx.fillStyle = '#ff00ff';
          ctx.fillText('💥 Triple Shot', 28, puY);
        }
        ctx.restore();
        // Difficulty scaling
        if (timeSurvived*1000 > level*nextLevelTime) {
          level++;
          playSound('sfxLevelUp');
          enemySpeed += 0.58;
          hazardSpeed += 0.51;
          enemySpawnRate = Math.max(340, enemySpawnRate-160);
          hazardSpawnRate = Math.max(280, hazardSpawnRate-100);
          setEnemySpawner();
          setHazardSpawner();
        }
        // Clamp movement so ship cannot leave visible area
        if (controlScheme === 'wasd') {
          if (keys['KeyA']) player.x = Math.max(player.x - player.speed, player.w/2);
          if (keys['KeyD']) player.x = Math.min(player.x + player.speed, canvas.width - player.w/2);
          if (keys['KeyW']) player.y = Math.max(player.y - player.speed, player.h/2);
          if (keys['KeyS']) player.y = Math.min(player.y + player.speed, canvas.height - player.h/2);
        } else {
          if (keys['ArrowLeft']) player.x = Math.max(player.x - player.speed, player.w/2);
          if (keys['ArrowRight']) player.x = Math.min(player.x + player.speed, canvas.width - player.w/2);
          if (keys['ArrowUp']) player.y = Math.max(player.y - player.speed, player.h/2);
          if (keys['ArrowDown']) player.y = Math.min(player.y + player.speed, canvas.height - player.h/2);
        }
        if (keys['Space']) shoot();
        // Only draw player if image is loaded
        if (player.img && player.img.complete && player.img.naturalHeight !== 0) {
          ctx.drawImage(player.img, player.x-player.w/2, player.y-player.h/2, player.w, player.h);
        }
        // Lasers
        ctx.save();
        for (let laser of lasers) ctx.fillStyle = laser.color, ctx.fillRect(laser.x-2, laser.y, laser.w, laser.h);
        ctx.restore();
        lasers = lasers.filter(l => l.y > -24); for(let laser of lasers){ laser.y -= 11; }
        
        // Villain spawn check (random chance)
        if (!villain && Math.random() < VILLAIN_SPAWN_CHANCE) {
          villain = {
            x: Math.random() * (canvas.width - 100) + 50,
            y: Math.random() * (canvas.height * 0.4) + 50, // Spawn in upper portion
            w: 80,
            h: 80,
            vx: (Math.random() - 0.5) * 3, // Random horizontal movement
            vy: (Math.random() - 0.5) * 2, // Random vertical movement
            health: VILLAIN_MAX_HEALTH,
            maxHealth: VILLAIN_MAX_HEALTH,
            lastShot: Date.now() - 500,
            shootCooldown: 1000 + Math.random() * 500
          };
        }
        
        // Enemies
        for (let enemy of enemies) {
          if (!enemy.alive) continue;
          if (enemyImg && enemyImg.complete && enemyImg.naturalHeight !== 0) {
            ctx.drawImage(enemyImg, enemy.x-enemy.w/2, enemy.y-enemy.h/2, enemy.w, enemy.h);
          }
          enemy.y += enemy.vy;
          // Enemy shooting
          if (Date.now() - enemy.lastShot > enemy.shootCooldown && enemy.y > 50 && enemy.y < canvas.height - 100) {
            enemyBullets.push({ x: enemy.x, y: enemy.y + enemy.h/2, w: 6, h: 16, vy: 5 + Math.random()*2, color: '#ff0000' });
            enemy.lastShot = Date.now();
            enemy.shootCooldown = 1500 + Math.random() * 1000;
            playSound('sfxEnemyShoot');
          }
          if(isColliding(
            {x: player.x-player.w/2, y: player.y-player.h/2, w: player.w, h: player.h},
            {x: enemy.x-enemy.w/2, y: enemy.y-enemy.h/2, w: enemy.w, h: enemy.h}
          )) { 
            const currentTime = Date.now();
            if (activePowerUps.shield > currentTime) {
              activePowerUps.shield = 0; // Shield absorbs one hit
              playSound('sfxShield');
            } else {
              gameOver = true;
            }
          }
        }
        // Enemy bullets
        for (let bullet of enemyBullets) {
          ctx.save();
          ctx.fillStyle = bullet.color;
          ctx.fillRect(bullet.x-3, bullet.y, bullet.w, bullet.h);
          // Add glow effect
          ctx.shadowBlur = 10;
          ctx.shadowColor = '#ff0000';
          ctx.fillRect(bullet.x-3, bullet.y, bullet.w, bullet.h);
          ctx.restore();
          bullet.y += bullet.vy;
          // Handle villain bullets that can move in any direction
          if (bullet.vx !== undefined) {
            bullet.x += bullet.vx;
          }
          // Collision with player
          if (isColliding(
            {x: player.x-player.w/2, y: player.y-player.h/2, w: player.w, h: player.h},
            {x: bullet.x-3, y: bullet.y, w: bullet.w, h: bullet.h}
          )) {
            const currentTime = Date.now();
            if (activePowerUps.shield > currentTime) {
              activePowerUps.shield = 0; // Shield absorbs one hit
              playSound('sfxShield');
            } else {
              gameOver = true;
            }
            bullet.y = canvas.height + 100;
          }
        }
        enemyBullets = enemyBullets.filter(b => {
          // Keep bullets that are on screen (either moving down or in any direction)
          if (b.vx !== undefined) {
            return b.x > -50 && b.x < canvas.width + 50 && b.y > -50 && b.y < canvas.height + 50;
          }
          return b.y < canvas.height + 50;
        });
        
        // Villain rendering and logic
        if (villain && villain.health > 0) {
          // Draw villain with glow effect
          ctx.save();
          ctx.shadowBlur = 15;
          ctx.shadowColor = '#ff0000';
          if (villainImg.complete && villainImg.naturalHeight !== 0) {
            ctx.drawImage(villainImg, villain.x - villain.w/2, villain.y - villain.h/2, villain.w, villain.h);
          } else {
            // Draw placeholder if image not loaded
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(villain.x - villain.w/2, villain.y - villain.h/2, villain.w, villain.h);
          }
          ctx.shadowBlur = 0;
          ctx.restore();
          
          // Villain movement - flies around, bounces off edges
          villain.x += villain.vx;
          villain.y += villain.vy;
          
          // Bounce off screen edges
          if (villain.x <= villain.w/2 || villain.x >= canvas.width - villain.w/2) {
            villain.vx = -villain.vx;
            villain.x = Math.max(villain.w/2, Math.min(canvas.width - villain.w/2, villain.x));
          }
          if (villain.y <= villain.h/2 || villain.y >= canvas.height - villain.h/2) {
            villain.vy = -villain.vy;
            villain.y = Math.max(villain.h/2, Math.min(canvas.height - villain.h/2, villain.y));
          }
          
          // Villain health bar
          const barWidth = 120;
          const barHeight = 8;
          const barX = villain.x - barWidth/2;
          const barY = villain.y - villain.h/2 - 20;
          ctx.save();
          ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
          ctx.fillRect(barX, barY, barWidth, barHeight);
          const healthPercent = villain.health / villain.maxHealth;
          ctx.fillStyle = healthPercent > 0.5 ? '#00ff00' : healthPercent > 0.3 ? '#ffff00' : '#ff0000';
          ctx.fillRect(barX, barY, healthPercent * barWidth, barHeight);
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1;
          ctx.strokeRect(barX, barY, barWidth, barHeight);
          ctx.font = 'bold 0.8em Orbitron, Arial';
          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.fillText(\`HP: \${villain.health}/\${villain.maxHealth}\`, villain.x, barY - 5);
          ctx.restore();
          
          // Villain shooting at player
          if (Date.now() - villain.lastShot > villain.shootCooldown) {
            // Calculate direction to player
            const dx = player.x - villain.x;
            const dy = player.y - villain.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const speed = 4;
            
            // Prevent division by zero
            if (distance > 0.1) {
              enemyBullets.push({
                x: villain.x,
                y: villain.y + villain.h/2,
                w: 8,
                h: 20,
                vx: (dx / distance) * speed,
                vy: (dy / distance) * speed,
                color: '#ff6600'
              });
              villain.lastShot = Date.now();
              villain.shootCooldown = 1000 + Math.random() * 500;
              playSound('sfxEnemyShoot');
            }
          }
          
          // Villain collision with player
          if(isColliding(
            {x: player.x-player.w/2, y: player.y-player.h/2, w: player.w, h: player.h},
            {x: villain.x-villain.w/2, y: villain.y-villain.h/2, w: villain.w, h: villain.h}
          )) { 
            const currentTime = Date.now();
            if (activePowerUps.shield > currentTime) {
              activePowerUps.shield = 0;
              playSound('sfxShield');
            } else {
              gameOver = true;
            }
          }
        }
        
        // Lasers hit enemy ships
        for (let laser of lasers) { for (let enemy of enemies) {
            if (!enemy.alive) continue;
            let enemyRect = {x: enemy.x-enemy.w/2, y: enemy.y-enemy.h/2, w: enemy.w, h: enemy.h};
            let laserRect = {x: laser.x-2, y: laser.y, w: laser.w, h: laser.h};
            if (isColliding(laserRect, enemyRect)) {
              // Explosion on hit
              explosions.push({x: enemy.x, y: enemy.y, start: performance.now(), duration: 350});
              enemy.alive = false;
              laser.y = -100;
              playSound('sfxExplosion');
              // Chance to drop power-up (50%)
              if (Math.random() < 0.5) {
                dropPowerUp(enemy.x, enemy.y);
              }
            }
        }}
        enemies = enemies.filter(e => e.y < canvas.height+22 && e.alive);
        
        // Lasers hit villain
        if (villain && villain.health > 0) {
          for (let laser of lasers) {
            let villainRect = {x: villain.x-villain.w/2, y: villain.y-villain.h/2, w: villain.w, h: villain.h};
            let laserRect = {x: laser.x-2, y: laser.y, w: laser.w, h: laser.h};
            if (isColliding(laserRect, villainRect)) {
              villain.health--;
              laser.y = -100;
              playSound('sfxExplosion');
              explosions.push({x: villain.x, y: villain.y, start: performance.now(), duration: 250});
              
              // Villain destroyed
              if (villain.health <= 0) {
                explosions.push({x: villain.x, y: villain.y, start: performance.now(), duration: 600});
                playSound('sfxExplosion');
                // Guaranteed power-up drops
                dropPowerUp(villain.x, villain.y);
                dropPowerUp(villain.x - 30, villain.y);
                dropPowerUp(villain.x + 30, villain.y);
                villain = null;
              }
            }
          }
        }
        
        // Lasers hit hazard (comet, sat, alien): circle collision
        for (let laser of lasers) {
          for (let debris of hazards) {
            if (debris.gone) continue;
            if (debris.comet || debris.sat || debris.alien) {
              let lrect = {x: laser.x-2, y: laser.y, w: laser.w, h: laser.h};
              let ccirc = {x: debris.x, y: debris.y, r: debris.r};
              if (isRectCircleColliding(lrect, ccirc)) {
                explosions.push({x: debris.x, y: debris.y, start: performance.now(), duration: 350});
                debris.gone = true;
                laser.y = -110;
                playSound('sfxExplosion');
              }
            }
          }
        }
        hazards = hazards.filter(d => d.y < canvas.height+60 && !d.gone);
        // Power-ups
        for (let pu of powerUps) {
          if (pu.collected) continue;
          // Draw power-up with pulsing effect
          ctx.save();
          const pulse = Math.sin(Date.now() / 200) * 0.2 + 0.8;
          ctx.globalAlpha = pulse;
          // Add glow effect
          ctx.shadowBlur = 15;
          ctx.shadowColor = pu.color;
          ctx.fillStyle = pu.color;
          ctx.beginPath();
          ctx.arc(pu.x, pu.y, pu.w/2, 0, Math.PI*2);
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 3;
          ctx.stroke();
          ctx.restore();
          pu.y += 2;
          // Collection
          if (isColliding(
            {x: player.x-player.w/2, y: player.y-player.h/2, w: player.w, h: player.h},
            {x: pu.x-pu.w/2, y: pu.y-pu.h/2, w: pu.w, h: pu.h}
          )) {
            pu.collected = true;
            playSound('sfxPowerUp');
            if (pu.type === 'shield') {
              activePowerUps.shield = Date.now() + 10000; // 10 seconds
            } else if (pu.type === 'rapidFire') {
              activePowerUps.rapidFire = Date.now() + 8000; // 8 seconds
            } else if (pu.type === 'tripleShot') {
              activePowerUps.tripleShot = Date.now() + 12000; // 12 seconds
            }
          }
        }
        powerUps = powerUps.filter(pu => pu.y < canvas.height + 50 && !pu.collected);
        // Update power-up timers
        const nowTime = Date.now();
        if (activePowerUps.shield > 0 && activePowerUps.shield < nowTime) activePowerUps.shield = 0;
        if (activePowerUps.rapidFire > 0 && activePowerUps.rapidFire < nowTime) activePowerUps.rapidFire = 0;
        if (activePowerUps.tripleShot > 0 && activePowerUps.tripleShot < nowTime) activePowerUps.tripleShot = 0;
        // Draw shield effect
        const shieldTime = Date.now();
        if (activePowerUps.shield > shieldTime) {
          ctx.save();
          ctx.globalAlpha = 0.4;
          ctx.strokeStyle = '#00ffff';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(player.x, player.y, player.w/2 + 8, 0, Math.PI*2);
          ctx.stroke();
          ctx.restore();
        }
        // Draw explosions LAST so they're on top
        let now = performance.now();
        for (let i = explosions.length - 1; i >= 0; --i) {
          let ex = explosions[i];
          let t = (now - ex.start) / ex.duration;
          if (t > 1) { explosions.splice(i, 1); continue; }
          let r1 = 14 + 20 * (1-t), r2 = 6 + 8*(1-t);
          ctx.save();
          ctx.globalAlpha = 0.6 * (1-t);
          ctx.beginPath(); ctx.arc(ex.x, ex.y, r1, 0, Math.PI*2);
          ctx.fillStyle = 'orange'; ctx.fill();
          ctx.beginPath(); ctx.arc(ex.x, ex.y, r2, 0, Math.PI*2);
          ctx.fillStyle = 'yellow'; ctx.fill();
          ctx.globalAlpha = 0.22 * (1-t);
          ctx.beginPath(); ctx.arc(ex.x, ex.y, r1*2, 0, Math.PI*2);
          ctx.fillStyle = 'red'; ctx.fill();
          ctx.restore();
        }
        if (gameOver) { showGameOver(); return; }
        requestAnimationFrame(gameLoop);
        } catch (error) {
          console.error('Game loop error:', error);
          // Continue game loop even if there's an error
          requestAnimationFrame(gameLoop);
        }
      }
      const cometImg = new Image();
      cometImg.src = 'assets/commet.png';
      cometImg.onerror = () => { console.error('Could not load comet image at: assets/commet.png'); };
      const satImg = new Image();
      satImg.src = 'assets/sat.png';
      satImg.onerror = () => { console.error('Could not load satellite image at: assets/sat.png'); };
      const alienImg = new Image();
      alienImg.src = 'assets/alien.png';
      alienImg.onerror = () => { console.error('Could not load alien image at: assets/alien.png'); };
      cleanupCurrentGame = function(){
        if (enemySpawnInt) clearInterval(enemySpawnInt);
        if (hazardSpawnInt) clearInterval(hazardSpawnInt);
        document.removeEventListener('keydown', keyHandlers.down);
        document.removeEventListener('keyup', keyHandlers.up);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        enemySpawnInt = null;
        hazardSpawnInt = null;
      };
      shipImg.onload = () => { gameLoop(); };
    }
    // Add score submit flow
    async function submitScoreToContract(scoreSec) {
      if (!userAddress || !contractInstance) throw new Error('Wallet not connected');
      await ensureSomniaNetwork();
      const centiSec = Math.round(scoreSec * 100);
      try {
        playBtn.innerText = "Submitting score...";
        playBtn.disabled = true;
        let tx = await contractInstance.submitScore(centiSec);
        await tx.wait();
        setTimeout(()=>{
          alert('Score submitted! Your best: '+scoreSec.toFixed(2)+'s');
        }, 200);
      } catch (e) {
        console.error("Score submit failed:", e);
        alert('Failed to submit score! '+(e && e.message ? e.message : ''));
      } finally {
        playBtn.innerText = "PLAY AGAIN";
        playBtn.disabled = false;
      }
    }
    const goOverlay = document.getElementById('gameOverOverlay');
    const goTime = document.getElementById('goTime');
    const goLevel = document.getElementById('goLevel');
    const goConnectBtn = document.getElementById('goConnectBtn');
    const goSubmitBtn = document.getElementById('goSubmitBtn');
    const goPlayAgainBtn = document.getElementById('goPlayAgainBtn');
    const leaderboardBtn = document.getElementById('leaderboardBtnTop');
    const leaderboardOverlay = document.getElementById('leaderboardOverlay');
    const leaderboardList = document.getElementById('leaderboardList');
    const leaderboardClose = document.getElementById('leaderboardClose');
    function updateOverlayButtons() {
      const hasMM = !!window.ethereum;
      console.log('[Overlay] updateOverlayButtons - hasMetaMask?', hasMM, 'userAddress:', userAddress);
      if (!hasMM) {
        goConnectBtn.style.display = 'none';
        goSubmitBtn.style.display = 'none';
        return;
      }
      if (userAddress) {
        goConnectBtn.style.display = 'none';
        goSubmitBtn.style.display = 'block';
        goSubmitBtn.disabled = false;
        goSubmitBtn.innerText = 'Submit Score';
      } else {
        goConnectBtn.style.display = 'block';
        goConnectBtn.disabled = false;
        goConnectBtn.innerText = 'Connect Wallet to Submit';
        goSubmitBtn.style.display = 'none';
      }
    }
    goConnectBtn.onclick = async function(){
      goConnectBtn.disabled = true;
      goConnectBtn.innerText = 'Connecting...';
      await connectWallet();
      updateOverlayButtons();
    };
    goSubmitBtn.onclick = async function(){
      if (!userAddress || !contractInstance) return;
      goSubmitBtn.disabled = true;
      goSubmitBtn.innerText = 'Submitting...';
      try {
        await submitScoreToContract(lastGameOverScore);
        goSubmitBtn.innerText = 'Submitted!';
      } catch(e) {
        goSubmitBtn.innerText = 'Submit Score';
        goSubmitBtn.disabled = false;
        alert('Failed to submit: ' + (e.message || e));
      }
    };
    goPlayAgainBtn.onclick = function(){
      goOverlay.style.display = 'none';
      if (currentShipImg) {
        startGame(currentShipImg);
      } else {
        window.location.reload();
      }
    };
    leaderboardBtn.onclick = async function(){
      await showLeaderboard();
    };
    leaderboardClose.onclick = function(){
      leaderboardOverlay.style.display = 'none';
    };
    async function showLeaderboard() {
      try {
        let lbContract;
        if (contractInstance) {
          lbContract = contractInstance;
        } else {
          lbContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, readonlyProvider);
        }
        const [addresses, scores] = await lbContract.getAllBestScores();
        const entries = addresses.map((addr, idx) => ({
          address: addr,
          score: scores[idx] ? scores[idx].toNumber() : 0
        })).filter(e => e.score > 0);
        entries.sort((a,b)=>b.score - a.score);
        const top = entries.slice(0,10);
        leaderboardList.innerHTML = '';
        if (!top.length) {
          const li = document.createElement('li');
          li.style.justifyContent = 'center';
          li.innerText = 'No scores yet';
          leaderboardList.appendChild(li);
        } else {
          top.forEach((entry, idx) => {
            const li = document.createElement('li');
            const left = document.createElement('span');
            left.innerText = \`\${idx+1}. \${entry.address.substring(0,6)}...\${entry.address.substring(entry.address.length-4)}\`;
            const right = document.createElement('span');
            right.innerText = (entry.score/100).toFixed(2)+'s';
            li.appendChild(left);
            li.appendChild(right);
            leaderboardList.appendChild(li);
          });
        }
        leaderboardOverlay.style.display = 'flex';
      } catch (err) {
        alert('Failed to load leaderboard: '+(err.message||err));
      }
    }
  </script>
</body>
</html>
`;
}

// Pong - from https://github.com/OmegaNetwork-source/pong
function getPongTemplate() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Omega Pong</title>
    <script src="https://cdn.jsdelivr.net/npm/ethers@5.7.2/dist/ethers.umd.min.js"
            integrity="sha256-pmKTpqK7Te4GGmhhK+C+PFwKt+QGirjZiko1e69mTHM="
            crossorigin="anonymous"></script>
    <style>
        :root {
            --primary-color: #FFFFFF;
            --background-color: #000000;
            --accent-color: #333333;
        }
        body {
            background-color: var(--background-color);
            color: var(--primary-color);
            font-family: 'Courier New', Courier, monospace;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            flex-direction: column;
        }
        #game-container {
            display: flex;
            border: 2px solid var(--primary-color);
            box-shadow: 0 0 15px var(--primary-color);
        }
        canvas {
            background-color: var(--background-color);
            display: block;
        }
        #ui-panel {
            width: 250px;
            padding: 20px;
            background-color: var(--accent-color);
            border-left: 2px solid var(--primary-color);
            display: flex;
            flex-direction: column;
            justify-content: space-between;
        }
        .ui-section {
            margin-bottom: 20px;
        }
        h1, h2 {
            text-align: center;
            border-bottom: 1px solid var(--primary-color);
            padding-bottom: 10px;
            margin-top: 0;
        }
        #score-display, #leaderboard {
            list-style: none;
            padding: 0;
        }
        #score-display li, #leaderboard li {
            padding: 5px 0;
        }
        #leaderboard li {
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        button {
            background-color: var(--background-color);
            color: var(--primary-color);
            border: 1px solid var(--primary-color);
            padding: 10px 15px;
            width: 100%;
            cursor: pointer;
            font-family: inherit;
            margin-top: 10px;
        }
        button:hover {
            background-color: var(--primary-color);
            color: var(--background-color);
        }
        #messageBox {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background-color: rgba(0, 0, 0, 0.8);
            padding: 30px;
            border: 2px solid var(--primary-color);
            text-align: center;
            z-index: 10;
        }
        #mobile-controls {
            display: none;
            margin-top: 10px;
        }
        #mobile-controls button {
             width: 100px;
             height: 80px;
             margin: 0 10px;
        }

        @media (max-width: 800px) {
            #game-container {
                flex-direction: column-reverse;
                width: 100%;
                height: 100%;
                border: none;
            }
            #ui-panel {
                width: 100%;
                border-left: none;
                border-top: 2px solid var(--primary-color);
                box-sizing: border-box;
                height: auto;
                padding: 10px;
            }
            canvas {
                width: 100%;
                flex-grow: 1;
            }
            #mobile-controls {
                display: flex;
                justify-content: center;
                width: 100%;
            }
        }
    </style>
</head>
<body>

    <div id="game-container">
        <canvas id="gameCanvas"></canvas>
        <div id="ui-panel">
            <div>
                <h1 id="game-title">Omega Pong</h1>
                <div class="ui-section">
                    <h2>Score</h2>
                    <ul id="score-display">
                        <li>Player: <span id="player-score">0</span></li>
                        <li>Opponent: <span id="opponent-score">0</span></li>
                    </ul>
                </div>
                <div class="ui-section">
                    <h2>Leaderboard</h2>
                    <ul id="leaderboard"></ul>
                </div>
            </div>
            <div>
                <button id="connectWalletBtn">Connect Wallet</button>
                <button id="submitScoreBtn" style="display: none;">Submit Score</button>
                <button id="exportCsvBtn" style="display: none;">Export CSV</button>
            </div>
        </div>
    </div>

    <div id="messageBox" style="display: none;">
        <h2 id="messageTitle"></h2>
        <p id="messageText"></p>
        <button id="actionButton"></button>
    </div>

    <div id="mobile-controls">
        <button id="upBtn">UP</button>
        <button id="downBtn">DOWN</button>
    </div>

    <script>
        document.addEventListener('DOMContentLoaded', () => {
            const canvas = document.getElementById('gameCanvas');
            const ctx = canvas.getContext('2d');

            const playerScoreEl = document.getElementById('player-score');
            const opponentScoreEl = document.getElementById('opponent-score');

            let canvasWidth, canvasHeight;

            const paddleWidth = 10;
            const paddleHeight = 100;

            let player = {
                x: 0,
                y: 0,
                width: paddleWidth,
                height: paddleHeight,
                score: 0
            };

            let opponent = {
                x: 0,
                y: 0,
                width: paddleWidth,
                height: paddleHeight,
                score: 0
            };

            let ball = {
                x: 0,
                y: 0,
                radius: 7,
                speed: 420, // pixels per second
                velocityX: 300,
                velocityY: 300
            };
            
            let lastTime = 0;
            let gameState = 'start'; // 'start', 'playing', 'over'

            // Web3
            let provider, signer, contract, userAddress;
            const contractAddress = "0xd0739507572af804d57ecf21d368d85f49065e11";
            const contractABI = [
                {
                    "anonymous": false,
                    "inputs": [
                        {
                            "indexed": true,
                            "internalType": "address",
                            "name": "player",
                            "type": "address"
                        },
                        {
                            "indexed": false,
                            "internalType": "uint256",
                            "name": "score",
                            "type": "uint256"
                        }
                    ],
                    "name": "ScoreSubmitted",
                    "type": "event"
                },
                {
                    "inputs": [
                        {
                            "internalType": "uint256",
                            "name": "_score",
                            "type": "uint256"
                        }
                    ],
                    "name": "submitScore",
                    "outputs": [],
                    "stateMutability": "nonpayable",
                    "type": "function"
                },
                {
                    "inputs": [],
                    "name": "getLeaderboard",
                    "outputs": [
                        {
                            "components": [
                                {
                                    "internalType": "address",
                                    "name": "player",
                                    "type": "address"
                                },
                                {
                                    "internalType": "uint256",
                                    "name": "score",
                                    "type": "uint256"
                                }
                            ],
                            "internalType": "struct Leaderboard.ScoreEntry[]",
                            "name": "",
                            "type": "tuple[]"
                        }
                    ],
                    "stateMutability": "view",
                    "type": "function"
                },
                {
                    "inputs": [],
                    "name": "getPlayerCount",
                    "outputs": [
                        {
                            "internalType": "uint256",
                            "name": "",
                            "type": "uint256"
                        }
                    ],
                    "stateMutability": "view",
                    "type": "function"
                },
                {
                    "inputs": [
                        {
                            "internalType": "address",
                            "name": "",
                            "type": "address"
                        }
                    ],
                    "name": "highScores",
                    "outputs": [
                        {
                            "internalType": "uint256",
                            "name": "",
                            "type": "uint256"
                        }
                    ],
                    "stateMutability": "view",
                    "type": "function"
                },
                {
                    "inputs": [
                        {
                            "internalType": "uint256",
                            "name": "",
                            "type": "uint256"
                        }
                    ],
                    "name": "players",
                    "outputs": [
                        {
                            "internalType": "address",
                            "name": "",
                            "type": "address"
                        }
                    ],
                    "stateMutability": "view",
                    "type": "function"
                }
            ];

            function resizeCanvas() {
                const container = document.getElementById('game-container');
                const isMobile = window.innerWidth <= 800;

                if (isMobile) {
                    canvas.width = window.innerWidth;
                    canvas.height = window.innerHeight * 0.7; 
                } else {
                    canvas.width = 800;
                    canvas.height = 600;
                }
                
                canvasWidth = canvas.width;
                canvasHeight = canvas.height;
                
                setGameState('start');
            }

            function drawRect(x, y, w, h, color) {
                ctx.fillStyle = color;
                ctx.fillRect(x, y, w, h);
            }

            function drawCircle(x, y, r, color) {
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.arc(x, y, r, 0, Math.PI * 2, false);
                ctx.closePath();
                ctx.fill();
            }

            function drawNet() {
                for (let i = 0; i <= canvas.height; i += 15) {
                    drawRect(canvas.width / 2 - 1, i, 2, 10, 'white');
                }
            }
            
            function render() {
                // Clear the canvas
                drawRect(0, 0, canvas.width, canvas.height, 'black');
                // Draw net
                drawNet();
                // Draw paddles
                drawRect(player.x, player.y, player.width, player.height, 'white');
                drawRect(opponent.x, opponent.y, opponent.width, opponent.height, 'white');
                // Draw ball
                drawCircle(ball.x, ball.y, ball.radius, 'white');
            }

            function update(deltaTime) {
                if (gameState !== 'playing') return;

                // Ball movement
                ball.x += ball.velocityX * deltaTime;
                ball.y += ball.velocityY * deltaTime;

                // Ball collision with top/bottom walls
                if(ball.y + ball.radius > canvas.height || ball.y - ball.radius < 0) {
                    ball.velocityY = -ball.velocityY;
                }

                // Ball collision with paddles
                let selectedPlayer = (ball.x < canvas.width / 2) ? player : opponent;
                if(collision(ball, selectedPlayer)) {
                    let collidePoint = (ball.y - (selectedPlayer.y + selectedPlayer.height / 2));
                    collidePoint = collidePoint / (selectedPlayer.height / 2);
                    
                    let angleRad = (Math.PI / 4) * collidePoint;
                    
                    let direction = (ball.x < canvas.width / 2) ? 1 : -1;
                    ball.velocityX = direction * ball.speed * Math.cos(angleRad);
                    ball.velocityY = ball.speed * Math.sin(angleRad);
                    
                    ball.speed += 10;
                }

                // Score point
                if(ball.x - ball.radius < 0) {
                    opponent.score++;
                    updateScore();
                    resetBall();
                } else if(ball.x + ball.radius > canvas.width) {
                    player.score++;
                    updateScore();
                    resetBall();
                }

                // Opponent AI
                let targetY = ball.y - opponent.height / 2;
                opponent.y += (targetY - opponent.y) * 0.1; // Smoothing
                 // Clamp opponent paddle to screen
                if (opponent.y < 0) opponent.y = 0;
                if (opponent.y + opponent.height > canvas.height) opponent.y = canvas.height - opponent.height;
            }

            function collision(b, p) {
                p.top = p.y;
                p.bottom = p.y + p.height;
                p.left = p.x;
                p.right = p.x + p.width;

                b.top = b.y - b.radius;
                b.bottom = b.y + b.radius;
                b.left = b.x - b.radius;
                b.right = b.x + b.radius;

                return p.left < b.right && p.top < b.bottom && p.right > b.left && p.bottom > b.top;
            }
            
            function updateScore() {
                playerScoreEl.textContent = player.score;
                opponentScoreEl.textContent = opponent.score;
                if(player.score >= 10 || opponent.score >= 10) {
                    setGameState('over');
                }
            }

            function resetGame() {
                player.score = 0;
                opponent.score = 0;
                updateScore();
                
                player.x = 10;
                player.y = (canvas.height - paddleHeight) / 2;

                opponent.x = canvas.width - paddleWidth - 10;
                opponent.y = (canvas.height - paddleHeight) / 2;

                resetBall();
            }

            function resetBall() {
                ball.x = canvas.width / 2;
                ball.y = canvas.height / 2;
                ball.speed = 420;
                ball.velocityX = (ball.velocityX > 0 ? -1 : 1) * 300;
                ball.velocityY = 300;
            }

            function setGameState(state) {
                gameState = state;
                const box = document.getElementById('messageBox');
                if (state === 'start' || state === 'over') {
                    box.style.display = 'block';
                    if (state === 'start') {
                        resetGame();
                        document.getElementById('messageTitle').textContent = 'Omega Pong';
                        document.getElementById('messageText').textContent = 'First to 10 points wins. Click to start.';
                        document.getElementById('actionButton').textContent = 'Play';
                        document.getElementById('actionButton').onclick = () => setGameState('playing');
                    } else { // over
                        document.getElementById('messageTitle').textContent = 'Game Over';
                        document.getElementById('messageText').textContent = \`Final Score: \${player.score} - \${opponent.score}\`;
                        document.getElementById('actionButton').textContent = 'Play Again';
                        document.getElementById('actionButton').onclick = () => setGameState('start');
                        if (userAddress && player.score > opponent.score) {
                            document.getElementById('submitScoreBtn').style.display = 'block';
                        }
                    }
                } else { // playing
                    box.style.display = 'none';
                    document.getElementById('submitScoreBtn').style.display = 'none';
                }
            }
            
            async function connectWallet() {
                try {
                    if (typeof window.ethereum === 'undefined') {
                        alert("Please install MetaMask!");
                        return;
                    }
                    
                    await window.ethereum.request({ method: 'eth_requestAccounts' });
                    provider = new ethers.providers.Web3Provider(window.ethereum);
                    signer = provider.getSigner();
                    userAddress = await signer.getAddress();
                    contract = new ethers.Contract(contractAddress, contractABI, signer);

                    const connectWalletBtn = document.getElementById('connectWalletBtn');
                    connectWalletBtn.textContent = \`\${userAddress.substring(0, 6)}...\${userAddress.substring(userAddress.length - 4)}\`;
                    connectWalletBtn.disabled = true;

                    document.getElementById('exportCsvBtn').style.display = 'block';
                    
                    await fetchLeaderboard();

                } catch (error) {
                    console.error("Failed to connect wallet:", error);
                    alert("Failed to connect wallet. See console for details.");
                }
            }

            async function fetchLeaderboard() {
                const leaderboardEl = document.getElementById('leaderboard');
                leaderboardEl.innerHTML = '<li>Loading...</li>';
                try {
                    const scores = await contract.getLeaderboard();
                    leaderboardEl.innerHTML = '';
                    if (scores.length === 0) {
                        leaderboardEl.innerHTML = '<li>No scores yet!</li>';
                        return;
                    }
                    scores.forEach(score => {
                        const li = document.createElement('li');
                        const address = \`\${score.player.substring(0, 6)}...\${score.player.substring(score.player.length - 4)}\`;
                        li.textContent = \`\${address}: \${score.score}\`;
                        leaderboardEl.appendChild(li);
                    });
                } catch (error) {
                    console.error("Failed to fetch leaderboard:", error);
                    leaderboardEl.innerHTML = '<li>Error loading scores.</li>';
                }
            }

            async function submitScore() {
                if (!contract) {
                    alert("Please connect your wallet first.");
                    return;
                }
                const submitButton = document.getElementById('submitScoreBtn');
                submitButton.textContent = 'Submitting...';
                submitButton.disabled = true;

                try {
                    const tx = await contract.submitScore(player.score);
                    await tx.wait();
                    alert("Score submitted successfully!");
                    await fetchLeaderboard();
                } catch (error) {
                    console.error("Failed to submit score:", error);
                    alert("Score submission failed. See console for details.");
                } finally {
                    submitButton.textContent = 'Submit Score';
                    submitButton.style.display = 'none';
                }
            }

            function exportLeaderboardToCsv() {
                const leaderboardEl = document.getElementById('leaderboard');
                const rows = Array.from(leaderboardEl.querySelectorAll('li'));
                if (rows.length === 0 || rows[0].textContent.includes("No scores")) {
                    alert("No leaderboard data to export.");
                    return;
                }
                let csvContent = "data:text/csv;charset=utf-8,Player,Score\n";
                rows.forEach(row => {
                    const [player, score] = row.textContent.split(': ');
                    csvContent += \`\${player},\${score}\n\`;
                });
                const encodedUri = encodeURI(csvContent);
                const link = document.createElement("a");
                link.setAttribute("href", encodedUri);
                link.setAttribute("download", "omega-pong-leaderboard.csv");
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
            
            function gameLoop(timestamp) {
                const deltaTime = lastTime ? (timestamp - lastTime) / 1000 : 0;
                update(deltaTime);
                render();
                lastTime = timestamp;
                requestAnimationFrame(gameLoop);
            }

            // Controls
            function movePaddle(event) {
                let rect = canvas.getBoundingClientRect();
                player.y = event.clientY - rect.top - player.height / 2;
                 // Clamp player paddle to screen
                if (player.y < 0) player.y = 0;
                if (player.y + player.height > canvas.height) player.y = canvas.height - player.height;
            }
            
            canvas.addEventListener('mousemove', movePaddle);
            
            const upBtn = document.getElementById('upBtn');
            const downBtn = document.getElementById('downBtn');

            let touchInterval;

            const startMoving = (direction) => {
                if (touchInterval) clearInterval(touchInterval);
                touchInterval = setInterval(() => {
                    player.y += direction * 10;
                    if (player.y < 0) player.y = 0;
                    if (player.y + player.height > canvas.height) player.y = canvas.height - player.height;
                }, 16);
            };

            const stopMoving = () => {
                clearInterval(touchInterval);
            };

            upBtn.addEventListener('mousedown', () => startMoving(-1));
            upBtn.addEventListener('touchstart', () => startMoving(-1));
            downBtn.addEventListener('mousedown', () => startMoving(1));
            downBtn.addEventListener('touchstart', () => startMoving(1));
            
            upBtn.addEventListener('mouseup', stopMoving);
            upBtn.addEventListener('touchend', stopMoving);
            downBtn.addEventListener('mouseup', stopMoving);
            downBtn.addEventListener('touchend', stopMoving);

            // Web3 Buttons
            const connectWalletBtn = document.getElementById('connectWalletBtn');
            const submitScoreBtn = document.getElementById('submitScoreBtn');
            const exportCsvBtn = document.getElementById('exportCsvBtn');

            connectWalletBtn.addEventListener('click', connectWallet);
            submitScoreBtn.addEventListener('click', submitScore);
            exportCsvBtn.addEventListener('click', exportLeaderboardToCsv);

            window.addEventListener('resize', resizeCanvas);
            resizeCanvas();
            requestAnimationFrame(gameLoop);
        });
    </script>
</body>
</html> 
`;
}

// Pac Man - from https://github.com/OmegaNetwork-source/pacman
function getPacManTemplate() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <title>Omega-Man</title>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/ethers/5.7.2/ethers.umd.min.js"></script>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=VT323&display=swap" rel="stylesheet">
    <style>
    :root {
      --bg: #111;
      --fg: #fff;
      --accent: #fff;
      --danger: #f33;
      --panel-bg: #181818;
      --panel-fg: #fff;
      --panel-width: 320px;
      --maze-wall: #fff;
      --maze-bg: #222;
      --dot: #fff;
      --power: #0ff; /* Cyan */
      --omega: #fff;
      --ghost1: #f33; /* Red */
      --ghost2: #3cf; /* Blue */
      --ghost3: #fc3; /* Yellow */
      --ghost4: #9f3; /* Green */
    }
    html, body {
      height: 100%;
      margin: 0;
      padding: 0;
      background: var(--bg);
      color: var(--fg);
      font-family: 'VT323', monospace;
      font-size: 1.2rem;
      overflow: hidden;
    }
    #game-container {
      display: flex;
      flex-direction: row;
      align-items: flex-start; /* Align canvas and panel to the top */
      gap: 30px;
    }
    canvas {
      background: var(--maze-bg);
      border: 2px solid var(--accent);
      border-radius: 5px;
    }
    #sidePanel {
      width: var(--panel-width);
      padding: 20px;
      background: var(--panel-bg);
      border-radius: 5px;
      border: 2px solid var(--accent);
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    #sidePanel h1 {
      margin: 0 0 10px 0;
      text-align: center;
      font-size: 3rem;
      letter-spacing: 2px;
      color: var(--accent);
    }
    #wallet-section button {
        background: var(--accent);
        color: var(--bg);
        border: none;
        padding: 10px;
        font-family: 'VT323', monospace;
        font-size: 1.2rem;
        width: 100%;
        cursor: pointer;
    }
    #wallet-section button:disabled {
        background: #555;
        cursor: not-allowed;
    }
    #leaderboard {
        border-top: 1px solid var(--accent);
        padding-top: 20px;
    }
    #leaderboard h2 {
        margin-top: 0;
    }
    #leaderboard ol {
        padding-left: 20px;
        margin: 0;
        max-height: 250px;
        overflow-y: auto;
    }
    #leaderboard li {
        margin-bottom: 5px;
    }
    .mobile-controls {
        display: none; /* Hidden by default */
        position: fixed;
        bottom: 0;
        left: 0;
        width: 100%;
        height: 150px;
    }
    .mobile-btn {
        position: absolute;
        background: rgba(255, 255, 255, 0.2);
        color: white;
        border: 2px solid white;
        border-radius: 50%;
        width: 60px;
        height: 60px;
        font-size: 2rem;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    #message-box h2 {
        margin-top: 0;
    }
    #end-game-controls button {
        background: var(--accent);
        color: var(--bg);
        border: none;
        padding: 10px 20px;
        font-family: 'VT323', monospace;
        font-size: 1.2rem;
        cursor: pointer;
        margin: 10px;
        transition: background 0.2s;
    }
    #end-game-controls button:hover:not(:disabled) {
        background: #ccc;
    }
    #end-game-controls button:disabled {
        background: #555;
        color: #999;
        cursor: not-allowed;
    }
    @media (max-width: 900px) {
      body {
        justify-content: flex-start;
        align-items: flex-start;
        padding-top: 20px;
      }
      #game-container {
        flex-direction: column;
        align-items: center;
        gap: 20px;
      }
      .mobile-controls {
        display: block;
      }
    }
    </style>
</head>
<body style="margin:0; background:#111; min-height:100vh; display:flex; align-items:center; justify-content:center;">
    <!-- Mode Selection Modal -->
    <div id="mode-modal" style="position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.92);z-index:2000;display:flex;align-items:center;justify-content:center;">
      <div style="background:#181818;padding:48px 32px;border-radius:16px;box-shadow:0 0 32px #0008;text-align:center;min-width:320px;">
        <h2 style="color:#fff;font-size:2.2rem;margin-bottom:32px;">How do you want to play?</h2>
        <button id="play-points-btn" style="background:linear-gradient(90deg,#0ff,#fff);color:#111;font-size:1.3rem;padding:16px 32px;margin:12px 0;width:100%;border:none;border-radius:8px;cursor:pointer;font-family:'VT323',monospace;">Play For Points</button>
        <div style="color:#aaa;margin:12px 0;">or</div>
        <button id="play-free-btn" style="background:#222;color:#fff;font-size:1.3rem;padding:16px 32px;width:100%;border:1px solid #fff;border-radius:8px;cursor:pointer;font-family:'VT323',monospace;">Play For Free</button>
        <div id="arcade-deposit-notice" style="color:#f33;font-size:1.1rem;margin-top:12px;display:none;">You must deposit at least 5 ARCADE tokens to play for points.</div>
      </div>
    </div>
    <div id="game-container">
      <canvas id="gameCanvas"></canvas>
      <div id="sidePanel">
        <h1>OMEGA-MAN</h1>
        <!-- Arcade Credits Section (hidden by default) -->
        <div id="arcade-credits-section" style="display:none;flex-direction:column;align-items:center;margin-bottom:18px;">
          <div style="color:#0ff;font-size:1.1rem;margin-bottom:6px;">Arcade Credits: <span id="arcade-credits">0</span></div>
          <div style="color:#fff;font-size:1rem;margin-bottom:6px;">ARCADE Balance: <span id="arcade-balance">0</span></div>
          <input id="arcade-deposit-amount" type="number" min="1" placeholder="Amount" style="width:120px;padding:8px 12px;font-size:1.2rem;margin-bottom:8px;border-radius:6px;border:1px solid #ccc;box-sizing:border-box;" />
          <button id="arcade-deposit-btn" style="background:linear-gradient(90deg,#0ff,#fff);color:#111;border:none;border-radius:6px;padding:8px 18px;font-size:1.1rem;cursor:pointer;">Deposit</button>
          <div id="arcade-deposit-status" style="color:#aaa;font-size:0.95rem;margin-top:4px;"></div>
        </div>
        <div id="insert-token-container" style="display: flex; flex-direction: column; align-items: center; margin-bottom: 18px;">
          <button id="insert-token-btn" style="background: linear-gradient(90deg, #0ff, #fff); border: none; border-radius: 50%; width: 64px; height: 64px; box-shadow: 0 0 16px #0ff8, 0 0 4px #fff; display: flex; align-items: center; justify-content: center; cursor: pointer; margin-bottom: 8px; transition: box-shadow 0.2s;">
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="18" cy="18" r="16" stroke="#111" stroke-width="4" fill="#fff"/>
              <circle cx="18" cy="18" r="10" stroke="#0ff" stroke-width="3" fill="none"/>
              <rect x="15" y="10" width="6" height="16" rx="3" fill="#0ff"/>
            </svg>
          </button>
          <span style="color: #0ff; font-size: 1.1rem; letter-spacing: 1px;">Insert Token</span>
        </div>
        <div id="score">Score: 0</div>
        <div id="lives">Lives: 3</div>
        <div id="wallet-section">
          <div><b>Wallet:</b> <span id="wallet-status">Not Connected</span></div>
          <button id="connect-wallet">Connect Wallet</button>
        </div>
        <div id="leaderboard">
            <h2>Leaderboard</h2>
            <button id="export-leaderboard-csv" style="margin-bottom:10px;background:#222;color:#0ff;border:1px solid #0ff;border-radius:6px;padding:6px 14px;font-family:'VT323',monospace;font-size:1.1rem;cursor:pointer;">Export as CSV</button>
            <ol id="leaderboard-list">
                <li>Connect wallet to see scores.</li>
            </ol>
        </div>
      </div>
    </div>
    
    <div class="mobile-controls">
        <button class="mobile-btn" id="btn-up" style="left: 50%; bottom: 80px; transform: translateX(-50%);">▲</button>
        <button class="mobile-btn" id="btn-left" style="left: 25%; bottom: 10px; transform: translateX(-50%);">◀</button>
        <button class="mobile-btn" id="btn-down" style="left: 50%; bottom: 10px; transform: translateX(-50%);">▼</button>
        <button class="mobile-btn" id="btn-right" style="right: 25%; bottom: 10px; transform: translateX(50%);">▶</button>
    </div>

    <div id="message-overlay" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; text-align: center; z-index: 1000;">
        <div id="message-box" style="background: #181818; padding: 40px; border-radius: 10px; border: 1px solid var(--accent);">
            <div id="message"></div>
            <div id="end-game-controls" style="display: none; margin-top: 20px;">
                <button id="submit-score-btn">Submit Score</button>
                <button id="new-game-btn">Play Again</button>
            </div>
        </div>
    </div>
    
    <script>
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    const TILE_S = 20;
    const MAZE_W = 28;
    const MAZE_H = 36;
    
    const CANVAS_W = TILE_S * MAZE_W;
    const CANVAS_H = TILE_S * MAZE_H;
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;

    // 1=wall, 2=dot, 3=power pellet, 0=empty, 4=ghost house door
    const MAZE = [
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,3,2,2,2,2,2,2,2,2,2,2,2,1,1,2,2,2,2,2,2,2,2,2,2,2,3,1],
        [1,2,1,1,1,1,2,1,1,1,1,1,2,1,1,2,1,1,1,1,1,2,1,1,1,1,2,1],
        [1,2,1,1,1,1,2,1,1,1,1,1,2,1,1,2,1,1,1,1,1,2,1,1,1,1,2,1],
        [1,2,1,1,1,1,2,1,1,1,1,1,2,1,1,2,1,1,1,1,1,2,1,1,1,1,2,1],
        [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
        [1,2,1,1,1,1,2,1,1,2,1,1,1,1,1,1,1,1,2,1,1,2,1,1,1,1,2,1],
        [1,2,1,1,1,1,2,1,1,2,1,1,1,1,1,1,1,1,2,1,1,2,1,1,1,1,2,1],
        [1,2,2,2,2,2,2,1,1,2,2,2,2,1,1,2,2,2,2,1,1,2,2,2,2,2,2,1],
        [1,1,1,1,1,1,2,1,1,1,1,1,0,1,1,0,1,1,1,1,1,2,1,1,1,1,1,1],
        [1,1,1,1,1,1,2,1,1,1,1,1,0,1,1,0,1,1,1,1,1,2,1,1,1,1,1,1],
        [1,1,1,1,1,1,2,1,1,0,0,0,0,0,0,0,0,0,0,1,1,2,1,1,1,1,1,1],
        [1,1,1,1,1,1,2,1,1,0,1,1,1,4,4,1,1,1,0,1,1,2,1,1,1,1,1,1],
        [1,1,1,1,1,1,2,1,1,0,1,0,0,0,0,0,0,1,0,1,1,2,1,1,1,1,1,1],
        [0,0,0,0,0,0,2,0,0,0,1,0,0,0,0,0,0,1,0,0,0,2,0,0,0,0,0,0], // Tunnel
        [1,1,1,1,1,1,2,1,1,0,1,0,0,0,0,0,0,1,0,1,1,2,1,1,1,1,1,1],
        [1,1,1,1,1,1,2,1,1,0,1,1,1,1,1,1,1,1,0,1,1,2,1,1,1,1,1,1],
        [1,1,1,1,1,1,2,1,1,0,0,0,0,0,0,0,0,0,0,1,1,2,1,1,1,1,1,1],
        [1,1,1,1,1,1,2,1,1,0,1,1,1,1,1,1,1,1,0,1,1,2,1,1,1,1,1,1],
        [1,2,2,2,2,2,2,2,2,2,2,2,2,1,1,2,2,2,2,2,2,2,2,2,2,2,2,1],
        [1,2,1,1,1,1,2,1,1,1,1,1,2,1,1,2,1,1,1,1,1,2,1,1,1,1,2,1],
        [1,2,1,1,1,1,2,1,1,1,1,1,2,1,1,2,1,1,1,1,1,2,1,1,1,1,2,1],
        [1,3,2,2,1,1,2,2,2,2,2,2,2,0,0,2,2,2,2,2,2,1,1,2,2,2,3,1],
        [1,1,1,2,1,1,2,1,1,2,1,1,1,1,1,1,1,1,2,1,1,2,1,1,2,1,1,1],
        [1,1,1,2,1,1,2,1,1,2,1,1,1,1,1,1,1,1,2,1,1,2,1,1,2,1,1,1],
        [1,2,2,2,2,2,2,1,1,2,2,2,2,1,1,2,2,2,2,1,1,2,2,2,2,2,2,1],
        [1,2,1,1,1,1,1,1,1,1,1,1,2,1,1,2,1,1,1,1,1,1,1,1,1,1,2,1],
        [1,2,1,1,1,1,1,1,1,1,1,1,2,1,1,2,1,1,1,1,1,1,1,1,1,1,2,1],
        [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
        [1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1], // Connector Row
        [1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1], // Connector Row
        [1,2,2,2,1,2,1,2,2,2,2,1,1,2,2,2,2,1,2,1,2,2,2,2,1,2,2,1],
        [1,2,1,2,1,2,1,2,1,1,2,1,1,2,1,1,2,1,2,1,2,1,2,1,1,2,1,1],
        [1,2,1,2,2,2,2,2,1,1,2,2,2,2,1,1,2,2,2,2,2,2,2,1,1,2,2,1],
        [1,3,2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,3,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
    ];
    let originalMaze; // To store the initial state for resets

    // --- GAME STATE ---
    let score = 0;
    let lives = 3;
    let dots = 0;
    let totalDots = 0;
    let gameOver = false;
    let gamePaused = false;
    
    let omega = {};
    let ghosts = [];
    let powerPellet = { active: false, timer: 0 };
    
    const DIRS = [ {x:0, y:-1}, {x:1, y:0}, {x:0, y:1}, {x:-1, y:0} ]; // Up, Right, Down, Left

    // --- WEB3 STATE ---
    const contractAddress = "0x6801d29b5939174ad32f347c7120a99e72858ea4";
    const contractABI = [
        {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"player","type":"address"},{"indexed":false,"internalType":"uint256","name":"score","type":"uint256"}],"name":"ScoreSubmitted","type":"event"},
        {"inputs":[{"internalType":"uint256","name":"_score","type":"uint256"}],"name":"submitScore","outputs":[],"stateMutability":"nonpayable","type":"function"},
        {"inputs":[],"name":"getLeaderboard","outputs":[{"components":[{"internalType":"address","name":"player","type":"address"},{"internalType":"uint256","name":"score","type":"uint256"}],"internalType":"struct Leaderboard.ScoreEntry[]","name":"","type":"tuple[]"}],"stateMutability":"view","type":"function"}
    ];
    let provider, signer, leaderboardContract, userAccount;
    
    // --- ARCADE TOKEN/DEPOSIT CONFIG ---
    const arcadeDepositAddress = "0x78e40a706fe36eaa94c5388600f1667dd92bb2c6";
    const arcadeTokenAddress = "0xFF3fD61427d3485c8e33cb5f5999EAd9639C56a5";
    const arcadeDepositABI = [
      {"inputs":[{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"deposit","outputs":[],"stateMutability":"nonpayable","type":"function"},
      {"inputs":[],"stateMutability":"nonpayable","type":"constructor"},
      {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"TokenDeposited","type":"event"},
      {"inputs":[],"name":"admin","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
      {"inputs":[],"name":"arcadeToken","outputs":[{"internalType":"contract IERC20","name":"","type":"address"}],"stateMutability":"view","type":"function"}
    ];
    const erc20ABI = [
      {"constant":true,"inputs":[{"name":"_owner","type":"address"}],"name":"balanceOf","outputs":[{"name":"balance","type":"uint256"}],"type":"function"},
      {"constant":false,"inputs":[{"name":"_spender","type":"address"},{"name":"_value","type":"uint256"}],"name":"approve","outputs":[{"name":"success","type":"bool"}],"type":"function"},
      {"constant":true,"inputs":[{"name":"_owner","type":"address"},{"name":"_spender","type":"address"}],"name":"allowance","outputs":[{"name":"remaining","type":"uint256"}],"type":"function"},
      {"constant":false,"inputs":[{"name":"_to","type":"address"},{"name":"_value","type":"uint256"}],"name":"transfer","outputs":[{"name":"success","type":"bool"}],"type":"function"},
      {"constant":true,"inputs":[],"name":"decimals","outputs":[{"name":"","type":"uint8"}],"type":"function"}
    ];
    let arcadeDepositContract, arcadeTokenContract;
    let arcadeCredits = 0;
    let playMode = null; // 'points' or 'free'

    // Add a global flag to track if user can play for points
    let canPlayForPoints = false;

    // --- DRAWING ---
    function draw() {
        ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
        drawMaze();
        drawOmega();
        drawGhosts();
    }

    function drawMaze() {
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--maze-bg').trim();
        ctx.fillRect(0,0,CANVAS_W, CANVAS_H);

        for (let y = 0; y < MAZE_H; y++) {
            for (let x = 0; x < MAZE_W; x++) {
                const tile = MAZE[y][x];
                if (tile === 1) { // Wall
                    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--maze-wall').trim();
                    ctx.fillRect(x * TILE_S, y * TILE_S, TILE_S, TILE_S);
                } else if (tile === 2) { // Dot
                    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--dot').trim();
                    ctx.beginPath();
                    ctx.arc(x * TILE_S + TILE_S / 2, y * TILE_S + TILE_S / 2, TILE_S / 6, 0, Math.PI * 2);
                    ctx.fill();
                } else if (tile === 3) { // Power Pellet
                    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--power').trim();
                    ctx.beginPath();
                    ctx.arc(x * TILE_S + TILE_S / 2, y * TILE_S + TILE_S / 2, TILE_S / 3, 0, Math.PI * 2);
                    ctx.fill();
                } else if (tile === 4) { // Ghost door
                    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--power').trim();
                    ctx.fillRect(x * TILE_S, y * TILE_S + TILE_S / 2 - 2, TILE_S, 4);
                }
            }
        }
    }

    function drawOmega() {
        ctx.save();
        ctx.translate(omega.x * TILE_S + TILE_S / 2, omega.y * TILE_S + TILE_S / 2);
        
        // Rotate mouth to match movement direction
        const angle = (omega.dir - 1) * Math.PI / 2;
        ctx.rotate(angle);

        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--omega').trim();
        ctx.beginPath();
        const mouthAngle = (Date.now() % 400 < 200) ? Math.PI / 4 : Math.PI / 6;
        ctx.arc(0, 0, TILE_S / 2 - 2, mouthAngle, -mouthAngle);
        ctx.lineTo(0, 0);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    function drawGhosts() {
        ghosts.forEach(ghost => {
            const isFrightened = powerPellet.active;
            const isFlashing = isFrightened && powerPellet.timer < 3 && (Date.now() % 400 < 200);

            if (ghost.eatenTimer > 0) { // Draw as eyes only
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.arc(ghost.x * TILE_S + TILE_S * 0.3, ghost.y * TILE_S + TILE_S / 2, TILE_S / 8, 0, Math.PI * 2);
                ctx.arc(ghost.x * TILE_S + TILE_S * 0.7, ghost.y * TILE_S + TILE_S / 2, TILE_S / 8, 0, Math.PI * 2);
                ctx.fill();
            } else {
                ctx.fillStyle = isFrightened 
                    ? (isFlashing ? '#fff' : getComputedStyle(document.documentElement).getPropertyValue('--power').trim())
                    : getComputedStyle(document.documentElement).getPropertyValue(\`--ghost\${ghost.id}\`).trim();
                
                const x = ghost.x * TILE_S;
                const y = ghost.y * TILE_S;
                const r = TILE_S / 2;
                
                ctx.beginPath();
                ctx.arc(x + r, y + r, r, Math.PI, 0);
                ctx.lineTo(x + TILE_S, y + TILE_S);
                ctx.lineTo(x, y + TILE_S);
                ctx.closePath();
                ctx.fill();

                // Eyes
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.arc(x + TILE_S * 0.3, y + TILE_S * 0.4, TILE_S/5, 0, Math.PI * 2);
                ctx.arc(x + TILE_S * 0.7, y + TILE_S * 0.4, TILE_S/5, 0, Math.PI * 2);
                ctx.fill();

                // Pupils
                ctx.fillStyle = '#000';
                ctx.beginPath();
                ctx.arc(x + TILE_S * 0.3, y + TILE_S * 0.4, TILE_S/10, 0, Math.PI * 2);
                ctx.arc(x + TILE_S * 0.7, y + TILE_S * 0.4, TILE_S/10, 0, Math.PI * 2);
                ctx.fill();
            }
        });
    }

    // --- GAME LOGIC ---
    function update(dt) {
        updateOmega(dt);
        updateGhosts(dt);
        checkCollisions();
        checkWinCondition();
    }

    function canMove(x, y, isGhost = false) {
        if (x < 0 || x >= MAZE_W || y < 0 || y >= MAZE_H) return false;
        const tile = MAZE[y][x];
        if (isGhost) {
            return tile !== 1;
        }
        return tile !== 1 && tile !== 4;
    }

    function updateOmega(dt) {
        omega.moveTimer -= dt;
        if (omega.moveTimer > 0) return;
        omega.moveTimer = 0.15;

        let nx = omega.x + DIRS[omega.nextDir].x;
        let ny = omega.y + DIRS[omega.nextDir].y;
        if (canMove(nx, ny)) {
            omega.dir = omega.nextDir;
        }
        
        nx = omega.x + DIRS[omega.dir].x;
        ny = omega.y + DIRS[omega.dir].y;
        
        // Handle tunnel
        if (ny === 14) {
            if (nx < 0) nx = MAZE_W - 1;
            if (nx >= MAZE_W) nx = 0;
        }

        if (canMove(nx, ny)) {
            omega.x = nx;
            omega.y = ny;
        }
        
        // Check for dot collection
        const currentTile = MAZE[omega.y][omega.x];
        if (currentTile === 2) {
            MAZE[omega.y][omega.x] = 0; // Eat dot
            score += 10;
            dots--;
            updateScoreDisplay();
        } else if (currentTile === 3) {
            MAZE[omega.y][omega.x] = 0; // Eat power pellet
            score += 50;
            dots--;
            powerPellet.active = true;
            powerPellet.timer = 7; // 7 seconds of power
            updateScoreDisplay();
        }
    }
    
    function updateGhosts(dt) {
        if (powerPellet.active) {
            powerPellet.timer -= dt;
            if (powerPellet.timer <= 0) {
                powerPellet.active = false;
            }
        }

        ghosts.forEach(ghost => {
            if (ghost.eatenTimer > 0) {
                ghost.eatenTimer -= dt;
                if (ghost.eatenTimer <= 0) {
                    ghost.x = ghost.startX;
                    ghost.y = ghost.startY;
                }
                return;
            }

            ghost.moveTimer -= dt;
            if (ghost.moveTimer > 0) return;
            ghost.moveTimer = powerPellet.active ? 0.3 : 0.22; // Slower when frightened

            // AI Logic
            let validMoves = [];
            for (let i = 0; i < 4; i++) {
                // Prevent reversing direction
                if (i === (ghost.dir + 2) % 4) continue;
                
                let nx = ghost.x + DIRS[i].x;
                let ny = ghost.y + DIRS[i].y;
                if (canMove(nx, ny, true)) {
                    validMoves.push(i);
                }
            }

            if (validMoves.length > 0) {
                ghost.dir = validMoves[Math.floor(Math.random() * validMoves.length)];
            }
            
            ghost.x += DIRS[ghost.dir].x;
            ghost.y += DIRS[ghost.dir].y;
        });
    }

    function checkCollisions() {
        for (const ghost of ghosts) {
            if (ghost.eatenTimer > 0) continue;

            if (ghost.x === omega.x && ghost.y === omega.y) {
                if (powerPellet.active) {
                    score += 200;
                    updateScoreDisplay();
                    ghost.eatenTimer = 3; // Respawn after 3 seconds
                    // Move ghost back to start immediately to prevent re-collision
                    ghost.x = ghost.startX; 
                    ghost.y = ghost.startY;
                } else {
                    lives--;
                    updateLivesDisplay();
                    if (lives <= 0) {
                        endGame();
                    } else {
                        resetPositions();
                    }
                    return; // Stop processing collisions for this frame
                }
            }
        }
    }

    function checkWinCondition() {
        if (dots === 0 && !gameOver) {
            endGame();
        }
    }

    function resetPositions() {
        omega.x = 13;
        omega.y = 22;
        ghosts.forEach(g => {
            g.x = g.startX;
            g.y = g.startY;
        });
    }

    // --- UI & STATE MANAGEMENT ---
    const messageEl = document.getElementById('message');
    const overlayEl = document.getElementById('message-overlay');
    
    function updateScoreDisplay() {
        document.getElementById('score').textContent = \`Score: \${score}\`;
    }

    function updateLivesDisplay() {
        document.getElementById('lives').textContent = \`Lives: \${lives}\`;
    }

    function resetGame() {
        // First, restore the maze from the original copy
        for(let y = 0; y < MAZE_H; y++) {
            for(let x = 0; x < MAZE_W; x++) {
                MAZE[y][x] = originalMaze[y][x];
            }
        }

        score = 0;
        lives = 3;
        dots = totalDots;
        gameOver = false;
        gamePaused = false;
        powerPellet.active = false;
        
        resetPositions();
        
        updateScoreDisplay();
        updateLivesDisplay();
        overlayEl.style.display = 'none';
        if (playMode === 'points') {
            document.getElementById('wallet-section').style.display = '';
            document.getElementById('arcade-credits-section').style.display = 'flex';
            document.getElementById('leaderboard').style.display = '';
            // If not enough deposit, show overlay and block game
            if (!canPlayForPoints) {
                showBlockPlayOverlay();
            } else {
                hideBlockPlayOverlay();
            }
        } else {
            document.getElementById('wallet-section').style.display = 'none';
            document.getElementById('arcade-credits-section').style.display = 'none';
            document.getElementById('leaderboard').style.display = 'none';
            hideBlockPlayOverlay();
        }
    }

    function endGame() {
        gameOver = true;
        gamePaused = true;
        const controlsEl = document.getElementById('end-game-controls');
        const submitBtn = document.getElementById('submit-score-btn');
        const newGameBtn = document.getElementById('new-game-btn');

        const win = dots === 0;
        messageEl.innerHTML = \`<h2>\${win ? 'You Win!' : 'Game Over'}</h2><p>Final Score: \${score}</p>\`;
        
        submitBtn.disabled = !userAccount;
        submitBtn.textContent = 'Submit Score';
        newGameBtn.disabled = false;
        controlsEl.style.display = 'block';

        overlayEl.style.display = 'flex';
    }

    // --- WEB3 ---
    async function initWallet() {
        const connectWalletBtn = document.getElementById('connect-wallet');
        if (window.ethereum) {
            connectWalletBtn.disabled = false;
            connectWalletBtn.addEventListener('click', connectWallet);

            window.ethereum.on('accountsChanged', (accounts) => {
                if (accounts.length > 0) {
                    updateWalletStatus(accounts[0]);
                } else {
                    updateWalletStatus(null);
                }
            });

        } else {
            document.getElementById('wallet-status').textContent = 'No wallet found';
        }
    }
    
    async function connectWallet() {
        try {
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            updateWalletStatus(accounts[0]);
        } catch (err) {
            console.error(err.message);
            document.getElementById('wallet-status').textContent = 'Connection failed';
        }
    }

    function updateWalletStatus(account) {
        const walletStatusEl = document.getElementById('wallet-status');
        const connectWalletBtn = document.getElementById('connect-wallet');
        
        if (account) {
            userAccount = account;
            provider = new ethers.providers.Web3Provider(window.ethereum);
            signer = provider.getSigner();
            leaderboardContract = new ethers.Contract(contractAddress, contractABI, provider);
            
            const truncated = \`\${account.substring(0, 6)}...\${account.substring(account.length - 4)}\`;
            walletStatusEl.textContent = truncated;
            connectWalletBtn.textContent = 'Connected';
            connectWalletBtn.disabled = true;
            if (playMode === 'points') updateArcadeBalances();
            updateLeaderboard();
        } else {
            userAccount = null;
            walletStatusEl.textContent = 'Not Connected';
            connectWalletBtn.textContent = 'Connect Wallet';
            connectWalletBtn.disabled = false;
        }
    }

    async function updateLeaderboard() {
        const leaderboardListEl = document.getElementById('leaderboard-list');
        if (!leaderboardContract) {
            leaderboardListEl.innerHTML = '<li>Connect wallet to see scores.</li>';
            return;
        }
        leaderboardListEl.innerHTML = '<li>Loading...</li>';
        try {
            const scores = await leaderboardContract.getLeaderboard();
            if (scores.length === 0) {
                leaderboardListEl.innerHTML = '<li>No scores yet. Be the first!</li>';
                return;
            }
            const sortedScores = [...scores].sort((a, b) => b.score - a.score);
            leaderboardListEl.innerHTML = sortedScores.map(entry => 
                \`<li>\${entry.player.substring(0, 6)}...\${entry.player.substring(entry.player.length - 4)}: \${entry.score}</li>\`
            ).join('');
        } catch (error) {
            console.error("Leaderboard fetch failed:", error);
            leaderboardListEl.innerHTML = '<li>Error loading scores.</li>';
        }
    }
    
    async function submitScore(finalScore) {
        if (playMode !== 'points') {
            alert("You must Play For Points and deposit ARCADE tokens to submit your score.");
            return;
        }
        if (!canPlayForPoints) {
            alert("You must deposit at least 5 ARCADE tokens to submit your score.");
            return;
        }
        if (!leaderboardContract || !signer) {
            alert("Please connect your wallet to submit your score.");
            return;
        }
        const submitBtn = document.getElementById('submit-score-btn');
        const newGameBtn = document.getElementById('new-game-btn');
        submitBtn.disabled = true;
        newGameBtn.disabled = true;
        submitBtn.textContent = 'Submitting...';

        const contractWithSigner = leaderboardContract.connect(signer);
        try {
            const tx = await contractWithSigner.submitScore(finalScore);
            submitBtn.textContent = 'Confirming...';
            await tx.wait();
            submitBtn.textContent = 'Score Submitted!';
            newGameBtn.disabled = false; 
            await updateLeaderboard();
        } catch (error) {
            console.error("Score submission failed:", error);
            alert("Score submission failed. See console for details.");
            submitBtn.textContent = 'Submission Failed';
            setTimeout(() => {
                if (gameOver) {
                    submitBtn.disabled = !userAccount;
                    newGameBtn.disabled = false;
                    submitBtn.textContent = 'Submit Score';
                }
            }, 2000);
        }
    }

    // --- CONTROLS ---
    window.addEventListener('keydown', e => {
        if (['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft'].includes(e.key)) {
            if (playMode === 'points' && !canPlayForPoints) return;
            e.preventDefault();
            const keyMap = { 'ArrowUp': 0, 'ArrowRight': 1, 'ArrowDown': 2, 'ArrowLeft': 3 };
            omega.nextDir = keyMap[e.key];
        }
    });

    function handleMobile(dir) {
        if (playMode === 'points' && !canPlayForPoints) return;
        omega.nextDir = dir;
    }

    document.getElementById('btn-up').addEventListener('touchstart', (e) => { e.preventDefault(); handleMobile(0); });
    document.getElementById('btn-left').addEventListener('touchstart', (e) => { e.preventDefault(); handleMobile(3); });
    document.getElementById('btn-down').addEventListener('touchstart', (e) => { e.preventDefault(); handleMobile(2); });
    document.getElementById('btn-right').addEventListener('touchstart', (e) => { e.preventDefault(); handleMobile(1); });

    // --- GAME INIT & LOOP ---
    let lastTime = 0;
    
    function gameLoop(timestamp) {
        if (!lastTime) lastTime = timestamp;
        const dt = (timestamp - lastTime) / 1000;
        lastTime = timestamp;

        if (!gamePaused) {
            if (playMode === 'points' && !canPlayForPoints) {
                // Block game update
            } else {
                update(dt);
            }
        }
        
        draw();
        requestAnimationFrame(gameLoop);
    }
    
    function init() {
        // Deep copy of the initial maze state for resetting the game
        originalMaze = JSON.parse(JSON.stringify(MAZE));
        MAZE.forEach(row => {
            row.forEach(tile => {
                if (tile === 2 || tile === 3) {
                    totalDots++;
                }
            });
        });
        dots = totalDots;

        omega = { x: 13, y: 22, dir: 0, nextDir: 0, moveTimer: 0 };
        ghosts = [
            { id: 1, x: 13, y: 14, startX: 13, startY: 14, dir: 2, eatenTimer: 0, moveTimer: 0 },
            { id: 2, x: 14, y: 14, startX: 14, startY: 14, dir: 2, eatenTimer: 0, moveTimer: 0.1 },
            { id: 3, x: 12, y: 14, startX: 12, startY: 14, dir: 2, eatenTimer: 0, moveTimer: 0.2 },
            { id: 4, x: 15, y: 14, startX: 15, startY: 14, dir: 2, eatenTimer: 0, moveTimer: 0.3 }
        ];

        initWallet();
        resetGame();
        requestAnimationFrame(gameLoop);
    }

    document.getElementById('new-game-btn').addEventListener('click', () => {
        resetGame();
        // Deduct 5 Arcade Credits if playing for points
        if (playMode === 'points') {
            arcadeCredits -= 5;
            if (arcadeCredits < 0) arcadeCredits = 0;
            document.getElementById('arcade-credits').textContent = arcadeCredits;
            updateArcadeBalances();
            if (arcadeCredits < 5) {
                canPlayForPoints = false;
                showBlockPlayOverlay();
            }
        }
    });

    document.getElementById('submit-score-btn').addEventListener('click', () => {
        submitScore(score);
    });

    // --- MODE SELECTION LOGIC ---
    window.addEventListener('DOMContentLoaded', () => {
      document.getElementById('mode-modal').style.display = 'flex';
      document.getElementById('play-points-btn').onclick = () => selectMode('points');
      document.getElementById('play-free-btn').onclick = () => selectMode('free');
      // Add deposit notice
      let notice = document.createElement('div');
      notice.id = 'arcade-deposit-notice';
      notice.style = 'color:#f33;font-size:1.1rem;margin-top:12px;display:none;';
      notice.textContent = 'You must deposit at least 5 ARCADE tokens to play for points.';
      document.getElementById('mode-modal').querySelector('div').appendChild(notice);
    });

    function selectMode(mode) {
      playMode = mode;
      document.getElementById('mode-modal').style.display = 'none';
      if (mode === 'points') {
        document.getElementById('wallet-section').style.display = '';
        document.getElementById('arcade-credits-section').style.display = 'flex';
        document.getElementById('leaderboard').style.display = '';
        initWallet();
        initArcadeContracts();
        updateArcadeBalances();
        canPlayForPoints = arcadeCredits >= 5;
      } else {
        document.getElementById('wallet-section').style.display = 'none';
        document.getElementById('arcade-credits-section').style.display = 'none';
        document.getElementById('leaderboard').style.display = 'none';
        canPlayForPoints = true;
      }
      resetGame();
    }

    // --- ARCADE CONTRACTS INIT ---
    function initArcadeContracts() {
      if (window.ethereum) {
        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();
        arcadeDepositContract = new ethers.Contract(arcadeDepositAddress, arcadeDepositABI, signer);
        arcadeTokenContract = new ethers.Contract(arcadeTokenAddress, erc20ABI, signer);
        updateArcadeBalances();
      }
      document.getElementById('arcade-deposit-btn').onclick = handleArcadeDeposit;
    }

    async function updateArcadeBalances() {
      if (!userAccount || !arcadeTokenContract) return;
      const decimals = await arcadeTokenContract.decimals();
      const bal = await arcadeTokenContract.balanceOf(userAccount);
      document.getElementById('arcade-balance').textContent = ethers.utils.formatUnits(bal, decimals);
      document.getElementById('arcade-credits').textContent = arcadeCredits;
      const playBtn = document.getElementById('play-points-btn');
      const depositNotice = document.getElementById('arcade-deposit-notice');
      if (playBtn && depositNotice) {
        if (arcadeCredits < 5) {
          playBtn.disabled = true;
          depositNotice.style.display = 'block';
          canPlayForPoints = false;
        } else {
          playBtn.disabled = false;
          depositNotice.style.display = 'none';
          canPlayForPoints = true;
        }
      }
    }

    async function handleArcadeDeposit() {
      const statusEl = document.getElementById('arcade-deposit-status');
      const amountInput = document.getElementById('arcade-deposit-amount');
      let amount = amountInput.value;
      if (!amount || isNaN(amount) || Number(amount) <= 0) {
        statusEl.textContent = 'Enter a valid amount.';
        return;
      }
      if (Number(amount) < 5) {
        statusEl.textContent = 'Minimum deposit is 5 ARCADE tokens.';
        return;
      }
      amount = ethers.utils.parseUnits(amount, 18);
      try {
        statusEl.textContent = 'Approving...';
        const tx1 = await arcadeTokenContract.approve(arcadeDepositAddress, amount);
        await tx1.wait();
        statusEl.textContent = 'Depositing...';
        const tx2 = await arcadeDepositContract.deposit(amount);
        await tx2.wait();
        statusEl.textContent = 'Deposit successful!';
        arcadeCredits += Number(ethers.utils.formatUnits(amount, 18));
        updateArcadeBalances();
        if (arcadeCredits >= 5) {
          canPlayForPoints = true;
          hideBlockPlayOverlay();
        }
      } catch (e) {
        statusEl.textContent = 'Deposit failed.';
        console.error(e);
      }
    }

    // Overlay to block play if not enough deposit
    function showBlockPlayOverlay() {
      let overlay = document.getElementById('block-play-overlay');
      const canvas = document.getElementById('gameCanvas');
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'block-play-overlay';
        overlay.style = 'position:absolute;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.92);z-index:30;display:flex;align-items:center;justify-content:center;pointer-events:auto;';
        overlay.innerHTML = '<div style="background:#181818;padding:48px 32px;border-radius:16px;box-shadow:0 0 32px #0008;text-align:center;min-width:320px;"><h2 style="color:#fff;font-size:2.2rem;margin-bottom:32px;">Deposit Required</h2><div style="color:#f33;font-size:1.2rem;">You must deposit at least 5 ARCADE tokens to play for points.</div></div>';
        // Insert overlay as a sibling to the canvas, absolutely positioned over it
        const gameContainer = document.getElementById('game-container');
        gameContainer.style.position = 'relative';
        canvas.parentNode.insertBefore(overlay, canvas.nextSibling);
        // Position overlay over the canvas
        overlay.style.width = canvas.offsetWidth + 'px';
        overlay.style.height = canvas.offsetHeight + 'px';
        overlay.style.left = canvas.offsetLeft + 'px';
        overlay.style.top = canvas.offsetTop + 'px';
      } else {
        overlay.style.display = 'flex';
        // Reposition overlay in case of resize
        overlay.style.width = canvas.offsetWidth + 'px';
        overlay.style.height = canvas.offsetHeight + 'px';
        overlay.style.left = canvas.offsetLeft + 'px';
        overlay.style.top = canvas.offsetTop + 'px';
      }
    }
    function hideBlockPlayOverlay() {
      let overlay = document.getElementById('block-play-overlay');
      if (overlay) overlay.style.display = 'none';
    }

    // Add window resize handler to reposition overlay if visible
    window.addEventListener('resize', () => {
      let overlay = document.getElementById('block-play-overlay');
      const canvas = document.getElementById('gameCanvas');
      if (overlay && overlay.style.display !== 'none') {
        overlay.style.width = canvas.offsetWidth + 'px';
        overlay.style.height = canvas.offsetHeight + 'px';
        overlay.style.left = canvas.offsetLeft + 'px';
        overlay.style.top = canvas.offsetTop + 'px';
      }
    });

    // Add CSV export logic after updateLeaderboard()
    document.getElementById('export-leaderboard-csv').addEventListener('click', async () => {
      if (!leaderboardContract) {
        alert('Connect wallet to load leaderboard.');
        return;
      }
      try {
        const scores = await leaderboardContract.getLeaderboard();
        if (!scores.length) {
          alert('No scores to export.');
          return;
        }
        let csv = 'Player,Score\n';
        for (const entry of scores) {
          csv += \`\${entry.player},\${entry.score}\n\`;
        }
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'omega-man-leaderboard.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (e) {
        alert('Failed to export leaderboard.');
        console.error(e);
      }
    });

    init();

    </script>
</body>
</html>
`;
}

// Brick Breaker - from https://github.com/OmegaNetwork-source/brickbreaker
function getBrickBreakerTemplate() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Omega Breakout</title>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/ethers/5.7.2/ethers.umd.min.js" integrity="sha512-FDcVY+g7vc5CXANbrTSg1K5qLyriCsGDYCE02Li1tXEYdNQPvLPHNE+rT2Mjei8N7fZbe0WLhw27j2SrGRpdMg==" crossorigin="anonymous" referrerpolicy="no-referrer"></script>
    <style>
        :root {
            --primary-color: #00ffff;
            --background-color: #0d0d0d;
            --text-color: #ffffff;
            --panel-bg-color: #1a1a1a;
            --border-color: #333;
        }
        body, html {
            margin: 0;
            padding: 0;
            height: 100%;
            font-family: 'Courier New', Courier, monospace;
            background-color: var(--background-color);
            color: var(--text-color);
            overflow: hidden;
            display: flex;
            justify-content: center;
            align-items: center;
        }
        .container {
            display: flex;
            width: 90vw;
            height: 90vh;
            max-width: 1400px;
            max-height: 800px;
        }
        .game-container {
            flex-grow: 1;
            display: flex;
            justify-content: center;
            align-items: center;
            position: relative;
        }
        canvas {
            background-color: #000;
            box-shadow: 0 0 20px var(--primary-color);
            border: 2px solid var(--primary-color);
        }
        .ui-panel {
            width: 300px;
            padding: 20px;
            background-color: var(--panel-bg-color);
            border-left: 1px solid var(--border-color);
            display: flex;
            flex-direction: column;
            box-shadow: -5px 0 15px rgba(0,0,0,0.5);
        }
        h1, h2, p {
            text-align: center;
            text-shadow: 0 0 5px var(--primary-color);
        }
        h1 {
            font-size: 2.5em;
            margin-bottom: 20px;
            color: var(--primary-color);
        }
        .stats p {
            font-size: clamp(1em, 2.5vh, 1.2em);
            margin: 10px 0;
        }
        .leaderboard {
            margin-top: 20px;
            flex-grow: 1;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            text-align: left;
        }
        th, td {
            padding: 8px;
            border-bottom: 1px solid var(--border-color);
        }
        th {
            text-align: center;
            color: var(--primary-color);
        }
        td {
            font-size: 0.9em;
        }
        .web3-btn {
            background-color: transparent;
            color: var(--primary-color);
            border: 1px solid var(--primary-color);
            padding: 10px 15px;
            margin: 10px auto;
            cursor: pointer;
            font-family: inherit;
            font-size: 1em;
            display: block;
            width: 80%;
            transition: background-color 0.3s, color 0.3s;
        }
        .web3-btn:hover {
            background-color: var(--primary-color);
            color: var(--background-color);
        }
        .message-box {
            position: absolute;
            background-color: rgba(26, 26, 26, 0.9);
            padding: 30px;
            border: 1px solid var(--primary-color);
            box-shadow: 0 0 15px var(--primary-color);
            text-align: center;
            display: none; /* Hidden by default */
        }
        @media (max-width: 768px) {
            .container {
                flex-direction: column;
                height: 100vh;
                width: 100vw;
            }
            .ui-panel {
                width: 100%;
                height: auto;
                border-left: none;
                border-top: 1px solid var(--border-color);
                flex-shrink: 0;
                overflow-y: auto;
                padding: 10px;
            }
            .game-container {
                height: 60vh;
            }
            h1 {
                font-size: 2em;
                margin-bottom: 10px;
            }
            .web3-btn {
                padding: 12px;
                font-size: 1.1em;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="game-container">
            <canvas id="gameCanvas"></canvas>
            <div id="messageBox" class="message-box">
                <h2 id="messageTitle"></h2>
                <p id="messageText"></p>
                <button id="actionButton" class="web3-btn">Play</button>
            </div>
        </div>
        <div class="ui-panel">
            <h1>Omega<br>Breakout</h1>
            <div class="stats">
                <p>Score: <span id="score">0</span></p>
                <p>Lives: <span id="lives">3</span></p>
            </div>
            <button id="connectWalletBtn" class="web3-btn">Connect Wallet</button>
            <button id="submitScoreBtn" class="web3-btn" style="display:none;">Submit Score</button>
            <button id="exportCsvBtn" class="web3-btn">Export CSV</button>
            <div class="leaderboard">
                <h2>Leaderboard</h2>
                <table>
                    <thead>
                        <tr><th>Rank</th><th>Player</th><th>Score</th></tr>
                    </thead>
                    <tbody id="leaderboardBody">
                        <!-- Scores will be populated here -->
                    </tbody>
                </table>
            </div>
            <p id="walletStatus" style="font-size: 0.8em; text-align: center;"></p>
        </div>
    </div>

    <script>
        document.addEventListener('DOMContentLoaded', () => {
            const canvas = document.getElementById('gameCanvas');
            const ctx = canvas.getContext('2d');
            const gameContainer = document.querySelector('.game-container');

            canvas.width = gameContainer.clientWidth;
            canvas.height = gameContainer.clientHeight;

            // Game State
            let gameState = 'start'; // 'start', 'playing', 'paused', 'over', 'won'
            let score = 0;
            let lives = 3;

            // Time-based physics
            let lastTime = 0;

            // Controls
            let rightPressed = false;
            let leftPressed = false;

            // --- Game Objects ---
            const paddle = {
                x: canvas.width / 2 - 50,
                y: canvas.height - 20,
                width: 100,
                height: 10,
                color: 'var(--primary-color)',
                speed: 450 // pixels per second
            };

            const ball = {
                x: canvas.width / 2,
                y: canvas.height - 30,
                radius: 7,
                dx: 200, // pixels per second
                dy: -200, // pixels per second
                color: 'var(--primary-color)'
            };

            const bricks = {
                rowCount: 6,
                columnCount: 8,
                width: (canvas.width * 0.9) / 8,
                height: 20,
                padding: 5,
                offsetTop: 50,
                offsetLeft: (canvas.width * 0.05),
                list: []
            };

            // --- Drawing Functions ---
            function drawPaddle() {
                ctx.beginPath();
                ctx.rect(paddle.x, paddle.y, paddle.width, paddle.height);
                ctx.fillStyle = paddle.color;
                ctx.shadowColor = paddle.color;
                ctx.shadowBlur = 10;
                ctx.fill();
                ctx.closePath();
                ctx.shadowBlur = 0;
            }

            function drawBall() {
                ctx.beginPath();
                ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
                ctx.fillStyle = ball.color;
                ctx.shadowColor = ball.color;
                ctx.shadowBlur = 15;
                ctx.fill();
                ctx.closePath();
                ctx.shadowBlur = 0;
            }

            function drawBricks() {
                bricks.list.forEach(column => {
                    column.forEach(brick => {
                        if (brick.status === 1) {
                            ctx.beginPath();
                            ctx.rect(brick.x, brick.y, bricks.width, bricks.height);
                            ctx.fillStyle = \`hsl(180, 100%, \${brick.health * 20 + 40}%)\`;
                            ctx.fill();
                            ctx.closePath();
                        }
                    });
                });
            }
            
            // --- Game Logic ---
            function createBricks() {
                bricks.list = [];
                for (let c = 0; c < bricks.columnCount; c++) {
                    bricks.list[c] = [];
                    for (let r = 0; r < bricks.rowCount; r++) {
                        const brickX = c * (bricks.width + bricks.padding) + bricks.offsetLeft;
                        const brickY = r * (bricks.height + bricks.padding) + bricks.offsetTop;
                        bricks.list[c][r] = { x: brickX, y: brickY, status: 1, health: bricks.rowCount - r };
                    }
                }
            }

            function update(deltaTime) {
                // Ball movement
                ball.x += ball.dx * deltaTime;
                ball.y += ball.dy * deltaTime;

                // Wall collision (left/right)
                if (ball.x + ball.radius > canvas.width || ball.x - ball.radius < 0) {
                    ball.dx = -ball.dx;
                }
                // Wall collision (top)
                if (ball.y - ball.radius < 0) {
                    ball.dy = -ball.dy;
                }

                // Paddle collision
                if (ball.y + ball.radius > paddle.y && ball.x > paddle.x && ball.x < paddle.x + paddle.width) {
                    ball.dy = -Math.abs(ball.dy); // Ensure it always goes up
                }

                // Lose a life
                if (ball.y + ball.radius > canvas.height) {
                    lives--;
                    document.getElementById('lives').textContent = lives;
                    if (lives <= 0) {
                        setGameState('over');
                    } else {
                        resetBallAndPaddle();
                    }
                }
                
                // Brick collision
                let totalBricks = 0;
                bricks.list.forEach(column => {
                    column.forEach(brick => {
                        if (brick.status === 1) {
                            totalBricks++;
                            if (ball.x > brick.x && ball.x < brick.x + bricks.width && ball.y > brick.y && ball.y < brick.y + bricks.height) {
                                ball.dy = -ball.dy;
                                brick.status = 0; // For now, just destroy it
                                score += 10;
                                document.getElementById('score').textContent = score;
                            }
                        }
                    });
                });

                if(totalBricks === 0) {
                    setGameState('won');
                }

                // Paddle movement from keyboard
                if (rightPressed && paddle.x < canvas.width - paddle.width) {
                    paddle.x += paddle.speed * deltaTime;
                }
                if (leftPressed && paddle.x > 0) {
                    paddle.x -= paddle.speed * deltaTime;
                }
            }

            function gameLoop(timestamp) {
                if (!lastTime) lastTime = timestamp;
                const deltaTime = (timestamp - lastTime) / 1000;
                lastTime = timestamp;

                ctx.clearRect(0, 0, canvas.width, canvas.height);

                if (gameState === 'playing') {
                    update(deltaTime);
                }
                
                drawBricks();
                drawPaddle();
                drawBall();

                requestAnimationFrame(gameLoop);
            }

            // --- State Management & Controls ---
            
            function showMessage(state) {
                const box = document.getElementById('messageBox');
                const title = document.getElementById('messageTitle');
                const text = document.getElementById('messageText');
                const button = document.getElementById('actionButton');
                
                box.style.display = 'block';
                if(state === 'start') {
                    title.innerText = "Omega Breakout";
                    text.innerText = "Clear all the bricks to win.";
                    button.innerText = "Play";
                    button.onclick = () => setGameState('playing');
                } else if (state === 'over') {
                    title.innerText = "Game Over";
                    text.innerText = \`Final Score: \${score}\`;
                    button.innerText = "Play Again";
                    button.onclick = () => location.reload();
                    if(userAddress) document.getElementById('submitScoreBtn').style.display = 'block';
                } else if (state === 'won') {
                    title.innerText = "You Win!";
                    text.innerText = \`Final Score: \${score}\`;
                    button.innerText = "Play Again";
                    button.onclick = () => location.reload();
                    if(userAddress) document.getElementById('submitScoreBtn').style.display = 'block';
                }
            }

            function setGameState(newState) {
                gameState = newState;
                const box = document.getElementById('messageBox');
                box.style.display = 'none';

                if (newState === 'playing') {
                    lastTime = 0; // Reset timer for smooth start
                } else {
                   showMessage(newState);
                }
            }

            function resetBallAndPaddle() {
                ball.x = canvas.width / 2;
                ball.y = canvas.height - 30;
                ball.dx = 200 * (Math.random() > 0.5 ? 1 : -1);
                ball.dy = -200;
                paddle.x = canvas.width / 2 - paddle.width / 2;
            }

            // Mouse controls
            document.addEventListener('mousemove', (e) => {
                const relativeX = e.clientX - canvas.getBoundingClientRect().left;
                if (relativeX > 0 && relativeX < canvas.width) {
                    paddle.x = relativeX - paddle.width / 2;
                }
            });

            // Touch controls
            canvas.addEventListener('touchmove', (e) => {
                e.preventDefault();
                const touch = e.touches[0];
                const relativeX = touch.clientX - canvas.getBoundingClientRect().left;
                if (relativeX > 0 && relativeX < canvas.width) {
                    paddle.x = relativeX - paddle.width / 2;
                }
            }, { passive: false });

            // Keyboard controls
            document.addEventListener('keydown', (e) => {
                if(e.key === 'Right' || e.key === 'ArrowRight') rightPressed = true;
                else if(e.key === 'Left' || e.key === 'ArrowLeft') leftPressed = true;
            });
            document.addEventListener('keyup', (e) => {
                if(e.key === 'Right' || e.key === 'ArrowRight') rightPressed = false;
                else if(e.key === 'Left' || e.key === 'ArrowLeft') leftPressed = false;
            });

            // --- Web3 Integration (Placeholder) ---
            let provider, signer, contract, userAddress;
            const contractAddress = "0x9d93ece865b97cc9d14eccea6ff9471a8d4be05a"; // <-- IMPORTANT
            const contractABI = [
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "player",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "score",
				"type": "uint256"
			}
		],
		"name": "ScoreSubmitted",
		"type": "event"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "_score",
				"type": "uint256"
			}
		],
		"name": "submitScore",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "getLeaderboard",
		"outputs": [
			{
				"components": [
					{
						"internalType": "address",
						"name": "player",
						"type": "address"
					},
					{
						"internalType": "uint256",
						"name": "score",
						"type": "uint256"
					}
				],
				"internalType": "struct Leaderboard.ScoreEntry[]",
				"name": "",
				"type": "tuple[]"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "getPlayerCount",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"name": "highScores",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"name": "players",
		"outputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	}
];

            const connectWalletBtn = document.getElementById('connectWalletBtn');
            const submitScoreBtn = document.getElementById('submitScoreBtn');
            const exportCsvBtn = document.getElementById('exportCsvBtn');
            const leaderboardBody = document.getElementById('leaderboardBody');
            const walletStatusP = document.getElementById('walletStatus');

            async function connectWallet() {
                if (typeof ethers === 'undefined') {
                    walletStatusP.textContent = 'Library not loaded. Please refresh.';
                    console.error("Ethers.js is not loaded.");
                    return;
                }
                if (typeof window.ethereum === 'undefined') {
                    walletStatusP.textContent = 'Please install MetaMask!';
                    return;
                }
                try {
                    await window.ethereum.request({ method: 'eth_requestAccounts' });
                    provider = new ethers.providers.Web3Provider(window.ethereum);
                    signer = provider.getSigner();
                    userAddress = await signer.getAddress();
                    contract = new ethers.Contract(contractAddress, contractABI, signer);
                    
                    walletStatusP.textContent = \`Connected: \${userAddress.substring(0, 6)}...\${userAddress.substring(userAddress.length - 4)}\`;
                    connectWalletBtn.textContent = 'Wallet Connected';
                    connectWalletBtn.disabled = true;
                } catch (error) {
                    console.error("Wallet connection failed:", error);
                    walletStatusP.textContent = 'Connection failed.';
                }
            }

            async function submitScore() {
                if (!contract || !userAddress) {
                    walletStatusP.textContent = 'Please connect wallet first.';
                    return;
                }
                try {
                    submitScoreBtn.textContent = 'Submitting...';
                    submitScoreBtn.disabled = true;
                    const tx = await contract.submitScore(score);
                    await tx.wait();
                    alert('Score submitted successfully!');
                    fetchLeaderboard(); // Refresh leaderboard
                } catch (error) {
                    console.error("Score submission failed:", error);
                    alert('Score submission failed.');
                } finally {
                    submitScoreBtn.textContent = 'Submit Score';
                    submitScoreBtn.disabled = false;
                    submitScoreBtn.style.display = 'none';
                }
            }

            async function fetchLeaderboard() {
                if (!contractAddress || !contractABI.length) return;
                
                let tempProvider = new ethers.providers.JsonRpcProvider('https://mainnet.aurora.dev');
                 if (typeof window.ethereum !== 'undefined') {
                    tempProvider = new ethers.providers.Web3Provider(window.ethereum);
                }
                const readonlyContract = new ethers.Contract(contractAddress, contractABI, tempProvider);

                try {
                    const board = await readonlyContract.getLeaderboard();
                    leaderboardBody.innerHTML = ''; // Clear previous entries
                    
                    // Sort the leaderboard by score descending
                    const sortedBoard = [...board].sort((a, b) => b.score - a.score);

                    sortedBoard.slice(0, 10).forEach((entry, index) => {
                        const row = leaderboardBody.insertRow();
                        const rankCell = row.insertCell(0);
                        const playerCell = row.insertCell(1);
                        const scoreCell = row.insertCell(2);

                        rankCell.textContent = index + 1;
                        playerCell.textContent = \`\${entry.player.substring(0, 6)}...\${entry.player.substring(entry.player.length - 4)}\`;
                        scoreCell.textContent = entry.score.toString();
                    });
                } catch (error) {
                    console.error("Failed to fetch leaderboard:", error);
                }
            }
            
            async function exportLeaderboardToCsv() {
                if (!contract) {
                    alert("Please connect your wallet first to fetch the latest data.");
                    return;
                }
                
                exportCsvBtn.disabled = true;
                exportCsvBtn.textContent = 'Exporting...';

                try {
                    const board = await contract.getLeaderboard();
                    const sortedBoard = [...board].sort((a, b) => b.score - a.score);

                    let csvContent = "data:text/csv;charset=utf-8,Rank,Player,Score\n";
                    
                    sortedBoard.forEach((entry, index) => {
                        const rank = index + 1;
                        const player = entry.player;
                        const score = entry.score.toString();
                        csvContent += \`\${rank},\${player},\${score}\n\`;
                    });

                    const encodedUri = encodeURI(csvContent);
                    const link = document.createElement("a");
                    link.setAttribute("href", encodedUri);
                    link.setAttribute("download", "omega-breakout-leaderboard.csv");
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);

                } catch (error) {
                    console.error("Failed to export CSV:", error);
                    alert("Failed to export leaderboard. See console for details.");
                } finally {
                    exportCsvBtn.disabled = false;
                    exportCsvBtn.textContent = 'Export CSV';
                }
            }

            connectWalletBtn.addEventListener('click', connectWallet);
            submitScoreBtn.addEventListener('click', submitScore);
            exportCsvBtn.addEventListener('click', exportLeaderboardToCsv);

            // --- Initial Setup ---
            createBricks();
            setGameState('start');
            // We fetch leaderboard on load, but contract might not be fully available
            // without a provider. Let's try, but also fetch after connecting.
            setTimeout(fetchLeaderboard, 500);
            requestAnimationFrame(gameLoop);
        });
    </script>
</body>
</html> 
`;
}

// Export for use in ai-dev.js
if (typeof window !== 'undefined') {
    window.GAME_TEMPLATES = GAME_TEMPLATES;
}
