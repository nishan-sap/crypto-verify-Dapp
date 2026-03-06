# CryptoVerify DApp — CN6035 Blockchain Assignment

A decentralised application (DApp) for tracking and verifying blockchain transactions across 10 networks.

**Live Demo:** https://nishan-sap.github.io/crypto-verify-Dapp/
**Contract (Sepolia):** 0x04BDEeDE281D1c0b63449CAc4EDc30d9b2B369aE

---

## Features

- **Transaction Explorer** — Search any public transaction by hash (works on GitHub Pages via browser-direct RPC)
- **Wallet History** — Retrieve all transactions for any wallet (requires local Node.js backend)
- **10 Blockchains** — Ethereum, Sepolia, Base, Optimism, Arbitrum, Linea, Polygon, BNB Chain, Bitcoin, Solana, Tron
- **Smart Contract** — Solidity 0.8.28, deployed on Ethereum Sepolia TestNet

---

## Tech Stack

| Layer | Technology |
|---|---|
| Smart Contract | Solidity 0.8.28, Hardhat 2.22.17 |
| Backend | Node.js, Express.js, ethers.js 6.x |
| Frontend | React 19, Vite, ethers.js (browser) |
| Security | Helmet, express-rate-limit, CORS whitelist, regex validation |
| Hosting | GitHub Pages (frontend), local Node.js (backend) |

---

## Local Setup

### 1. Clone and install

```bash
git clone https://github.com/nishan-sap/crypto-verify-Dapp.git
cd crypto-verify-Dapp
npm install
```

### 2. Create .env file

```bash
cp .env.example .env
# Fill in your values
```

```
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
PRIVATE_KEY=your_metamask_private_key
CONTRACT_ADDRESS=0x04BDEeDE281D1c0b63449CAc4EDc30d9b2B369aE
PORT=5000
```

### 3. Start the backend

```bash
node backend/server.js
```

### 4. Start the frontend (separate terminal)

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

---

## Smart Contract

```bash
# Compile
npx hardhat compile

# Run tests
npx hardhat test

# Deploy to Sepolia
npx hardhat run scripts/deploy.js --network sepolia
```

---

## API Endpoints

```
GET /api/transactions/lookup/:txHash   — Look up any TX (all chains auto-detected)
GET /api/transactions/wallet/:address  — All public transactions for a wallet
GET /api/transactions/total            — DApp contract transaction count
```

---

## Security

- **Helmet** — HTTP security headers
- **Rate Limiting** — 30 blockchain queries / minute / IP
- **CORS Whitelist** — Only allows localhost and GitHub Pages
- **Input Validation** — Regex-only, no SQL/NoSQL queries
- **No API keys in code** — All secrets via .env (excluded from git)

---

## Why GitHub Pages shows 0 for wallet history

GitHub Pages is **static hosting** — it serves HTML/CSS/JS files only. It cannot run Node.js.

- **Explorer tab** — Works on GitHub Pages (uses browser-side ethers.js to query public RPCs directly)
- **Wallet History tab** — Requires `node backend/server.js` running locally (aggregates multiple chain APIs server-side)

---

*CN6035 Mobile and Distributed Systems — University of East London — Nishan Sapkota*
