# CryptoVerify — Multi-Chain Blockchain Explorer

> Live: [nishan-sap.github.io/crypto-verify-Dapp](https://nishan-sap.github.io/crypto-verify-Dapp/)  
> Contract: `0x04BDEeDE281D1c0b63449CAc4EDc30d9b2B369aE` on Ethereum Sepolia

---

## Features

- **Transaction Explorer** — Search any public transaction by hash across 11 blockchains. Works fully on GitHub Pages — no backend required.
- **Wallet History** — Paste any wallet address and all 11 chains are searched in parallel automatically. No manual network selection. No backend required.
- **11 Blockchains** — Ethereum Mainnet, Sepolia TestNet, Base, Optimism, Arbitrum One, Linea, Polygon, BNB Chain, Bitcoin, Solana, Tron
- **100% Client-Side** — All data fetched directly from Blockscout, Blockstream, Solana RPC, and TronGrid APIs. Works on GitHub Pages with zero backend.
- **Auto-Detection** — Chain family automatically detected from hash/address format as you type
- **Smart Contract** — Solidity 0.8.28, deployed on Ethereum Sepolia TestNet

---

## Tech Stack

| Layer | Technology |
|---|---|
| Smart Contract | Solidity 0.8.28, Hardhat 2.22.17 |
| Frontend | React 19, Vite 7 |
| Blockchain Library | ethers.js 6.13.5 |
| Blockchain Data | Blockscout API (EVM), Blockstream API (BTC), Solana RPC, TronGrid |
| Deployment | GitHub Pages (gh-pages) |
| Dev Tools | Node.js, dotenv |

---

## Supported Chains

| Chain | API | Symbol |
|---|---|---|
| Ethereum Mainnet | Blockscout | ETH |
| Sepolia TestNet | Blockscout | ETH |
| Base | Blockscout | ETH |
| Optimism | Blockscout | ETH |
| Arbitrum One | Blockscout | ETH |
| Linea | Blockscout | ETH |
| Polygon | Blockscout | POL |
| BNB Chain | Blockscout | BNB |
| Bitcoin | Blockstream | BTC |
| Solana | Public RPC | SOL |
| Tron | TronGrid | TRX |

---

## Local Setup

```bash
# 1. Clone the repo
git clone https://github.com/nishan-sap/crypto-verify-Dapp.git
cd crypto-verify-Dapp

# 2. Create .env file
cp .env.example .env
# Fill in your SEPOLIA_RPC_URL and PRIVATE_KEY

# 3. Install dependencies
npm install --legacy-peer-deps

# 4. Start frontend
cd frontend
npm install
npm run dev
```

Open: http://localhost:5173/crypto-verify-Dapp/

---

## Smart Contract

```bash
# Compile
npx hardhat compile

# Run tests (against live Sepolia contract)
npx hardhat test --network sepolia

# Deploy (creates new contract)
npx hardhat run scripts/deploy.js --network sepolia
```

---

## Deploy to GitHub Pages

```bash
# Build and publish frontend
cd frontend
npm run deploy
```

Live at: https://nishan-sap.github.io/crypto-verify-Dapp/

---

## Security

| Feature | Implementation |
|---|---|
| No private keys in code | `.env` file, excluded via `.gitignore` |
| Input validation | Regex-only address/hash validation |
| No backend exposure | 100% client-side, no server attack surface |
| HTTPS only | GitHub Pages enforces HTTPS |
| No API keys | All APIs used are free and public |

---

## Project Structure

```
cn6035 blockchain/
├── contracts/
│   └── TransactionVerifier.sol
├── scripts/
│   └── deploy.js
├── test/
│   └── TransactionVerifier.test.js
├── backend/
│   ├── server.js
│   └── routes/transactions.js
├── frontend/
│   └── src/
│       └── App.jsx
├── .env.example
├── hardhat.config.js
└── README.md
```

---

*CN6035 Blockchain — Nishan Sapkota*
