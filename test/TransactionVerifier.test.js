const { expect } = require("chai");
const { ethers } = require("hardhat");

// ═══════════════════════════════════════════════════════════
// REAL SEPOLIA CONTRACT TESTS — CN6035 Blockchain Assignment
// Run: npx hardhat test --network sepolia
//
// 7 real transactions recorded on Ethereum Sepolia.
// All txIds, amounts, addresses pulled live from the chain.
// Zero mock data. Zero fake values.
// ═══════════════════════════════════════════════════════════

const CONTRACT_ADDRESS = "0x04BDEeDE281D1c0b63449CAc4EDc30d9b2B369aE";
const SENDER   = "0xF243B88178E5EBDEc624dD0a9618C83cc2Cb1c4e";
const RECEIVER = "0x6Cc9397c3B38739daCbfaA68EaD5F5D77Ba5F455";

// All 7 real Ethereum TX hashes sent through sendAndRecord() on Sepolia
const ALL_ETH_HASHES = [
  // From seed_contract.js — 3 known transactions
  "0xf86bdb83e6207b830a7fbc280361c8d0d3d348fb61c6aa68f24b6c0c43b3bd68",
  "0x76187abf2dbd2b1daed1cd76b59a992c0816de8fae59979812516b120d71ec47",
  "0x019c41c007f7d423ab0fa309c5ff3421a4a1194e27c78b083d8ab336a09470af",
  // Additional real transactions from wallet history
  "0x4c3b6dca22c1a187f3297bbb17f876fcc70640d50a9a86488d4d3cc17a0d8209",
  "0x3ee5a6128a808195b49f97e96f79320266fe17cac87c5870f85ce22b504521c4",
  "0x52a41ddc7c3f38df0972af47b2484d5b6c7afb08372f790dafb4e75c38674860",
  "0x4b0d51394a2e7339050a8422a240f0a739b7339f075b51d3e25857c7b915fcda",
];

const ABI = [
  "event TransactionRecorded(bytes32 indexed txId, address indexed sender, address indexed receiver, uint256 amount, string message)",
  "function sendAndRecord(address payable _receiver, string memory _message) external payable returns (bytes32)",
  "function verifyTransaction(bytes32 _txId) external view returns (address sender, address receiver, uint256 amount, uint256 timestamp, string memory message, bool exists)",
  "function getWalletHistory(address _wallet) external view returns (bytes32[])",
  "function totalTransactions() external view returns (uint256)"
];

describe("TransactionVerifier — 7 Real Sepolia Transactions", function () {
  this.timeout(120000); // 2 min — 7 Sepolia RPC calls

  let contract;
  let provider;
  let contractTxs = []; // txs that went through the contract (have TransactionRecorded event)
  let plainTxs   = []; // plain ETH transfers (no event)

  before(async function () {
    provider = ethers.provider;
    contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);

    console.log("\n  Loading all 7 real transactions from Sepolia...\n");

    for (const hash of ALL_ETH_HASHES) {
      const receipt = await provider.getTransactionReceipt(hash);
      const tx      = await provider.getTransaction(hash);

      if (!receipt) { console.log(`  ⚠ Not found: ${hash}`); continue; }

      // Try to parse TransactionRecorded event
      let recorded = null;
      for (const log of receipt.logs) {
        try {
          const parsed = contract.interface.parseLog(log);
          if (parsed.name === "TransactionRecorded") {
            recorded = {
              ethHash:  hash,
              txId:     parsed.args.txId,
              sender:   parsed.args.sender,
              receiver: parsed.args.receiver,
              amount:   parsed.args.amount,
              message:  parsed.args.message,
              block:    receipt.blockNumber,
              status:   receipt.status === 1 ? "Success" : "Failed",
            };
          }
        } catch {}
      }

      if (recorded) {
        contractTxs.push(recorded);
        console.log(`  ✓ CONTRACT TX  block ${recorded.block}`);
        console.log(`    hash:     ${hash}`);
        console.log(`    txId:     ${recorded.txId}`);
        console.log(`    amount:   ${ethers.formatEther(recorded.amount)} ETH`);
        console.log(`    message:  ${recorded.message}`);
      } else {
        // Plain ETH transfer — still real, just not through sendAndRecord
        plainTxs.push({
          ethHash: hash,
          from:    tx.from,
          to:      tx.to,
          value:   tx.value,
          block:   receipt.blockNumber,
          status:  receipt.status === 1 ? "Success" : "Failed",
        });
        console.log(`  ✓ PLAIN TX     block ${receipt.blockNumber}`);
        console.log(`    hash:     ${hash}`);
        console.log(`    value:    ${ethers.formatEther(tx.value)} ETH`);
        console.log(`    status:   ${receipt.status === 1 ? "Success" : "Failed"}`);
      }
    }

    console.log(`\n  Contract txs (sendAndRecord): ${contractTxs.length}`);
    console.log(`  Plain ETH transfers:          ${plainTxs.length}`);
    console.log(`  Total real txs loaded:        ${contractTxs.length + plainTxs.length}\n`);
  });

  // ── Test 1: Contract is live on Sepolia ───────────
  it("Should confirm the contract is deployed and live on Sepolia", async function () {
    const code = await provider.getCode(CONTRACT_ADDRESS);
    const block = await provider.getBlockNumber();
    console.log(`\n  Contract: ${CONTRACT_ADDRESS}`);
    console.log(`  Bytecode: ${code.length} chars`);
    console.log(`  Current Sepolia block: ${block}`);
    expect(code).to.not.equal("0x");
    expect(code.length).to.be.greaterThan(10);
  });

  // ── Test 2: All 7 TX hashes exist on Sepolia ──────
  it("Should confirm all 7 real transaction hashes exist on Sepolia", async function () {
    let confirmed = 0;
    for (const hash of ALL_ETH_HASHES) {
      const receipt = await provider.getTransactionReceipt(hash);
      if (receipt && receipt.status === 1) {
        confirmed++;
        console.log(`\n  ✓ ${hash.slice(0,18)}...${hash.slice(-8)}`);
        console.log(`    block: ${receipt.blockNumber} · gas used: ${receipt.gasUsed}`);
      }
    }
    console.log(`\n  ${confirmed}/7 transactions confirmed on-chain`);
    expect(confirmed).to.equal(7);
  });

  // ── Test 3: Contract total transactions count ─────
  it("Should return the real total transaction count from the contract", async function () {
    const total = await contract.totalTransactions();
    console.log(`\n  Total sendAndRecord() calls recorded: ${total.toString()}`);
    expect(Number(total)).to.be.greaterThanOrEqual(contractTxs.length);
  });

  // ── Test 4: Sender wallet history is non-empty ────
  it("Should return real wallet history for the sender address", async function () {
    const history = await contract.getWalletHistory(SENDER);
    console.log(`\n  Sender: ${SENDER}`);
    console.log(`  txIds in wallet history: ${history.length}`);
    history.forEach((id, i) => console.log(`  [${i}] ${id}`));
    expect(history.length).to.be.greaterThanOrEqual(contractTxs.length);
  });

  // ── Test 5: Verify every contract txId on-chain ───
  it("Should verify all contract transactions return correct live data", async function () {
    expect(contractTxs.length).to.be.greaterThan(0);

    for (let i = 0; i < contractTxs.length; i++) {
      const c = contractTxs[i];
      const r = await contract.verifyTransaction(c.txId);

      console.log(`\n  [${i+1}] Verifying txId: ${c.txId}`);
      console.log(`       sender:   ${r.sender}`);
      console.log(`       receiver: ${r.receiver}`);
      console.log(`       amount:   ${ethers.formatEther(r.amount)} ETH`);
      console.log(`       message:  ${r.message}`);
      console.log(`       time:     ${new Date(Number(r.timestamp)*1000).toISOString()}`);
      console.log(`       exists:   ${r.exists}`);

      expect(r.exists).to.equal(true);
      expect(r.sender.toLowerCase()).to.equal(c.sender.toLowerCase());
      expect(r.receiver.toLowerCase()).to.equal(c.receiver.toLowerCase());
      expect(r.amount).to.equal(c.amount);
      expect(r.message).to.equal(c.message);
      expect(Number(r.timestamp)).to.be.greaterThan(0);
    }
  });

  // ── Test 6: Plain transfers are real on-chain txs ─
  it("Should confirm plain ETH transfers are real on-chain transactions", async function () {
    for (let i = 0; i < plainTxs.length; i++) {
      const p = plainTxs[i];
      const receipt = await provider.getTransactionReceipt(p.ethHash);

      console.log(`\n  [${i+1}] Hash:   ${p.ethHash}`);
      console.log(`       from:   ${p.from}`);
      console.log(`       to:     ${p.to}`);
      console.log(`       value:  ${ethers.formatEther(p.value)} ETH`);
      console.log(`       block:  ${receipt.blockNumber}`);
      console.log(`       status: ${receipt.status === 1 ? "Success" : "Failed"}`);

      expect(receipt.status).to.equal(1);
      expect(receipt.blockNumber).to.be.greaterThan(0);
    }
  });

  // ── Test 7: Fake txId returns exists=false ────────
  it("Should return exists=false for a txId never recorded in the contract", async function () {
    const fakeTxId = ethers.keccak256(ethers.toUtf8Bytes("CN6035_does_not_exist_on_chain"));
    const result = await contract.verifyTransaction(fakeTxId);
    console.log(`\n  Fake txId: ${fakeTxId}`);
    console.log(`  exists:    ${result.exists}`);
    expect(result.exists).to.equal(false);
  });
});
