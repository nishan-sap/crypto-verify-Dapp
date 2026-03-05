const express = require("express");
const { ethers } = require("ethers");
require("dotenv").config();
const router = express.Router();

// ── Input Validators (no SQL, only safe regex) ────
const isEVMHash   = (h) => /^0x[a-fA-F0-9]{64}$/.test(h);
const isBTCHash   = (h) => /^[a-fA-F0-9]{64}$/.test(h);
const isBytes32   = (h) => /^0x[a-fA-F0-9]{64}$/.test(h);
const isEVMAddr   = (a) => /^0x[a-fA-F0-9]{40}$/.test(a);
const VALID_CHAINS = ["ethereum","sepolia","polygon","bsc","arbitrum","base","bitcoin"];

// ── RPC Endpoints (public, no API key needed) ─────
const RPC = {
  ethereum: "https://ethereum.publicnode.com",
  sepolia:  process.env.SEPOLIA_RPC_URL,
  polygon:  "https://polygon-bsc.publicnode.com",
  bsc:      "https://bsc.publicnode.com",
  arbitrum: "https://arbitrum-one.publicnode.com",
  base:     "https://base.publicnode.com",
};

const CHAIN_NAMES = {
  ethereum: "Ethereum Mainnet",
  sepolia:  "Ethereum Sepolia TestNet",
  polygon:  "Polygon Mainnet",
  bsc:      "BNB Smart Chain",
  arbitrum: "Arbitrum One",
  base:     "Base",
  bitcoin:  "Bitcoin",
};

const EXPLORERS = {
  ethereum: "https://etherscan.io/tx/",
  sepolia:  "https://sepolia.etherscan.io/tx/",
  polygon:  "https://polygonscan.com/tx/",
  bsc:      "https://bscscan.com/tx/",
  arbitrum: "https://arbiscan.io/tx/",
  base:     "https://basescan.org/tx/",
  bitcoin:  "https://blockstream.info/tx/",
};

const SYMBOLS = {
  ethereum:"ETH", sepolia:"SepoliaETH", polygon:"MATIC",
  bsc:"BNB", arbitrum:"ETH", base:"ETH", bitcoin:"BTC"
};

// ── Contract setup (DApp's own contract on Sepolia) ─
const ABI = [
  "function sendAndRecord(address payable _receiver, string memory _message) external payable returns (bytes32)",
  "function verifyTransaction(bytes32 _txId) external view returns (address sender, address receiver, uint256 amount, uint256 timestamp, string memory message, bool exists)",
  "function getWalletHistory(address _wallet) external view returns (bytes32[])",
  "function totalTransactions() external view returns (uint256)"
];
const sepoliaProvider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
const dappWallet  = new ethers.Wallet(process.env.PRIVATE_KEY, sepoliaProvider);
const dappContract = new ethers.Contract(process.env.CONTRACT_ADDRESS, ABI, dappWallet);

// ── EVM lookup helper ─────────────────────────────
async function lookupEVM(chain, txHash) {
  const provider = new ethers.JsonRpcProvider(RPC[chain]);
  const [tx, receipt] = await Promise.all([
    provider.getTransaction(txHash),
    provider.getTransactionReceipt(txHash).catch(() => null)
  ]);
  if (!tx) return null;

  const block = tx.blockNumber
    ? await provider.getBlock(tx.blockNumber).catch(() => null)
    : null;
  const currentBlock = await provider.getBlockNumber().catch(() => tx.blockNumber || 0);

  return {
    found: true,
    chain,
    network: CHAIN_NAMES[chain],
    symbol: SYMBOLS[chain],
    txHash,
    from: tx.from,
    to: tx.to || "Contract Creation",
    value: ethers.formatEther(tx.value) + " " + SYMBOLS[chain],
    valueRaw: tx.value.toString(),
    nonce: tx.nonce,
    blockNumber: tx.blockNumber || "Pending",
    confirmations: tx.blockNumber ? Math.max(0, currentBlock - tx.blockNumber) : 0,
    timestamp: block ? new Date(block.timestamp * 1000).toISOString() : "Pending",
    status: receipt ? (receipt.status === 1 ? "Success" : "Failed") : "Pending",
    gasLimit: tx.gasLimit.toString(),
    gasUsed: receipt ? receipt.gasUsed.toString() : "Pending",
    gasPrice: tx.gasPrice ? ethers.formatUnits(tx.gasPrice, "gwei") + " Gwei" : "N/A",
    type: tx.data && tx.data !== "0x" ? "Contract Interaction" : "ETH Transfer",
    explorerUrl: EXPLORERS[chain] + txHash
  };
}

// ── Bitcoin lookup helper ─────────────────────────
async function lookupBTC(txHash) {
  const fetch = (await import("node-fetch")).default;
  const res = await fetch(`https://blockstream.info/testnet/api/tx/${txHash}`, {
    headers: { "User-Agent": "ChainVerify/2.0" },
    timeout: 8000
  });
  if (!res.ok) {
    // try mainnet
    const res2 = await fetch(`https://blockstream.info/api/tx/${txHash}`, {
      headers: { "User-Agent": "ChainVerify/2.0" }, timeout: 8000
    });
    if (!res2.ok) return null;
    const data = await res2.json();
    return formatBTC(data, txHash, "mainnet");
  }
  const data = await res.json();
  return formatBTC(data, txHash, "testnet");
}

function formatBTC(data, txHash, net) {
  const inputValue = data.vin.reduce((s, v) => s + (v.prevout?.value || 0), 0);
  const outputValue = data.vout.reduce((s, v) => s + (v.value || 0), 0);
  const fee = inputValue - outputValue;
  return {
    found: true,
    chain: "bitcoin",
    network: "Bitcoin " + (net === "mainnet" ? "Mainnet" : "Testnet"),
    symbol: "BTC",
    txHash,
    from: data.vin[0]?.prevout?.scriptpubkey_address || "Coinbase",
    to: data.vout[0]?.scriptpubkey_address || "Multiple",
    value: (outputValue / 1e8).toFixed(8) + " BTC",
    valueRaw: outputValue.toString(),
    blockNumber: data.status?.block_height || "Pending",
    confirmations: data.status?.confirmed ? (data.status.block_height ? "Confirmed" : "1+") : 0,
    timestamp: data.status?.block_time
      ? new Date(data.status.block_time * 1000).toISOString()
      : "Pending",
    status: data.status?.confirmed ? "Success" : "Pending",
    fee: (fee / 1e8).toFixed(8) + " BTC",
    inputs: data.vin.length,
    outputs: data.vout.length,
    size: data.size + " bytes",
    type: "Bitcoin Transfer",
    explorerUrl: EXPLORERS.bitcoin + txHash
  };
}

// ─────────────────────────────────────────────────
// GET /api/transactions/lookup/:chain/:txHash
// ─────────────────────────────────────────────────
router.get("/lookup/:chain/:txHash", async (req, res) => {
  const { chain, txHash } = req.params;

  // Validate chain
  if (!VALID_CHAINS.includes(chain)) {
    return res.status(400).json({
      error: `Invalid chain. Supported: ${VALID_CHAINS.join(", ")}`
    });
  }

  // Validate hash format
  if (chain === "bitcoin") {
    if (!isBTCHash(txHash) && !isEVMHash(txHash)) {
      return res.status(400).json({ error: "Invalid Bitcoin transaction hash format." });
    }
  } else {
    if (!isEVMHash(txHash)) {
      return res.status(400).json({ error: "Invalid EVM transaction hash. Must be 0x + 64 hex characters." });
    }
  }

  try {
    let result;
    if (chain === "bitcoin") {
      result = await lookupBTC(txHash.replace("0x",""));
    } else {
      result = await lookupEVM(chain, txHash);
    }

    if (!result) {
      return res.status(404).json({
        found: false,
        message: `Transaction not found on ${CHAIN_NAMES[chain]}.`
      });
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Blockchain query failed: " + err.message });
  }
});

// ─────────────────────────────────────────────────
// GET /api/transactions/verify/:txId  (DApp only)
// ─────────────────────────────────────────────────
router.get("/verify/:txId", async (req, res) => {
  const { txId } = req.params;
  if (!isBytes32(txId)) return res.status(400).json({ error: "Invalid transaction ID format." });
  try {
    const result = await dappContract.verifyTransaction(txId);
    const [sender, receiver, amount, timestamp, message, exists] = result;
    if (!exists) return res.status(404).json({ valid: false, message: "Not found in DApp records." });
    res.json({
      valid: true, txId, sender, receiver,
      amount: ethers.formatEther(amount) + " ETH",
      timestamp: new Date(Number(timestamp) * 1000).toISOString(),
      message
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────
// GET /api/transactions/history/:wallet
// ─────────────────────────────────────────────────
router.get("/history/:wallet", async (req, res) => {
  const { wallet } = req.params;
  if (!isEVMAddr(wallet)) return res.status(400).json({ error: "Invalid wallet address." });
  try {
    const history = await dappContract.getWalletHistory(wallet);
    res.json({ wallet, transactions: history, count: history.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────
// GET /api/transactions/total
// ─────────────────────────────────────────────────
router.get("/total", async (req, res) => {
  try {
    const total = await dappContract.totalTransactions();
    res.json({ total: Number(total) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
