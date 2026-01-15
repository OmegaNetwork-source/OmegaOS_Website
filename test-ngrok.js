// Simplest ngrok test
const ngrok = require('ngrok');
const http = require('http');

async function test() {
    console.log('Creating test server...');

    const server = http.createServer((req, res) => {
        res.end('<h1>IT WORKS!</h1>');
    });

    server.listen(7777, async () => {
        console.log('Server on http://localhost:7777');

        try {
            console.log('Starting ngrok...');
            // Simplest possible call - just the port number
            const url = await ngrok.connect(7777);
            console.log('✅ SUCCESS!');
            console.log('PUBLIC URL:', url);
            console.log('\nCopy this URL and test it in your browser!');
            console.log('Press Ctrl+C to stop\n');
        } catch (e) {
            console.error('FAILED:', e.message);
            console.error('Details:', e);
        }
    });
}

test();
