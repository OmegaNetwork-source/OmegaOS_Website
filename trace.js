// Omega Trace v2.0 Logic

// --- Configuration ---
const COLORS = {
    bg: '#000000',
    grid: '#003300',
    land: '#001a00',
    highlight: '#00ff33',
    alert: '#ff3333',
    dim: '#006611'
};

let currentMode = 'trace';
let mapInstance = null;

document.addEventListener('DOMContentLoaded', () => {
    // Init Map
    mapInstance = new MatrixMap('mapCanvas');
    mapInstance.startAnimation();

    // Tab Handling
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => setMode(btn.dataset.tab));
    });

    // Input Handling
    const input = document.getElementById('targetInput');
    const btn = document.getElementById('runBtn');

    btn.addEventListener('click', () => parseAndRun());
    input.addEventListener('keypress', (e) => { if (e.key === 'Enter') parseAndRun(); });

    log('System initialized. Waiting for input...', 'success');
});

function setMode(mode) {
    currentMode = mode;

    // Update Tabs
    document.querySelectorAll('.tab-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.tab === mode);
    });

    // Update Placeholder
    const input = document.getElementById('targetInput');
    if (mode === 'trace') input.placeholder = "ENTER IP ADDRESS...";
    if (mode === 'phone') input.placeholder = "ENTER PHONE NUMBER...";
    if (mode === 'ports') input.placeholder = "ENTER IP TO SCAN...";

    input.value = '';
    input.focus();

    document.getElementById('resultsArea').innerHTML = '<div style="text-align:center; margin-top:20px; color:#444;">Standby...</div>';
    log(`Switched to ${mode.toUpperCase()} mode.`, 'info');
}

async function parseAndRun() {
    const input = document.getElementById('targetInput').value.trim();
    if (!input && currentMode !== 'trace') return; // IP trace can do 'self' on empty

    if (currentMode === 'trace') await runIpTrace(input);
    if (currentMode === 'phone') await runPhoneTrace(input);
    if (currentMode === 'ports') await runPortScan(input);
}

// --- FEATURE: IP TRACE ---
async function runIpTrace(ip) {
    log(`Initiating trace on ${ip || 'LOCALHOST'}...`);

    try {
        const res = await fetch(ip ? `http://ip-api.com/json/${ip}` : 'http://ip-api.com/json/');
        const data = await res.json();

        if (data.status === 'fail') throw new Error(data.message);

        renderResults([
            { l: 'IP', v: data.query },
            { l: 'ISP', v: data.isp },
            { l: 'ORG', v: data.org },
            { l: 'COUNTRY', v: `${data.country} (${data.countryCode})` },
            { l: 'CITY', v: data.city },
            { l: 'TIMEZONE', v: data.timezone },
            { l: 'COORDS', v: `${data.lat}, ${data.lon}` }
        ]);

        log(`Target acquired: ${data.city}, ${data.country}`, 'success');
        mapInstance.setTarget(data.lat, data.lon, data.query);

    } catch (e) {
        log(`Trace failed: ${e.message}`, 'error');
    }
}

// --- FEATURE: PHONE TRACKER (Simulated) ---
async function runPhoneTrace(phone) {
    log(`Analyzing signal: ${phone}...`);
    await sleep(1000); // Suspense

    // Mock Data Generator
    const carriers = ['Verizon', 'AT&T', 'T-Mobile', 'Vodafone', 'Orange', 'Telefonica'];
    const mockCarrier = carriers[Math.floor(Math.random() * carriers.length)];
    const valid = phone.length > 9;

    if (!valid) {
        log('Signal too weak. Invalid format.', 'error');
        return;
    }

    renderResults([
        { l: 'NUMBER', v: phone },
        { l: 'VALID', v: 'TRUE' },
        { l: 'CARRIER', v: mockCarrier },
        { l: 'TYPE', v: 'MOBILE / GSM' },
        { l: 'SIGNAL', v: '-85 dBm (Good)' },
        { l: 'STATUS', v: 'ACTIVE' },
        { l: 'LOCATION', v: 'TRIANGULATING...' }
    ]);

    log('Carrier info extracted.', 'success');

    await sleep(1500);
    // Fake location based on "random" but stable
    const lat = 30 + Math.random() * 20;
    const lon = -100 + Math.random() * 40;

    log(`Approximate location found via cell towers.`, 'success');
    mapInstance.setTarget(lat, lon, phone);
}

// --- FEATURE: PORT SCANNER ---
async function runPortScan(ip) {
    if (!ip) { log('IP required for port scan.', 'error'); return; }

    log(`Starting NMAP-lite scan on ${ip}...`);
    document.getElementById('resultsArea').innerHTML = '<div class="port-grid" id="portGrid"></div>';
    const grid = document.getElementById('portGrid');

    // Define ports
    const ports = [21, 22, 23, 25, 53, 80, 110, 443, 3306, 3389, 8080];

    // Visual placeholder
    ports.forEach(p => {
        const pf = document.createElement('div');
        pf.className = 'port-item';
        pf.id = `p-${p}`;
        pf.innerText = `${p}\n...`;
        grid.appendChild(pf);
    });

    try {
        // Use backend IPC
        if (window.electronAPI && window.electronAPI.invoke) {
            const result = await window.electronAPI.invoke('scan-ports', { ip, ports });

            if (result.success) {
                result.results.forEach(r => {
                    const el = document.getElementById(`p-${r.port}`);
                    if (el) {
                        el.innerText = `${r.port}\n${r.status.toUpperCase()}`;
                        if (r.status === 'open') {
                            el.classList.add('port-open');
                            log(`[OPEN] Port ${r.port}`, 'success');
                        } else {
                            el.classList.add('port-closed');
                        }
                    }
                });
                log('Scan complete.', 'success');
            } else {
                throw new Error(result.error);
            }
        } else {
            // Fallback for simulation (if running without full IPC rights)
            log('IPC bridge unavailable. Running simulation.', 'error');
            ports.forEach(p => {
                setTimeout(() => {
                    const open = Math.random() > 0.7;
                    const el = document.getElementById(`p-${p}`);
                    el.innerText = `${p}\n${open ? 'OPEN' : 'CLOSED'}`;
                    if (open) el.classList.add('port-open');
                }, Math.random() * 2000);
            });
        }
    } catch (e) {
        log(`Scan error: ${e.message}`, 'error');
    }
}

// --- VISUAL: MATRIX MAP ---
class MatrixMap {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.dots = [];
        this.resize();
        this.initDots();
        this.target = null;

        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        this.canvas.width = this.canvas.parentElement.offsetWidth;
        this.canvas.height = this.canvas.parentElement.offsetHeight;
        this.width = this.canvas.width;
        this.height = this.canvas.height;
    }

    initDots() {
        // Create a grid of "matrix" dots to represent the world
        // We use a simplified map projection function to cull dots not on land
        // For Cyberpunk vibe, we just do a global grid but denser near "equator"ish
        this.dots = [];
        const cols = 60;
        const rows = 30;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                this.dots.push({
                    x: (c / cols) * this.width,
                    y: (r / rows) * this.height,
                    char: String.fromCharCode(0x30A0 + Math.random() * 96), // Katakana
                    speed: 0.5 + Math.random(),
                    alpha: 0.1 + Math.random() * 0.4
                });
            }
        }
    }

    startAnimation() {
        const animate = () => {
            this.draw();
            requestAnimationFrame(animate);
        };
        animate();
    }

    setTarget(lat, lon, label) {
        // Mercator-ish projection to canvas coords
        // Lat: -90 to 90 -> Height to 0
        // Lon: -180 to 180 -> 0 to Width

        const x = (lon + 180) * (this.width / 360);
        const latRad = lat * Math.PI / 180;
        const mercN = Math.log(Math.tan((Math.PI / 4) + (latRad / 2)));
        const y = (this.height / 2) - (this.width * mercN / (2 * Math.PI));

        this.target = { x, y, label };

        // Update overlay
        document.getElementById('overlayLat').innerText = lat.toFixed(4);
        document.getElementById('overlayLon').innerText = lon.toFixed(4);
    }

    draw() {
        // Fade effect
        this.ctx.fillStyle = 'rgba(0, 5, 0, 0.1)';
        this.ctx.fillRect(0, 0, this.width, this.height);

        this.ctx.fillStyle = '#0f3';
        this.ctx.font = '10px monospace';

        // Draw Matrix Rain/Grid
        this.dots.forEach(d => {
            if (Math.random() > 0.95) d.char = String.fromCharCode(0x30A0 + Math.random() * 96);
            d.alpha = Math.max(0.1, Math.abs(Math.sin(Date.now() * 0.001 * d.speed)));

            this.ctx.fillStyle = `rgba(0, 255, 50, ${d.alpha})`;
            this.ctx.fillText(d.char, d.x, d.y);
        });

        // Draw Grid Lines
        this.ctx.strokeStyle = '#003300';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        for (let i = 0; i < this.width; i += 50) { this.ctx.moveTo(i, 0); this.ctx.lineTo(i, this.height); }
        for (let i = 0; i < this.height; i += 50) { this.ctx.moveTo(0, i); this.ctx.lineTo(this.width, i); }
        this.ctx.stroke();

        // Draw Target
        if (this.target) {
            const { x, y, label } = this.target;

            // Pulse
            const pulse = 10 + Math.sin(Date.now() * 0.01) * 5;

            this.ctx.strokeStyle = '#ff3333';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.arc(x, y, pulse, 0, Math.PI * 2);
            this.ctx.stroke();

            this.ctx.fillStyle = '#ff3333';
            this.ctx.beginPath();
            this.ctx.arc(x, y, 3, 0, Math.PI * 2);
            this.ctx.fill();

            // Crosshairs
            this.ctx.beginPath();
            this.ctx.moveTo(x - 20, y); this.ctx.lineTo(x + 20, y);
            this.ctx.moveTo(x, y - 20); this.ctx.lineTo(x, y + 20);
            this.ctx.stroke();

            this.ctx.fillText(label || 'TARGET', x + 10, y - 10);
        }
    }
}

// --- HELPERS ---
function renderResults(data) {
    const area = document.getElementById('resultsArea');
    let html = '';
    data.forEach(d => {
        html += `
            <div class="data-row">
                <span class="label">${d.l}</span>
                <span class="value">${d.v}</span>
            </div>
        `;
    });
    area.innerHTML = html;
}

function log(msg, type = 'info') {
    const c = document.getElementById('console');
    const d = document.createElement('div');
    d.className = `log-entry ${type}`;
    d.innerHTML = `> ${msg}`;
    c.prepend(d);
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
