const { expect } = require("chai");
const { ethers } = require("hardhat");

// ═══════════════════════════════════════════════════════════════════
// TransactionVerifier.sol — LOCAL Unit Tests
// CN6035 Blockchain — Nishan Sapkota
//
// Run with:  npx hardhat test test/TransactionVerifier.unit.test.js
//            (no --network flag — runs on local Hardhat in-process node)
//
// These tests run in <5 seconds with zero network dependency.
// ═══════════════════════════════════════════════════════════════════

describe("TransactionVerifier — Local Unit Tests", function () {
  this.timeout(30000);

  let contract;
  let owner, sender, receiver, attacker;

  // ── Deploy a fresh contract before every test ─────────────────
  beforeEach(async function () {
    [owner, sender, receiver, attacker] = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("TransactionVerifier");
    contract = await Factory.deploy();
    await contract.waitForDeployment();
  });

  // ─────────────────────────────────────────────────────────────
  // DEPLOYMENT
  // ─────────────────────────────────────────────────────────────
  describe("Deployment", function () {

    it("U1. Contract deploys with zero transactions", async function () {
      const total = await contract.totalTransactions();
      expect(total).to.equal(0n);
    });

    it("U2. Owner is set to deployer address", async function () {
      expect(await contract.owner()).to.equal(owner.address);
    });

  });

  // ─────────────────────────────────────────────────────────────
  // HAPPY PATH — sendAndRecord()
  // ─────────────────────────────────────────────────────────────
  describe("sendAndRecord — happy path", function () {

    it("U3. Records a transaction and increments totalTransactions", async function () {
      await contract.connect(sender).sendAndRecord(
        receiver.address, "Test payment",
        { value: ethers.parseEther("0.01") }
      );
      expect(await contract.totalTransactions()).to.equal(1n);
    });

    it("U4. Transfers ETH to the receiver", async function () {
      const amount = ethers.parseEther("0.05");
      await expect(
        contract.connect(sender).sendAndRecord(receiver.address, "Pay", { value: amount })
      ).to.changeEtherBalance(receiver, amount);
    });

    it("U5. verifyTransaction returns correct fields", async function () {
      const amount = ethers.parseEther("0.001");
      const msg    = "Unit test payment";

      const tx = await contract.connect(sender).sendAndRecord(
        receiver.address, msg, { value: amount }
      );
      const receipt = await tx.wait();

      // Parse txId from emitted event
      const iface  = contract.interface;
      let txId;
      for (const log of receipt.logs) {
        try {
          const parsed = iface.parseLog(log);
          if (parsed?.name === "TransactionRecorded") { txId = parsed.args.txId; break; }
        } catch {}
      }
      expect(txId).to.not.be.undefined;

      const result = await contract.verifyTransaction(txId);
      expect(result.exists).to.equal(true);
      expect(result.sender.toLowerCase()).to.equal(sender.address.toLowerCase());
      expect(result.receiver.toLowerCase()).to.equal(receiver.address.toLowerCase());
      expect(result.amount).to.equal(amount);
      expect(result.message).to.equal(msg);
    });

    it("U6. Both sender and receiver appear in wallet history", async function () {
      const tx = await contract.connect(sender).sendAndRecord(
        receiver.address, "History test",
        { value: ethers.parseEther("0.002") }
      );
      await tx.wait();

      const senderHist   = await contract.getWalletHistory(sender.address);
      const receiverHist = await contract.getWalletHistory(receiver.address);
      expect(senderHist.length).to.equal(1);
      expect(receiverHist.length).to.equal(1);
      expect(senderHist[0]).to.equal(receiverHist[0]); // same txId
    });

    it("U7. Multiple transactions accumulate correctly", async function () {
      for (let i = 0; i < 3; i++) {
        await contract.connect(sender).sendAndRecord(
          receiver.address, `Payment ${i + 1}`,
          { value: ethers.parseEther("0.001") }
        );
      }
      expect(await contract.totalTransactions()).to.equal(3n);
      const history = await contract.getWalletHistory(sender.address);
      expect(history.length).to.equal(3);
    });

    it("U8. Emits TransactionRecorded event with correct args", async function () {
      const amount = ethers.parseEther("0.003");
      await expect(
        contract.connect(sender).sendAndRecord(receiver.address, "Event test", { value: amount })
      )
        .to.emit(contract, "TransactionRecorded")
        .withArgs(
          // txId is dynamic — use anyValue
          (val) => typeof val === "string" && val.startsWith("0x"),
          sender.address,
          receiver.address,
          amount,
          "Event test"
        );
    });

  });

  // ─────────────────────────────────────────────────────────────
  // REVERT CASES
  // ─────────────────────────────────────────────────────────────
  describe("sendAndRecord — revert cases", function () {

    it("U9. Reverts when ETH value is zero", async function () {
      await expect(
        contract.connect(sender).sendAndRecord(receiver.address, "no eth", { value: 0 })
      ).to.be.revertedWithCustomError(contract, "ZeroValue");
    });

    it("U10. Reverts when receiver is zero address", async function () {
      await expect(
        contract.connect(sender).sendAndRecord(
          ethers.ZeroAddress, "bad addr",
          { value: ethers.parseEther("0.001") }
        )
      ).to.be.revertedWithCustomError(contract, "InvalidReceiver");
    });

    it("U11. Reverts when sender == receiver (self-transfer)", async function () {
      await expect(
        contract.connect(sender).sendAndRecord(
          sender.address, "self",
          { value: ethers.parseEther("0.001") }
        )
      ).to.be.revertedWithCustomError(contract, "SelfTransfer");
    });

  });

  // ─────────────────────────────────────────────────────────────
  // verifyTransaction() edge cases
  // ─────────────────────────────────────────────────────────────
  describe("verifyTransaction — edge cases", function () {

    it("U12. Returns exists=false for unknown txId", async function () {
      const fakeTxId = ethers.keccak256(ethers.toUtf8Bytes("nonexistent"));
      const result = await contract.verifyTransaction(fakeTxId);
      expect(result.exists).to.equal(false);
      expect(result.sender).to.equal(ethers.ZeroAddress);
      expect(result.amount).to.equal(0n);
    });

  });

  // ─────────────────────────────────────────────────────────────
  // getWalletHistory() edge cases
  // ─────────────────────────────────────────────────────────────
  describe("getWalletHistory — edge cases", function () {

    it("U13. Returns empty array for wallet with no transactions", async function () {
      const history = await contract.getWalletHistory(attacker.address);
      expect(history.length).to.equal(0);
    });

  });

  // ─────────────────────────────────────────────────────────────
  // SECURITY — Re-entrancy
  // ─────────────────────────────────────────────────────────────
  describe("Security — Re-entrancy guard", function () {

    it("U14. Malicious receiver cannot re-enter sendAndRecord", async function () {
      // Deploy a contract that tries to re-enter on receive
      const AttackerFactory = await ethers.getContractFactory("ReentrancyAttacker");
      const attackerContract = await AttackerFactory.deploy(await contract.getAddress());
      await attackerContract.waitForDeployment();

      // Attack should revert because of ReentrancyGuard
      await expect(
        attackerContract.connect(attacker).attack({ value: ethers.parseEther("0.01") })
      ).to.be.reverted;
    });

  });

  // ─────────────────────────────────────────────────────────────
  // ACCESS CONTROL
  // ─────────────────────────────────────────────────────────────
  describe("Access control — Ownable", function () {

    it("U15. emergencyWithdraw reverts for non-owner", async function () {
      await expect(
        contract.connect(attacker).emergencyWithdraw()
      ).to.be.revertedWithCustomError(contract, "OwnableUnauthorizedAccount");
    });

  });

});
