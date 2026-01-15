// Omega Vuln - Vulnerability Scanner Service
const net = require('net');
const https = require('https');
const http = require('http');
const dns = require('dns');
const tls = require('tls');
const path = require('path');
const fs = require('fs');

class VulnScanner {
    constructor() {
        // Load vulnerability database
        const dbPath = path.join(__dirname, 'vuln-database.json');
        this.vulnDb = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

        this.scanProgress = 0;
        this.scanResults = [];
        this.isScanning = false;
    }

    // Common ports to scan
    getCommonPorts() {
        return [21, 22, 23, 25, 53, 80, 110, 135, 139, 143, 443, 445,
            1433, 1521, 3306, 3389, 5432, 5900, 6379, 8080, 8443, 27017];
    }

    // Parse port range string (e.g., "1-1000" or "22,80,443")
    parsePortRange(portStr) {
        if (!portStr || portStr === 'common') {
            return this.getCommonPorts();
        }

        const ports = [];
        const parts = portStr.split(',');

        for (const part of parts) {
            if (part.includes('-')) {
                const [start, end] = part.split('-').map(Number);
                for (let p = start; p <= end && p <= 65535; p++) {
                    ports.push(p);
                }
            } else {
                const p = parseInt(part);
                if (p > 0 && p <= 65535) {
                    ports.push(p);
                }
            }
        }

        return [...new Set(ports)].sort((a, b) => a - b);
    }

    // Scan a single port
    async scanPort(host, port, timeout = 2000) {
        return new Promise((resolve) => {
            const socket = new net.Socket();
            let banner = '';

            socket.setTimeout(timeout);

            socket.on('connect', () => {
                // Try to grab banner
                socket.write('HEAD / HTTP/1.0\r\n\r\n');
            });

            socket.on('data', (data) => {
                banner += data.toString();
            });

            socket.on('timeout', () => {
                socket.destroy();
                resolve({ port, open: false, banner: null });
            });

            socket.on('error', () => {
                resolve({ port, open: false, banner: null });
            });

            socket.on('close', () => {
                if (socket.connecting) {
                    resolve({ port, open: false, banner: null });
                } else {
                    resolve({ port, open: true, banner: banner || null });
                }
            });

            socket.connect(port, host);

            // Wait for banner with timeout
            setTimeout(() => {
                if (socket.readyState === 'open') {
                    socket.end();
                }
            }, timeout - 100);
        });
    }

    // Detect service from banner
    detectService(port, banner) {
        const portInfo = this.vulnDb.port_info[port.toString()];
        let service = portInfo ? portInfo.service : 'Unknown';
        let version = null;

        if (banner) {
            // Try to extract service and version from banner
            for (const [serviceName, serviceData] of Object.entries(this.vulnDb.services)) {
                for (const pattern of serviceData.patterns) {
                    if (banner.toLowerCase().includes(pattern.toLowerCase())) {
                        service = serviceName.toUpperCase();

                        // Try to extract version
                        const versionMatch = banner.match(new RegExp(pattern + '[/\\s-]?([0-9.]+)', 'i'));
                        if (versionMatch) {
                            version = versionMatch[1];
                        }
                        break;
                    }
                }
            }

            // Common version patterns
            if (!version) {
                const genericVersion = banner.match(/(?:version|ver)[:\s]+([0-9.]+)/i);
                if (genericVersion) {
                    version = genericVersion[1];
                }
            }
        }

        return { service, version, banner };
    }

    // Check for vulnerabilities based on service and version
    checkVulnerabilities(service, version) {
        const vulns = [];
        const serviceLower = service.toLowerCase();

        for (const [svcName, svcData] of Object.entries(this.vulnDb.services)) {
            // Check if service matches
            const matches = svcData.patterns.some(p =>
                serviceLower.includes(p.toLowerCase()) ||
                p.toLowerCase().includes(serviceLower)
            );

            if (matches) {
                for (const vuln of svcData.vulnerabilities) {
                    let isVulnerable = false;

                    // Check version against vulnerable versions
                    for (const versionPattern of vuln.versions) {
                        if (versionPattern === '*') {
                            isVulnerable = true;
                            break;
                        }

                        if (version) {
                            if (versionPattern.startsWith('<')) {
                                const vulnVersion = versionPattern.substring(1);
                                if (this.compareVersions(version, vulnVersion) < 0) {
                                    isVulnerable = true;
                                    break;
                                }
                            } else if (version.includes(versionPattern) || versionPattern.includes(version)) {
                                isVulnerable = true;
                                break;
                            }
                        }
                    }

                    if (isVulnerable || !version) {
                        vulns.push({
                            ...vuln,
                            confidence: version ? 'high' : 'medium'
                        });
                    }
                }
            }
        }

        return vulns;
    }

    // Compare version strings
    compareVersions(v1, v2) {
        const parts1 = v1.split('.').map(Number);
        const parts2 = v2.split('.').map(Number);

        for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
            const p1 = parts1[i] || 0;
            const p2 = parts2[i] || 0;

            if (p1 < p2) return -1;
            if (p1 > p2) return 1;
        }

        return 0;
    }

    // Check HTTP security headers
    async checkWebSecurity(host, useHttps = true) {
        const results = [];
        const protocol = useHttps ? https : http;
        const port = useHttps ? 443 : 80;

        return new Promise((resolve) => {
            const options = {
                hostname: host,
                port: port,
                path: '/',
                method: 'GET',
                timeout: 5000,
                rejectUnauthorized: false
            };

            const req = protocol.request(options, (res) => {
                const headers = res.headers;

                // Check each security header
                for (const headerCheck of this.vulnDb.web_checks.headers) {
                    const headerValue = headers[headerCheck.header.toLowerCase()];

                    if (!headerValue) {
                        results.push({
                            severity: headerCheck.missing_severity,
                            title: headerCheck.title,
                            description: headerCheck.description,
                            fix: headerCheck.fix,
                            cve: null,
                            exploit_url: null
                        });
                    }
                }

                resolve(results);
            });

            req.on('error', () => {
                resolve(results);
            });

            req.on('timeout', () => {
                req.destroy();
                resolve(results);
            });

            req.end();
        });
    }

    // Check SSL/TLS configuration
    async checkSSL(host) {
        const results = [];

        return new Promise((resolve) => {
            const options = {
                host: host,
                port: 443,
                rejectUnauthorized: false,
                timeout: 5000
            };

            const socket = tls.connect(options, () => {
                const cert = socket.getPeerCertificate();

                if (cert && Object.keys(cert).length > 0) {
                    // Check expiry
                    const validTo = new Date(cert.valid_to);
                    if (validTo < new Date()) {
                        results.push({
                            severity: 'critical',
                            title: 'SSL Certificate Expired',
                            description: `Certificate expired on ${validTo.toDateString()}`,
                            fix: 'Renew the SSL certificate',
                            cve: null,
                            exploit_url: null
                        });
                    }

                    // Check if self-signed
                    if (cert.issuer && cert.subject &&
                        JSON.stringify(cert.issuer) === JSON.stringify(cert.subject)) {
                        results.push({
                            severity: 'medium',
                            title: 'Self-Signed SSL Certificate',
                            description: 'The certificate is self-signed and not trusted by browsers.',
                            fix: 'Obtain a certificate from a trusted CA',
                            cve: null,
                            exploit_url: null
                        });
                    }
                }

                // Check TLS version
                const protocol = socket.getProtocol();
                if (protocol === 'TLSv1' || protocol === 'TLSv1.1') {
                    results.push({
                        severity: 'high',
                        title: 'Weak TLS Protocol',
                        description: `Server uses ${protocol} which is deprecated and vulnerable.`,
                        fix: 'Disable TLS 1.0/1.1 and use TLS 1.2 or higher',
                        cve: null,
                        exploit_url: null
                    });
                }

                socket.end();
                resolve(results);
            });

            socket.on('error', () => {
                resolve(results);
            });

            socket.on('timeout', () => {
                socket.destroy();
                resolve(results);
            });
        });
    }

    // Main scan function
    async scan(target, options = {}) {
        this.isScanning = true;
        this.scanProgress = 0;
        this.scanResults = [];

        const targetType = options.type || 'auto';
        const portRange = options.ports || 'common';
        const ports = this.parsePortRange(portRange);

        console.log(`[Vuln Scanner] Starting scan of ${target}`);
        console.log(`[Vuln Scanner] Ports to scan: ${ports.length}`);

        const results = {
            target: target,
            scanTime: new Date().toISOString(),
            openPorts: [],
            vulnerabilities: []
        };

        // Resolve hostname to IP
        let ip = target;
        try {
            if (!/^\d+\.\d+\.\d+\.\d+$/.test(target)) {
                const addresses = await dns.promises.resolve4(target);
                ip = addresses[0];
                console.log(`[Vuln Scanner] Resolved ${target} to ${ip}`);
            }
        } catch (e) {
            console.log(`[Vuln Scanner] Using target as-is: ${target}`);
        }

        // Port scanning
        const totalSteps = ports.length + 3; // ports + web checks + SSL + finalize
        let currentStep = 0;

        for (const port of ports) {
            const portResult = await this.scanPort(ip, port);
            currentStep++;
            this.scanProgress = Math.floor((currentStep / totalSteps) * 100);

            if (portResult.open) {
                console.log(`[Vuln Scanner] Port ${port} open`);

                const serviceInfo = this.detectService(port, portResult.banner);
                const portData = {
                    port: port,
                    service: serviceInfo.service,
                    version: serviceInfo.version,
                    banner: serviceInfo.banner ? serviceInfo.banner.substring(0, 200) : null
                };

                results.openPorts.push(portData);

                // Check for vulnerabilities
                const vulns = this.checkVulnerabilities(serviceInfo.service, serviceInfo.version);
                for (const vuln of vulns) {
                    results.vulnerabilities.push({
                        ...vuln,
                        port: port,
                        service: serviceInfo.service,
                        version: serviceInfo.version
                    });
                }

                // Check for high-risk ports
                const portInfo = this.vulnDb.port_info[port.toString()];
                if (portInfo && portInfo.risk === 'high') {
                    results.vulnerabilities.push({
                        severity: 'info',
                        title: `High-Risk Service Exposed: ${portInfo.service}`,
                        description: `Port ${port} (${portInfo.service}) is open and considered high-risk if exposed to the internet.`,
                        fix: `Consider restricting access to port ${port} with a firewall or VPN`,
                        port: port,
                        service: portInfo.service,
                        cve: null,
                        exploit_url: null
                    });
                }
            }
        }

        // Web security checks (if HTTP/HTTPS)
        const hasHttp = results.openPorts.some(p => p.port === 80);
        const hasHttps = results.openPorts.some(p => p.port === 443);

        if (hasHttp || hasHttps || targetType === 'website') {
            currentStep++;
            this.scanProgress = Math.floor((currentStep / totalSteps) * 100);

            console.log('[Vuln Scanner] Checking web security headers...');
            const webResults = await this.checkWebSecurity(target, hasHttps);
            results.vulnerabilities.push(...webResults.map(v => ({
                ...v,
                port: hasHttps ? 443 : 80,
                service: 'HTTP'
            })));
        }

        // SSL/TLS checks
        if (hasHttps || targetType === 'website') {
            currentStep++;
            this.scanProgress = Math.floor((currentStep / totalSteps) * 100);

            console.log('[Vuln Scanner] Checking SSL/TLS...');
            const sslResults = await this.checkSSL(target);
            results.vulnerabilities.push(...sslResults.map(v => ({
                ...v,
                port: 443,
                service: 'HTTPS'
            })));
        }

        // Sort vulnerabilities by severity
        const severityOrder = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
        results.vulnerabilities.sort((a, b) =>
            severityOrder[a.severity] - severityOrder[b.severity]
        );

        // OS Detection
        results.os = this.detectOS(results.openPorts);

        // Risk Score Calculation
        results.riskScore = this.calculateRiskScore(results.vulnerabilities);

        this.scanProgress = 100;
        this.scanResults = results;
        this.isScanning = false;

        console.log(`[Vuln Scanner] Scan complete. Found ${results.openPorts.length} open ports and ${results.vulnerabilities.length} potential vulnerabilities.`);
        console.log(`[Vuln Scanner] OS Guess: ${results.os.name}, Confidence: ${results.os.confidence}, Risk Score: ${results.riskScore}`);

        return results;
    }

    // Heuristic OS Detection
    detectOS(openPorts) {
        let os = { name: 'Unknown', confidence: 'low', icon: '❓' };
        let points = { windows: 0, linux: 0, mac: 0 };

        // Check ports
        const ports = openPorts.map(p => p.port);

        if (ports.includes(135)) points.windows += 5;
        if (ports.includes(139)) points.windows += 5;
        if (ports.includes(445)) points.windows += 10;
        if (ports.includes(3389)) points.windows += 15;

        if (ports.includes(22)) points.linux += 5;
        if (ports.includes(2049)) points.linux += 5; // NFS
        if (ports.includes(631)) points.linux += 2; // CUPS (also Mac)

        // Check banners
        openPorts.forEach(p => {
            if (!p.banner) return;
            const banner = p.banner.toLowerCase();

            if (banner.includes('windows') || banner.includes('microsoft')) points.windows += 10;
            if (banner.includes('ubuntu') || banner.includes('debian') || banner.includes('centos') || banner.includes('linux')) points.linux += 10;
            if (banner.includes('ssh') && (banner.includes('openssh'))) points.linux += 2; // Common on Linux
        });

        // Determine OS
        if (points.windows > points.linux && points.windows > 5) {
            os = { name: 'Windows', confidence: points.windows > 20 ? 'high' : 'medium', icon: '🪟' };
        } else if (points.linux > points.windows && points.linux > 5) {
            // Refine Linux distro
            let distro = 'Linux';
            openPorts.forEach(p => {
                if (p.banner) {
                    if (p.banner.toLowerCase().includes('ubuntu')) distro = 'Ubuntu Linux';
                    if (p.banner.toLowerCase().includes('debian')) distro = 'Debian Linux';
                    if (p.banner.toLowerCase().includes('centos')) distro = 'CentOS Linux';
                }
            });
            os = { name: distro, confidence: points.linux > 15 ? 'high' : 'medium', icon: '🐧' };
        }

        return os;
    }

    // Calculate Risk Score (0-100)
    calculateRiskScore(vulns) {
        let score = 0;
        const weights = { critical: 40, high: 20, medium: 10, low: 5, info: 1 };

        vulns.forEach(v => {
            score += weights[v.severity] || 0;
        });

        // Cap at 100, but allow overflow for "EXTREME" internal calculation if needed
        return Math.min(100, score);
    }

    getProgress() {
        return {
            progress: this.scanProgress,
            isScanning: this.isScanning
        };
    }

    getResults() {
        return this.scanResults;
    }
}

module.exports = new VulnScanner();
