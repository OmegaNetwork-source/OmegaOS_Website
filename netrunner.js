// Netrunner Logic // v2.0 Global Surveillance

const CANVAS_PADDING = 50;

// State
let circuits = [];
let mapCanvas, ctx;
let trafficCanvas, trafficCtx;
let width, height;
let particles = [];
let lastFrameTime = 0;
let selectedNode = null;
let trafficHistory = new Array(50).fill(10); // Mock traffic data

// Assets
const NODE_COLORS = {
    guard: '#00ff99', // Green
    middle: '#00ccff', // Blue
    exit: '#ff0055',  // Red
    me: '#ffffff',    // White
    internet: '#ffff00' // Yellow
};

document.addEventListener('DOMContentLoaded', async () => {
    setupCanvas();
    setupWindowControls();

    // Initial Render Loop
    requestAnimationFrame(renderLoop);

    // Initial Data Fetch
    await fetchCircuits();

    // Auto-refresh every 5s
    setInterval(fetchCircuits, 5000);
    setInterval(updateTraffic, 100);

    // Mock Logs
    addLog('System initialized...', 'info');
    addLog('Connecting to Tor daemon...', 'warn');
});

function setupCanvas() {
    mapCanvas = document.getElementById('mapCanvas');
    ctx = mapCanvas.getContext('2d');

    trafficCanvas = document.getElementById('trafficCanvas');
    trafficCtx = trafficCanvas.getContext('2d');

    resize();
    window.addEventListener('resize', resize);

    // Interaction
    mapCanvas.addEventListener('click', handleMapClick);
    mapCanvas.addEventListener('mousemove', handleMapHover);
}

function resize() {
    width = mapCanvas.width = mapCanvas.offsetWidth;
    height = mapCanvas.height = mapCanvas.offsetHeight;

    trafficCanvas.width = trafficCanvas.offsetWidth;
    trafficCanvas.height = trafficCanvas.offsetHeight;
}

// --- Data Logic ---

async function fetchCircuits() {
    try {
        if (window.electronAPI && window.electronAPI.torGetCircuits) {
            const rawCircuits = await window.electronAPI.torGetCircuits();
            // Process raw data into visual nodes
            processCircuits(rawCircuits);
            addLog(`Updated circuit data: ${rawCircuits.length} active`, 'success');
        } else {
            // Dev Mode Mock
            processCircuits([
                { id: '8080', status: 'BUILT', nodes: ['$GUARD~GuardNodes', '$RELAY~RelayNode', '$EXIT~ExitNode'] }
            ]);
        }
    } catch (e) {
        console.error("Tor IPC Error", e);
        addLog('Connection failed: ' + e.message, 'warn');
    }
}

function processCircuits(raw) {
    // For visual simplicity, we focus on the FIRST active circuit for the main path
    // But we can show others as background ghosts later

    if (raw.length === 0) return;

    const active = raw[0];
    const path = [];

    // 1. ME (Localhost) - Move UP to avoid bottom Log Box
    path.push({
        type: 'me',
        name: 'LOCALHOST',
        ip: '127.0.0.1',
        x: width * 0.1,
        y: height * 0.55 // Moved from 0.8 to 0.55 to be safely above HUDs
    });

    // 2. Nodes (Simulated Geo-location based on hash)
    active.nodes.forEach((nodeObj, i) => {
        let type = 'middle';
        if (i === 0) type = 'guard';
        if (i === active.nodes.length - 1) type = 'exit';

        // Handle both string (dev mock) and object (production) formats
        let name, fingerprintStr;

        if (typeof nodeObj === 'string') {
            name = nodeObj.split('~')[0].replace('$', '');
            fingerprintStr = nodeObj;
        } else {
            name = nodeObj.name;
            fingerprintStr = nodeObj.fingerprint;
        }

        // Generate consistent fake coords from name hash
        const hash = name.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
        const randX = (hash % 100) / 100;
        const randY = ((hash * 13) % 100) / 100;

        // Map to roughly world map distribution (very rough)
        // Restricted Area: Avoid bottom 250px (HUDs) and top 60px (Header)
        const safeYMin = height * 0.15;
        const safeYMax = height - 250; // Increased safety margin

        const x = width * (0.15 + (randX * 0.7));
        const y = safeYMin + (randY * (safeYMax - safeYMin));

        path.push({
            type,
            name,
            fingerprint: fingerprintStr,
            country: ['DE', 'US', 'NL', 'FR', 'SE'][hash % 5],
            city: ['Berlin', 'New York', 'Amsterdam', 'Paris', 'Stockholm'][hash % 5],
            bandwidth: (hash % 50) + 10 + ' MB/s',
            uptime: (hash % 20) + 'd',
            x, y
        });
    });

    // 3. TARGET (Internet)
    path.push({
        type: 'internet',
        name: 'INTERNET',
        x: width * 0.9,
        y: height * 0.15 // Moved up slightly
    });

    circuits = [path];
}

// --- Render Logic ---

function renderLoop(timestamp) {
    const dt = timestamp - lastFrameTime;
    lastFrameTime = timestamp;

    // Clear with slight trail effect? No, clean redraw for now
    ctx.clearRect(0, 0, width, height);

    // Background Grid
    // ctx.fillStyle = '#0a1010';
    // ctx.fillRect(0, 0, width, height);

    drawWorldMapGrid();
    drawConnections(dt);
    drawNodes();
    renderTrafficGraph();

    requestAnimationFrame(renderLoop);
}

function drawWorldMapGrid() {
    ctx.fillStyle = 'rgba(0, 255, 153, 0.05)';
    const gridSize = 20;

    for (let x = 0; x < width; x += gridSize) {
        for (let y = 0; y < height; y += gridSize) {
            const n = Math.sin(x * 0.01) + Math.cos(y * 0.015);
            if (n > 0.5) ctx.fillRect(x, y, 2, 2);
        }
    }
}

function drawNodes() {
    circuits.forEach(path => {
        path.forEach(node => {
            const isSelected = selectedNode === node;
            const size = isSelected ? 8 : 4;
            const glow = isSelected ? 20 : 10;

            ctx.beginPath();
            ctx.arc(node.x, node.y, size, 0, Math.PI * 2);
            ctx.fillStyle = NODE_COLORS[node.type];
            ctx.shadowBlur = glow;
            ctx.shadowColor = NODE_COLORS[node.type];
            ctx.fill();
            ctx.shadowBlur = 0; // Reset

            // Label w/ Geo Info
            if (node.type !== 'middle' || isSelected || true) { // Always show some info
                ctx.fillStyle = '#aaa';
                ctx.font = '10px monospace';
                let label = node.name;
                if (node.country) label += ` [${node.country}]`;

                ctx.fillText(label, node.x + 10, node.y + 4);
            }
        });
    });
}

function drawConnections(dt) {
    if (circuits.length === 0) return;
    const path = circuits[0];

    ctx.beginPath();
    ctx.strokeStyle = 'rgba(0, 255, 153, 0.2)';
    ctx.lineWidth = 1;

    // Draw Curved Lines (Quadratic Bezier)
    ctx.moveTo(path[0].x, path[0].y);
    for (let i = 1; i < path.length; i++) {
        const prev = path[i - 1];
        const curr = path[i];

        // Control point: mid-x, but pushed up/down to create arc
        // Simple arc:
        // const cpX = (prev.x + curr.x) / 2;
        // const cpY = (prev.y + curr.y) / 2 - 50; 
        // ctx.quadraticCurveTo(cpX, cpY, curr.x, curr.y);

        ctx.lineTo(curr.x, curr.y); // Keeping straight for clarity, maybe curve later?
        // User asked for "better flow". Let's try slight curve.
    }
    ctx.stroke();

    // Better curved path for particles to follow?
    // Actually, straight lines scan better for "circuit" look.
    // Let's keep straight but improve particle flow.


    // Spawn Particles
    if (Math.random() > 0.9) {
        particles.push({
            segment: 0,
            progress: 0,
            speed: 0.02 + Math.random() * 0.02
        });
    }

    // Update & Draw Particles
    ctx.fillStyle = '#fff';
    particles.forEach((p, idx) => {
        p.progress += p.speed;
        if (p.progress >= 1) {
            p.progress = 0;
            p.segment++;
        }

        if (p.segment >= path.length - 1) {
            particles.splice(idx, 1);
            return;
        }

        const start = path[p.segment];
        const end = path[p.segment + 1];

        const px = start.x + (end.x - start.x) * p.progress;
        const py = start.y + (end.y - start.y) * p.progress;

        ctx.fillRect(px, py, 3, 3);
    });
}

function renderTrafficGraph() {
    const w = trafficCanvas.width;
    const h = trafficCanvas.height;
    trafficCtx.clearRect(0, 0, w, h);

    trafficCtx.strokeStyle = '#00ff99';
    trafficCtx.lineWidth = 2;
    trafficCtx.beginPath();

    const step = w / trafficHistory.length;

    trafficHistory.forEach((val, i) => {
        const y = h - (val / 100 * h);
        if (i === 0) trafficCtx.moveTo(i * step, y);
        else trafficCtx.lineTo(i * step, y);
    });
    trafficCtx.stroke();

    // Fill
    trafficCtx.lineTo(w, h);
    trafficCtx.lineTo(0, h);
    trafficCtx.fillStyle = 'rgba(0, 255, 153, 0.1)';
    trafficCtx.fill();
}

function updateTraffic() {
    // Shift & Push random noise
    trafficHistory.shift();
    const last = trafficHistory[trafficHistory.length - 1] || 10;
    let next = last + (Math.random() * 20 - 10);
    if (next < 5) next = 5;
    if (next > 90) next = 90;
    trafficHistory.push(next);
}

// --- Interaction ---

function handleMapClick(e) {
    const rect = mapCanvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    if (circuits.length > 0) {
        let clicked = null;
        circuits[0].forEach(node => {
            const dx = node.x - mx;
            const dy = node.y - my;
            if (dx * dx + dy * dy < 200) { // 14px radius hit
                clicked = node;
            }
        });

        selectedNode = clicked;
        renderInspector(clicked);
    }
}

function handleMapHover(e) {
    const rect = mapCanvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    let hovering = false;
    if (circuits.length > 0) {
        circuits[0].forEach(node => {
            const dx = node.x - mx;
            const dy = node.y - my;
            if (dx * dx + dy * dy < 200) hovering = true;
        });
    }
    mapCanvas.style.cursor = hovering ? 'pointer' : 'default';
}

function renderInspector(node) {
    const el = document.getElementById('node-details');
    if (!node) {
        el.innerHTML = '<div style="text-align:center; padding: 20px; color: #666;">Select a node...</div>';
        return;
    }

    el.innerHTML = `
        <div class="data-row"><span class="data-label">NAME:</span> <span class="data-val">${node.name}</span></div>
        <div class="data-row"><span class="data-label">TYPE:</span> <span class="data-val" style="color:${NODE_COLORS[node.type]}">${node.type.toUpperCase()}</span></div>
        <div class="data-row"><span class="data-label">IP:</span> <span class="data-val secure">MASKED</span></div>
        <div class="data-row"><span class="data-label">LOC:</span> <span class="data-val">${node.country || 'N/A'}</span></div>
         <div class="data-row"><span class="data-label">UPTIME:</span> <span class="data-val">${node.uptime || 'N/A'}</span></div>
        <hr style="border:0; border-bottom:1px solid #333; margin:10px 0;">
        <div class="data-row"><span class="data-label">BW:</span> <span class="data-val">${node.bandwidth || 'Unknown'}</span></div>
        <div class="data-row"><span class="data-label">FLAGS:</span> <span class="data-val warn">Fast, Valid, V2Dir</span></div>
    `;
}

function addLog(msg, type = 'info') {
    const box = document.getElementById('system-log');
    const div = document.createElement('div');
    div.className = `log-entry ${type}`;
    div.innerText = `> ${msg}`;
    box.prepend(div);

    if (box.children.length > 8) box.lastChild.remove();
}

// Window Controls
async function setupWindowControls() {
    if (!window.electronAPI) return;
    try {
        const windowId = await window.electronAPI.getWindowId();
        document.getElementById('minBtn').onclick = () => window.electronAPI.appWindowMinimize(windowId);
        document.getElementById('closeBtn').onclick = () => window.electronAPI.appWindowClose(windowId);
        document.getElementById('refreshBtn').onclick = () => fetchCircuits();
    } catch (e) {
        console.error("Win controls error", e);
    }
}
