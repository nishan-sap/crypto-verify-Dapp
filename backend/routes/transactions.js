/**
 * backend/routes/transactions.js
 * ─────────────────────────────────────────────────────────────────
 * CryptoVerify — Transaction Routes
 * CN6035 — Nishan Sapkota
 *
 * Routes are intentionally thin — all business logic lives in
 * backend/services/chainService.js (service layer pattern).
 *
 * Endpoints:
 *   GET /api/transactions/lookup/:txHash   — auto-detect chain
 *   GET /api/transactions/wallet/:address  — all chains
 *   GET /api/transactions/total            — contract stat
 * ─────────────────────────────────────────────────────────────────
 */

const express = require("express");
require("dotenv").config({ path: require("path").resolve(__dirname, "../../.env") });

const router  = express.Router();
const logger  = require("../logger");
const service = require("../services/chainService");

const {
  detectHashType,
  detectAddressType,
  EVM_CHAINS,
  lookupEVM, lookupBTC, lookupSolana, lookupTron,
  getWalletHistoryBlockscout, getWalletHistoryBTC,
  getWalletHistorySolana, getWalletHistoryTron,
  getContractTotal,
} = service;

// ═══════════════════════════════════════════════════════════════
// ROUTE 1: GET /api/transactions/lookup/:txHash
// Validates input → detects chain → delegates to service
// ═══════════════════════════════════════════════════════════════
router.get("/lookup/:txHash", async (req, res, next) => {
  const raw   = req.params.txHash;
  const clean = (raw || "").trim();

  // ── Input validation ────────────────────────────────────────
  if (!clean || clean.length < 40) {
    logger.warn(`[lookup] Invalid input: "${clean.slice(0, 30)}"`);
    return res.status(400).json({
      error:  "Invalid transaction hash. Must be at least 40 characters.",
      code:   "INVALID_TX_HASH",
      input:  clean.slice(0, 20) + "...",
    });
  }

  const hashType = detectHashType(clean);
  logger.info(`[lookup] Hash type detected: ${hashType} — ${clean.slice(0, 14)}...`);

  try {
    // ── BTC hash (64 hex, no 0x prefix) ───────────────────────
    if ((hashType === "btc") && !clean.startsWith("0x")) {
      const r = await lookupBTC(clean);
      if (r) return res.json(r);

      // Same format = Tron — try as fallback
      const t = await lookupTron(clean);
      if (t) return res.json(t);
    }

    // ── Solana signature ───────────────────────────────────────
    if (hashType === "solana") {
      const r = await lookupSolana(clean);
      if (r) return res.json(r);
    }

    // ── EVM hash (0x + 64 hex) ─────────────────────────────────
    if (hashType === "evm") {
      const chains  = Object.keys(EVM_CHAINS);
      const results = await Promise.allSettled(chains.map(c => lookupEVM(c, clean)));
      for (const r of results) {
        if (r.status === "fulfilled" && r.value) return res.json(r.value);
      }
    }

    logger.warn(`[lookup] Not found on any chain: ${clean.slice(0, 14)}...`);
    return res.status(404).json({
      found:   false,
      error:   "Transaction not found on any supported blockchain.",
      code:    "TX_NOT_FOUND",
      tried:   ["Sepolia", "Ethereum", "Base", "Optimism", "Arbitrum", "Polygon", "Linea", "BNB Chain", "Bitcoin", "Solana", "Tron"],
    });

  } catch (err) {
    logger.error(`[lookup] Unexpected error: ${err.message}`);
    next(err);
  }
});

// ═══════════════════════════════════════════════════════════════
// ROUTE 2: GET /api/transactions/wallet/:address
// Validates address → detects chain family → service lookup
// ═══════════════════════════════════════════════════════════════
router.get("/wallet/:address", async (req, res, next) => {
  const raw   = req.params.address;
  const clean = (raw || "").trim();

  // ── Input validation ────────────────────────────────────────
  if (!clean || clean.length < 25) {
    logger.warn(`[wallet] Invalid address: "${clean.slice(0, 20)}"`);
    return res.status(400).json({
      error: "Invalid wallet address. Must be at least 25 characters.",
      code:  "INVALID_ADDRESS",
    });
  }

  const addrType = detectAddressType(clean);
  logger.info(`[wallet] Address type: ${addrType} — ${clean.slice(0, 12)}...`);

  if (addrType === "unknown") {
    return res.status(400).json({
      error: "Unrecognised address format. Supported: EVM (0x), Bitcoin (1/3/bc1), Solana, Tron (T).",
      code:  "UNKNOWN_ADDRESS_FORMAT",
    });
  }

  try {
    let allTxns = [];
    let chainsSearched = [];
    let source = "";

    if (addrType === "evm") {
      const chains  = Object.keys(EVM_CHAINS);
      source        = "Blockscout API (blockscout.com)";
      chainsSearched = chains.map(c => EVM_CHAINS[c].name);

      const results = await Promise.allSettled(
        chains.map(c => getWalletHistoryBlockscout(c, clean))
      );
      results.forEach(r => { if (r.status === "fulfilled") allTxns.push(...r.value); });

      // Sort newest first
      allTxns.sort((a, b) => {
        if (!a.timestamp || a.timestamp === "Unknown") return 1;
        if (!b.timestamp || b.timestamp === "Unknown") return -1;
        return new Date(b.timestamp) - new Date(a.timestamp);
      });

    } else if (addrType === "btc") {
      source         = "Blockstream.info API";
      chainsSearched = ["Bitcoin Mainnet"];
      allTxns        = await getWalletHistoryBTC(clean);

    } else if (addrType === "solana") {
      source         = "Solana Mainnet RPC";
      chainsSearched = ["Solana Mainnet"];
      allTxns        = await getWalletHistorySolana(clean);

    } else if (addrType === "tron") {
      source         = "TronGrid API";
      chainsSearched = ["Tron Mainnet"];
      allTxns        = await getWalletHistoryTron(clean);
    }

    logger.info(`[wallet] ${clean.slice(0, 12)}...: ${allTxns.length} txs found across ${chainsSearched.length} chain(s)`);
    return res.json({
      address:       clean,
      addressType:   addrType,
      transactions:  allTxns,
      count:         allTxns.length,
      chainsSearched,
      source,
    });

  } catch (err) {
    logger.error(`[wallet] Unexpected error: ${err.message}`);
    next(err);
  }
});

// ═══════════════════════════════════════════════════════════════
// ROUTE 3: GET /api/transactions/total
// Queries the deployed smart contract on Sepolia
// ═══════════════════════════════════════════════════════════════
router.get("/total", async (req, res, next) => {
  try {
    const total = await getContractTotal();
    return res.json({
      total,
      contract: process.env.CONTRACT_ADDRESS,
      network:  "Sepolia TestNet",
    });
  } catch (err) {
    logger.error(`[total] Contract query failed: ${err.message}`);
    return res.status(500).json({
      error: "Failed to query smart contract.",
      code:  "CONTRACT_QUERY_FAILED",
    });
  }
});

module.exports = router;
