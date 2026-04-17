// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// ── Interface for the target contract ────────────────────────────
interface ITransactionVerifier {
    function sendAndRecord(address payable _receiver, string calldata _message)
        external payable returns (bytes32);
}

/**
 * @title ReentrancyAttacker
 * @dev Test helper — attempts to re-enter sendAndRecord() on receive().
 *      Used in unit test U14 to prove ReentrancyGuard works.
 */
contract ReentrancyAttacker {
    ITransactionVerifier public target;
    uint256 public attackCount;

    constructor(address _target) {
        target = ITransactionVerifier(_target);
    }

    // Re-entrancy attempt — called when this contract receives ETH
    receive() external payable {
        attackCount++;
        if (attackCount < 3) {
            // Try to re-enter — should revert due to nonReentrant
            target.sendAndRecord{value: msg.value}(payable(msg.sender), "reenter");
        }
    }

    function attack() external payable {
        // First call — triggers sendAndRecord with this contract as receiver
        target.sendAndRecord{value: msg.value}(payable(address(this)), "attack");
    }
}
