// Simple deployment script using ethers from parent directory
// Compile the contract first using Remix IDE, then paste the bytecode here

const path = require('path');
const fs = require('fs');

// Use ethers from parent directory
const parentEthers = require(path.join(__dirname, '..', 'node_modules', 'ethers'));

const { ethers } = parentEthers;

// Omega Network config
const RPC_URL = 'https://0x4e454228.rpc.aurora-cloud.dev';
const TOMEGA_ADDRESS = '0x82C88F75d3DA75dF268cda532CeC8B101da8Fa51';

// Contract ABI (minimal for deployment and interaction)
const CONTRACT_ABI = [
  "constructor()",
  "function claim() external",
  "function hasClaimed(address) external view returns (bool)",
  "function withdrawTokens(uint256) external",
  "function owner() external view returns (address)",
  "function tOmega() external view returns (address)",
  "function CLAIM_AMOUNT() external view returns (uint256)"
];

async function deploy() {
  const privateKey = process.argv[2];
  
  if (!privateKey) {
    console.error('❌ Error: Private key required');
    console.log('Usage: node deploy-final.js <private_key>');
    process.exit(1);
  }

  const cleanPrivateKey = privateKey.startsWith('0x') ? privateKey : '0x' + privateKey;
  
  try {
    console.log('🔗 Connecting to Omega Network...');
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(cleanPrivateKey, provider);
    
    console.log('📝 Deployer address:', wallet.address);
    
    const balance = await provider.getBalance(wallet.address);
    console.log('💰 Balance:', ethers.formatEther(balance), 'OMEGA');
    
    if (balance === 0n) {
      console.error('❌ Error: Insufficient balance for deployment');
      process.exit(1);
    }

    console.log('\n📦 Reading contract bytecode...');
    console.log('Note: You need to compile the contract first.');
    console.log('Options:');
    console.log('1. Use Remix IDE: https://remix.ethereum.org');
    console.log('2. Compile ClaimDistributor15.sol');
    console.log('3. Copy the bytecode and save it to bytecode.txt');
    console.log('4. Or use Hardhat to compile');
    
    // Try to read bytecode from file if it exists
    const bytecodePath = path.join(__dirname, 'bytecode.txt');
    let bytecode = '';
    
    if (fs.existsSync(bytecodePath)) {
      bytecode = fs.readFileSync(bytecodePath, 'utf8').trim();
      console.log('✅ Found bytecode file');
    } else {
      console.log('\n💡 For now, let\'s use Hardhat to compile and deploy...');
      console.log('Run: npx hardhat compile (after fixing Hardhat config)');
      console.log('Or compile on Remix and save bytecode to bytecode.txt');
      process.exit(0);
    }
    
    if (!bytecode || bytecode.length < 100) {
      console.error('❌ Invalid bytecode');
      process.exit(1);
    }
    
    console.log('🚀 Deploying contract...');
    const factory = new ethers.ContractFactory(CONTRACT_ABI, bytecode, wallet);
    const contract = await factory.deploy();
    
    console.log('⏳ Waiting for deployment transaction...');
    await contract.waitForDeployment();
    
    const address = await contract.getAddress();
    console.log('\n✅ Contract deployed!');
    console.log('📍 Address:', address);
    
    const tx = contract.deploymentTransaction();
    if (tx) {
      console.log('🔗 Transaction hash:', tx.hash);
      console.log('⏳ Waiting for confirmations...');
      await tx.wait(3);
      console.log('✅ Deployment confirmed!');
    }
    
    // Verify deployment
    console.log('\n🔍 Verifying deployment...');
    const owner = await contract.owner();
    const tOmegaAddr = await contract.tOmega();
    console.log('Owner:', owner);
    console.log('tOmega address:', tOmegaAddr);
    console.log('✅ Contract verified!');
    
    // Update index.html
    const indexPath = path.join(__dirname, 'index.html');
    let indexContent = fs.readFileSync(indexPath, 'utf8');
    
    indexContent = indexContent.replace(
      /const CONTRACT_ADDRESS = "0x0000000000000000000000000000000000000000"/,
      `const CONTRACT_ADDRESS = "${address}"`
    );
    
    fs.writeFileSync(indexPath, indexContent);
    console.log('\n✅ Updated index.html with contract address');
    
    console.log('\n📋 Next steps:');
    console.log('1. Fund the contract with tOmega tokens');
    console.log('2. Test the claim functionality');
    console.log('3. Deploy the frontend');
    
  } catch (error) {
    console.error('❌ Deployment error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

deploy();
