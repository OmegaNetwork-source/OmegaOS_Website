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
            // Wait for Tor to be ready
            if (!torManager.isRunning) {
                console.log('[Whisper] Waiting for Tor...');
                // In a real app, we'd wait properly. Assuming Tor starts up via main.js
            }

            this.onionAddress = await torManager.setupHiddenService(this.port, 80);
            console.log('[Whisper] Service initialized at:', this.onionAddress);
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

            this.server.listen(this.port, '127.0.0.1', () => {
                console.log(`[Whisper] Local server listening on port ${this.port}`);
                resolve();
            });

            this.server.on('error', (err) => {
                if (err.code === 'EADDRINUSE') {
                    console.log('[Whisper] Port in use, trying to reuse...');
                    resolve(); // Assume it's our own old process or ignore for now
                } else {
                    reject(err);
                }
            });
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
                // Send through Tor to external onion address
                const agent = new SocksProxyAgent('socks5h://127.0.0.1:9050');
                const url = targetOnion.startsWith('http') ? targetOnion : `http://${targetOnion}/message`;

                console.log(`[Whisper] Sending to ${url}...`);
                console.log(`[Whisper] Using SOCKS proxy: socks5h://127.0.0.1:9050`);
                console.log(`[Whisper] From: ${this.onionAddress}`);

                response = await axios.post(url, payload, {
                    httpAgent: agent,
                    httpsAgent: agent,
                    proxy: false,
                    timeout: 60000,
                    validateStatus: (status) => status < 500,
                    maxRedirects: 0
                });

                console.log(`[Whisper] Message sent successfully to ${targetOnion}`);
                console.log(`[Whisper] Response status: ${response.status}`);
            }


            // Save to local history
            const message = {
                id: Date.now() + Math.random().toString(),
                to: targetOnion,
                content: content,
                timestamp: payload.timestamp,
                isIncoming: false,
                ttl: ttl
            };

            this.messages.push(message);
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
            return { success: false, error: error.message };
        }
    }

    // Helpers for Frontend
    getMessages(contactId) {
        if (!contactId) return this.messages;
        return this.messages.filter(m => m.from === contactId || m.to === contactId);
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
