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

        // Paths
        const userDataPath = app.getPath('userData');
        this.storagePath = path.join(userDataPath, 'whisper-data');
        this.ensureStorage();

        this.loadData();
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
            console.error('[Whisper] Failed to load data:', e);
        }
    }

    saveData() {
        try {
            fs.writeFileSync(path.join(this.storagePath, 'contacts.json'), JSON.stringify(Array.from(this.contacts.entries())));
            fs.writeFileSync(path.join(this.storagePath, 'messages.json'), JSON.stringify(this.messages));
        } catch (e) {
            console.error('[Whisper] Failed to save data:', e);
        }
    }

    async initialize() {
        this.initError = null;
        // 1. Start Local Server
        await this.startServer();

        // 2. Setup Tor Hidden Service
        try {
            // Wait for Tor to be fully ready (bootstrapped)
            if (!torManager.isRunning) {
                console.log('[Whisper] Waiting for Tor to start...');
                // Wait up to 60 seconds for Tor to start
                for (let i = 0; i < 60; i++) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    if (torManager.isRunning) {
                        break;
                    }
                    if (i === 59) {
                        throw new Error('Tor did not start within 60 seconds');
                    }
                }
            }

            // Wait for Tor to fully bootstrap (establish circuits)
            console.log('[Whisper] Waiting for Tor to bootstrap (this may take 30-60 seconds on first launch)...');
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
                console.warn('[Whisper] Tor may not be fully bootstrapped, but proceeding anyway...');
            }

            this.onionAddress = await torManager.setupHiddenService(this.port, 80);
            console.log('[Whisper] Hidden service created: ', this.onionAddress);
            console.log('[Whisper] ⚠️ IMPORTANT: Hidden services take 30-60 seconds to propagate through the Tor network.');
            console.log('[Whisper] Other users may not be able to connect immediately. Please wait 1-2 minutes before testing.');

            // Wait a bit for hidden service to start propagating (doesn't need to be fully ready)
            // Hidden services propagate asynchronously, so we just give it a moment
            await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds

            console.log('[Whisper] Service initialized at:', this.onionAddress);
            console.log('[Whisper] Note: Full propagation may take up to 60 seconds.');
            return this.onionAddress;
        } catch (error) {
            console.error('[Whisper] Failed to setup Hidden Service:', error);
            this.initError = error.message;
            throw error;
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
                    let body = '';
                    req.on('data', chunk => body += chunk.toString());
                    req.on('end', () => {
                        try {
                            const message = JSON.parse(body);
                            this.handleIncomingMessage(message);
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ status: 'received' }));
                        } catch (e) {
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
                    console.log(`[Whisper] Local server listening on port ${this.port}`);
                    resolve();
                });

                this.server.on('error', (err) => {
                    if (err.code === 'EADDRINUSE' && maxRetries > 0) {
                        console.log(`[Whisper] Port ${port} in use, trying ${port + 1}...`);
                        this.server.removeAllListeners('error');
                        this.server.close();
                        // Create new server for next attempt
                        this.server = http.createServer(this.server._events.request);
                        tryPort(port + 1, maxRetries - 1);
                    } else if (err.code === 'EADDRINUSE') {
                        console.error('[Whisper] All ports 7777-7787 in use!');
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
        console.log('[Whisper] Received message from', payload.from);

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
            console.log(`[Whisper] Message ${message.id} will self-destruct in ${message.ttl}ms`);
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
            console.log(`[Whisper] Message ${messageId} deleted (TTL expired).`);
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

        console.log('[Whisper Service] Saving outgoing message to:', targetOnion);
        this.messages.push(message);
        this.saveData();
        console.log('[Whisper Service] Total messages after save:', this.messages.length);

        try {
            // Check if sending to self
            const isSelf = targetOnion === this.onionAddress ||
                targetOnion.replace(/^https?:\/\//, '').replace(/\/.*$/, '') === this.onionAddress;

            let response;

            if (isSelf) {
                // Send to localhost directly (Tor can't connect to its own hidden service)
                console.log(`[Whisper] Sending to self via localhost:${this.port}...`);
                response = await axios.post(`http://127.0.0.1:${this.port}/message`, payload, {
                    timeout: 5000
                });
                console.log(`[Whisper] Message sent to self successfully`);
            } else {
                // Try local network first (for same-machine testing)
                // On the same machine, Tor can't route between its own hidden services
                let sentViaLocalNetwork = false;

                // Try all possible local ports (7777-7787) to find other Whisper instances
                console.log(`[Whisper] My port is ${this.port}. Scanning local network ports 7777-7787...`);
                const localPorts = [7777, 7778, 7779, 7780, 7781, 7782, 7783, 7784, 7785, 7786, 7787];

                for (const port of localPorts) {
                    // Skip our own port
                    if (port === this.port) {
                        console.log(`[Whisper] Skipping port ${port} (my own port)`);
                        continue;
                    }

                    try {
                        console.log(`[Whisper] Trying localhost:${port}...`);
                        const localResponse = await axios.post(`http://127.0.0.1:${port}/message`, payload, {
                            timeout: 1000 // Short timeout for local check
                        });
                        console.log(`[Whisper] Message sent via local network on port ${port}!`);
                        response = localResponse;
                        sentViaLocalNetwork = true;
                        break;
                    } catch (localErr) {
                        // Port not responding, try next
                    }
                }

                if (!sentViaLocalNetwork) {
                    console.log(`[Whisper] No local Whisper found, trying Tor...`);

                    // Verify Tor is running before attempting
                    if (!torManager.isRunning) {
                        throw new Error('Tor is not running. Please wait for Tor to connect.');
                    }

                    // Construct URL properly - remove any existing /message and trailing slashes
                    let cleanOnion = targetOnion
                        .replace(/^https?:\/\//, '')  // Remove http:// or https://
                        .replace(/\/message\/?$/, '') // Remove trailing /message
                        .replace(/\/+$/, '');         // Remove trailing slashes
                    // Remove .onion extension if present (SocksProxyAgent handles it)
                    cleanOnion = cleanOnion.replace(/\.onion$/, '');

                    console.log(`[Whisper] Sending to http://${cleanOnion}.onion:80/message...`);
                    console.log(`[Whisper] Using SOCKS proxy: socks5h://127.0.0.1:9050`);
                    console.log(`[Whisper] From: ${this.onionAddress}`);
                    console.log(`[Whisper] Payload size: ${JSON.stringify(payload).length} bytes`);

                    // Retry with exponential backoff (hidden services can take time to propagate)
                    let lastError = null;
                    const maxRetries = 3;
                    for (let attempt = 0; attempt < maxRetries; attempt++) {
                        try {
                            // Use native http request with SOCKS agent for better .onion handling
                            response = await this.sendViaTor(cleanOnion, payload);
                            console.log(`[Whisper] Message sent successfully to ${targetOnion} (attempt ${attempt + 1})`);
                            console.log(`[Whisper] Response status: ${response.status}`);
                            break; // Success, exit retry loop
                        } catch (err) {
                            lastError = err;
                            if (attempt < maxRetries - 1) {
                                const waitTime = Math.min(5000 * (attempt + 1), 15000); // 5s, 10s, 15s max
                                console.warn(`[Whisper] Send attempt ${attempt + 1} failed: ${err.message}`);
                                console.log(`[Whisper] Retrying in ${waitTime/1000} seconds... (Hidden services may still be propagating)`);
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
            console.error('[Whisper] Send failed:', error.message);
            console.error('[Whisper] Error details:', {
                code: error.code,
                errno: error.errno,
                syscall: error.syscall,
                address: error.address,
                port: error.port
            });

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
            const agent = new SocksProxyAgent('socks5h://127.0.0.1:9050');
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
                    'Connection': 'close' // Ensure connection is closed after request
                },
                timeout: 120000, // 120 seconds (hidden services can be slow)
                // Allow .onion addresses
                lookup: false // Disable DNS lookup (SOCKS handles it)
            };

            console.log(`[Whisper] Making HTTP request to ${fullOnionAddress}:80/message via SOCKS5`);

            const req = http.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => {
                    data += chunk;
                });
                res.on('end', () => {
                    console.log(`[Whisper] Response received: ${res.statusCode}`);
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve({ status: res.statusCode, data: data });
                    } else {
                        reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                    }
                });
            });

            req.on('error', (e) => {
                console.error(`[Whisper] Request error: ${e.message}`);
                reject(e);
            });

            req.on('timeout', () => {
                console.error('[Whisper] Request timed out');
                req.destroy();
                reject(new Error('Connection timed out'));
            });

            req.write(postData);
            req.end();
        });
    }

    // Helpers for Frontend
    getMessages(contactId) {
        console.log('[Whisper Service] getMessages called with contactId:', contactId);
        console.log('[Whisper Service] Total messages in store:', this.messages.length);
        if (this.messages.length > 0) {
            console.log('[Whisper Service] Sample message:', JSON.stringify(this.messages[0]));
        }
        if (!contactId) return this.messages;
        const filtered = this.messages.filter(m => m.from === contactId || m.to === contactId);
        console.log('[Whisper Service] Filtered messages count:', filtered.length);
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
