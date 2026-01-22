// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ClaimDistributor15
 * @notice Enhanced airdrop contract with anti-bot protections
 * @dev Implements wallet age, balance requirements, and rate limiting
 */
contract ClaimDistributor15 is Ownable {
    IERC20 public immutable tOmega;
    uint256 public constant CLAIM_AMOUNT = 1000 * 10**18; // 1000 tokens
    
    // Anti-bot settings (configurable by owner)
    uint256 public minWalletAgeDays = 7; // Minimum wallet age in days
    uint256 public maxClaimsPerBlock = 10; // Rate limiting: max claims per block
    bool public requireMinimumBalance = true;
    uint256 public minimumBalance = 0.01 ether; // Minimum ETH balance required
    
    // Tracking
    mapping(address => bool) public hasClaimed;
    mapping(address => uint256) public firstSeenBlock; // Track when wallet first interacted
    mapping(uint256 => uint256) public claimsPerBlock; // Track claims per block
    uint256 public totalClaims;
    
    // tOmega token address: 0x82C88F75d3DA75dF268cda532CeC8B101da8Fa51
    constructor() Ownable(msg.sender) {
        tOmega = IERC20(0x82C88F75d3DA75dF268cda532CeC8B101da8Fa51);
    }

    /**
     * @notice Claim airdrop tokens (with anti-bot checks)
     * @dev Requires wallet age, minimum balance, and rate limiting
     */
    function claim() external {
        address claimer = msg.sender;
        
        // Basic checks
        require(!hasClaimed[claimer], "Already claimed");
        require(tOmega.balanceOf(address(this)) >= CLAIM_AMOUNT, "Faucet empty");
        
        // Anti-bot checks
        _checkWalletAge(claimer);
        _checkMinimumBalance(claimer);
        _checkRateLimit();
        
        // Record first interaction if not already recorded
        if (firstSeenBlock[claimer] == 0) {
            firstSeenBlock[claimer] = block.number;
        }
        
        // Mark as claimed
        hasClaimed[claimer] = true;
        totalClaims++;
        claimsPerBlock[block.number]++;
        
        // Transfer tokens
        tOmega.transfer(claimer, CLAIM_AMOUNT);
    }
    
    /**
     * @notice Check if wallet is old enough
     * @dev Compares current block with first seen block
     */
    function _checkWalletAge(address wallet) internal view {
        if (firstSeenBlock[wallet] == 0) {
            // New wallet, record it but allow claim if minWalletAgeDays is 0
            require(minWalletAgeDays == 0, "Wallet too new");
            return;
        }
        
        uint256 blocksSinceFirstSeen = block.number - firstSeenBlock[wallet];
        uint256 minBlocks = minWalletAgeDays * 24 * 60 * 60 / 2; // Assuming ~2 second blocks
        
        require(blocksSinceFirstSeen >= minBlocks, "Wallet age requirement not met");
    }
    
    /**
     * @notice Check if wallet has minimum balance
     */
    function _checkMinimumBalance(address wallet) internal view {
        if (!requireMinimumBalance) return;
        require(wallet.balance >= minimumBalance, "Insufficient wallet balance");
    }
    
    /**
     * @notice Check rate limiting per block
     */
    function _checkRateLimit() internal view {
        require(claimsPerBlock[block.number] < maxClaimsPerBlock, "Rate limit exceeded");
    }
    
    /**
     * @notice Check if address is eligible to claim (view function)
     * @param wallet Address to check
     * @return eligible Whether wallet can claim
     * @return reason Reason if not eligible
     */
    function checkEligibility(address wallet) external view returns (bool eligible, string memory reason) {
        if (hasClaimed[wallet]) {
            return (false, "Already claimed");
        }
        
        if (tOmega.balanceOf(address(this)) < CLAIM_AMOUNT) {
            return (false, "Faucet empty");
        }
        
        if (firstSeenBlock[wallet] == 0 && minWalletAgeDays > 0) {
            return (false, "Wallet too new");
        }
        
        if (firstSeenBlock[wallet] > 0) {
            uint256 blocksSinceFirstSeen = block.number - firstSeenBlock[wallet];
            uint256 minBlocks = minWalletAgeDays * 24 * 60 * 60 / 2;
            if (blocksSinceFirstSeen < minBlocks) {
                return (false, "Wallet age requirement not met");
            }
        }
        
        if (requireMinimumBalance && wallet.balance < minimumBalance) {
            return (false, "Insufficient wallet balance");
        }
        
        if (claimsPerBlock[block.number] >= maxClaimsPerBlock) {
            return (false, "Rate limit exceeded");
        }
        
        return (true, "Eligible");
    }
    
    // Owner functions to adjust settings
    function setMinWalletAgeDays(uint256 _days) external onlyOwner {
        minWalletAgeDays = _days;
    }
    
    function setMaxClaimsPerBlock(uint256 _max) external onlyOwner {
        maxClaimsPerBlock = _max;
    }
    
    function setRequireMinimumBalance(bool _require) external onlyOwner {
        requireMinimumBalance = _require;
    }
    
    function setMinimumBalance(uint256 _amount) external onlyOwner {
        minimumBalance = _amount;
    }
    
    // Function to manually record wallet first seen (for wallets that interacted before contract)
    function recordWalletFirstSeen(address wallet, uint256 blockNumber) external onlyOwner {
        if (firstSeenBlock[wallet] == 0) {
            firstSeenBlock[wallet] = blockNumber;
        }
    }
    
    // Function to withdraw leftover tokens if needed
    function withdrawTokens(uint256 amount) external onlyOwner {
        tOmega.transfer(msg.sender, amount);
    }
}
