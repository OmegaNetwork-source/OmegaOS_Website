import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const contractAddress = process.argv[2];

if (!contractAddress) {
    console.error('Usage: node update-contract-address.js <contract_address>');
    process.exit(1);
}

if (!/^0x[a-fA-F0-9]{40}$/.test(contractAddress)) {
    console.error('Invalid contract address format');
    process.exit(1);
}

const indexPath = path.join(__dirname, 'index.html');
let content = fs.readFileSync(indexPath, 'utf8');

// Update contract address
content = content.replace(
    /const CONTRACT_ADDRESS = "0x[a-fA-F0-9]{40}";/,
    `const CONTRACT_ADDRESS = "${contractAddress}";`
);

fs.writeFileSync(indexPath, content);
console.log(`✅ Updated index.html with contract address: ${contractAddress}`);
