# CryptoVerify — Frontend

React 19 + Vite 7 frontend for the CryptoVerify multi-chain DApp.

## Live Site
https://nishan-sap.github.io/crypto-verify-Dapp/

## Features
- Search transactions across 11 blockchains in parallel
- Wallet history lookup for any address
- Auto-detects chain from hash/address format
- Live Ethereum gas tracker
- ENS name resolution (.eth domains)
- 100% client-side — no backend required

## Local Development
```bash
npm install
npm run dev
```
Open: http://localhost:5173/crypto-verify-Dapp/

## Deploy to GitHub Pages
```bash
npm run deploy
```

## Supported Chains
Ethereum Mainnet, Sepolia TestNet, Base, Optimism, Arbitrum One, Linea, Polygon, BNB Chain, Bitcoin, Solana, Tron

## Tech Stack
- React 19
- Vite 7
- ethers.js 6
- Blockscout API (EVM chains)
- Blockstream API (Bitcoin)
- Solana Public RPC
- TronGrid API (Tron)

*CN6035 — Nishan Sapkota*
