# Wallet Drainer - Educational Demo

## ⚠️ DISCLAIMER
**THIS IS FOR EDUCATIONAL PURPOSES ONLY**
- Only use on testnets (Sepolia, Goerli, Mumbai, etc.)
- Never deploy to mainnet
- Never use with real funds
- This demonstrates how malicious contracts work for security awareness

## 📋 What This Does

This smart contract automatically forwards any ETH sent to it to a specified recipient wallet. It demonstrates:
- How malicious contracts can drain wallets
- The importance of auditing contracts before interacting
- Why you should never send funds to unverified contracts

## 🚀 How to Deploy

### Step 1: Deploy the Contract

1. Go to [Remix IDE](https://remix.ethereum.org)
2. Create a new file `WalletDrainer.sol`
3. Copy the contract code from `WalletDrainer.sol`
4. Compile with Solidity 0.8.0+
5. Deploy to a testnet (Sepolia recommended):
   - Switch MetaMask to Sepolia testnet
   - Get test ETH from [Sepolia Faucet](https://sepoliafaucet.com/)
   - In Remix, select "Injected Provider - MetaMask"
   - Enter your recipient wallet address in the constructor
   - Click "Deploy"
   - Confirm the transaction in MetaMask

### Step 2: Use the Interface

1. Open `drainer-interface.html` in a browser
2. Connect your MetaMask wallet
3. Enter the deployed contract address
4. Enter your recipient wallet address
5. Click "Set Recipient Wallet" (if you want to change it)
6. Enter an amount and click "Send ETH (Will be Drained)"
7. Watch as the funds are automatically sent to the recipient!

## 📝 Contract Functions

### `constructor(address payable _recipientWallet)`
- Sets the initial recipient wallet
- Only called once during deployment

### `setRecipient(address payable _newRecipient)`
- Updates the recipient wallet
- Only owner can call this

### `drainETH()`
- Public function to send ETH to the contract
- Automatically forwards to recipient

### `receive()` / `fallback()`
- Automatically triggered when ETH is sent
- Immediately drains to recipient

## 🔍 How It Works

1. User sends ETH to the contract
2. Contract's `receive()` or `drainETH()` function is triggered
3. Contract immediately forwards all ETH to the recipient wallet
4. Events are emitted for tracking

## 🛡️ Security Lessons

This contract teaches important security concepts:

1. **Always audit contracts** before sending funds
2. **Check the contract code** on Etherscan
3. **Verify recipient addresses** in the contract
4. **Use testnets** for experimentation
5. **Never trust** unverified contracts

## 📊 Testing on Sepolia

1. Get test ETH: https://sepoliafaucet.com/
2. Deploy contract with your recipient address
3. Send small amounts (0.01 ETH) to test
4. Verify transactions on [Sepolia Etherscan](https://sepolia.etherscan.io/)

## 🎓 Educational Use Cases

- Security awareness training
- Smart contract auditing practice
- Understanding malicious contract patterns
- Web3 security demonstrations
- Blockchain forensics training

## ⚙️ Technical Details

- **Solidity Version**: ^0.8.0
- **License**: MIT
- **Network**: Any EVM-compatible testnet
- **Gas Optimization**: Minimal storage, efficient transfers

## 🔗 Resources

- [Remix IDE](https://remix.ethereum.org)
- [Sepolia Faucet](https://sepoliafaucet.com/)
- [Sepolia Etherscan](https://sepolia.etherscan.io/)
- [MetaMask](https://metamask.io/)
- [Ethers.js Docs](https://docs.ethers.io/)

## ⚠️ Legal Notice

This code is provided for educational purposes only. The author is not responsible for any misuse. Always obtain proper authorization before testing security tools.
