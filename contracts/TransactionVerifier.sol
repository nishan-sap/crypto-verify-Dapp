// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title TransactionVerifier
 * @dev Records and verifies crypto transactions on the blockchain
 * @author Nishan Sapkota - CN6035
 */
contract TransactionVerifier {

    // Structure to store each transaction
    struct Transaction {
        address sender;
        address receiver;
        uint256 amount;
        uint256 timestamp;
        string message;
        bool exists;
    }

    // Owner of the contract
    address public owner;

    // Map transaction ID to Transaction data
    mapping(bytes32 => Transaction) private transactions;

    // Store all transaction IDs per wallet address
    mapping(address => bytes32[]) private walletHistory;

    // Total transactions recorded
    uint256 public totalTransactions;

    // Events
    event TransactionRecorded(
        bytes32 indexed txId,
        address indexed sender,
        address indexed receiver,
        uint256 amount,
        uint256 timestamp
    );

    // Constructor
    constructor() {
        owner = msg.sender;
    }

    /**
     * @dev Send ETH and record it on the blockchain
     * @param _receiver The wallet address receiving the ETH
     * @param _message Optional note with the transaction
     */
    function sendAndRecord(
        address payable _receiver,
        string memory _message
    ) external payable returns (bytes32 txId) {

        // Must send more than 0
        require(msg.value > 0, "Must send some ETH");
        require(_receiver != address(0), "Invalid receiver address");
        require(_receiver != msg.sender, "Cannot send to yourself");

        // Generate unique transaction ID
        txId = keccak256(abi.encodePacked(
            msg.sender,
            _receiver,
            msg.value,
            block.timestamp,
            totalTransactions
        ));

        // Record on blockchain
        transactions[txId] = Transaction({
            sender:    msg.sender,
            receiver:  _receiver,
            amount:    msg.value,
            timestamp: block.timestamp,
            message:   _message,
            exists:    true
        });

        // Add to both wallets history
        walletHistory[msg.sender].push(txId);
        walletHistory[_receiver].push(txId);

        totalTransactions++;

        // Actually send the ETH to receiver
        _receiver.transfer(msg.value);

        // Emit event
        emit TransactionRecorded(txId, msg.sender, _receiver, msg.value, block.timestamp);

        return txId;
    }

    /**
     * @dev Verify a transaction - FREE to call, no gas needed
     * @param _txId The transaction ID to verify
     */
    function verifyTransaction(bytes32 _txId)
        external
        view
        returns (
            address sender,
            address receiver,
            uint256 amount,
            uint256 timestamp,
            string memory message,
            bool exists
        )
    {
        Transaction memory tx = transactions[_txId];
        return (
            tx.sender,
            tx.receiver,
            tx.amount,
            tx.timestamp,
            tx.message,
            tx.exists
        );
    }

    /**
     * @dev Get all transaction IDs for a wallet address
     */
    function getWalletHistory(address _wallet)
        external
        view
        returns (bytes32[] memory)
    {
        return walletHistory[_wallet];
    }
}