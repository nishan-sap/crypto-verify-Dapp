# Deployment Guide — CryptoVerify DApp

**CN6035 — Nishan Sapkota**

---

## Prerequisites

| Requirement | Version | Install |
|---|---|---|
| Node.js | 18+ | https://nodejs.org |
| Git | Any | https://git-scm.com |
| MetaMask wallet | Any | https://metamask.io |
| Alchemy account (free) | — | https://dashboard.alchemy.com |

---

## Step 1 — Clone and install

```bash
git clone https://github.com/nishan-sap/crypto-verify-Dapp.git
cd crypto-verify-Dapp
npm install
```

---

## Step 2 — Set up environment variables

```bash
cp .env.example .env
```

Edit `.env` and fill in:

```
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
PRIVATE_KEY=0xYOUR_WALLET_PRIVATE_KEY
```

Get Sepolia test ETH free at: https://sepoliafaucet.com/

---

## Step 3 — Compile the contract

```bash
npx hardhat compile
```

**Expected output:**
```
Compiled 3 Solidity files successfully (evm target: paris).
```

Generates `artifacts/contracts/TransactionVerifier.sol/TransactionVerifier.json`
containing the ABI and bytecode.

---

## Step 4 — Deploy to Sepolia

```bash
npx hardhat run scripts/deploy.js --network sepolia
```

**Expected output:**
```
Deploying TransactionVerifier to Sepolia...
✅ Contract deployed!
📋 Contract address: 0x04BDEeDE281D1c0b63449CAc4EDc30d9b2B369aE
🔍 https://sepolia.etherscan.io/address/0x04BDEeDE281D1c0b63449CAc4EDc30d9b2B369aE
```

**Live deployment details:**

| Property | Value |
|---|---|
| Contract Address | `0x04BDEeDE281D1c0b63449CAc4EDc30d9b2B369aE` |
| Deployer Wallet | `0xF243B88178E5EBDEc624dD0a9618C83cc2Cb1c4e` |
| Network | Ethereum Sepolia TestNet (chainId: 11155111) |
| Deploy TX | View on [Sepolia Etherscan ↗](https://sepolia.etherscan.io/address/0x04BDEeDE281D1c0b63449CAc4EDc30d9b2B369aE) |
| Block Explorer | https://eth-sepolia.blockscout.com/address/0x04BDEeDE... |
| Compiler | Solidity 0.8.28 |

Update `CONTRACT_ADDRESS` in your `.env` file with the new address.

---

## Step 5 — Seed test transactions (optional)

Creates 3 real on-chain transactions for testing:

```bash
node scripts/seed_contract.js
```

**Expected output:**
```
Seeding 3 transactions to TransactionVerifier...

✅ Payment 1 sent!
   ETH hash:  0xf86bdb83e6207b830a7fbc280361c8d0d3d348fb61c6aa68f24b6c0c43b3bd68
   bytes32 ID: 0x...
   Block:     10397680
   Amount:    0.001 ETH

✅ Payment 2 sent!
   ETH hash:  0x76187abf2dbd2b1daed1cd76b59a992c0816de8fae59979812516b120d71ec47
   Block:     10397681
   Amount:    0.002 ETH

✅ Payment 3 sent!
   ETH hash:  0x019c41c007f7d423ab0fa309c5ff3421a4a1194e27c78b083d8ab336a09470af
   Block:     10397682
   Amount:    0.001 ETH

Total seeded: 3 transactions
```

---

## Step 6 — Run tests

### Local unit tests (fast, no network needed)

```bash
npx hardhat test test/TransactionVerifier.unit.test.js
```

**Expected output:**
```
  TransactionVerifier — Local Unit Tests

    Deployment
      ✓ U1. Contract deploys with zero transactions
      ✓ U2. Owner is set to deployer address

    sendAndRecord — happy path
      ✓ U3. Records a transaction and increments totalTransactions
      ✓ U4. Transfers ETH to the receiver
      ✓ U5. verifyTransaction returns correct fields
      ✓ U6. Both sender and receiver appear in wallet history
      ✓ U7. Multiple transactions accumulate correctly
      ✓ U8. Emits TransactionRecorded event with correct args

    sendAndRecord — revert cases
      ✓ U9.  Reverts when ETH value is zero
      ✓ U10. Reverts when receiver is zero address
      ✓ U11. Reverts when sender == receiver (self-transfer)

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

### Sepolia integration tests (requires .env)

```bash
npx hardhat test test/TransactionVerifier.test.js --network sepolia
```

```
  TransactionVerifier — Real Sepolia Contract Tests
    ✓ 1. Contract is deployed and has bytecode on Sepolia
    ...
  10 passing (4s)
```

---

## Step 7 — Run the event indexer (optional)

Listens for on-chain events and saves them locally:

```bash
node backend/indexer.js
```

Output is saved to `data/transactions.json`.

---

## Step 8 — Deploy the frontend

```bash
cd frontend
cp .env.example .env
# Edit frontend/.env — set VITE_CONTRACT_ADDRESS
npm install
npm run deploy
```

Live at: **https://nishan-sap.github.io/crypto-verify-Dapp/**

---

## Step 9 — Run ESLint (code quality)

```bash
# Root (backend + scripts)
npm run lint

# Frontend
cd frontend && npm run lint

# Solidity
npx solhint 'contracts/**/*.sol'
```

---

## Troubleshooting

| Error | Solution |
|---|---|
| `PRIVATE_KEY: invalid BytesLike value` | Check .env — key must start with `0x` |
| `insufficient funds` | Get Sepolia ETH at sepoliafaucet.com |
| `Contract not deployed` | Check CONTRACT_ADDRESS in .env matches deployed address |
| `CORS error in browser` | Normal — App.jsx uses client-side fetch, not the Express backend |
| `Gas tracker shows unavailable` | Network congestion — refreshes every 30s automatically |
| `Solana RPC rate limited` | Expected on GitHub Pages — explorer link is provided as fallback |

---

## Architecture Overview

```
Browser (React 19 + Vite 7)
    │
    ├── Blockscout API ──→ 8 EVM chains (Sepolia, ETH, Base, OP, Arbitrum, Linea, Polygon, BNB)
    ├── Blockstream API ─→ Bitcoin Mainnet
    ├── Solana RPC ──────→ Solana Mainnet
    ├── TronGrid API ────→ Tron Mainnet
    │
    └── ethers.js ───────→ TransactionVerifier.sol (Sepolia)
                           0x04BDEeDE281D1c0b63449CAc4EDc30d9b2B369aE
```

---

*CN6035 — University of East London — Academic Year 2025/26*
