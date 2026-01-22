import hre from "hardhat";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { ethers } from "ethers";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  // Get private key from environment
  const privateKey = process.env.PRIVATE_KEY;
  
  if (!privateKey) {
    console.error('Error: PRIVATE_KEY environment variable required');
    console.log('Usage: $env:PRIVATE_KEY="your_key"; npx hardhat run scripts/deploy.js --network omega');
    process.exit(1);
  }

  // Add the private key to the network config
  hre.config.networks.omega.accounts = ['0x' + privateKey.replace(/^0x/, '')];

  console.log("Deploying ClaimDistributor15...");
  console.log("Network: Omega Network (Chain ID: 1313161768)");

  // Read the compiled artifact
  const artifact = await hre.artifacts.readArtifact("ClaimDistributor15");
  
  // Create provider and wallet
  const provider = new ethers.JsonRpcProvider("https://0x4e454228.rpc.aurora-cloud.dev");
  const wallet = new ethers.Wallet('0x' + privateKey.replace(/^0x/, ''), provider);
  
  console.log("Deployer address:", wallet.address);
  
  // Check balance
  const balance = await provider.getBalance(wallet.address);
  console.log("Wallet balance:", ethers.formatEther(balance), "ETH");
  
  if (balance === 0n) {
    console.error("❌ Wallet has no balance! Need ETH for gas fees.");
    process.exit(1);
  }
  
  // Deploy using ContractFactory
  console.log("Creating contract factory...");
  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
  console.log("Deploying contract (this may take a minute)...");
  
  let distributor;
  let txHash;
  try {
    distributor = await factory.deploy();
    txHash = distributor.deploymentTransaction().hash;
    console.log("Deployment transaction sent!");
    console.log("Transaction hash:", txHash);
    console.log("Waiting for confirmation (this may take 30-60 seconds)...");
    
    // Poll for transaction manually with timeout
    const maxWaitTime = 120000; // 2 minutes
    const startTime = Date.now();
    let receipt = null;
    
    while (Date.now() - startTime < maxWaitTime) {
      try {
        receipt = await provider.getTransactionReceipt(txHash);
        if (receipt) {
          console.log("✅ Transaction confirmed!");
          break;
        }
      } catch (e) {
        // Transaction not found yet, continue polling
      }
      await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds
      process.stdout.write(".");
    }
    
    if (!receipt) {
      console.log("\n⚠️ Transaction not confirmed after 2 minutes. Checking status...");
      const tx = await provider.getTransaction(txHash);
      if (!tx) {
        console.error("❌ Transaction not found on network. It may not have been broadcast.");
        process.exit(1);
      } else {
        console.log("Transaction is still pending. You can check it later with hash:", txHash);
        process.exit(1);
      }
    }
    
    if (receipt.status === 0) {
      console.error("❌ Transaction failed!");
      process.exit(1);
    }
    
    await distributor.waitForDeployment();
    console.log("\n✅ Contract deployed!");
  } catch (error) {
    console.error("\n❌ Deployment error:", error.message);
    if (txHash) {
      console.error("Transaction hash:", txHash);
    }
    throw error;
  }

  const address = await distributor.getAddress();
  console.log("Contract address:", address);
  
  // Wait for a few confirmations
  const tx = distributor.deploymentTransaction();
  if (tx) {
    console.log("Waiting for 3 confirmations...");
    await tx.wait(3);
    console.log("✅ Deployment confirmed with 3 blocks!");
  }
  
  // Update index.html with the deployed address
  const indexPath = path.join(__dirname, '..', 'index.html');
  let indexContent = fs.readFileSync(indexPath, 'utf8');
  
  // Replace the placeholder address
  indexContent = indexContent.replace(
    /const CONTRACT_ADDRESS = "0x0000000000000000000000000000000000000000"/,
    `const CONTRACT_ADDRESS = "${address}"`
  );
  
  fs.writeFileSync(indexPath, indexContent);
  console.log("\n✅ Updated index.html with contract address:", address);
  
  console.log("\n📋 Next steps:");
  console.log("1. Fund the contract with tOmega tokens");
  console.log("2. Test the claim functionality");
  console.log("3. Deploy the frontend");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
