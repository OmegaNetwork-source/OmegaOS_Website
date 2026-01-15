// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ClaimDistributor is Ownable {
    IERC20 public immutable tOmega;
    uint256 public constant CLAIM_AMOUNT = 1000 * 10**18; // 1000 tokens
    
    mapping(address => bool) public hasClaimed;
    
    // Address provided by user: 0x82C88F75d3DA75dF268cda532CeC8B101da8Fa51
    constructor() Ownable(msg.sender) {
        tOmega = IERC20(0x82C88F75d3DA75dF268cda532CeC8B101da8Fa51);
    }

    function claim() external {
        require(!hasClaimed[msg.sender], "Already claimed");
        require(tOmega.balanceOf(address(this)) >= CLAIM_AMOUNT, "Faucet empty");

        hasClaimed[msg.sender] = true;
        tOmega.transfer(msg.sender, CLAIM_AMOUNT);
    }

    // Function to withdraw leftover tokens if needed
    function withdrawTokens(uint256 amount) external onlyOwner {
        tOmega.transfer(msg.sender, amount);
    }
}
