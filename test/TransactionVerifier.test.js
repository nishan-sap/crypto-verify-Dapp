const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TransactionVerifier", function () {
  let contract;
  let owner;
  let receiver;

  beforeEach(async function () {
    [owner, receiver] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("TransactionVerifier");
    contract = await Factory.deploy();
    await contract.waitForDeployment();
  });

  // Test 1 — BigInt fix: compare with 0n not 0
  it("Should deploy and start with zero transactions", async function () {
    const total = await contract.totalTransactions();
    expect(total).to.equal(0n);
  });

  // Test 2 — BigInt fix: compare with 1n not 1
  it("Should record a transaction and return a txId", async function () {
    const tx = await contract.connect(owner).sendAndRecord(
      receiver.address,
      "Test payment",
      { value: ethers.parseEther("0.01") }
    );
    const receipt = await tx.wait();
    expect(receipt.status).to.equal(1);

    const total = await contract.totalTransactions();
    expect(total).to.equal(1n);
  });

  // Test 3 — verify recorded transaction data
  it("Should verify a recorded transaction correctly", async function () {
    const tx = await contract.connect(owner).sendAndRecord(
      receiver.address,
      "Hello Blockchain",
      { value: ethers.parseEther("0.05") }
    );
    const receipt = await tx.wait();

    const event = receipt.logs
      .map(log => { try { return contract.interface.parseLog(log); } catch { return null; } })
      .find(e => e && e.name === "TransactionRecorded");

    expect(event).to.not.be.undefined;
    const txId = event.args.txId;

    const result = await contract.verifyTransaction(txId);
    expect(result.exists).to.equal(true);
    expect(result.sender.toLowerCase()).to.equal(owner.address.toLowerCase());
    expect(result.receiver.toLowerCase()).to.equal(receiver.address.toLowerCase());
    expect(result.amount).to.equal(ethers.parseEther("0.05"));
  });

  // Test 4 — unknown txId returns exists=false
  it("Should return exists=false for unknown txId", async function () {
    const fakeTxId = ethers.keccak256(ethers.toUtf8Bytes("nonexistent"));
    const result = await contract.verifyTransaction(fakeTxId);
    expect(result.exists).to.equal(false);
  });

  // Test 5 — revert fix: use try/catch instead of .reverted
  it("Should revert when sending zero ETH", async function () {
    let failed = false;
    try {
      await contract.connect(owner).sendAndRecord(
        receiver.address,
        "Zero ETH test",
        { value: 0 }
      );
    } catch {
      failed = true;
    }
    expect(failed).to.equal(true);
  });

  // Test 6 — wallet history returns correct count
  it("Should return wallet transaction history", async function () {
    await contract.connect(owner).sendAndRecord(
      receiver.address, "Tx 1", { value: ethers.parseEther("0.01") }
    );
    await contract.connect(owner).sendAndRecord(
      receiver.address, "Tx 2", { value: ethers.parseEther("0.02") }
    );

    const history = await contract.getWalletHistory(owner.address);
    expect(history.length).to.equal(2);
  });
});
