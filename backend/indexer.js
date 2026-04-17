/**
 * backend/indexer.js
 * ─────────────────────────────────────────────────────────────────
 * NSTCrypto — On-Chain Event Indexer
 * CN6035 — Nishan Sapkota
 *
 * Listens for TransactionRecorded events from the deployed
 * TransactionVerifier contract on Sepolia and persists them
 * to data/transactions.json for fast offline lookup.
 *
 * Run:  node backend/indexer.js
 * ─────────────────────────────────────────────────────────────────
 */

const { ethers } = require("ethers");
const fs         = require("fs");
const path       = require("path");
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
// ── Config ────────────────────────────────────────────────────────
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS
  || "0x04BDEeDE281D1c0b63449CAc4EDc30d9b2B369aE";

const RPC_URL = process.env.SEPOLIA_RPC_URL
  || "https://rpc.sepolia.org";

const DATA_DIR  = path.join(__dirname, "..", "data");
const DATA_FILE = path.join(DATA_DIR, "transactions.json");

const ABI = [
  "event TransactionRecorded(bytes32 indexed txId, address indexed sender, address indexed receiver, uint256 amount, string message)",
  "function totalTransactions() external view returns (uint256)",
];

// ── Helpers ───────────────────────────────────────────────────────
function loadIndex() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) return { transactions: {}, lastBlock: 0, updatedAt: null };
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    return { transactions: {}, lastBlock: 0, updatedAt: null };
  }
}

function saveIndex(index) {
  index.updatedAt = new Date().toISOString();
  fs.writeFileSync(DATA_FILE, JSON.stringify(index, null, 2));
}

function fmt(val, decimals = 18) {
  return ethers.formatUnits(val, decimals);
}

// ── Main indexer ──────────────────────────────────────────────────
async function syncPastEvents(provider, contract, index) {
  const latest    = await provider.getBlockNumber();
  const fromBlock = index.lastBlock + 1;

  if (fromBlock > latest) {
    console.log(`[indexer] Already up to date at block ${latest}`);
    return index;
  }

  console.log(`[indexer] Syncing blocks ${fromBlock} → ${latest} ...`);

  // Fetch in chunks of 2000 blocks to avoid RPC limits
  const CHUNK = 2000;
  let cursor   = fromBlock;
  let newCount = 0;

  while (cursor <= latest) {
    const to = Math.min(cursor + CHUNK - 1, latest);
    try {
      const filter = contract.filters.TransactionRecorded();
      const events = await contract.queryFilter(filter, cursor, to);

      for (const e of events) {
        const txId = e.args.txId;
        if (!index.transactions[txId]) {
          const block = await e.getBlock();
          index.transactions[txId] = {
            txId,
            ethHash:    e.transactionHash,
            blockNumber: e.blockNumber,
            timestamp:   block ? new Date(block.timestamp * 1000).toISOString() : null,
            sender:     e.args.sender,
            receiver:   e.args.receiver,
            amount:     fmt(e.args.amount),
            amountWei:  e.args.amount.toString(),
            message:    e.args.message,
            network:    "Sepolia TestNet",
            explorerUrl: `https://sepolia.etherscan.io/tx/${e.transactionHash}`,
          };
          newCount++;
        }
      }
    } catch (err) {
      console.warn(`[indexer] Error fetching ${cursor}–${to}: ${err.message}`);
    }
    cursor = to + 1;
  }

  index.lastBlock = latest;
  console.log(`[indexer] Synced ${newCount} new events. Total: ${Object.keys(index.transactions).length}`);
  return index;
}

async function startLiveListener(provider, contract, index) {
  console.log("[indexer] Live listener started — waiting for new events...");

  contract.on("TransactionRecorded", async (txId, sender, receiver, amount, message, event) => {
    try {
      const block = await event.getBlock();
      const record = {
        txId,
        ethHash:    event.transactionHash,
        blockNumber: event.blockNumber,
        timestamp:   block ? new Date(block.timestamp * 1000).toISOString() : null,
        sender,
        receiver,
        amount:     fmt(amount),
        amountWei:  amount.toString(),
        message,
        network:    "Sepolia TestNet",
        explorerUrl: `https://sepolia.etherscan.io/tx/${event.transactionHash}`,
      };

      index.transactions[txId] = record;
      index.lastBlock = event.blockNumber;
      saveIndex(index);

      console.log(`[indexer] ✅ New TX indexed:`);
      console.log(`          txId:   ${txId}`);
      console.log(`          from:   ${sender}`);
      console.log(`          to:     ${receiver}`);
      console.log(`          amount: ${record.amount} ETH`);
      console.log(`          msg:    ${message}`);
    } catch (err) {
      console.error("[indexer] Error processing event:", err.message);
    }
  });
}

async function main() {
  console.log("═══════════════════════════════════════════════════");
  console.log("  NSTCrypto — On-Chain Event Indexer");
  console.log("  Contract:", CONTRACT_ADDRESS);
  console.log("  Network:  Sepolia TestNet");
  console.log("═══════════════════════════════════════════════════");

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const contract  = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);

  // Confirm connection
  const network = await provider.getNetwork();
  const total   = await contract.totalTransactions();
  console.log(`\n[indexer] Connected to chainId ${network.chainId}`);
  console.log(`[indexer] Contract has ${total} total transactions\n`);

  // Load existing index
  let index = loadIndex();
  console.log(`[indexer] Loaded ${Object.keys(index.transactions).length} existing records from disk`);
  console.log(`[indexer] Last synced block: ${index.lastBlock}`);

  // Sync all past events
  index = await syncPastEvents(provider, contract, index);
  saveIndex(index);

  // Print current index
  const records = Object.values(index.transactions);
  if (records.length > 0) {
    console.log("\n[indexer] Current indexed transactions:");
    console.log("─".repeat(65));
    for (const r of records) {
      console.log(`  ${r.txId.slice(0, 20)}... | ${r.amount} ETH | block ${r.blockNumber}`);
    }
    console.log("─".repeat(65));
  }

  console.log(`\n[indexer] Index saved to: ${DATA_FILE}`);

  // Start live listener for new events
  await startLiveListener(provider, contract, index);

  console.log("\n[indexer] Running... Press Ctrl+C to stop.\n");

  // Keep alive
  process.on("SIGINT", () => {
    console.log("\n[indexer] Shutting down...");
    saveIndex(index);
    process.exit(0);
  });
}

main().catch((err) => {
  console.error("[indexer] Fatal error:", err);
  process.exit(1);
});
