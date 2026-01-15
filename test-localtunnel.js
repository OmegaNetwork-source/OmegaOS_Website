// Test localtunnel
const localtunnel = require('localtunnel');
const http = require('http');

async function test() {
    console.log('Creating test server...');

    const server = http.createServer((req, res) => {
        res.end('<h1>LOCALTUNNEL WORKS!</h1><p>Public URL is working!</p>');
    });

    server.listen(7777, async () => {
        console.log('Server on http://localhost:7777');

        try {
            console.log('Starting localtunnel...');
            const tunnel = await localtunnel({ port: 7777 });

            console.log('✅ SUCCESS!');
            console.log('PUBLIC URL:', tunnel.url);
            console.log('\nCopy this URL and test it in your browser!');
            console.log('Press Ctrl+C to stop\n');

            tunnel.on('close', () => {
                console.log('Tunnel closed');
            });

        } catch (e) {
            console.error('FAILED:', e.message);
        }
    });
}

test();
