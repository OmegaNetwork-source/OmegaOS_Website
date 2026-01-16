const http = require('http');
const { SocksProxyAgent } = require('socks-proxy-agent');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const torManager = require('./tor-manager');

class WhisperService {
    constructor() {
        this.server = null;
        this.port = 7777;
        this.onionAddress = null;
        this.contacts = new Map();
        this.messages = [];
        this.logger = null; // Custom logger callback

        // Paths
        const userDataPath = app.getPath('userData');
        this.storagePath = path.join(userDataPath, 'whisper-data');
        this.ensureStorage();

        this.loadData();
    }

    setLogger(callback) {
        this.logger = callback;
    }

    log(type, msg) {
        // Console fallback
        if (type === 'error') {
            console.error(`[Whisper] ${msg}`);
        } else {
            console.log(`[Whisper] ${msg}`);
        }

        // Send to attached logger (if any)
        if (this.logger) {
            this.logger(type, msg);
        }
    }

    ensureStorage() {
        if (!fs.existsSync(this.storagePath)) {
            fs.mkdirSync(this.storagePath, { recursive: true });
        }
    }

    loadData() {
        try {
            if (fs.existsSync(path.join(this.storagePath, 'contacts.json'))) {
                const data = JSON.parse(fs.readFileSync(path.join(this.storagePath, 'contacts.json')));
                this.contacts = new Map(data);
            }
            if (fs.existsSync(path.join(this.storagePath, 'messages.json'))) {
                this.messages = JSON.parse(fs.readFileSync(path.join(this.storagePath, 'messages.json')));
            }
        } catch (e) {
            this.log('error', `Failed to load data: ${e.message}`);
        }
    }

    saveData() {
        try {
            fs.writeFileSync(path.join(this.storagePath, 'contacts.json'), JSON.stringify(Array.from(this.contacts.entries())));
            fs.writeFileSync(path.join(this.storagePath, 'messages.json'), JSON.stringify(this.messages));
        } catch (e) {
            this.log('error', `Failed to save data: ${e.message}`);
        }
    }

    async initialize() {
        this.initError = null;
        this.log('info', 'Initializing Whisper Service...');

        // 1. Start Local Server
        await this.startServer();

        // 2. Setup Tor Hidden Service
        try {
            // Wait for Tor to be fully ready (bootstrapped)
            this.log('info', 'Checking Tor status...');
            if (!(await torManager.isTorRunning())) {
                this.log('info', 'Waiting for Tor to start...');
                // Wait up to 60 seconds for Tor to start
                for (let i = 0; i < 60; i++) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    if (await torManager.isTorRunning()) {
                        break;
                    }
                    if (i === 59) {
                        throw new Error('Tor did not start within 60 seconds');
                    }
                    if (i % 5 === 0) this.log('info', `Waiting for Tor... (${i}s)`);
                }
            }

            // Wait for Tor to fully bootstrap (establish circuits)
            this.log('info', 'Waiting for Tor to bootstrap (this may take 30-60 seconds on first launch)...');
            let bootstrapped = false;
            for (let i = 0; i < 60; i++) {
                try {
                    // Check if Tor is bootstrapped by trying to get circuit status
                    if (torManager.isTorRunning && typeof torManager.isTorRunning === 'function') {
                        const isReady = await torManager.isTorRunning();
                        if (isReady) {
                            bootstrapped = true;
                            break;
                        }
                    } else {
                        // Fallback: just wait a bit
                        if (i > 10) { // After 10 seconds, assume ready
                            bootstrapped = true;
                            break;
                        }
                    }
                } catch (e) {
                    // Continue waiting
                }
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            if (!bootstrapped) {
                this.log('warn', 'Tor may not be fully bootstrapped, but proceeding anyway...');
            } else {
                this.log('info', 'Tor appears ready.');
            }

            this.onionAddress = await torManager.setupHiddenService(this.port, 80);
            this.log('info', `Hidden service created: ${this.onionAddress}`);
            this.log('warn', '⚠️ IMPORTANT: Hidden services take 30-60 seconds to propagate through the Tor network.');
            this.log('warn', 'Other users may not be able to connect immediately. Please wait 1-2 minutes before testing.');

            // Wait a bit for hidden service to start propagating (doesn't need to be fully ready)
            // Hidden services propagate asynchronously, so we just give it a moment
            await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds

            this.log('info', `Service initialized at: ${this.onionAddress}`);
            this.log('info', 'Note: Full propagation may take up to 60 seconds.');
            return this.onionAddress;
        } catch (error) {
            this.log('error', `Failed to setup Hidden Service: ${error.message}`);
            this.initError = error.message;
            throw error;
        }
    }

    async resetIdentity() {
        this.log('warn', 'Resetting identity requested...');
        try {
            await torManager.regenerateOnionAddress();

            // Re-setup hidden service to generate new key immediately
            this.onionAddress = await torManager.setupHiddenService(this.port, 80);

            this.log('info', `Identity reset! New address: ${this.onionAddress}`);
            return { success: true, message: 'Identity reset successfully.', address: this.onionAddress };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    startServer() {
        return new Promise((resolve, reject) => {
            this.server = http.createServer(async (req, res) => {
                // CORS support
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
                res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

                if (req.method === 'OPTIONS') {
                    res.writeHead(200);
                    res.end();
                    return;
                }

                if (req.method === 'POST' && req.url === '/message') {
                    this.log('info', 'Incoming message connection received');
                    let body = '';
                    req.on('data', chunk => body += chunk.toString());
                    req.on('end', () => {
                        try {
                            const message = JSON.parse(body);
                            this.handleIncomingMessage(message);
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ status: 'received' }));
                        } catch (e) {
                            this.log('error', `Failed to parse incoming message: ${e.message}`);
                            res.writeHead(400);
                            res.end(JSON.stringify({ error: 'Invalid JSON' }));
                        }
                    });
                } else {
                    res.writeHead(404);
                    res.end();
                }
            });

            // Try to bind to port, with fallback to next available port
            const tryPort = (port, maxRetries = 10) => {
                this.server.listen(port, '127.0.0.1', () => {
                    this.port = port; // Store actual port
                    this.localPort = port;
                    this.log('info', `Local server listening on port ${this.port}`);
                    resolve();
                });

                this.server.on('error', (err) => {
                    if (err.code === 'EADDRINUSE' && maxRetries > 0) {
                        this.log('info', `Port ${port} in use, trying ${port + 1}...`);
                        this.server.removeAllListeners('error');
                        this.server.close();
                        // Create new server for next attempt
                        this.server = http.createServer(this.server._events.request);
                        tryPort(port + 1, maxRetries - 1);
                    } else if (err.code === 'EADDRINUSE') {
                        this.log('error', 'All ports 7777-7787 in use!');
                        reject(new Error('All Whisper ports in use'));
                    } else {
                        reject(err);
                    }
                });
            };

            tryPort(this.port);
        });
    }

    handleIncomingMessage(payload) {
        // payload: { from: 'onionAddr', content: '...', timestamp: ..., ttl: number (ms) }
        this.log('info', `Received message from ${payload.from}`);

        const message = {
            id: Date.now() + Math.random().toString(),
            from: payload.from,
            content: payload.content,
            timestamp: payload.timestamp || Date.now(),
            isIncoming: true,
            read: false,
            ttl: payload.ttl
        };

        this.messages.push(message);
        this.saveData();

        // Notify frontend via IPC (handled in main.js)
        if (this.onMessageReceived) {
            this.onMessageReceived(message);
        }

        // Handle Self-Destruct (TTL)
        if (message.ttl) {
            this.log('info', `Message ${message.id} will self-destruct in ${message.ttl}ms`);
            setTimeout(() => {
                this.deleteMessage(message.id);
            }, message.ttl);
        }
    }

    deleteMessage(messageId) {
        const index = this.messages.findIndex(m => m.id === messageId);
        if (index > -1) {
            this.messages.splice(index, 1);
            this.saveData();
            this.log('info', `Message ${messageId} deleted (TTL expired).`);
            // Notify frontend to remove message
            if (this.onMessageDeleted) {
                this.onMessageDeleted(messageId);
            }
        }
    }

    async sendMessage(targetOnion, content, ttl = null) {
        const payload = {
            from: this.onionAddress,
            content: content,
            timestamp: Date.now(),
            ttl: ttl // Send TTL to recipient
        };

        // Save message FIRST (before attempting to send)
        const message = {
            id: Date.now() + Math.random().toString(),
            to: targetOnion,
            content: content,
            timestamp: payload.timestamp,
            isIncoming: false,
            ttl: ttl,
            status: 'sending' // pending status
        };

        this.log('info', `Saving outgoing message to: ${targetOnion}`);
        this.messages.push(message);
        this.saveData();
        this.log('info', `Total messages after save: ${this.messages.length}`);

        try {
            // Check if sending to self
            const isSelf = targetOnion === this.onionAddress ||
                targetOnion.replace(/^https?:\/\//, '').replace(/\/.*$/, '') === this.onionAddress;

            let response;

            if (isSelf) {
                // Send to localhost directly (Tor can't connect to its own hidden service)
                this.log('info', `Sending to self via localhost:${this.port}...`);
                response = await axios.post(`http://127.0.0.1:${this.port}/message`, payload, {
                    timeout: 5000
                });
                this.log('info', 'Message sent to self successfully');
            } else {
                // Try local network first (for same-machine testing)
                // On the same machine, Tor can't route between its own hidden services
                let sentViaLocalNetwork = false;

                // Try all possible local ports (7777-7787) to find other Whisper instances
                this.log('info', `My port is ${this.port}. Scanning local network ports 7777-7787...`);
                const localPorts = [7777, 7778, 7779, 7780, 7781, 7782, 7783, 7784, 7785, 7786, 7787];

                for (const port of localPorts) {
                    // Skip our own port
                    if (port === this.port) {
                        this.log('info', `Skipping port ${port} (my own port)`);
                        continue;
                    }

                    try {
                        this.log('info', `Trying localhost:${port}...`);
                        const localResponse = await axios.post(`http://127.0.0.1:${port}/message`, payload, {
                            timeout: 1000 // Short timeout for local check
                        });
                        this.log('info', `Message sent via local network on port ${port}!`);
                        response = localResponse;
                        sentViaLocalNetwork = true;
                        break;
                    } catch (localErr) {
                        // Port not responding, try next
                    }
                }

                if (!sentViaLocalNetwork) {
                    this.log('info', 'No local Whisper found, trying Tor...');

                    // Verify Tor is running before attempting
                    if (!(await torManager.isTorRunning())) {
                        throw new Error('Tor is not running. Please wait for Tor to connect.');
                    }

                    // Construct URL properly - remove any existing /message and trailing slashes
                    let cleanOnion = targetOnion
                        .replace(/^https?:\/\//, '')  // Remove http:// or https://
                        .replace(/\/message\/?$/, '') // Remove trailing /message
                        .replace(/\/+$/, '');         // Remove trailing slashes
                    // Remove .onion extension if present (SocksProxyAgent handles it)
                    cleanOnion = cleanOnion.replace(/\.onion$/, '');

                    this.log('info', `Sending to http://${cleanOnion}.onion:80/message...`);
                    this.log('info', 'Using SOCKS proxy: socks5h://127.0.0.1:9050');
                    this.log('info', `From: ${this.onionAddress}`);
                    this.log('info', `Payload size: ${JSON.stringify(payload).length} bytes`);

                    // Retry with exponential backoff (hidden services can take time to propagate)
                    let lastError = null;
                    const maxRetries = 3;
                    for (let attempt = 0; attempt < maxRetries; attempt++) {
                        try {
                            // Use native http request with SOCKS agent for better .onion handling
                            response = await this.sendViaTor(cleanOnion, payload);
                            this.log('info', `Message sent successfully to ${targetOnion} (attempt ${attempt + 1})`);
                            this.log('info', `Response status: ${response.status}`);
                            break; // Success, exit retry loop
                        } catch (err) {
                            lastError = err;
                            if (attempt < maxRetries - 1) {
                                const waitTime = Math.min(5000 * (attempt + 1), 15000); // 5s, 10s, 15s max
                                this.log('warn', `Send attempt ${attempt + 1} failed: ${err.message}`);
                                this.log('info', `Retrying in ${waitTime / 1000} seconds... (Hidden services may still be propagating)`);
                                await new Promise(resolve => setTimeout(resolve, waitTime));
                            }
                        }
                    }

                    // If all retries failed, throw the last error
                    if (!response) {
                        throw lastError || new Error('Failed to send message after multiple attempts');
                    }
                }
            }

            // Update message status to sent
            message.status = 'sent';
            this.saveData();

            // Handle Local Self-Destruct
            if (ttl) {
                setTimeout(() => {
                    this.deleteMessage(message.id);
                }, ttl);
            }

            return { success: true };
        } catch (error) {
            this.log('error', `Send failed: ${error.message}`);
            this.log('error', `Error details code: ${error.code}, errno: ${error.errno}, syscall: ${error.syscall}`);

            // Provide more helpful error messages
            let userError = error.message;
            if (error.code === 'ECONNREFUSED') {
                userError = 'Connection refused. The recipient may be offline, or their hidden service is still propagating (wait 1-2 minutes).';
            } else if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
                userError = 'Connection timed out. Hidden services can take 30-60 seconds to propagate. Try again in a minute.';
            } else if (error.code === 'ENOTFOUND' || error.code === 'EAI_AGAIN') {
                userError = 'Address not found. The hidden service may still be propagating, or the address is invalid. Wait 1-2 minutes and try again.';
            } else if (error.message.includes('SOCKS') || error.code === 'ECONNREFUSED') {
                userError = 'Tor proxy error. Make sure Tor is running and fully bootstrapped.';
            } else if (error.message.includes('proxy')) {
                userError = 'Proxy error. Make sure Tor is running properly.';
            } else {
                // Generic error - add hint about propagation
                userError = `${error.message}. Note: Hidden services take 30-60 seconds to propagate. Wait a minute and try again.`;
            }

            // Update message status to failed (but keep it saved)
            message.status = 'failed';
            message.error = userError;
            this.saveData();

            return { success: false, error: userError };
        }
    }

    // Helper method to send message via Tor using native HTTP
    async sendViaTor(onionAddress, payload) {
        return new Promise((resolve, reject) => {
            // Ensure onion address has .onion extension for proper routing
            const fullOnionAddress = onionAddress.endsWith('.onion') ? onionAddress : onionAddress + '.onion';

            // Use socks5h:// (note the 'h' at the end) which enables hostname resolution through SOCKS
            // This is important for .onion addresses
            const agent = new SocksProxyAgent('socks5h://127.0.0.1:9050', {
                keepAlive: true,
                timeout: 120000
            });
            const postData = JSON.stringify(payload);

            const options = {
                hostname: fullOnionAddress,
                port: 80,
                path: '/message',
                method: 'POST',
                agent: agent,
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData),
                    'Connection': 'keep-alive'
                },
                timeout: 120000
            };

            this.log('info', `Making HTTP request to ${fullOnionAddress}:80/message via SOCKS5`);
            this.log('info', `Request Options: ${JSON.stringify({ hostname: fullOnionAddress, port: 80, path: '/message' })}`);

            const req = http.request(options, (res) => {
                let data = '';

                this.log('info', `Response headers received: ${res.statusCode}`);

                res.on('data', (chunk) => {
                    data += chunk;
                });
                res.on('end', () => {
                    this.log('info', `Response body received (${data.length} bytes)`);
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve({ status: res.statusCode, data: data });
                    } else {
                        reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                    }
                });
            });

            req.on('error', (e) => {
                this.log('error', `Request error: ${e.message}`);
                reject(e);
            });

            req.on('socket', (socket) => {
                this.log('info', 'Socket assigned to request');
                socket.on('connect', () => {
                    this.log('info', 'Socket connected to SOCKS proxy');
                });
                socket.on('timeout', () => {
                    this.log('info', 'Socket timeout');
                });
            })

            req.on('timeout', () => {
                this.log('error', 'Request timed out waiting for response');
                req.destroy();
                reject(new Error('Connection timed out'));
            });

            req.write(postData);
            req.end();
        });
    }

    // Helpers for Frontend
    getMessages(contactId) {
        this.log('info', `getMessages called with contactId: ${contactId}`);
        this.log('info', `Total messages in store: ${this.messages.length}`);

        if (!contactId) return this.messages;
        const filtered = this.messages.filter(m => m.from === contactId || m.to === contactId);
        this.log('info', `Filtered messages count: ${filtered.length}`);
        return filtered;
    }

    addContact(onionAddress, name) {
        this.contacts.set(onionAddress, { id: onionAddress, name, addedAt: Date.now() });
        this.saveData();
        return true;
    }

    editContact(onionAddress, newName) {
        const contact = this.contacts.get(onionAddress);
        if (contact) {
            contact.name = newName;
            this.saveData();
            return true;
        }
        return false;
    }

    deleteContact(onionAddress) {
        if (this.contacts.has(onionAddress)) {
            this.contacts.delete(onionAddress);
            this.saveData();
            return true;
        }
        return false;
    }

    getContacts() {
        return Array.from(this.contacts.values());
    }
}

module.exports = new WhisperService();
