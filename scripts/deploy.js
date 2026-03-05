const hre = require("hardhat");

async function main() {
  console.log("Deploying TransactionVerifier to Sepolia...");
  const TransactionVerifier = await hre.ethers.getContractFactory("TransactionVerifier");
  const verifier = await TransactionVerifier.deploy();
  await verifier.waitForDeployment();
  const address = await verifier.getAddress();
  console.log("✅ Contract deployed!");
  console.log("📋 Contract address:", address);
  console.log(`🔍 https://sepolia.etherscan.io/address/${address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});