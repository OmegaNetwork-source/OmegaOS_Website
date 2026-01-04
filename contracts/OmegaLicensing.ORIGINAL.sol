// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title Omega OS Pro Licensing
 * @notice Manages licensing for Omega OS Pro via staking or purchase
 * @dev Users can stake tokens for 30-day licenses or purchase lifetime licenses
 */
contract OmegaLicensing {
    // License types
    enum LicenseType {
        None,
        Staked,      // 30-day staking license
        Purchased    // Lifetime purchased license
    }
    
    // License information
    struct License {
        LicenseType licenseType;
        uint256 stakedAmount;      // Amount staked (for staking licenses)
        uint256 purchaseAmount;     // Amount paid (for purchased licenses)
        uint256 startTime;          // When license started
        uint256 expiryTime;         // When license expires (0 for lifetime)
        bool isActive;              // Whether license is currently active
    }
    
    // Owner (deployer) - can adjust prices
    address public owner;
    
    // Pricing (adjustable by owner)
    uint256 public stakingAmount;      // Amount required for 30-day staking (default: 1000 OMEGA)
    uint256 public purchaseAmount;     // Amount required for lifetime purchase (default: 10000 OMEGA)
    uint256 public stakingPeriod;      // Staking period in seconds (default: 30 days)
    
    // Mapping from Omega ID to License
    mapping(string => License) public licenses;
    
    // Mapping from Omega ID to staked tokens (for staking)
    mapping(string => uint256) public stakedBalances;
    
    // Total staked tokens (for accounting)
    uint256 public totalStaked;
    
    // Events
    event LicenseStaked(
        string indexed omegaId,
        uint256 amount,
        uint256 expiryTime
    );
    
    event LicenseRenewed(
        string indexed omegaId,
        uint256 amount,
        uint256 newExpiryTime
    );
    
    event LicensePurchased(
        string indexed omegaId,
        uint256 amount
    );
    
    event LicenseWithdrawn(
        string indexed omegaId,
        uint256 amount
    );
    
    event StakingAmountUpdated(uint256 newAmount);
    event PurchaseAmountUpdated(uint256 newAmount);
    event StakingPeriodUpdated(uint256 newPeriod);
    
    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    modifier validOmegaId(string memory omegaId) {
        require(bytes(omegaId).length > 0, "Omega ID cannot be empty");
        _;
    }
    
    /**
     * @notice Constructor - sets initial values
     * @param _stakingAmount Initial staking amount (in wei, e.g., 1000 * 10^18)
     * @param _purchaseAmount Initial purchase amount (in wei, e.g., 10000 * 10^18)
     * @param _stakingPeriod Staking period in seconds (default: 30 days = 2592000)
     */
    constructor(
        uint256 _stakingAmount,
        uint256 _purchaseAmount,
        uint256 _stakingPeriod
    ) {
        owner = msg.sender;
        stakingAmount = _stakingAmount;
        purchaseAmount = _purchaseAmount;
        stakingPeriod = _stakingPeriod; // Default: 30 days
    }
    
    /**
     * @notice Stake tokens for 30-day license
     * @param omegaId The Omega ID of the user
     */
    function stakeForLicense(string memory omegaId) 
        external 
        payable 
        validOmegaId(omegaId) 
    {
        require(msg.value >= stakingAmount, "Insufficient staking amount");
        
        License storage license = licenses[omegaId];
        
        // If user already has a staking license, add to existing stake
        if (license.licenseType == LicenseType.Staked && license.isActive) {
            // Renew existing license
            stakedBalances[omegaId] += msg.value;
            license.stakedAmount += msg.value;
            
            // Extend expiry time (add 30 days from now, not from previous expiry)
            license.expiryTime = block.timestamp + stakingPeriod;
            
            emit LicenseRenewed(omegaId, msg.value, license.expiryTime);
        } else {
            // New staking license
            license.licenseType = LicenseType.Staked;
            license.stakedAmount = msg.value;
            license.startTime = block.timestamp;
            license.expiryTime = block.timestamp + stakingPeriod;
            license.isActive = true;
            license.purchaseAmount = 0;
            
            stakedBalances[omegaId] = msg.value;
            totalStaked += msg.value;
            
            emit LicenseStaked(omegaId, msg.value, license.expiryTime);
        }
    }
    
    /**
     * @notice Purchase lifetime license
     * @param omegaId The Omega ID of the user
     */
    function purchaseLicense(string memory omegaId) 
        external 
        payable 
        validOmegaId(omegaId) 
    {
        require(msg.value >= purchaseAmount, "Insufficient purchase amount");
        
        License storage license = licenses[omegaId];
        
        // If user has staked tokens, they need to withdraw first
        require(
            stakedBalances[omegaId] == 0,
            "Please withdraw staked tokens before purchasing lifetime license"
        );
        
        // Refund excess if overpaid
        uint256 excess = msg.value - purchaseAmount;
        if (excess > 0) {
            payable(msg.sender).transfer(excess);
        }
        
        license.licenseType = LicenseType.Purchased;
        license.purchaseAmount = purchaseAmount;
        license.stakedAmount = 0;
        license.startTime = block.timestamp;
        license.expiryTime = 0; // 0 means lifetime (never expires)
        license.isActive = true;
        
        emit LicensePurchased(omegaId, purchaseAmount);
    }
    
    /**
     * @notice Withdraw staked tokens (after license expires or user wants to stop)
     * @param omegaId The Omega ID of the user
     */
    function withdrawStake(string memory omegaId) 
        external 
        validOmegaId(omegaId) 
    {
        License storage license = licenses[omegaId];
        require(
            license.licenseType == LicenseType.Staked,
            "No staking license found"
        );
        require(
            block.timestamp >= license.expiryTime || !license.isActive,
            "License is still active. Wait for expiry or deactivate first."
        );
        
        uint256 amount = stakedBalances[omegaId];
        require(amount > 0, "No staked tokens to withdraw");
        
        // Reset license
        license.licenseType = LicenseType.None;
        license.isActive = false;
        license.stakedAmount = 0;
        stakedBalances[omegaId] = 0;
        totalStaked -= amount;
        
        // Transfer tokens back
        payable(msg.sender).transfer(amount);
        
        emit LicenseWithdrawn(omegaId, amount);
    }
    
    /**
     * @notice Check if a user has an active license
     * @param omegaId The Omega ID to check
     * @return hasLicense Whether the user has an active license
     * @return licenseType The type of license (0=None, 1=Staked, 2=Purchased)
     * @return expiryTime When the license expires (0 for lifetime)
     */
    function hasActiveLicense(string memory omegaId)
        external
        view
        returns (
            bool hasLicense,
            LicenseType licenseType,
            uint256 expiryTime
        )
    {
        License memory license = licenses[omegaId];
        
        if (license.licenseType == LicenseType.None || !license.isActive) {
            return (false, LicenseType.None, 0);
        }
        
        // Check if staking license has expired
        if (license.licenseType == LicenseType.Staked) {
            if (block.timestamp >= license.expiryTime) {
                return (false, LicenseType.None, license.expiryTime);
            }
        }
        
        // Purchased licenses never expire (expiryTime = 0)
        return (true, license.licenseType, license.expiryTime);
    }
    
    /**
     * @notice Get license information
     * @param omegaId The Omega ID to query
     * @return licenseType The type of license
     * @return stakedAmount Amount staked
     * @return purchaseAmount Amount paid for purchase
     * @return startTime When license started
     * @return expiryTime When license expires (0 for lifetime)
     * @return isActive Whether license is currently active
     */
    function getLicense(string memory omegaId)
        external
        view
        returns (
            LicenseType licenseType,
            uint256 stakedAmount,
            uint256 purchaseAmount,
            uint256 startTime,
            uint256 expiryTime,
            bool isActive
        )
    {
        License memory license = licenses[omegaId];
        return (
            license.licenseType,
            license.stakedAmount,
            license.purchaseAmount,
            license.startTime,
            license.expiryTime,
            license.isActive
        );
    }
    
    /**
     * @notice Update staking amount (owner only)
     * @param newAmount New staking amount required
     */
    function setStakingAmount(uint256 newAmount) external onlyOwner {
        require(newAmount > 0, "Staking amount must be greater than 0");
        stakingAmount = newAmount;
        emit StakingAmountUpdated(newAmount);
    }
    
    /**
     * @notice Update purchase amount (owner only)
     * @param newAmount New purchase amount required
     */
    function setPurchaseAmount(uint256 newAmount) external onlyOwner {
        require(newAmount > 0, "Purchase amount must be greater than 0");
        purchaseAmount = newAmount;
        emit PurchaseAmountUpdated(newAmount);
    }
    
    /**
     * @notice Update staking period (owner only)
     * @param newPeriod New staking period in seconds
     */
    function setStakingPeriod(uint256 newPeriod) external onlyOwner {
        require(newPeriod > 0, "Staking period must be greater than 0");
        stakingPeriod = newPeriod;
        emit StakingPeriodUpdated(newPeriod);
    }
    
    /**
     * @notice Withdraw contract balance (owner only)
     * @param amount Amount to withdraw
     */
    function withdraw(uint256 amount) external onlyOwner {
        require(address(this).balance >= amount, "Insufficient balance");
        payable(owner).transfer(amount);
    }
    
    /**
     * @notice Get contract balance
     * @return balance Current contract balance
     */
    function getBalance() external view returns (uint256 balance) {
        return address(this).balance;
    }
    
    /**
     * @notice Transfer ownership (owner only)
     * @param newOwner New owner address
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "New owner cannot be zero address");
        owner = newOwner;
    }
}

