// Bazaar App Logic

const APPS = [
    {
        id: 'netrunner',
        name: 'Netrunner',
        icon: '🕸️',
        category: 'Network Tool',
        description: 'Visualize your Tor circuit path in real-time. See the guard, relay, and exit nodes that secure your connection.',
        installed: false,
        featured: true
    }
];

document.addEventListener('DOMContentLoaded', async () => {
    try {
        await setupWindowControls();
    } catch (e) { console.error('Controls error', e); }

    // Check persisted install state
    const installedApps = JSON.parse(localStorage.getItem('installedApps') || '[]');
    APPS.forEach(app => {
        if (installedApps.includes(app.id)) {
            app.installed = true;
        }
    });

    renderApps();
});

function renderApps() {
    const grid = document.getElementById('appGrid');
    if (!grid) return;
    grid.innerHTML = '';

    APPS.forEach(app => {
        const card = document.createElement('div');
        card.className = 'app-card';

        const btnClass = app.installed ? 'install-btn installed' : (app.comingSoon ? 'install-btn' : 'install-btn primary');
        const btnText = app.installed ? 'Installed' : (app.comingSoon ? 'Coming Soon' : 'Install');
        const btnDisabled = app.installed || app.comingSoon ? 'disabled' : '';

        // Coming soon ribbon
        const ribbon = app.comingSoon ? `<div class="coming-soon">SOON</div>` : '';

        card.innerHTML = `
            ${ribbon}
            <div class="app-icon-area">
                <div class="app-icon">${app.icon}</div>
                <div>
                    <h3 class="app-name">${app.name}</h3>
                    <div class="app-category">${app.category}</div>
                </div>
            </div>
            <div class="app-desc">${app.description}</div>
            <button class="${btnClass}" ${btnDisabled} onclick="installApp('${app.id}')">
                ${btnText}
            </button>
        `;

        grid.appendChild(card);
    });
}

window.installApp = async (appId) => {
    const app = APPS.find(a => a.id === appId);
    if (!app || app.comingSoon || app.installed) return;

    // UI Feedback
    const btn = document.activeElement;
    if (btn) {
        btn.innerText = 'Downloading...';
        btn.style.opacity = '0.7';
    }

    // Simulate Network Delay
    await new Promise(r => setTimeout(r, 1500));

    if (btn) btn.innerText = 'Installing...';
    await new Promise(r => setTimeout(r, 1000));

    // "Install" logic
    try {
        if (window.electronAPI && window.electronAPI.installApp) {
            await window.electronAPI.installApp(appId);
            app.installed = true;

            // Persist locally too (since we share localStorage domain in this setup)
            const installedApps = JSON.parse(localStorage.getItem('installedApps') || '[]');
            if (!installedApps.includes(appId)) {
                installedApps.push(appId);
                localStorage.setItem('installedApps', JSON.stringify(installedApps));
            }

            renderApps(); // Re-render to show "Installed" state
            console.log(`App ${appId} installed successfully`);
        } else {
            throw new Error('API not available');
        }
    } catch (e) {
        console.error('Install failed:', e);
        if (btn) {
            btn.innerText = 'Error';
            btn.style.backgroundColor = 'red';
            setTimeout(() => {
                btn.innerText = 'Install';
                btn.style.backgroundColor = '';
                btn.style.opacity = '1';
            }, 2000);
        }
    }
};

async function setupWindowControls() {
    if (!window.electronAPI) return;
    try {
        const windowId = await window.electronAPI.getWindowId();
        const minBtn = document.getElementById('minBtn');
        const maxBtn = document.getElementById('maxBtn');
        const closeBtn = document.getElementById('closeBtn');

        if (minBtn) minBtn.onclick = () => window.electronAPI.appWindowMinimize(windowId);
        if (maxBtn) maxBtn.onclick = () => window.electronAPI.appWindowMaximize(windowId);
        if (closeBtn) closeBtn.onclick = () => window.electronAPI.appWindowClose(windowId);
    } catch (e) {
        console.error('Window controls error:', e);
    }
}
