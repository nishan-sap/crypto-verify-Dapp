# NSTCrypto — Multi-Chain Blockchain Explorer & OSINT Intelligence

<div align="center">

[![Live Demo](https://img.shields.io/badge/Live%20Demo-GitHub%20Pages-0EA5E9?style=for-the-badge&logo=github)](https://nishan-sap.github.io/crypto-verify-Dapp/)
[![Smart Contract](https://img.shields.io/badge/Contract-Sepolia-10B981?style=for-the-badge)](https://sepolia.etherscan.io/address/0x04BDEeDE281D1c0b63449CAc4EDc30d9b2B369aE)
[![Tests](https://img.shields.io/badge/Tests-25%20passing-10B981?style=for-the-badge)](test/)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.28-627EEA?style=for-the-badge)](contracts/)

Search, verify and investigate transactions across **11 blockchains** — directly from your browser.  
No API keys. No server. 100% client-side.

**[🔗 Live Site](https://nishan-sap.github.io/crypto-verify-Dapp/) · [📋 Contract on Etherscan](https://sepolia.etherscan.io/address/0x04BDEeDE281D1c0b63449CAc4EDc30d9b2B369aE) · [📖 Deployment Guide](docs/deployment.md)**

</div>

---

## ✨ Features

### 🔍 Tab 1 — Multi-Chain Explorer
Paste any transaction hash — all 11 chains searched in parallel. Chain family auto-detected from format as you type. Results in under 2 seconds.

### 📋 Tab 2 — Wallet History
Enter any wallet address — auto-detects EVM / Bitcoin / Solana / Tron. All matching chains searched simultaneously. Chain filter, copy buttons, inline risk badges.

### 🌿 Tab 3 — Block Tracker
**Wallet mode:** Enter an EVM wallet address to build a full provenance tree — see every incoming transaction, trace every sender's history, go as deep as you want. Unlimited depth, load more at every level.

**TX hash mode:** Enter any EVM transaction hash — chain auto-detected across all 8 EVM networks. Jumps straight to the block, shows block header stats (number, timestamp, gas, miner) and the first 10 transactions with risk badges and trace buttons on every address.

### 🧠 Tab 4 — Intelligence & OSINT
Law-enforcement grade on-chain investigation tool:
- **OFAC Sanctions Screening** — 30+ sanctioned addresses (Lazarus Group, Tornado Cash, Evil Corp, Garantex, Blender.io) across EVM, Bitcoin, Solana, and Tron
- **Risk Score 0–100** — SVG circular gauge with animated fill; weighted flags for OFAC hits, mixers, darknet markets, structuring patterns
- **AML Pattern Detection** — 6 behavioural flags: Rapid Movement, Structuring, Smurfing, High-Frequency, New Wallet, Dormant Wallet
- **Known Entity Labels** — 70+ labels: Binance/Coinbase/Kraken hot wallets, Uniswap/SushiSwap DEX, WETH/USDC/USDT contracts, bridges, burn addresses
- **Counterparty Risk Map** — flags every address in transaction history against OFAC and known entities
- **Token Transfers** — ERC-20 history via Blockscout tokentx API
- **Export** — TXT investigation report, CSV, JSON — all generated client-side
- **Multi-chain** — full analysis on EVM, Bitcoin, Solana, and Tron

### Additional
- ⚡ **Live Gas Tracker** — real-time Ethereum gas prices updated every 30 seconds
- 🏷️ **ENS Resolution** — type `.eth` names, auto-resolved to `0x` address before lookup
- 🚩 **Risk Badges** — inline OFAC / entity badges on every address in Explorer, Wallet History, and Block Tracker
- 🌿 **Floating Quick Tracker** — always-visible widget to trace any address from any tab

---

## 🌍 Supported Blockchains (11)

| # | Chain | Type | API Used | Symbol |
|---|-------|------|----------|--------|
| 1 | Ethereum Mainnet | Layer 1 | Blockscout | ETH |
| 2 | Sepolia TestNet | Testnet | Blockscout | ETH |
| 3 | Base | L2 Rollup | Blockscout | ETH |
| 4 | Optimism | L2 Rollup | Blockscout | ETH |
| 5 | Arbitrum One | L2 Rollup | Blockscout | ETH |
| 6 | Linea | L2 Rollup | Blockscout | ETH |
| 7 | Polygon | Sidechain | Blockscout | POL |
| 8 | BNB Chain | EVM L1 | Blockscout + JSON-RPC fallback | BNB |
| 9 | Bitcoin | Layer 1 | Blockstream API | BTC |
| 10 | Solana | Layer 1 | Public RPC (3 endpoints, auto-fallback) | SOL |
| 11 | Tron | Layer 1 | TronGrid REST API | TRX |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        User's Browser                           │
│                                                                 │
│  ┌─────────────────────┐    ┌────────────────────────────────┐  │
│  │  React 19 + Vite 7  │    │       Direct API Calls         │  │
│  │  GitHub Pages       │───▶│  Blockscout · Blockstream      │  │
│  │  App.jsx + intel.js │    │  Solana RPC · TronGrid         │  │
│  └─────────────────────┘    └────────────────────────────────┘  │
│             │                                                   │
│             ▼                                                   │
│  ┌─────────────────────┐                                        │
│  │    ethers.js v6     │───▶  Ethereum Sepolia TestNet         │
│  │                     │      TransactionVerifier.sol          │
│  └─────────────────────┘      0x04BDEeDE...369aE              │
└─────────────────────────────────────────────────────────────────┘

Optional local backend (NOT used by live site):
  Express + Helmet + CORS + Rate-limit + Winston → backend/server.js
  Event indexer: backend/indexer.js → data/transactions.json
```

---

## 📁 Project Structure

```
cn6035 blockchain/
│
├── contracts/
│   ├── TransactionVerifier.sol           ← Smart contract (ReentrancyGuard + Ownable)
│   └── ReentrancyAttacker.sol            ← Test helper (re-entrancy attack simulation)
│
├── scripts/
│   ├── deploy.js                         ← Deploy contract to Sepolia
│   └── seed_contract.js                  ← Create 3 real test transactions
│
├── test/
│   ├── TransactionVerifier.unit.test.js  ← 15 LOCAL unit tests (no network)
│   └── TransactionVerifier.test.js       ← 10 SEPOLIA integration tests
│
├── backend/
│   ├── server.js                         ← Express API (helmet, cors, rate-limit, winston)
│   ├── logger.js                         ← Winston structured logger
│   ├── indexer.js                        ← On-chain event indexer
│   ├── routes/
│   │   └── transactions.js               ← REST routes (lookup, wallet, total)
│   └── services/
│       └── chainService.js               ← All blockchain business logic
│
├── docs/
│   └── deployment.md                     ← Step-by-step installation manual
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx                       ← Full React app (4 tabs)
│   │   ├── intel.js                      ← OSINT engine (OFAC, AML, risk scoring, exports)
│   │   ├── main.jsx                      ← React entry point
│   │   └── index.css                     ← Global CSS reset
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── .env.example                          ← Template — copy to .env
├── .gitignore
├── .prettierrc.json
├── .solhint.json
├── eslint.config.js
├── hardhat.config.js
└── package.json
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
```bash
cp .env.example .env
```
Edit `.env`:
```
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
PRIVATE_KEY=0xYOUR_WALLET_PRIVATE_KEY
CONTRACT_ADDRESS=0x04BDEeDE281D1c0b63449CAc4EDc30d9b2B369aE
```
Get free Sepolia ETH at: https://sepoliafaucet.com/

### 3. Run unit tests (no network needed)
```bash
npm run test:unit
```
Expected: **15 tests passing** in ~3 seconds

### 4. Start the frontend locally
```bash
cd frontend
npm install
npm run dev
```
Open: http://localhost:5173/crypto-verify-Dapp/

### 5. Deploy to GitHub Pages
```bash
cd frontend
npm run deploy
```

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
|----------|-------|
| Address | `0x04BDEeDE281D1c0b63449CAc4EDc30d9b2B369aE` |
| Network | Ethereum Sepolia TestNet (chainId: 11155111) |
| Language | Solidity ^0.8.20 |
| Compiler | 0.8.28 |
| Security | OpenZeppelin ReentrancyGuard + Ownable |
| ETH Transfer | `call()` pattern (not deprecated `transfer()`) |

### Contract Functions

| Function | Type | Description |
|----------|------|-------------|
| `sendAndRecord(address, string)` | `external payable nonReentrant` | Send ETH + record on-chain |
| `verifyTransaction(bytes32)` | `external view` | Read tx data by ID — free, zero gas |
| `getWalletHistory(address)` | `external view` | Get all tx IDs for a wallet |
| `totalTransactions()` | `public view` | Auto-getter for total count |
| `emergencyWithdraw()` | `external onlyOwner` | Emergency ETH recovery — owner only |

---

## 🔒 Security

| Measure | Implementation | Protects Against |
|---------|---------------|-----------------|
| ReentrancyGuard | OpenZeppelin — `nonReentrant` | Re-entrancy attacks |
| `call()` not `transfer()` | `_receiver.call{value}("")` | Gas stipend issues (EIP-1884) |
| Ownable | OpenZeppelin — `onlyOwner` | Unauthorised admin functions |
| Custom errors | `ZeroValue`, `InvalidReceiver`, `SelfTransfer` | Gas-efficient reverts |
| CEI pattern | State written before ETH transferred | Re-entrancy via state manipulation |
| `.env` in `.gitignore` | Root `.gitignore` | Key exposure on GitHub |
| Helmet headers | `backend/server.js` | XSS, clickjacking, MIME sniffing |
| Rate limiting | `express-rate-limit` — 100 req/min | DDoS and API abuse |
| CORS whitelist | `localhost` + `github.io` only | Cross-origin attacks |
| Input validation | Regex-only in `App.jsx` | Injection attacks |

---

## 🧪 Test Transactions (Live on Sepolia)

| # | ETH Hash | Amount | Block |
|---|----------|--------|-------|
| Payment 1 | `0xf86bdb83e6207b830a7fbc280361c8d0d3d348fb61c6aa68f24b6c0c43b3bd68` | 0.001 ETH | 10397680 |
| Payment 2 | `0x76187abf2dbd2b1daed1cd76b59a992c0816de8fae59979812516b120d71ec47` | 0.002 ETH | 10397681 |
| Payment 3 | `0x019c41c007f7d423ab0fa309c5ff3421a4a1194e27c78b083d8ab336a09470af` | 0.001 ETH | 10397682 |

**Signer:** `0xF243B88178E5EBDEc624dD0a9618C83cc2Cb1c4e`
**Receiver:** `0x6Cc9397c3B38739daCbfaA68EaD5F5D77Ba5F455`

---

## 🛠️ All npm Scripts

| Script | Description |
|--------|-------------|
| `npm run test:unit` | 15 local unit tests — no network |
| `npm run test:integration` | 10 live Sepolia tests |
| `npm run compile` | Compile Solidity contracts |
| `npm run deploy` | Deploy to Sepolia |
| `npm run seed` | Create 3 test transactions on Sepolia |
| `npm run indexer` | Start on-chain event indexer |
| `npm run lint` | Lint backend JS with ESLint |
| `npm run lint:sol` | Lint Solidity with Solhint |
| `npm run format` | Format all code with Prettier |
| `cd frontend && npm run deploy` | Deploy frontend to GitHub Pages |

---

## 📚 Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Smart Contract | Solidity | ^0.8.20 |
| Security Library | OpenZeppelin Contracts | ^5.3.0 |
| Dev Framework | Hardhat | 2.22.17 |
| Blockchain Library | ethers.js | 6.13.5 |
| Frontend | React | 19.2.0 |
| Build Tool | Vite | 7.3.1 |
| Hosting | GitHub Pages | — |
| Backend | Express + Helmet + Winston + Morgan | — |
| Code Quality | ESLint + Solhint + Prettier | — |
| EVM Data | Blockscout API | — |
| Bitcoin Data | Blockstream API | — |
| Solana Data | Public JSON-RPC | — |
| Tron Data | TronGrid REST | — |

---

## 📖 Documentation

| Document | Location |
|----------|----------|
| Installation / Deployment Guide | `docs/deployment.md` |
| Unit Tests | `test/TransactionVerifier.unit.test.js` |
| Integration Tests | `test/TransactionVerifier.test.js` |

---

## 📚 Module Information

| Property | Value |
|----------|-------|
| Module | CN6035 — Mobile & Distributed Systems |
| University | University of East London |
| Student | Nishan Sapkota |
| Academic Year | 2025/26 |

---

Built for CN6035 — University of East London

🔗 [nishan-sap.github.io/crypto-verify-Dapp](https://nishan-sap.github.io/crypto-verify-Dapp/)
