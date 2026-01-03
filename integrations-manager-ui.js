// Integrations Manager UI
let currentWindowId = null;
let currentSection = 'webapps';

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    if (window.electronAPI) {
        window.electronAPI.getWindowId().then(id => {
            currentWindowId = id;
        });
    }

    // Window controls
    setupWindowControls();
    
    // Sidebar navigation
    setupSidebar();
    
    // Load data
    loadAllData();
    
    // Setup buttons
    setupButtons();
});

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

function setupSidebar() {
    document.querySelectorAll('.sidebar-item').forEach(item => {
        item.addEventListener('click', () => {
            const section = item.dataset.section;
            switchSection(section);
            
            // Update active state
            document.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
        });
    });
}

function switchSection(section) {
    currentSection = section;
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById(`${section}-section`).classList.add('active');
    loadSectionData(section);
}

function setupButtons() {
    document.getElementById('addWebAppBtn').addEventListener('click', () => showWebAppModal());
    document.getElementById('addExtensionBtn').addEventListener('click', () => showExtensionModal());
    document.getElementById('addPluginBtn').addEventListener('click', () => showPluginModal());
    document.getElementById('addAPIEndpointBtn').addEventListener('click', () => showAPIModal());
    document.getElementById('addWebhookBtn').addEventListener('click', () => showWebhookModal());
}

async function loadAllData() {
    await loadSectionData(currentSection);
}

async function loadSectionData(section) {
    if (!window.electronAPI) return;

    try {
        switch(section) {
            case 'webapps':
                await loadWebApps();
                break;
            case 'extensions':
                await loadExtensions();
                break;
            case 'plugins':
                await loadPlugins();
                break;
            case 'api':
                await loadAPIEndpoints();
                break;
            case 'webhooks':
                await loadWebhooks();
                break;
        }
    } catch (error) {
        console.error('Failed to load data:', error);
    }
}

// Web Apps
async function loadWebApps() {
    const list = document.getElementById('webapps-list');
    list.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">Loading...</div>';

    try {
        const webApps = await window.electronAPI.webappGetAll();
        list.innerHTML = '';

        if (webApps.length === 0) {
            list.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">No web apps installed</div>';
            return;
        }

        webApps.forEach(app => {
            const card = createItemCard(app.name, app.description || app.url, app.icon, [
                { text: 'Launch', action: () => launchWebApp(app.id), class: 'btn-primary' },
                { text: 'Delete', action: () => deleteWebApp(app.id), class: 'btn-danger' }
            ]);
            list.appendChild(card);
        });
    } catch (error) {
        list.innerHTML = `<div style="padding: 20px; color: #d32f2f;">Error: ${error.message}</div>`;
    }
}

function showWebAppModal() {
    const modal = createModal('Add Web App', `
        <div class="form-group">
            <label>Name</label>
            <input type="text" id="webapp-name" placeholder="My Web App">
        </div>
        <div class="form-group">
            <label>URL</label>
            <input type="url" id="webapp-url" placeholder="https://example.com">
        </div>
        <div class="form-group">
            <label>Icon (emoji)</label>
            <input type="text" id="webapp-icon" placeholder="🌐" maxlength="2">
        </div>
        <div class="form-group">
            <label>Description</label>
            <textarea id="webapp-desc" placeholder="Optional description"></textarea>
        </div>
        <div style="display: flex; gap: 8px; justify-content: flex-end; margin-top: 20px;">
            <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="saveWebApp()">Add</button>
        </div>
    `);
    document.body.appendChild(modal);
}

async function saveWebApp() {
    const name = document.getElementById('webapp-name').value;
    const url = document.getElementById('webapp-url').value;
    const icon = document.getElementById('webapp-icon').value || '🌐';
    const desc = document.getElementById('webapp-desc').value;

    if (!name || !url) {
        alert('Name and URL are required');
        return;
    }

    try {
        const id = name.toLowerCase().replace(/\s+/g, '-');
        await window.electronAPI.webappRegister(id, { name, url, icon, description: desc });
        closeModal();
        await loadWebApps();
    } catch (error) {
        alert('Failed to add web app: ' + error.message);
    }
}

async function launchWebApp(id) {
    try {
        await window.electronAPI.webappLaunch(id);
    } catch (error) {
        alert('Failed to launch web app: ' + error.message);
    }
}

async function deleteWebApp(id) {
    if (!confirm('Delete this web app?')) return;
    try {
        await window.electronAPI.webappDelete(id);
        await loadWebApps();
    } catch (error) {
        alert('Failed to delete web app: ' + error.message);
    }
}

// Extensions
async function loadExtensions() {
    const list = document.getElementById('extensions-list');
    list.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">Loading...</div>';

    try {
        const extensions = await window.electronAPI.extensionGetAll();
        list.innerHTML = '';

        if (extensions.length === 0) {
            list.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">No extensions installed</div>';
            return;
        }

        extensions.forEach(ext => {
            const card = createItemCard(
                ext.name,
                ext.description || `v${ext.version} by ${ext.author}`,
                ext.icon,
                [
                    { text: ext.enabled ? 'Disable' : 'Enable', action: () => toggleExtension(ext.id), class: 'btn-secondary' },
                    { text: 'Delete', action: () => deleteExtension(ext.id), class: 'btn-danger' }
                ]
            );
            list.appendChild(card);
        });
    } catch (error) {
        list.innerHTML = `<div style="padding: 20px; color: #d32f2f;">Error: ${error.message}</div>`;
    }
}

function showExtensionModal() {
    const modal = createModal('Add Extension', `
        <div class="form-group">
            <label>Name</label>
            <input type="text" id="ext-name" placeholder="My Extension">
        </div>
        <div class="form-group">
            <label>Version</label>
            <input type="text" id="ext-version" placeholder="1.0.0" value="1.0.0">
        </div>
        <div class="form-group">
            <label>Description</label>
            <textarea id="ext-desc" placeholder="Extension description"></textarea>
        </div>
        <div class="form-group">
            <label>Author</label>
            <input type="text" id="ext-author" placeholder="Author name">
        </div>
        <div class="form-group">
            <label>Icon (emoji)</label>
            <input type="text" id="ext-icon" placeholder="🔌" maxlength="2">
        </div>
        <div style="display: flex; gap: 8px; justify-content: flex-end; margin-top: 20px;">
            <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="saveExtension()">Add</button>
        </div>
    `);
    document.body.appendChild(modal);
}

async function saveExtension() {
    const name = document.getElementById('ext-name').value;
    const version = document.getElementById('ext-version').value;
    const desc = document.getElementById('ext-desc').value;
    const author = document.getElementById('ext-author').value;
    const icon = document.getElementById('ext-icon').value || '🔌';

    if (!name) {
        alert('Name is required');
        return;
    }

    try {
        const id = name.toLowerCase().replace(/\s+/g, '-');
        await window.electronAPI.extensionRegister(id, { name, version, description: desc, author, icon });
        closeModal();
        await loadExtensions();
    } catch (error) {
        alert('Failed to add extension: ' + error.message);
    }
}

async function toggleExtension(id) {
    try {
        await window.electronAPI.extensionToggle(id);
        await loadExtensions();
    } catch (error) {
        alert('Failed to toggle extension: ' + error.message);
    }
}

async function deleteExtension(id) {
    if (!confirm('Delete this extension?')) return;
    try {
        await window.electronAPI.extensionDelete(id);
        await loadExtensions();
    } catch (error) {
        alert('Failed to delete extension: ' + error.message);
    }
}

// Plugins
async function loadPlugins() {
    const list = document.getElementById('plugins-list');
    list.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">Loading...</div>';

    try {
        const plugins = await window.electronAPI.pluginGetAll();
        list.innerHTML = '';

        if (plugins.length === 0) {
            list.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">No plugins installed</div>';
            return;
        }

        plugins.forEach(plugin => {
            const card = createItemCard(
                plugin.name,
                plugin.description || `v${plugin.version} by ${plugin.author}`,
                plugin.icon,
                [
                    { text: plugin.enabled ? 'Disable' : 'Enable', action: () => togglePlugin(plugin.id), class: 'btn-secondary' },
                    { text: 'Delete', action: () => deletePlugin(plugin.id), class: 'btn-danger' }
                ]
            );
            list.appendChild(card);
        });
    } catch (error) {
        list.innerHTML = `<div style="padding: 20px; color: #d32f2f;">Error: ${error.message}</div>`;
    }
}

function showPluginModal() {
    const modal = createModal('Add Plugin', `
        <div class="form-group">
            <label>Name</label>
            <input type="text" id="plugin-name" placeholder="My Plugin">
        </div>
        <div class="form-group">
            <label>Version</label>
            <input type="text" id="plugin-version" placeholder="1.0.0" value="1.0.0">
        </div>
        <div class="form-group">
            <label>Description</label>
            <textarea id="plugin-desc" placeholder="Plugin description"></textarea>
        </div>
        <div class="form-group">
            <label>Author</label>
            <input type="text" id="plugin-author" placeholder="Author name">
        </div>
        <div class="form-group">
            <label>Icon (emoji)</label>
            <input type="text" id="plugin-icon" placeholder="🧩" maxlength="2">
        </div>
        <div style="display: flex; gap: 8px; justify-content: flex-end; margin-top: 20px;">
            <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="savePlugin()">Add</button>
        </div>
    `);
    document.body.appendChild(modal);
}

async function savePlugin() {
    const name = document.getElementById('plugin-name').value;
    const version = document.getElementById('plugin-version').value;
    const desc = document.getElementById('plugin-desc').value;
    const author = document.getElementById('plugin-author').value;
    const icon = document.getElementById('plugin-icon').value || '🧩';

    if (!name) {
        alert('Name is required');
        return;
    }

    try {
        const id = name.toLowerCase().replace(/\s+/g, '-');
        await window.electronAPI.pluginRegister(id, { name, version, description: desc, author, icon, entryPoint: 'index.js' });
        closeModal();
        await loadPlugins();
    } catch (error) {
        alert('Failed to add plugin: ' + error.message);
    }
}

async function togglePlugin(id) {
    try {
        await window.electronAPI.pluginToggle(id);
        await loadPlugins();
    } catch (error) {
        alert('Failed to toggle plugin: ' + error.message);
    }
}

async function deletePlugin(id) {
    if (!confirm('Delete this plugin?')) return;
    try {
        await window.electronAPI.pluginDelete(id);
        await loadPlugins();
    } catch (error) {
        alert('Failed to delete plugin: ' + error.message);
    }
}

// API Gateway
async function loadAPIEndpoints() {
    const list = document.getElementById('api-list');
    list.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">Loading...</div>';

    try {
        const endpoints = await window.electronAPI.apiGetEndpoints();
        list.innerHTML = '';

        if (endpoints.length === 0) {
            list.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">No API endpoints registered</div>';
            return;
        }

        endpoints.forEach(endpoint => {
            const card = createItemCard(endpoint, 'API Endpoint', '🔗', []);
            list.appendChild(card);
        });
    } catch (error) {
        list.innerHTML = `<div style="padding: 20px; color: #d32f2f;">Error: ${error.message}</div>`;
    }
}

function showAPIModal() {
    const modal = createModal('Add API Endpoint', `
        <div class="form-group">
            <label>Endpoint Name</label>
            <input type="text" id="api-name" placeholder="my-endpoint">
        </div>
        <div style="display: flex; gap: 8px; justify-content: flex-end; margin-top: 20px;">
            <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="saveAPIEndpoint()">Add</button>
        </div>
    `);
    document.body.appendChild(modal);
}

async function saveAPIEndpoint() {
    const name = document.getElementById('api-name').value;
    if (!name) {
        alert('Endpoint name is required');
        return;
    }

    try {
        await window.electronAPI.apiRegisterEndpoint(name, {});
        closeModal();
        await loadAPIEndpoints();
    } catch (error) {
        alert('Failed to add API endpoint: ' + error.message);
    }
}

// Webhooks
async function loadWebhooks() {
    const list = document.getElementById('webhooks-list');
    list.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">Loading...</div>';

    try {
        const webhooks = await window.electronAPI.webhookGetAll();
        list.innerHTML = '';

        if (webhooks.length === 0) {
            list.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">No webhooks configured</div>';
            return;
        }

        webhooks.forEach(webhook => {
            const card = createItemCard(
                webhook.name,
                `${webhook.url} • Triggered ${webhook.triggerCount} times`,
                '📡',
                [
                    { text: webhook.enabled ? 'Disable' : 'Enable', action: () => toggleWebhook(webhook.id), class: 'btn-secondary' },
                    { text: 'Test', action: () => testWebhook(webhook.id), class: 'btn-primary' },
                    { text: 'Delete', action: () => deleteWebhook(webhook.id), class: 'btn-danger' }
                ]
            );
            list.appendChild(card);
        });
    } catch (error) {
        list.innerHTML = `<div style="padding: 20px; color: #d32f2f;">Error: ${error.message}</div>`;
    }
}

function showWebhookModal() {
    const modal = createModal('Add Webhook', `
        <div class="form-group">
            <label>Name</label>
            <input type="text" id="webhook-name" placeholder="My Webhook">
        </div>
        <div class="form-group">
            <label>URL</label>
            <input type="url" id="webhook-url" placeholder="https://example.com/webhook">
        </div>
        <div class="form-group">
            <label>Method</label>
            <select id="webhook-method">
                <option value="POST">POST</option>
                <option value="GET">GET</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
            </select>
        </div>
        <div class="form-group">
            <label>Secret (optional)</label>
            <input type="text" id="webhook-secret" placeholder="Webhook secret">
        </div>
        <div style="display: flex; gap: 8px; justify-content: flex-end; margin-top: 20px;">
            <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="saveWebhook()">Add</button>
        </div>
    `);
    document.body.appendChild(modal);
}

async function saveWebhook() {
    const name = document.getElementById('webhook-name').value;
    const url = document.getElementById('webhook-url').value;
    const method = document.getElementById('webhook-method').value;
    const secret = document.getElementById('webhook-secret').value;

    if (!name || !url) {
        alert('Name and URL are required');
        return;
    }

    try {
        const id = name.toLowerCase().replace(/\s+/g, '-');
        await window.electronAPI.webhookRegister(id, { name, url, method, secret, events: [] });
        closeModal();
        await loadWebhooks();
    } catch (error) {
        alert('Failed to add webhook: ' + error.message);
    }
}

async function toggleWebhook(id) {
    try {
        await window.electronAPI.webhookToggle(id);
        await loadWebhooks();
    } catch (error) {
        alert('Failed to toggle webhook: ' + error.message);
    }
}

async function testWebhook(id) {
    try {
        const result = await window.electronAPI.webhookTrigger(id, { test: true, timestamp: Date.now() });
        if (result.success) {
            alert('Webhook triggered successfully!');
        } else {
            alert('Webhook failed: ' + result.error);
        }
        await loadWebhooks();
    } catch (error) {
        alert('Failed to test webhook: ' + error.message);
    }
}

async function deleteWebhook(id) {
    if (!confirm('Delete this webhook?')) return;
    try {
        await window.electronAPI.webhookDelete(id);
        await loadWebhooks();
    } catch (error) {
        alert('Failed to delete webhook: ' + error.message);
    }
}

// Helper functions
function createItemCard(title, description, icon, actions) {
    const card = document.createElement('div');
    card.className = 'item-card';
    
    const iconEl = document.createElement('div');
    iconEl.style.fontSize = '32px';
    iconEl.style.marginRight = '16px';
    iconEl.textContent = icon;
    
    const info = document.createElement('div');
    info.className = 'item-info';
    info.innerHTML = `
        <div class="item-title">${title}</div>
        <div class="item-description">${description}</div>
    `;
    
    const actionsEl = document.createElement('div');
    actionsEl.className = 'item-actions';
    actions.forEach(action => {
        const btn = document.createElement('button');
        btn.className = `btn ${action.class}`;
        btn.textContent = action.text;
        btn.addEventListener('click', action.action);
        actionsEl.appendChild(btn);
    });
    
    card.appendChild(iconEl);
    card.appendChild(info);
    card.appendChild(actionsEl);
    
    return card;
}

function createModal(title, content) {
    const modal = document.getElementById('modal');
    modal.innerHTML = `
        <div class="modal-content">
            <h2 style="margin-bottom: 20px;">${title}</h2>
            ${content}
        </div>
    `;
    modal.classList.add('active');
    return modal;
}

function closeModal() {
    const modal = document.getElementById('modal');
    modal.classList.remove('active');
    modal.innerHTML = '';
}

// Make functions global for inline onclick handlers
window.closeModal = closeModal;
window.saveWebApp = saveWebApp;
window.saveExtension = saveExtension;
window.savePlugin = savePlugin;
window.saveAPIEndpoint = saveAPIEndpoint;
window.saveWebhook = saveWebhook;


