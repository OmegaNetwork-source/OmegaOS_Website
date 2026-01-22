const { ethers } = require('ethers');
const solc = require('solc');
const fs = require('fs');
const path = require('path');

// Omega Network config
const RPC_URL = 'https://0x4e454228.rpc.aurora-cloud.dev';
const TOMEGA_ADDRESS = '0x82C88F75d3DA75dF268cda532CeC8B101da8Fa51';

function findImports(importPath) {
  try {
    // Try to find OpenZeppelin contracts
    if (importPath.startsWith('@openzeppelin/')) {
      // Convert @openzeppelin/contracts/token/ERC20/IERC20.sol to node_modules path
      // Remove @openzeppelin/ prefix, keep the rest
      const relPath = importPath.replace('@openzeppelin/contracts/', '');
      const openZeppelinPath = path.join(__dirname, 'node_modules', '@openzeppelin', 'contracts', relPath);
      
      console.log('Looking for:', openZeppelinPath);
      
      if (fs.existsSync(openZeppelinPath)) {
        console.log('Found:', openZeppelinPath);
        return { contents: fs.readFileSync(openZeppelinPath, 'utf8') };
      }
      
      // Try parent directory's node_modules
      const parentPath = path.join(__dirname, '..', 'node_modules', '@openzeppelin', 'contracts', relPath);
      if (fs.existsSync(parentPath)) {
        console.log('Found in parent:', parentPath);
        return { contents: fs.readFileSync(parentPath, 'utf8') };
      }
      
      console.log('Not found:', openZeppelinPath);
    }
    return { error: 'File not found: ' + importPath };
  } catch (e) {
    console.error('Import error:', e.message);
    return { error: e.message };
  }
}

async function compileContract() {
  const contractPath = path.join(__dirname, 'contracts', 'ClaimDistributor15.sol');
  const source = fs.readFileSync(contractPath, 'utf8');
  
  const input = {
    language: 'Solidity',
    sources: {
      'ClaimDistributor15.sol': {
        content: source
      }
    },
    settings: {
      outputSelection: {
        '*': {
          '*': ['abi', 'evm.bytecode']
        }
      },
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  };

  try {
    // solc.compile - check if it returns string or object
    const output = solc.compile(JSON.stringify(input), { import: findImports });
    
    // solc.compile returns a JSON string
    // Parse it carefully
    let parsedOutput;
    try {
      if (typeof output === 'string') {
        // Remove any non-JSON prefixes/suffixes
        const cleanOutput = output.trim();
        if (cleanOutput.startsWith('{') || cleanOutput.startsWith('[')) {
          parsedOutput = JSON.parse(cleanOutput);
        } else {
          // Try to find JSON in the string
          const jsonMatch = cleanOutput.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            parsedOutput = JSON.parse(jsonMatch[0]);
          } else {
            throw new Error('No valid JSON found in output');
          }
        }
      } else if (typeof output === 'object') {
        parsedOutput = output;
      } else {
        throw new Error('Unexpected output type: ' + typeof output);
      }
    } catch (e) {
      console.error('Failed to parse solc output');
      console.error('Output type:', typeof output);
      console.error('Output length:', typeof output === 'string' ? output.length : 'N/A');
      console.error('First 500 chars:', typeof output === 'string' ? output.substring(0, 500) : String(output).substring(0, 500));
      throw e;
    }
    
    if (parsedOutput.errors) {
      const errors = parsedOutput.errors.filter(e => e.severity === 'error');
      if (errors.length > 0) {
        console.error('Compilation errors:', JSON.stringify(errors, null, 2));
        throw new Error('Compilation failed');
      }
    }
    
    if (!parsedOutput.contracts || !parsedOutput.contracts['ClaimDistributor15.sol'] || !parsedOutput.contracts['ClaimDistributor15.sol']['ClaimDistributor15']) {
      throw new Error('Contract not found in compilation output');
    }
    
    const contract = parsedOutput.contracts['ClaimDistributor15.sol']['ClaimDistributor15'];
    return {
      abi: JSON.parse(contract.abi),
      bytecode: contract.evm.bytecode.object
    };
  } catch (error) {
    console.error('Compilation error:', error.message);
    if (error.stack) console.error(error.stack);
    throw error;
  }
}

async function deploy() {
  const privateKey = process.argv[2];
  
  if (!privateKey) {
    console.error('❌ Error: Private key required');
    console.log('Usage: node deploy-simple.js <private_key>');
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

    console.log('\n📦 Compiling contract...');
    const { abi, bytecode } = await compileContract();
    
    console.log('🚀 Deploying contract...');
    const factory = new ethers.ContractFactory(abi, bytecode, wallet);
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
