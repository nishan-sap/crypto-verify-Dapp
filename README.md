# CryptoVerify — Multi-Chain Blockchain Transaction Verifier

<div align="center">

[![Live Demo](https://img.shields.io/badge/Live%20Demo-GitHub%20Pages-0052FF?style=for-the-badge&logo=github)](https://nishan-sap.github.io/crypto-verify-Dapp/)
[![Smart Contract](https://img.shields.io/badge/Contract-Sepolia%20Testnet-8247E5?style=for-the-badge&logo=ethereum)](https://sepolia.etherscan.io/address/0x04BDEeDE281D1c0b63449CAc4EDc30d9b2B369aE)
[![Tests](https://img.shields.io/badge/Unit%20Tests-15%20Passing-brightgreen?style=for-the-badge&logo=mocha)](./test/TransactionVerifier.unit.test.js)
[![Integration](https://img.shields.io/badge/Integration%20Tests-10%20Passing-brightgreen?style=for-the-badge)](./test/TransactionVerifier.test.js)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.28-363636?style=for-the-badge&logo=solidity)](./contracts/TransactionVerifier.sol)
[![OpenZeppelin](https://img.shields.io/badge/OpenZeppelin-5.3-4E5EE4?style=for-the-badge)](https://openzeppelin.com/contracts/)

**Search and verify transactions across 11 blockchains — directly from your browser.**
**No API keys. No server. 100% Web3.**

[🔗 Live Site](https://nishan-sap.github.io/crypto-verify-Dapp/) · [📋 Contract on Etherscan](https://sepolia.etherscan.io/address/0x04BDEeDE281D1c0b63449CAc4EDc30d9b2B369aE) · [📖 Deployment Guide](./docs/deployment.md)

</div>

---

## ✨ Features

- **🔍 Multi-Chain Explorer** — Paste any transaction hash. All matching chains searched in parallel. Results appear in under 2 seconds.
- **👛 Wallet History** — Enter any wallet address. Auto-detects EVM / Bitcoin / Solana / Tron. All chains searched simultaneously.
- **⚡ Live Gas Tracker** — Real-time Ethereum gas prices (slow / average / fast Gwei) from Blockscout oracle. Updated every 30 seconds.
- **🏷️ ENS Resolution** — Type `.eth` names (e.g. `vitalik.eth`) — auto-resolved to `0x` address.
- **🔒 Secure Smart Contract** — Solidity contract with `ReentrancyGuard`, `Ownable`, custom errors, and `call()` instead of `transfer()`.
- **🌐 100% Client-Side** — No centralised backend. Data comes directly from blockchain nodes.
- **📡 Auto Chain Detection** — Chain family detected automatically from hash/address format as you type.

---

## 🌍 Supported Blockchains (11)

| # | Chain | Type | API Used | Symbol |
|---|---|---|---|---|
| 1 | Ethereum Mainnet | Layer 1 | Blockscout | ETH |
| 2 | Sepolia TestNet | Testnet | Blockscout | ETH |
| 3 | Base | L2 Rollup | Blockscout | ETH |
| 4 | Optimism | L2 Rollup | Blockscout | ETH |
| 5 | Arbitrum One | L2 Rollup | Blockscout | ETH |
| 6 | Linea | L2 Rollup | Blockscout | ETH |
| 7 | Polygon | Sidechain | Blockscout | POL |
| 8 | BNB Chain | EVM L1 | Blockscout + JSON-RPC | BNB |
| 9 | Bitcoin | Layer 1 | Blockstream API | BTC |
| 10 | Solana | Layer 1 | Public RPC (5 endpoints) | SOL |
| 11 | Tron | Layer 1 | TronGrid REST API | TRX |

---

## 🏗️ Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                    User's Browser                              │
│                                                                │
│  ┌─────────────────┐     ┌──────────────────────────────────┐ │
│  │   React 19      │     │       Direct API Calls           │ │
│  │   + Vite 7      │────▶│  Blockscout · Blockstream        │ │
│  │   GitHub Pages  │     │  Solana RPC · TronGrid           │ │
│  └─────────────────┘     └──────────────────────────────────┘ │
│           │                                                    │
│           ▼                                                    │
│  ┌─────────────────┐                                          │
│  │   ethers.js v6  │────▶  Ethereum Sepolia TestNet          │
│  │                 │       TransactionVerifier.sol            │
│  └─────────────────┘       0x04BDEeDE...369aE                │
└────────────────────────────────────────────────────────────────┘

Optional local backend (NOT used by live site):
  Express + Helmet + CORS + Rate-limit → backend/server.js
  Event indexer: backend/indexer.js → data/transactions.json
```

---

## 📁 Project Structure

```
cn6035 blockchain/
│
├── contracts/
│   ├── TransactionVerifier.sol       ← Smart contract (ReentrancyGuard + Ownable)
│   └── ReentrancyAttacker.sol        ← Test helper (re-entrancy attack simulation)
│
├── scripts/
│   ├── deploy.js                     ← Deploy contract to Sepolia
│   └── seed_contract.js              ← Create 3 real test transactions
│
├── test/
│   ├── TransactionVerifier.unit.test.js  ← 15 LOCAL unit tests (no network)
│   └── TransactionVerifier.test.js       ← 10 SEPOLIA integration tests
│
├── backend/
│   ├── server.js                     ← Express API (helmet, cors, rate-limit)
│   ├── indexer.js                    ← On-chain event indexer
│   └── routes/
│       └── transactions.js           ← REST routes (lookup, wallet, total)
│
├── docs/
│   └── deployment.md                 ← Step-by-step installation manual
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx                   ← Entire React frontend (1,197 lines)
│   │   ├── main.jsx                  ← React entry point
│   │   └── index.css                 ← Global CSS reset
│   ├── index.html
│   ├── vite.config.js
│   ├── eslint.config.js
│   └── package.json
│
├── .env                              ← Secrets — NOT in git
├── .gitignore
├── .prettierrc.json                  ← Prettier formatting config
├── .solhint.json                     ← Solidity linting rules
├── eslint.config.js                  ← Root ESLint config
├── hardhat.config.js                 ← Hardhat + Sepolia config
├── package.json                      ← Root deps + all npm scripts
└── README.md
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Git

### 1. Clone and install
```bash
git clone https://github.com/nishan-sap/crypto-verify-Dapp.git
cd crypto-verify-Dapp
npm install
```

### 2. Set up environment variables
Create a `.env` file in the project root:
```
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
PRIVATE_KEY=0xYOUR_WALLET_PRIVATE_KEY
CONTRACT_ADDRESS=0x04BDEeDE281D1c0b63449CAc4EDc30d9b2B369aE
```
Get Sepolia test ETH free at: https://sepoliafaucet.com/

### 3. Run local unit tests (no network needed)
```bash
npm run test:unit
```
Expected: **15 tests passing in ~5 seconds**

### 4. Start the frontend locally
```bash
cd frontend
npm install
npm run dev
```
Open: **http://localhost:5173/crypto-verify-Dapp/**

---

## 🧪 Testing

### Local Unit Tests
```bash
npm run test:unit
```
```
  TransactionVerifier — Local Unit Tests

    Deployment
      ✓ U1.  Contract deploys with zero transactions
      ✓ U2.  Owner is set to deployer address
    sendAndRecord — happy path
      ✓ U3.  Records a transaction and increments totalTransactions
      ✓ U4.  Transfers ETH to the receiver
      ✓ U5.  verifyTransaction returns correct fields
      ✓ U6.  Both sender and receiver appear in wallet history
      ✓ U7.  Multiple transactions accumulate correctly
      ✓ U8.  Emits TransactionRecorded event with correct args
    sendAndRecord — revert cases
      ✓ U9.  Reverts when ETH value is zero (ZeroValue)
      ✓ U10. Reverts when receiver is zero address (InvalidReceiver)
      ✓ U11. Reverts when sender == receiver (SelfTransfer)
    verifyTransaction — edge cases
      ✓ U12. Returns exists=false for unknown txId
    getWalletHistory — edge cases
      ✓ U13. Returns empty array for wallet with no transactions
    Security — Re-entrancy guard
      ✓ U14. Malicious receiver cannot re-enter sendAndRecord
    Access control — Ownable
      ✓ U15. emergencyWithdraw reverts for non-owner

  15 passing (3s)
```

### Sepolia Integration Tests
```bash
npm run test:integration
```
```
  TransactionVerifier — Real Sepolia Contract Tests
    ✓ 1.  Contract is deployed and has bytecode on Sepolia
    ✓ 2.  Contract records exactly 3 transactions
    ✓ 3.  Sender wallet has >= 3 entries in getWalletHistory()
    ✓ 4.  verifyTransaction() correct for Payment 1 (0.001 ETH)
    ✓ 5.  verifyTransaction() correct for Payment 2 (0.002 ETH)
    ✓ 6.  verifyTransaction() correct for Payment 3 (0.001 ETH)
    ✓ 7.  Returns exists=false for unknown txId
    ✓ 8.  All 3 txIds in sender wallet history
    ✓ 9.  Receiver wallet has >= 3 history entries
    ✓ 10. All 3 transactions mined in expected Sepolia blocks

  10 passing (4s)
```

---

## 📜 Smart Contract

| Property | Value |
|---|---|
| Address | `0x04BDEeDE281D1c0b63449CAc4EDc30d9b2B369aE` |
| Network | Ethereum Sepolia TestNet |
| Language | Solidity ^0.8.20 |
| Compiler | 0.8.28 |
| Security | OpenZeppelin `ReentrancyGuard` + `Ownable` |
| ETH Transfer | `call()` pattern (not deprecated `transfer()`) |

### Contract Functions

| Function | Type | Description |
|---|---|---|
| `sendAndRecord(address, string)` | `external payable nonReentrant` | Send ETH + record on-chain. Protected by ReentrancyGuard. |
| `verifyTransaction(bytes32)` | `external view` | Read tx data by ID — free, zero gas |
| `getWalletHistory(address)` | `external view` | Get all tx IDs for a wallet — free |
| `totalTransactions()` | `public view` | Auto-getter for total count |
| `emergencyWithdraw()` | `external onlyOwner` | Emergency ETH recovery — owner only |

---

## 🔒 Security

| Measure | Implementation | Protects Against |
|---|---|---|
| `ReentrancyGuard` | OpenZeppelin — `nonReentrant` modifier | Re-entrancy attacks |
| `call()` not `transfer()` | `_receiver.call{value}("")` | Gas stipend issues (EIP-1884) |
| `Ownable` | OpenZeppelin — `onlyOwner` | Unauthorised admin functions |
| Custom errors | `ZeroValue`, `InvalidReceiver`, `SelfTransfer`, `TransferFailed` | Gas-efficient reverts |
| CEI pattern | State written before ETH transferred | Re-entrancy attack vector |
| `.env` in `.gitignore` | Root `.gitignore` | Key exposure on GitHub |
| Helmet headers | `backend/server.js` | XSS, clickjacking, MIME sniffing |
| Rate limiting | `express-rate-limit` — 100 req/min | DDoS and API abuse |
| CORS whitelist | `localhost` + `github.io` only | Cross-origin attacks |
| Input validation | Regex-only in `App.jsx` | Injection attacks |

---

## 🧪 Test Transactions (Live on Sepolia)

| # | ETH Hash | Amount | Block | Etherscan |
|---|---|---|---|---|
| Payment 1 | `0xf86bdb83...` | 0.001 ETH | 10397680 | [View ↗](https://sepolia.etherscan.io/tx/0xf86bdb83e6207b830a7fbc280361c8d0d3d348fb61c6aa68f24b6c0c43b3bd68) |
| Payment 2 | `0x76187abf...` | 0.002 ETH | 10397681 | [View ↗](https://sepolia.etherscan.io/tx/0x76187abf2dbd2b1daed1cd76b59a992c0816de8fae59979812516b120d71ec47) |
| Payment 3 | `0x019c41c0...` | 0.001 ETH | 10397682 | [View ↗](https://sepolia.etherscan.io/tx/0x019c41c007f7d423ab0fa309c5ff3421a4a1194e27c78b083d8ab336a09470af) |

Sender: `0xF243B88178E5EBDEc624dD0a9618C83cc2Cb1c4e`
Receiver: `0x6Cc9397c3B38739daCbfaA68EaD5F5D77Ba5F455`

---

## 🛠️ All npm Scripts

| Script | Description |
|---|---|
| `npm run test:unit` | 15 local unit tests — no network |
| `npm run test:integration` | 10 live Sepolia tests |
| `npm run compile` | Compile Solidity contracts |
| `npm run deploy` | Deploy to Sepolia |
| `npm run seed` | Create 3 test transactions |
| `npm run indexer` | Start event indexer |
| `npm run lint` | Lint backend JS with ESLint |
| `npm run lint:sol` | Lint Solidity with Solhint |
| `npm run format` | Format all code with Prettier |

---

## 📚 Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Smart Contract | Solidity | ^0.8.20 |
| Security Library | OpenZeppelin Contracts | ^5.3.0 |
| Dev Framework | Hardhat | 2.22.17 |
| Blockchain Library | ethers.js | 6.13.5 |
| Frontend | React | 19.2.0 |
| Build Tool | Vite | 7.3.1 |
| Hosting | GitHub Pages | — |
| Code Quality | ESLint + Solhint + Prettier | — |
| EVM Data | Blockscout API | — |
| Bitcoin Data | Blockstream API | — |
| Solana Data | Public JSON-RPC | — |
| Tron Data | TronGrid REST | — |

---

## 📖 Documentation

| Document | Location |
|---|---|
| Installation / Deployment Guide | [`docs/deployment.md`](./docs/deployment.md) |
| Unit Tests | [`test/TransactionVerifier.unit.test.js`](./test/TransactionVerifier.unit.test.js) |
| Integration Tests | [`test/TransactionVerifier.test.js`](./test/TransactionVerifier.test.js) |
| Technical Report | [`CN6035_Technical_Report_NishanSapkota.docx`](./CN6035_Technical_Report_NishanSapkota.docx) |

---

## 📚 Module Information

| Property | Value |
|---|---|
| Module | CN6035 — Mobile & Distributed Systems |
| University | University of East London |
| Student | Nishan Sapkota |
| Academic Year | 2025/26 |

---

<div align="center">
Built for CN6035 — University of East London<br>
<a href="https://nishan-sap.github.io/crypto-verify-Dapp/">🔗 nishan-sap.github.io/crypto-verify-Dapp</a>
</div>
