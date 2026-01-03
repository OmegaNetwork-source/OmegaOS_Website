// Integrations Manager - Core system for plugins, extensions, web apps, API gateway, and webhooks
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const INTEGRATIONS_PATH = path.join(app.getPath('userData'), 'isolated-env', 'integrations');
const PLUGINS_PATH = path.join(INTEGRATIONS_PATH, 'plugins');
const EXTENSIONS_PATH = path.join(INTEGRATIONS_PATH, 'extensions');
const WEBAPPS_PATH = path.join(INTEGRATIONS_PATH, 'webapps');
const WEBHOOKS_PATH = path.join(INTEGRATIONS_PATH, 'webhooks');

// Ensure directories exist
[INTEGRATIONS_PATH, PLUGINS_PATH, EXTENSIONS_PATH, WEBAPPS_PATH, WEBHOOKS_PATH].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

class IntegrationsManager {
  constructor() {
    this.plugins = new Map();
    this.extensions = new Map();
    this.webApps = new Map();
    this.webhooks = new Map();
    this.apiGateway = {
      endpoints: new Map(),
      middleware: []
    };
    this.loadAll();
  }

  // ========== WEB APP WRAPPER ==========
  registerWebApp(id, config) {
    const webApp = {
      id,
      name: config.name,
      url: config.url,
      icon: config.icon || '🌐',
      width: config.width || 1200,
      height: config.height || 800,
      description: config.description || '',
      category: config.category || 'other',
      createdAt: Date.now()
    };
    
    this.webApps.set(id, webApp);
    this.saveWebApp(id, webApp);
    return webApp;
  }

  getWebApp(id) {
    return this.webApps.get(id);
  }

  getAllWebApps() {
    return Array.from(this.webApps.values());
  }

  deleteWebApp(id) {
    this.webApps.delete(id);
    const filePath = path.join(WEBAPPS_PATH, `${id}.json`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  saveWebApp(id, webApp) {
    const filePath = path.join(WEBAPPS_PATH, `${id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(webApp, null, 2));
  }

  // ========== BROWSER EXTENSIONS ==========
  registerExtension(id, config) {
    const extension = {
      id,
      name: config.name,
      version: config.version || '1.0.0',
      description: config.description || '',
      author: config.author || 'Unknown',
      icon: config.icon || '🔌',
      permissions: config.permissions || [],
      contentScripts: config.contentScripts || [],
      backgroundScript: config.backgroundScript || null,
      manifest: config.manifest || {},
      enabled: true,
      installedAt: Date.now()
    };
    
    this.extensions.set(id, extension);
    this.saveExtension(id, extension);
    return extension;
  }

  getExtension(id) {
    return this.extensions.get(id);
  }

  getAllExtensions() {
    return Array.from(this.extensions.values());
  }

  toggleExtension(id) {
    const ext = this.extensions.get(id);
    if (ext) {
      ext.enabled = !ext.enabled;
      this.saveExtension(id, ext);
    }
    return ext;
  }

  deleteExtension(id) {
    this.extensions.delete(id);
    const filePath = path.join(EXTENSIONS_PATH, `${id}.json`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  saveExtension(id, extension) {
    const filePath = path.join(EXTENSIONS_PATH, `${id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(extension, null, 2));
  }

  // ========== PLUGIN SYSTEM ==========
  registerPlugin(id, config) {
    const plugin = {
      id,
      name: config.name,
      version: config.version || '1.0.0',
      description: config.description || '',
      author: config.author || 'Unknown',
      icon: config.icon || '🧩',
      entryPoint: config.entryPoint,
      permissions: config.permissions || [],
      hooks: config.hooks || {},
      enabled: true,
      installedAt: Date.now()
    };
    
    this.plugins.set(id, plugin);
    this.savePlugin(id, plugin);
    
    // Load plugin if enabled
    if (plugin.enabled && plugin.entryPoint) {
      this.loadPlugin(plugin);
    }
    
    return plugin;
  }

  loadPlugin(plugin) {
    try {
      const pluginPath = path.join(PLUGINS_PATH, plugin.id, plugin.entryPoint);
      if (fs.existsSync(pluginPath)) {
        // In a real implementation, you'd load and execute the plugin
        // For security, plugins should be sandboxed
        console.log(`Loading plugin: ${plugin.id}`);
        return true;
      }
    } catch (error) {
      console.error(`Failed to load plugin ${plugin.id}:`, error);
    }
    return false;
  }

  getPlugin(id) {
    return this.plugins.get(id);
  }

  getAllPlugins() {
    return Array.from(this.plugins.values());
  }

  togglePlugin(id) {
    const plugin = this.plugins.get(id);
    if (plugin) {
      plugin.enabled = !plugin.enabled;
      this.savePlugin(id, plugin);
      if (plugin.enabled) {
        this.loadPlugin(plugin);
      }
    }
    return plugin;
  }

  deletePlugin(id) {
    this.plugins.delete(id);
    const filePath = path.join(PLUGINS_PATH, `${id}.json`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  savePlugin(id, plugin) {
    const filePath = path.join(PLUGINS_PATH, `${id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(plugin, null, 2));
  }

  // ========== API GATEWAY ==========
  registerAPIEndpoint(name, handler) {
    this.apiGateway.endpoints.set(name, handler);
  }

  async callAPIEndpoint(name, params) {
    const handler = this.apiGateway.endpoints.get(name);
    if (handler) {
      try {
        return await handler(params);
      } catch (error) {
        throw new Error(`API endpoint error: ${error.message}`);
      }
    }
    throw new Error(`API endpoint not found: ${name}`);
  }

  addAPIMiddleware(middleware) {
    this.apiGateway.middleware.push(middleware);
  }

  getAPIEndpoints() {
    return Array.from(this.apiGateway.endpoints.keys());
  }

  // ========== WEBHOOK MANAGER ==========
  registerWebhook(id, config) {
    const webhook = {
      id,
      name: config.name,
      url: config.url,
      method: config.method || 'POST',
      headers: config.headers || {},
      secret: config.secret || null,
      enabled: true,
      events: config.events || [],
      lastTriggered: null,
      triggerCount: 0,
      createdAt: Date.now()
    };
    
    this.webhooks.set(id, webhook);
    this.saveWebhook(id, webhook);
    return webhook;
  }

  async triggerWebhook(id, data) {
    const webhook = this.webhooks.get(id);
    if (!webhook || !webhook.enabled) {
      return { success: false, error: 'Webhook not found or disabled' };
    }

    try {
      const https = require('https');
      const http = require('http');
      const url = require('url');
      
      const parsedUrl = url.parse(webhook.url);
      const isHttps = parsedUrl.protocol === 'https:';
      const client = isHttps ? https : http;
      
      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (isHttps ? 443 : 80),
        path: parsedUrl.path,
        method: webhook.method,
        headers: {
          'Content-Type': 'application/json',
          ...webhook.headers
        }
      };

      if (webhook.secret) {
        options.headers['X-Webhook-Secret'] = webhook.secret;
      }

      return new Promise((resolve, reject) => {
        const req = client.request(options, (res) => {
          let responseData = '';
          res.on('data', (chunk) => {
            responseData += chunk;
          });
          res.on('end', () => {
            webhook.lastTriggered = Date.now();
            webhook.triggerCount++;
            this.saveWebhook(id, webhook);
            
            resolve({
              success: res.statusCode >= 200 && res.statusCode < 300,
              statusCode: res.statusCode,
              data: responseData
            });
          });
        });

        req.on('error', (error) => {
          reject({ success: false, error: error.message });
        });

        req.write(JSON.stringify(data));
        req.end();
      });
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  triggerWebhooksByEvent(eventName, data) {
    const matchingWebhooks = Array.from(this.webhooks.values())
      .filter(wh => wh.enabled && wh.events.includes(eventName));
    
    return Promise.all(
      matchingWebhooks.map(wh => this.triggerWebhook(wh.id, { event: eventName, ...data }))
    );
  }

  getWebhook(id) {
    return this.webhooks.get(id);
  }

  getAllWebhooks() {
    return Array.from(this.webhooks.values());
  }

  toggleWebhook(id) {
    const webhook = this.webhooks.get(id);
    if (webhook) {
      webhook.enabled = !webhook.enabled;
      this.saveWebhook(id, webhook);
    }
    return webhook;
  }

  deleteWebhook(id) {
    this.webhooks.delete(id);
    const filePath = path.join(WEBHOOKS_PATH, `${id}.json`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  saveWebhook(id, webhook) {
    const filePath = path.join(WEBHOOKS_PATH, `${id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(webhook, null, 2));
  }

  // ========== LOAD/SAVE ==========
  loadAll() {
    // Load web apps
    if (fs.existsSync(WEBAPPS_PATH)) {
      fs.readdirSync(WEBAPPS_PATH).forEach(file => {
        if (file.endsWith('.json')) {
          try {
            const data = JSON.parse(fs.readFileSync(path.join(WEBAPPS_PATH, file), 'utf8'));
            this.webApps.set(data.id, data);
          } catch (e) {
            console.error(`Failed to load web app ${file}:`, e);
          }
        }
      });
    }

    // Load extensions
    if (fs.existsSync(EXTENSIONS_PATH)) {
      fs.readdirSync(EXTENSIONS_PATH).forEach(file => {
        if (file.endsWith('.json')) {
          try {
            const data = JSON.parse(fs.readFileSync(path.join(EXTENSIONS_PATH, file), 'utf8'));
            this.extensions.set(data.id, data);
          } catch (e) {
            console.error(`Failed to load extension ${file}:`, e);
          }
        }
      });
    }

    // Load plugins
    if (fs.existsSync(PLUGINS_PATH)) {
      fs.readdirSync(PLUGINS_PATH).forEach(file => {
        if (file.endsWith('.json')) {
          try {
            const data = JSON.parse(fs.readFileSync(path.join(PLUGINS_PATH, file), 'utf8'));
            this.plugins.set(data.id, data);
            if (data.enabled && data.entryPoint) {
              this.loadPlugin(data);
            }
          } catch (e) {
            console.error(`Failed to load plugin ${file}:`, e);
          }
        }
      });
    }

    // Load webhooks
    if (fs.existsSync(WEBHOOKS_PATH)) {
      fs.readdirSync(WEBHOOKS_PATH).forEach(file => {
        if (file.endsWith('.json')) {
          try {
            const data = JSON.parse(fs.readFileSync(path.join(WEBHOOKS_PATH, file), 'utf8'));
            this.webhooks.set(data.id, data);
          } catch (e) {
            console.error(`Failed to load webhook ${file}:`, e);
          }
        }
      });
    }
  }
}

module.exports = IntegrationsManager;


