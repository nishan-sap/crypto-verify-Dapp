# CryptoVerify — Multi-Chain Blockchain Transaction Verifier

<div align="center">

![CryptoVerify Banner](https://img.shields.io/badge/CryptoVerify-Multi--Chain%20DApp-00d4aa?style=for-the-badge&logo=ethereum)

[![Live Demo](https://img.shields.io/badge/Live%20Demo-GitHub%20Pages-blue?style=flat-square&logo=github)](https://nishan-sap.github.io/crypto-verify-Dapp/)
[![Smart Contract](https://img.shields.io/badge/Contract-Sepolia%20Testnet-purple?style=flat-square&logo=ethereum)](https://sepolia.etherscan.io/address/0x04BDEeDE281D1c0b63449CAc4EDc30d9b2B369aE)
[![Tests](https://img.shields.io/badge/Tests-10%2F10%20Passing-brightgreen?style=flat-square&logo=mocha)](./test/TransactionVerifier.test.js)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)

**Search and verify transactions across 11 blockchains — directly from your browser. No backend. No API keys. No server.**

[🔗 Live Site](https://nishan-sap.github.io/crypto-verify-Dapp/) · [📋 Smart Contract](https://sepolia.etherscan.io/address/0x04BDEeDE281D1c0b63449CAc4EDc30d9b2B369aE) · [🐛 Report Bug](https://github.com/nishan-sap/crypto-verify-Dapp/issues)

</div>

---

## 📸 Screenshots

| Explorer Tab | Wallet History Tab |
|---|---|
| Search any TX hash across 11 chains | Full wallet transaction history |
| Auto-detects chain family from input | Parallel search across all chains |
| Live gas tracker in corner | Filter by chain, sort by date |

---

## ✨ Features

- **🔍 Multi-Chain Explorer** — Paste any transaction hash and all matching chains are searched in parallel. Results appear in under 2 seconds.
- **👛 Wallet History** — Enter any wallet address to retrieve full transaction history across all 11 supported chains simultaneously.
- **⚡ Live Gas Tracker** — Real-time Ethereum gas prices (slow / average / fast) updated every 30 seconds.
- **🏷️ ENS Resolution** — Type `.eth` names (e.g. `vitalik.eth`) and they resolve automatically to wallet addresses.
- **🔗 Smart Contract** — Solidity contract on Ethereum Sepolia records and verifies transactions immutably on-chain.
- **🌐 100% Client-Side** — No backend server, no database, no API keys. Everything runs directly in the browser.
- **📡 Auto-Detection** — Chain family detected automatically from hash/address format as you type.

---

## 🌍 Supported Blockchains

| # | Chain | Type | API | Symbol |
|---|---|---|---|---|
| 1 | Ethereum Mainnet | Layer 1 | Blockscout | ETH |
| 2 | Sepolia TestNet | Testnet | Blockscout | ETH |
| 3 | Base | L2 Rollup | Blockscout | ETH |
| 4 | Optimism | L2 Rollup | Blockscout | ETH |
| 5 | Arbitrum One | L2 Rollup | Blockscout | ETH |
| 6 | Linea | L2 Rollup | Blockscout | ETH |
| 7 | Polygon | Sidechain | Blockscout | POL |
| 8 | BNB Chain | EVM L1 | Blockscout + RPC | BNB |
| 9 | Bitcoin | Layer 1 | Blockstream | BTC |
| 10 | Solana | Layer 1 | Public RPC | SOL |
| 11 | Tron | Layer 1 | TronGrid | TRX |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│                   User's Browser                      │
│                                                       │
│  ┌─────────────┐    ┌─────────────────────────────┐  │
│  │  React 19   │    │     Direct API Calls         │  │
│  │  Frontend   │───▶│  Blockscout · Blockstream    │  │
│  │  (Vite 7)   │    │  Solana RPC · TronGrid       │  │
│  └─────────────┘    └─────────────────────────────┘  │
│         │                                             │
│         ▼                                             │
│  ┌─────────────┐                                     │
│  │  ethers.js  │───▶ Ethereum Sepolia TestNet        │
│  │     v6      │     TransactionVerifier.sol         │
│  └─────────────┘     0x04BDEeDE...                   │
└─────────────────────────────────────────────────────┘
```

**JAMstack architecture** — Static frontend hosted on GitHub Pages, communicating directly with blockchain APIs. No centralised backend means no single point of failure.

---

## 🛠️ Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Smart Contract | Solidity | ^0.8.20 |
| Development Framework | Hardhat | 2.22.17 |
| Blockchain Library | ethers.js | 6.13.5 |
| Frontend Framework | React | 19.2.0 |
| Build Tool | Vite | 7.3.1 |
| Hosting | GitHub Pages | — |
| EVM Data | Blockscout API | — |
| Bitcoin Data | Blockstream API | — |
| Solana Data | Public JSON-RPC | — |
| Tron Data | TronGrid REST API | — |

---

## 📁 Project Structure

```
cn6035 blockchain/
├── contracts/
│   └── TransactionVerifier.sol     # Solidity smart contract
├── scripts/
│   ├── deploy.js                   # Deploy contract to Sepolia
│   └── seed_contract.js            # Seed 3 real test transactions
├── test/
│   └── TransactionVerifier.test.js # 10 integration tests (live Sepolia)
├── backend/
│   ├── server.js                   # Express API (optional local backend)
│   └── routes/
│       └── transactions.js         # REST routes for TX lookup
├── frontend/
│   ├── src/
│   │   ├── App.jsx                 # Entire React application (~1200 lines)
│   │   ├── main.jsx                # React entry point
│   │   └── index.css               # Global styles
│   ├── index.html                  # HTML shell
│   ├── vite.config.js              # Vite build config
│   └── package.json                # Frontend dependencies
├── hardhat.config.js               # Hardhat + Sepolia network config
├── package.json                    # Root dependencies
└── .env                            # Secrets — NOT in git
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Git

### 1. Clone the repository
```bash
git clone https://github.com/nishan-sap/crypto-verify-Dapp.git
cd crypto-verify-Dapp
```

### 2. Set up environment variables
```bash
cp .env.example .env
```
Edit `.env` and fill in:
```
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
PRIVATE_KEY=0xYOUR_WALLET_PRIVATE_KEY
```

### 3. Install root dependencies (Hardhat)
```bash
npm install
```

### 4. Install and run the frontend
```bash
cd frontend
npm install
npm run dev
```
Open: **http://localhost:5173/crypto-verify-Dapp/**

---

## 🧪 Smart Contract

### Run tests against live Sepolia
```bash
npx hardhat test --network sepolia
```

Expected output:
```
  TransactionVerifier — Real Sepolia Contract Tests

    ✓ 1. Contract is deployed and has bytecode on Sepolia
    ✓ 2. Contract records exactly 3 transactions
    ✓ 3. Sender wallet has at least 3 entries in getWalletHistory()
    ✓ 4. verifyTransaction() returns correct data for Payment 1 (0.001 ETH)
    ✓ 5. verifyTransaction() returns correct data for Payment 2 (0.002 ETH)
    ✓ 6. verifyTransaction() returns correct data for Payment 3 (0.001 ETH)
    ✓ 7. verifyTransaction() returns exists=false for an unknown txId
    ✓ 8. All 3 real txIds are present in sender's getWalletHistory()
    ✓ 9. Receiver wallet also has history
    ✓ 10. All 3 transactions were mined in the expected Sepolia blocks

  10 passing (4s)
```

### Compile
```bash
npx hardhat compile
```

### Deploy a new contract instance
```bash
npx hardhat run scripts/deploy.js --network sepolia
```

---

## 🌐 Deploy Frontend to GitHub Pages

```bash
cd frontend
npm run deploy
```

Live at: **https://nishan-sap.github.io/crypto-verify-Dapp/**

---

## 📜 Smart Contract Details

| Property | Value |
|---|---|
| Contract Address | `0x04BDEeDE281D1c0b63449CAc4EDc30d9b2B369aE` |
| Network | Ethereum Sepolia TestNet |
| Language | Solidity ^0.8.20 |
| Compiler | 0.8.28 |

### Contract Functions

| Function | Type | Description |
|---|---|---|
| `sendAndRecord(address, string)` | `external payable` | Send ETH and record transaction on-chain |
| `verifyTransaction(bytes32)` | `external view` | Read transaction data by ID — free, no gas |
| `getWalletHistory(address)` | `external view` | Get all transaction IDs for a wallet |
| `totalTransactions()` | `public view` | Total number of recorded transactions |

---

## 🔒 Security

| Feature | Implementation |
|---|---|
| No private keys in frontend | Read-only API calls only — wallet never needed |
| `.env` in `.gitignore` | Private key never committed to GitHub |
| No API keys required | All APIs are public and keyless |
| Input validation | Regex-only hash/address validation before any API call |
| CORS-safe APIs only | All endpoints explicitly support cross-origin requests |
| Smart contract validation | `require()` guards on value > 0, valid receiver, no self-send |
| Rate limiting (backend) | 100 req/min global, 30 req/min for blockchain calls |
| Security headers (backend) | `helmet` middleware — OWASP recommended headers |

---

## 🧪 Test Transactions (Live on Sepolia)

These 3 real transactions are permanently recorded on the Sepolia blockchain:

| # | ETH Hash | Amount | Block |
|---|---|---|---|
| Payment 1 | `0xf86bdb83...` | 0.001 ETH | 10397680 |
| Payment 2 | `0x76187abf...` | 0.002 ETH | 10397681 |
| Payment 3 | `0x019c41c0...` | 0.001 ETH | 10397682 |

Sender: `0xF243B881...` → Receiver: `0x6Cc93979...`

---

## 📚 Module Information

| Property | Value |
|---|---|
| Module | CN6035 — Mobile & Distributed Systems |
| University | University of East London |
| Programme | BSc (Hons) Computer Science |
| Student | Nishan Sapkota |
| Academic Year | 2025/26 |

---

## 📄 Licence

This project is licensed under the MIT Licence — see the [LICENSE](LICENSE) file for details.

---

<div align="center">
Built with ❤️ for CN6035 — University of East London
</div>
