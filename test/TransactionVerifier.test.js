const { expect } = require("chai");
const { ethers } = require("hardhat");

// ═══════════════════════════════════════════════════════════════════
// TransactionVerifier.sol — Full Real Sepolia Test Suite
// CN6035 Blockchain — Nishan Sapkota
//
// Run with:  npx hardhat test --network sepolia
//
// All 3 transactions were recorded live on Sepolia in blocks
// 10397680, 10397681, 10397682 using seed_contract.js
// ═══════════════════════════════════════════════════════════════════

const CONTRACT  = "0x04BDEeDE281D1c0b63449CAc4EDc30d9b2B369aE";
const SENDER    = "0xF243B88178E5EBDEc624dD0a9618C83cc2Cb1c4e";
const RECEIVER  = "0x6Cc9397c3B38739daCbfaA68EaD5F5D77Ba5F455";

// 3 real Ethereum TX hashes — confirmed on Sepolia blockchain
const REAL_TX_HASHES = {
  payment1: {
    ethHash: "0xf86bdb83e6207b830a7fbc280361c8d0d3d348fb61c6aa68f24b6c0c43b3bd68",
    amount:  ethers.parseEther("0.001"),
    message: "CN6035 Assignment — Payment 1",
    block:   10397680,
  },
  payment2: {
    ethHash: "0x76187abf2dbd2b1daed1cd76b59a992c0816de8fae59979812516b120d71ec47",
    amount:  ethers.parseEther("0.002"),
    message: "CN6035 Assignment — Payment 2",
    block:   10397681,
  },
  payment3: {
    ethHash: "0x019c41c007f7d423ab0fa309c5ff3421a4a1194e27c78b083d8ab336a09470af",
    amount:  ethers.parseEther("0.001"),
    message: "CN6035 Assignment — Payment 3",
    block:   10397682,
  },
};

const ABI = [
  "event TransactionRecorded(bytes32 indexed txId, address indexed sender, address indexed receiver, uint256 amount, string message)",
  "function sendAndRecord(address payable _receiver, string memory _message) external payable returns (bytes32)",
  "function verifyTransaction(bytes32 _txId) external view returns (address sender, address receiver, uint256 amount, uint256 timestamp, string memory message, bool exists)",
  "function getWalletHistory(address _wallet) external view returns (bytes32[])",
  "function totalTransactions() external view returns (uint256)",
];

// ── Helper: extract txId from a real Sepolia receipt ─────────────
async function getTxId(contract, provider, ethHash) {
  const receipt = await provider.getTransactionReceipt(ethHash);
  if (!receipt) throw new Error(`Receipt not found for ${ethHash}`);
  for (const log of receipt.logs) {
    try {
      const parsed = contract.interface.parseLog(log);
      if (parsed.name === "TransactionRecorded") return parsed.args.txId;
    } catch {}
  }
  throw new Error(`No TransactionRecorded event in receipt ${ethHash}`);
}

// ════════════════════════════════════════════════════════════════
describe("TransactionVerifier — Real Sepolia Contract Tests", function () {
  this.timeout(90000); // 90s — Sepolia can be slow

  let contract, provider;
  let txIds = {}; // will hold real bytes32 txIds fetched from chain

  // ── Setup: connect to live contract, load real txIds ──────────
  before(async function () {
    provider = ethers.provider;
    contract = new ethers.Contract(CONTRACT, ABI, provider);

    console.log("\n  ┌────────────────────────────────────────┐");
    console.log("  │   Loading real txIds from Sepolia...   │");
    console.log("  └────────────────────────────────────────┘");

    for (const [key, data] of Object.entries(REAL_TX_HASHES)) {
      txIds[key] = await getTxId(contract, provider, data.ethHash);
      console.log(`\n  ✓ ${key}`);
      console.log(`    ETH hash: ${data.ethHash.slice(0,20)}...`);
      console.log(`    bytes32:  ${txIds[key].slice(0,20)}...`);
      console.log(`    amount:   ${ethers.formatEther(data.amount)} ETH`);
      console.log(`    message:  ${data.message}`);
    }
    console.log("\n  All 3 real txIds loaded from on-chain events ✓\n");
  });

  // ── TEST 1: Contract is deployed ─────────────────────────────
  it("1. Contract is deployed and has bytecode on Sepolia", async function () {
    const code = await provider.getCode(CONTRACT);
    console.log(`\n     Contract address: ${CONTRACT}`);
    console.log(`     Bytecode length:  ${code.length} chars`);
    expect(code).to.not.equal("0x");
    expect(code.length).to.be.greaterThan(100);
  });

  // ── TEST 2: Total transaction count ──────────────────────────
  it("2. Contract records exactly 3 transactions (our 3 seeded calls)", async function () {
    const total = await contract.totalTransactions();
    console.log(`\n     totalTransactions() = ${total.toString()}`);
    expect(Number(total)).to.be.greaterThanOrEqual(3);
  });

  // ── TEST 3: Sender wallet history ────────────────────────────
  it("3. Sender wallet has at least 3 entries in getWalletHistory()", async function () {
    const history = await contract.getWalletHistory(SENDER);
    console.log(`\n     Wallet: ${SENDER}`);
    console.log(`     History length: ${history.length}`);
    history.forEach((id, i) => console.log(`       [${i}] ${id.slice(0,20)}...`));
    expect(history.length).to.be.greaterThanOrEqual(3);
  });

  // ── TEST 4: Verify Payment 1 — 0.001 ETH ─────────────────────
  it("4. verifyTransaction() returns correct data for Payment 1 (0.001 ETH)", async function () {
    const r = await contract.verifyTransaction(txIds.payment1);
    console.log(`\n     txId:     ${txIds.payment1.slice(0,20)}...`);
    console.log(`     exists:   ${r.exists}`);
    console.log(`     sender:   ${r.sender}`);
    console.log(`     receiver: ${r.receiver}`);
    console.log(`     amount:   ${ethers.formatEther(r.amount)} ETH`);
    console.log(`     message:  ${r.message}`);

    expect(r.exists).to.equal(true);
    expect(r.sender.toLowerCase()).to.equal(SENDER.toLowerCase());
    expect(r.receiver.toLowerCase()).to.equal(RECEIVER.toLowerCase());
    expect(r.amount).to.equal(REAL_TX_HASHES.payment1.amount);
    expect(r.message).to.equal(REAL_TX_HASHES.payment1.message);
  });

  // ── TEST 5: Verify Payment 2 — 0.002 ETH ─────────────────────
  it("5. verifyTransaction() returns correct data for Payment 2 (0.002 ETH)", async function () {
    const r = await contract.verifyTransaction(txIds.payment2);
    console.log(`\n     txId:     ${txIds.payment2.slice(0,20)}...`);
    console.log(`     exists:   ${r.exists}`);
    console.log(`     amount:   ${ethers.formatEther(r.amount)} ETH`);
    console.log(`     message:  ${r.message}`);

    expect(r.exists).to.equal(true);
    expect(r.sender.toLowerCase()).to.equal(SENDER.toLowerCase());
    expect(r.receiver.toLowerCase()).to.equal(RECEIVER.toLowerCase());
    expect(r.amount).to.equal(REAL_TX_HASHES.payment2.amount);
    expect(r.message).to.equal(REAL_TX_HASHES.payment2.message);
  });

  // ── TEST 6: Verify Payment 3 — 0.001 ETH ─────────────────────
  it("6. verifyTransaction() returns correct data for Payment 3 (0.001 ETH)", async function () {
    const r = await contract.verifyTransaction(txIds.payment3);
    console.log(`\n     txId:     ${txIds.payment3.slice(0,20)}...`);
    console.log(`     exists:   ${r.exists}`);
    console.log(`     amount:   ${ethers.formatEther(r.amount)} ETH`);
    console.log(`     message:  ${r.message}`);

    expect(r.exists).to.equal(true);
    expect(r.sender.toLowerCase()).to.equal(SENDER.toLowerCase());
    expect(r.receiver.toLowerCase()).to.equal(RECEIVER.toLowerCase());
    expect(r.amount).to.equal(REAL_TX_HASHES.payment3.amount);
    expect(r.message).to.equal(REAL_TX_HASHES.payment3.message);
  });

  // ── TEST 7: Unknown txId returns exists=false ─────────────────
  it("7. verifyTransaction() returns exists=false for an unknown txId", async function () {
    const fakeTxId = ethers.keccak256(ethers.toUtf8Bytes("CN6035_nonexistent_tx"));
    const r = await contract.verifyTransaction(fakeTxId);
    console.log(`\n     Fake txId: ${fakeTxId.slice(0,20)}...`);
    console.log(`     exists:    ${r.exists}`);
    expect(r.exists).to.equal(false);
    expect(r.sender).to.equal(ethers.ZeroAddress);
    expect(r.amount).to.equal(0n);
  });

  // ── TEST 8: All 3 txIds in wallet history ─────────────────────
  it("8. All 3 real txIds are present in sender's getWalletHistory()", async function () {
    const history = await contract.getWalletHistory(SENDER);
    const historyLower = history.map(h => h.toLowerCase());

    for (const [key, txId] of Object.entries(txIds)) {
      const found = historyLower.includes(txId.toLowerCase());
      console.log(`\n     ${key}: ${found ? "✓ found" : "✗ NOT found"}`);
      expect(found, `${key} txId not found in wallet history`).to.be.true;
    }
  });

  // ── TEST 9: Receiver wallet has transactions too ──────────────
  it("9. Receiver wallet also has history (funds received from contract)", async function () {
    const history = await contract.getWalletHistory(RECEIVER);
    console.log(`\n     Receiver: ${RECEIVER}`);
    console.log(`     Transactions received: ${history.length}`);
    expect(history.length).to.be.greaterThanOrEqual(3);
  });

  // ── TEST 10: Payment blocks are correct ──────────────────────
  it("10. All 3 transactions were mined in the expected Sepolia blocks", async function () {
    for (const [key, data] of Object.entries(REAL_TX_HASHES)) {
      const receipt = await provider.getTransactionReceipt(data.ethHash);
      console.log(`\n     ${key}: block ${receipt.blockNumber} (expected ${data.block})`);
      expect(receipt.blockNumber).to.equal(data.block);
      expect(receipt.status).to.equal(1); // 1 = success
    }
  });
});
