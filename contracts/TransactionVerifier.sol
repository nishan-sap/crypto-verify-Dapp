// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TransactionVerifier
 * @dev Records and verifies crypto transactions on the blockchain.
 *      Uses ReentrancyGuard to prevent re-entrancy attacks.
 *      Uses call() instead of transfer() to avoid gas stipend issues.
 * @author Nishan Sapkota — CN6035
 */
contract TransactionVerifier is ReentrancyGuard, Ownable {

    // ── Data structures ───────────────────────────────────────────
    struct Transaction {
        address sender;
        address receiver;
        uint256 amount;
        uint256 timestamp;
        string  message;
        bool    exists;
    }

    // ── Storage ───────────────────────────────────────────────────
    mapping(bytes32 txId => Transaction tx) private transactions;
    mapping(address wallet => bytes32[] ids) private walletHistory;
    uint256 public totalTransactions;

    // ── Events ────────────────────────────────────────────────────
    event TransactionRecorded(
        bytes32 indexed txId,
        address indexed sender,
        address indexed receiver,
        uint256 amount,
        string  message
    );

    // ── Custom errors (gas-efficient vs require strings) ──────────
    error ZeroValue();
    error InvalidReceiver();
    error SelfTransfer();
    error TransferFailed();

    // ── Constructor ───────────────────────────────────────────────
    constructor() Ownable(msg.sender) {}

    // ── Functions ─────────────────────────────────────────────────

    /**
     * @dev Send ETH and record it on-chain.
     *      nonReentrant guard prevents re-entrancy attacks.
     *      Uses call() instead of transfer() to avoid 2300-gas-stipend issues.
     * @param _receiver  Wallet address receiving the ETH
     * @param _message   Optional note stored with the transaction
     * @return txId      Unique bytes32 identifier for this transaction
     */
    function sendAndRecord(
        address payable _receiver,
        string calldata _message
    ) external payable nonReentrant returns (bytes32 txId) {

        if (msg.value == 0)                        revert ZeroValue();
        if (_receiver == address(0))               revert InvalidReceiver();
        if (_receiver == msg.sender)               revert SelfTransfer();

        // Generate deterministic unique ID
        txId = keccak256(abi.encodePacked(
            msg.sender,
            _receiver,
            msg.value,
            block.timestamp,
            totalTransactions
        ));

        // Write state BEFORE transferring ETH (checks-effects-interactions)
        transactions[txId] = Transaction({
            sender:    msg.sender,
            receiver:  _receiver,
            amount:    msg.value,
            timestamp: block.timestamp,
            message:   _message,
            exists:    true
        });

        walletHistory[msg.sender].push(txId);
        walletHistory[_receiver].push(txId);
        totalTransactions++;

        // Transfer ETH using call() — safer than transfer()
        (bool success, ) = _receiver.call{value: msg.value}("");
        if (!success) revert TransferFailed();

        emit TransactionRecorded(txId, msg.sender, _receiver, msg.value, _message);
    }

    /**
     * @dev Emergency withdrawal — owner only, for stuck ETH if any.
     */
    function emergencyWithdraw() external onlyOwner {
        (bool ok, ) = owner().call{value: address(this).balance}("");
        if (!ok) revert TransferFailed();
    }

    /**
     * @dev Verify a transaction by its ID — view function, zero gas cost for callers.
     * @param _txId  The bytes32 transaction ID
     */
    function verifyTransaction(bytes32 _txId)
        external view
        returns (
            address sender,
            address receiver,
            uint256 amount,
            uint256 timestamp,
            string memory message,
            bool    exists
        )
    {
        Transaction memory t = transactions[_txId];
        return (t.sender, t.receiver, t.amount, t.timestamp, t.message, t.exists);
    }

    /**
     * @dev Get all transaction IDs for a wallet — view function, zero gas.
     * @param _wallet  Wallet address to query
     */
    function getWalletHistory(address _wallet)
        external view
        returns (bytes32[] memory)
    {
        return walletHistory[_wallet];
    }
}
