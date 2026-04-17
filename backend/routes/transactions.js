const express = require("express");
const router  = express.Router();
const logger  = require("../logger");

const {
  VALIDATORS,
  EVM_CHAINS,
  lookupEVM,
  lookupBTC,
  lookupSolana,
  lookupTron,
  getWalletHistoryBlockscout,
  getWalletHistoryBTC,
  getWalletHistorySolana,
  getWalletHistoryTron,
  getContractTotal,
} = require("../services/chainService");

// ═══════════════════════════════════════════════════════════════
// ROUTE 1: GET /api/transactions/lookup/:txHash
// Auto-detects chain — tries all in parallel
// ═══════════════════════════════════════════════════════════════
router.get("/lookup/:txHash", async (req, res, next) => {
  try {
    const clean = req.params.txHash.trim();

    // Bitcoin hash (64 hex, no 0x)?
    if (VALIDATORS.isBTCHash(clean) && !clean.startsWith("0x")) {
      const r = await lookupBTC(clean);
      if (r) return res.json(r);
    }

    // Solana signature?
    if (VALIDATORS.isSolHash(clean)) {
      const r = await lookupSolana(clean);
      if (r) return res.json(r);
    }

    // Tron hash (64 hex)?
    if (VALIDATORS.isBTCHash(clean)) {
      const r = await lookupTron(clean);
      if (r) return res.json(r);
    }

    // EVM hash (0x + 64)?
    if (VALIDATORS.isEVMHash(clean)) {
      const chains  = Object.keys(EVM_CHAINS);
      const results = await Promise.allSettled(chains.map(c => lookupEVM(c, clean)));
      for (const r of results) {
        if (r.status === "fulfilled" && r.value) return res.json(r.value);
      }
    }

    return res.status(404).json({
      found: false,
      message: "Transaction not found on any supported blockchain.",
      tried: ["Sepolia", "Ethereum", "Base", "Optimism", "Arbitrum", "Polygon", "Linea", "BNB Chain", "Bitcoin", "Solana", "Tron"],
    });
  } catch (err) {
    logger.error(`[lookup] unhandled: ${err.message}`, { stack: err.stack });
    next(err);
  }
});

// ═══════════════════════════════════════════════════════════════
// ROUTE 2: GET /api/transactions/wallet/:address
// Auto-detects address type → searches ALL matching chains
// ═══════════════════════════════════════════════════════════════
router.get("/wallet/:address", async (req, res, next) => {
  try {
    const clean  = req.params.address.trim();
    let allTxns  = [];
    let chains   = [];
    let source   = "";

    if (VALIDATORS.isEVMAddr(clean)) {
      chains = Object.keys(EVM_CHAINS);
      source = "Blockscout API (blockscout.com)";
      const results = await Promise.allSettled(chains.map(c => getWalletHistoryBlockscout(c, clean)));
      results.forEach(r => { if (r.status === "fulfilled") allTxns.push(...r.value); });
      allTxns.sort((a, b) => {
        if (a.timestamp === "Unknown" || a.timestamp === "Pending") return 1;
        if (b.timestamp === "Unknown" || b.timestamp === "Pending") return -1;
        return new Date(b.timestamp) - new Date(a.timestamp);
      });

    } else if (VALIDATORS.isBTCAddr(clean)) {
      source  = "Blockstream.info API";
      allTxns = await getWalletHistoryBTC(clean);

    } else if (VALIDATORS.isSolAddr(clean)) {
      source  = "Solana Mainnet RPC";
      allTxns = await getWalletHistorySolana(clean);

    } else if (VALIDATORS.isTronAddr(clean)) {
      source  = "TronGrid API";
      allTxns = await getWalletHistoryTron(clean);

    } else {
      return res.status(400).json({ error: "Unrecognised address format. Paste a full wallet address." });
    }

    return res.json({
      address: clean,
      transactions: allTxns,
      count: allTxns.length,
      chainsSearched: chains.length > 0 ? chains.map(c => EVM_CHAINS[c]?.name) : [source.split(" ")[0]],
      source,
    });
  } catch (err) {
    logger.error(`[wallet] unhandled: ${err.message}`, { stack: err.stack });
    next(err);
  }
});

// ═══════════════════════════════════════════════════════════════
// ROUTE 3: GET /api/transactions/total
// ═══════════════════════════════════════════════════════════════
router.get("/total", async (req, res, next) => {
  try {
    const total = await getContractTotal();
    res.json({ total });
  } catch (err) {
    logger.error(`[total] ${err.message}`);
    next(err);
  }
});

module.exports = router;
