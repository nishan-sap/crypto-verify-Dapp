# Crypto Transaction Verifier DApp
**CN6035 Mobile & Distributed Systems | University of East London**
**Student: Nishan Sapkota**

## Overview
A blockchain-based DApp that allows users to send ETH and verify 
transactions permanently on the Ethereum Sepolia TestNet.

## Tech Stack
- Smart Contract: Solidity 0.8.28 (Ethereum Sepolia)
- Backend: Node.js, Express.js, ethers.js
- Frontend: React, Vite, ethers.js
- Tools: Hardhat, MetaMask, Infura, ESLint

## Live Demo
https://nishan-sap.github.io/crypto-verify-Dapp/

## Contract Address
0x04BDEeDE281D1c0b63449CAc4EDc30d9b2B369aE

## Features
- Connect MetaMask wallet
- Send ETH and record on blockchain
- Verify any transaction by ID
- View full wallet transaction history

## Run Locally
### Backend
cd "H:\bsc project\cn6035 blockchain"
node backend/server.js

### Frontend
cd frontend
npm run dev