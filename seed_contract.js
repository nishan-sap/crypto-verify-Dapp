const { ethers } = require("ethers");
require("dotenv").config();

const CONTRACT_ADDRESS = "0x04BDEeDE281D1c0b63449CAc4EDc30d9b2B369aE";

const ABI = [
  "function sendAndRecord(address payable _receiver, string memory _message) external payable returns (bytes32)",
  "function verifyTransaction(bytes32 _txId) external view returns (address sender, address receiver, uint256 amount, uint256 timestamp, string memory message, bool exists)",
  "function getWalletHistory(address _wallet) external view returns (bytes32[])",
  "function totalTransactions() external view returns (uint256)",
  "event TransactionRecorded(bytes32 indexed txId, address indexed sender, address indexed receiver, uint256 amount, string message)"
];

// Use a well-known Sepolia address as receiver (Sepolia faucet — not yours)
const RECEIVER = "0x6Cc9397c3B38739daCbfaA68EaD5F5D77Ba5F455";

async function main() {
  const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
  const signer   = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

  console.log("Signer:", signer.address);
  console.log("Receiver:", RECEIVER);

  const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
  const totalBefore = await contract.totalTransactions();
  console.log("Total BEFORE:", totalBefore.toString());

  const txs = [
    { msg: "CN6035 Assignment — Payment 1", value: "0.001" },
    { msg: "CN6035 Assignment — Payment 2", value: "0.002" },
    { msg: "CN6035 Assignment — Payment 3", value: "0.001" },
  ];

  const results = [];

  for (let i = 0; i < txs.length; i++) {
    const t = txs[i];
    console.log(`\nTx ${i+1}: "${t.msg}" — ${t.value} ETH to ${RECEIVER}`);

    const tx = await contract.sendAndRecord(RECEIVER, t.msg,
      { value: ethers.parseEther(t.value) }
    );
    console.log("  ETH hash:", tx.hash);

    const receipt = await tx.wait();
    console.log("  Block:", receipt.blockNumber, "Status:", receipt.status===1?"SUCCESS":"FAILED");

    for (const log of receipt.logs) {
      try {
        const parsed = contract.interface.parseLog(log);
        if (parsed.name === "TransactionRecorded") {
          const txId = parsed.args.txId;
          console.log("  bytes32 txId:", txId);
          results.push({
            ethHash: tx.hash,
            txId,
            sender: parsed.args.sender,
            receiver: parsed.args.receiver,
            amount: ethers.formatEther(parsed.args.amount),
            message: parsed.args.message,
          });
        }
      } catch {}
    }
  }

  const totalAfter = await contract.totalTransactions();
  console.log("\nTotal AFTER:", totalAfter.toString());

  console.log("\n\n========================================");
  console.log("PASTE THIS OUTPUT BACK TO CLAUDE");
  console.log("========================================");
  console.log(`SENDER=${signer.address}`);
  console.log(`RECEIVER=${RECEIVER}`);
  console.log(`TOTAL=${totalAfter.toString()}`);
  results.forEach((r,i) => {
    console.log(`TX${i+1}_HASH=${r.ethHash}`);
    console.log(`TX${i+1}_ID=${r.txId}`);
    console.log(`TX${i+1}_AMOUNT=${r.amount}`);
    console.log(`TX${i+1}_MSG=${r.message}`);
  });
}

main().catch(e => { console.error("Error:", e.message); process.exit(1); });
