// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title Omega Identity Registry
 * @notice Stores Omega OS identities on Omega Network blockchain
 * @dev Each Omega OS installation gets a unique identity linked to a wallet address
 */
contract OmegaIdentityRegistry {
    // Struct to store identity information
    struct Identity {
        string omegaId;           // Unique Omega ID (e.g., "omega://abc123...")
        address walletAddress;     // Wallet address that owns this identity
        string deviceFingerprint;  // Privacy-preserving device fingerprint hash
        uint256 createdAt;         // Timestamp when identity was created
        bool exists;              // Whether this identity exists
    }
    
    // Mapping from wallet address to identity
    mapping(address => Identity) public identities;
    
    // Mapping from Omega ID to wallet address (for reverse lookup)
    mapping(string => address) public omegaIdToAddress;
    
    // Mapping to check if an Omega ID is already taken
    mapping(string => bool) public omegaIdExists;
    
    // Events
    event IdentityRegistered(
        address indexed walletAddress,
        string indexed omegaId,
        string deviceFingerprint,
        uint256 timestamp
    );
    
    event IdentityUpdated(
        address indexed walletAddress,
        string indexed omegaId,
        uint256 timestamp
    );
    
    // Modifiers
    modifier onlyIdentityOwner(address walletAddress) {
        require(
            identities[walletAddress].exists,
            "Identity does not exist for this address"
        );
        _;
    }
    
    modifier validOmegaId(string memory omegaId) {
        require(
            bytes(omegaId).length > 0,
            "Omega ID cannot be empty"
        );
        require(
            bytes(omegaId).length <= 100,
            "Omega ID too long"
        );
        _;
    }
    
    /**
     * @notice Register a new Omega Identity
     * @param omegaId The unique Omega ID (e.g., "omega://abc123...")
     * @param deviceFingerprint Privacy-preserving device fingerprint hash
     * @dev Only one identity per wallet address
     */
    function registerIdentity(
        string memory omegaId,
        string memory deviceFingerprint
    ) external {
        require(
            !identities[msg.sender].exists,
            "Identity already exists for this address"
        );
        require(
            !omegaIdExists[omegaId],
            "Omega ID already taken"
        );
        require(
            bytes(deviceFingerprint).length > 0,
            "Device fingerprint cannot be empty"
        );
        
        // Create new identity
        identities[msg.sender] = Identity({
            omegaId: omegaId,
            walletAddress: msg.sender,
            deviceFingerprint: deviceFingerprint,
            createdAt: block.timestamp,
            exists: true
        });
        
        // Store reverse mapping
        omegaIdToAddress[omegaId] = msg.sender;
        omegaIdExists[omegaId] = true;
        
        emit IdentityRegistered(
            msg.sender,
            omegaId,
            deviceFingerprint,
            block.timestamp
        );
    }
    
    /**
     * @notice Get identity information for a wallet address
     * @param walletAddress The wallet address to query
     * @return omegaId The Omega ID
     * @return deviceFingerprint The device fingerprint
     * @return createdAt Timestamp when identity was created
     * @return exists Whether the identity exists
     */
    function getIdentity(address walletAddress)
        external
        view
        returns (
            string memory omegaId,
            string memory deviceFingerprint,
            uint256 createdAt,
            bool exists
        )
    {
        Identity memory identity = identities[walletAddress];
        return (
            identity.omegaId,
            identity.deviceFingerprint,
            identity.createdAt,
            identity.exists
        );
    }
    
    /**
     * @notice Get wallet address for an Omega ID
     * @param omegaId The Omega ID to lookup
     * @return walletAddress The wallet address associated with this Omega ID
     */
    function getAddressFromOmegaId(string memory omegaId)
        external
        view
        returns (address walletAddress)
    {
        return omegaIdToAddress[omegaId];
    }
    
    /**
     * @notice Check if an identity exists for a wallet address
     * @param walletAddress The wallet address to check
     * @return exists Whether the identity exists
     */
    function hasIdentity(address walletAddress)
        external
        view
        returns (bool exists)
    {
        return identities[walletAddress].exists;
    }
    
    /**
     * @notice Check if an Omega ID is available
     * @param omegaId The Omega ID to check
     * @return available Whether the Omega ID is available
     */
    function isOmegaIdAvailable(string memory omegaId)
        external
        view
        returns (bool available)
    {
        return !omegaIdExists[omegaId];
    }
}

