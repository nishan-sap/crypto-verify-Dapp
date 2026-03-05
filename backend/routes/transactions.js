const express = require("express");
const { ethers } = require("ethers");
require("dotenv").config();
const router = express.Router();

// Contract ABI - just the functions we need
const ABI = [
  "function sendAndRecord(address payable _receiver, string memory _message) external payable returns (bytes32)",
  "function verifyTransaction(bytes32 _txId) external view returns (address sender, address receiver, uint256 amount, uint256 timestamp, string memory message, bool exists)",
  "function getWalletHistory(address _wallet) external view returns (bytes32[])",
  "function totalTransactions() external view returns (uint256)"
];

// Connect to blockchain
const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, ABI, wallet);

// GET /api/transactions/verify/:txId
router.get("/verify/:txId", async (req, res) => {
  try {
    const { txId } = req.params;
    const result = await contract.verifyTransaction(txId);
    const [sender, receiver, amount, timestamp, message, exists] = result;

    if (!exists) {
      return res.status(404).json({ 
        valid: false, 
        message: "Transaction not found on blockchain" 
      });
    }

    res.json({
      valid: true,
      txId,
      sender,
      receiver,
      amount: ethers.formatEther(amount) + " ETH",
      timestamp: new Date(Number(timestamp) * 1000).toISOString(),
      message
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/transactions/history/:wallet
router.get("/history/:wallet", async (req, res) => {
  try {
    const { wallet: walletAddress } = req.params;
    const history = await contract.getWalletHistory(walletAddress);
    res.json({ wallet: walletAddress, transactions: history });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/transactions/total
router.get("/total", async (req, res) => {
  try {
    const total = await contract.totalTransactions();
    res.json({ total: Number(total) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;