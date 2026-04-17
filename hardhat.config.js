require("@nomicfoundation/hardhat-ethers");
require("@nomicfoundation/hardhat-chai-matchers");
require("dotenv").config();

const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL;
const PRIVATE_KEY     = process.env.PRIVATE_KEY;

// Warn (not throw) — allow compile/test tasks without .env
if (!SEPOLIA_RPC_URL) console.warn("⚠️  SEPOLIA_RPC_URL not set — Sepolia network unavailable");
if (!PRIVATE_KEY)     console.warn("⚠️  PRIVATE_KEY not set — deployment unavailable");

module.exports = {
  solidity: "0.8.28",
  networks: {
    ...(SEPOLIA_RPC_URL && PRIVATE_KEY
      ? {
          sepolia: {
            url:      SEPOLIA_RPC_URL,
            accounts: [PRIVATE_KEY],
          },
        }
      : {}),
  },
};
