/**
 * backend/services/chainService.js
 * ─────────────────────────────────────────────────────────────────
 * NSTCrypto — Blockchain Service Layer
 * CN6035 — Nishan Sapkota
 *
 * This module contains ALL business logic for querying blockchains.
 * Routes import from here — keeping routes thin and testable.
 *
 * Responsibilities:
 *   • Chain configuration registry
 *   • Input validation helpers
 *   • EVM / BTC / Solana / Tron transaction lookup
 *   • Wallet history retrieval for all supported chains
 *   • Structured error responses
 * ─────────────────────────────────────────────────────────────────
 */

const { ethers } = require("ethers");
require("dotenv").config({ path: require("path").resolve(__dirname, "../../.env") });

const logger = require("../logger");

// ═══════════════════════════════════════════════════════════════
// INPUT VALIDATION — regex only, zero injection risk
// ═══════════════════════════════════════════════════════════════

const VALIDATORS = {
  isEVMHash:  h => /^0x[a-fA-F0-9]{64}$/.test(h),
  isBTCHash:  h => /^[a-fA-F0-9]{64}$/.test(h),
  isSolHash:  h => /^[1-9A-HJ-NP-Za-km-z]{80,100}$/.test(h),
  isEVMAddr:  a => /^0x[a-fA-F0-9]{40}$/.test(a),
  isBTCAddr:  a => /^(1|3|bc1)[a-zA-Z0-9]{25,62}$/.test(a),
  isSolAddr:  a => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(a),
  isTronAddr: a => /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(a),
};

/**
 * Validate a transaction hash — returns the detected type or throws.
 * @param {string} hash
 * @returns {"evm"|"btc"|"solana"|"tron"|"unknown"}
 */
function detectHashType(hash) {
  if (!hash || typeof hash !== "string") return "unknown";
  const h = hash.trim();
  if (VALIDATORS.isEVMHash(h))  return "evm";
  if (VALIDATORS.isSolHash(h))  return "solana";
  if (VALIDATORS.isBTCHash(h))  return "btc";   // also covers Tron (same format)
  return "unknown";
}

/**
 * Validate a wallet address — returns the detected type or throws.
 * @param {string} address
 * @returns {"evm"|"btc"|"solana"|"tron"|"unknown"}
 */
function detectAddressType(address) {
  if (!address || typeof address !== "string") return "unknown";
  const a = address.trim();
  if (VALIDATORS.isEVMAddr(a))  return "evm";
  if (VALIDATORS.isBTCAddr(a))  return "btc";
  if (VALIDATORS.isTronAddr(a)) return "tron";
  if (VALIDATORS.isSolAddr(a))  return "solana";
  return "unknown";
}

// ═══════════════════════════════════════════════════════════════
// CHAIN CONFIG REGISTRY
// ═══════════════════════════════════════════════════════════════

const EVM_CHAINS = {
  sepolia:  { name: "Sepolia TestNet",  rpc: process.env.SEPOLIA_RPC_URL,       explorer: "https://sepolia.etherscan.io/tx/",        blockscout: "https://eth-sepolia.blockscout.com/api" },
  ethereum: { name: "Ethereum Mainnet", rpc: "https://ethereum.publicnode.com",  explorer: "https://etherscan.io/tx/",               blockscout: "https://eth.blockscout.com/api" },
  base:     { name: "Base",             rpc: "https://base.publicnode.com",       explorer: "https://basescan.org/tx/",              blockscout: "https://base.blockscout.com/api" },
  op:       { name: "Optimism",         rpc: "https://optimism.publicnode.com",   explorer: "https://optimistic.etherscan.io/tx/",   blockscout: "https://optimism.blockscout.com/api" },
  arbitrum: { name: "Arbitrum One",     rpc: "https://arbitrum-one.publicnode.com", explorer: "https://arbiscan.io/tx/",             blockscout: "https://arbitrum.blockscout.com/api" },
  polygon:  { name: "Polygon",          rpc: "https://polygon-bsc.publicnode.com", explorer: "https://polygonscan.com/tx/",          blockscout: "https://polygon.blockscout.com/api" },
  linea:    { name: "Linea",            rpc: "https://linea.publicnode.com",      explorer: "https://lineascan.build/tx/",           blockscout: "https://explorer.linea.build/api" },
  bnb:      { name: "BNB Chain",        rpc: "https://bsc.publicnode.com",        explorer: "https://bscscan.com/tx/",              blockscout: "https://bsc.blockscout.com/api" },
};

const SYMBOLS = {
  sepolia: "SepoliaETH", ethereum: "ETH", base: "ETH", op: "ETH",
  arbitrum: "ETH", polygon: "MATIC", linea: "ETH", bnb: "BNB"
};

// ═══════════════════════════════════════════════════════════════
// FETCH HELPER — with timeout and structured error
// ═══════════════════════════════════════════════════════════════

async function safeFetch(url, options = {}) {
  const { default: fetch } = await import("node-fetch");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: { "User-Agent": "NSTCrypto/1.0", ...(options.headers || {}) }
    });
    return res;
  } catch (err) {
    if (err.name === "AbortError") {
      logger.warn(`safeFetch timeout: ${url}`);
      throw new Error("FETCH_TIMEOUT");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// ═══════════════════════════════════════════════════════════════
// TX LOOKUP — EVM (JSON-RPC via ethers.js)
// ═══════════════════════════════════════════════════════════════

async function lookupEVM(chainId, txHash) {
  const cfg = EVM_CHAINS[chainId];
  try {
    const provider = new ethers.JsonRpcProvider(cfg.rpc);
    const [tx, receipt] = await Promise.all([
      provider.getTransaction(txHash),
      provider.getTransactionReceipt(txHash).catch(() => null)
    ]);
    if (!tx) return null;
    const block  = tx.blockNumber ? await provider.getBlock(tx.blockNumber).catch(() => null) : null;
    const latest = await provider.getBlockNumber().catch(() => 0);

    logger.info(`[EVM] Found ${txHash.slice(0, 14)}... on ${cfg.name}`);
    return {
      found: true, chain: chainId, network: cfg.name,
      symbol: SYMBOLS[chainId], txHash,
      from: tx.from,
      to: tx.to || "Contract Creation",
      value: ethers.formatEther(tx.value) + " " + SYMBOLS[chainId],
      blockNumber: tx.blockNumber || "Pending",
      confirmations: tx.blockNumber ? Math.max(0, latest - tx.blockNumber) : 0,
      timestamp: block ? new Date(block.timestamp * 1000).toISOString() : "Pending",
      status: receipt ? (receipt.status === 1 ? "Success" : "Failed") : "Pending",
      gasUsed: receipt ? receipt.gasUsed.toString() : "Pending",
      gasPrice: tx.gasPrice ? ethers.formatUnits(tx.gasPrice, "gwei") + " Gwei" : "N/A",
      type: tx.data && tx.data !== "0x" ? "Contract Interaction" : "Transfer",
      nonce: tx.nonce,
      verifiedBy: `${cfg.name} JSON-RPC (publicnode.com)`,
      explorerUrl: cfg.explorer + txHash,
    };
  } catch (err) {
    logger.debug(`[EVM] ${chainId} lookup failed for ${txHash.slice(0, 14)}...: ${err.message}`);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════
// TX LOOKUP — Bitcoin (Blockstream)
// ═══════════════════════════════════════════════════════════════

async function lookupBTC(txHash) {
  try {
    const r = await safeFetch(`https://blockstream.info/api/tx/${txHash}`);
    if (!r.ok) return null;
    const d   = await r.json();
    const out = d.vout.reduce((s, v) => s + (v.value || 0), 0);
    const inp = d.vin.reduce((s, v)  => s + (v.prevout?.value || 0), 0);

    logger.info(`[BTC] Found ${txHash.slice(0, 14)}...`);
    return {
      found: true, chain: "bitcoin", network: "Bitcoin Mainnet", symbol: "BTC", txHash,
      from: d.vin[0]?.prevout?.scriptpubkey_address || "Coinbase",
      to:   d.vout[0]?.scriptpubkey_address || "Multiple",
      value: (out / 1e8).toFixed(8) + " BTC",
      fee:   inp > 0 ? ((inp - out) / 1e8).toFixed(8) + " BTC" : "N/A",
      blockNumber: d.status?.block_height || "Pending",
      confirmations: d.status?.confirmed ? "Confirmed" : "Unconfirmed",
      timestamp: d.status?.block_time ? new Date(d.status.block_time * 1000).toISOString() : "Pending",
      status: d.status?.confirmed ? "Success" : "Pending",
      size: d.size + " bytes", inputs: d.vin.length, outputs: d.vout.length,
      type: "Bitcoin Transfer",
      verifiedBy: "Blockstream.info API",
      explorerUrl: "https://blockstream.info/tx/" + txHash,
    };
  } catch (err) {
    logger.debug(`[BTC] lookup failed for ${txHash.slice(0, 14)}...: ${err.message}`);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════
// TX LOOKUP — Solana (public RPC)
// ═══════════════════════════════════════════════════════════════

async function lookupSolana(sig) {
  try {
    const r = await safeFetch("https://api.mainnet-beta.solana.com", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0", id: 1, method: "getTransaction",
        params: [sig, { encoding: "json", maxSupportedTransactionVersion: 0 }]
      })
    });
    const d = await r.json();
    if (!d.result) return null;
    const tx      = d.result;
    const lamports = tx.meta ? Math.abs((tx.meta.preBalances[0] || 0) - (tx.meta.postBalances[0] || 0)) : 0;

    logger.info(`[Solana] Found ${sig.slice(0, 14)}...`);
    return {
      found: true, chain: "solana", network: "Solana Mainnet", symbol: "SOL", txHash: sig,
      from: tx.transaction?.message?.accountKeys?.[0] || "Unknown",
      to:   tx.transaction?.message?.accountKeys?.[1] || "Unknown",
      value: (lamports / 1e9).toFixed(9) + " SOL",
      fee:   tx.meta?.fee ? (tx.meta.fee / 1e9).toFixed(9) + " SOL" : "N/A",
      blockNumber: tx.slot || "Unknown",
      confirmations: "Confirmed",
      timestamp: tx.blockTime ? new Date(tx.blockTime * 1000).toISOString() : "Unknown",
      status: tx.meta?.err ? "Failed" : "Success",
      type: "Solana Transaction",
      verifiedBy: "Solana Mainnet RPC (api.mainnet-beta.solana.com)",
      explorerUrl: "https://explorer.solana.com/tx/" + sig,
    };
  } catch (err) {
    logger.debug(`[Solana] lookup failed: ${err.message}`);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════
// TX LOOKUP — Tron (TronGrid)
// ═══════════════════════════════════════════════════════════════

async function lookupTron(txHash) {
  try {
    const r = await safeFetch(`https://api.trongrid.io/v1/transactions/${txHash}`);
    if (!r.ok) return null;
    const d = await r.json();
    if (!d.data?.[0]) return null;
    const tx  = d.data[0];
    const amt = tx.raw_data?.contract?.[0]?.parameter?.value?.amount || 0;

    logger.info(`[Tron] Found ${txHash.slice(0, 14)}...`);
    return {
      found: true, chain: "tron", network: "Tron Mainnet", symbol: "TRX", txHash,
      from: tx.raw_data?.contract?.[0]?.parameter?.value?.owner_address || "Unknown",
      to:   tx.raw_data?.contract?.[0]?.parameter?.value?.to_address    || "Unknown",
      value: (amt / 1e6).toFixed(6) + " TRX",
      blockNumber: tx.blockNumber || "Unknown",
      confirmations: "Confirmed",
      timestamp: tx.block_timestamp ? new Date(tx.block_timestamp).toISOString() : "Unknown",
      status: tx.ret?.[0]?.contractRet === "SUCCESS" ? "Success" : "Failed",
      type: "TRX Transfer",
      verifiedBy: "TronGrid API (api.trongrid.io)",
      explorerUrl: "https://tronscan.org/#/transaction/" + txHash,
    };
  } catch (err) {
    logger.debug(`[Tron] lookup failed: ${err.message}`);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════
// WALLET HISTORY — EVM (Blockscout)
// ═══════════════════════════════════════════════════════════════

async function getWalletHistoryBlockscout(chainId, address) {
  const cfg = EVM_CHAINS[chainId];
  const url = `${cfg.blockscout}?module=account&action=txlist&address=${address}&sort=desc&offset=15&page=1`;
  try {
    const r = await safeFetch(url);
    if (!r.ok) return [];
    const d = await r.json();
    if (!Array.isArray(d.result)) return [];
    logger.debug(`[Blockscout] ${chainId}: ${d.result.length} txs for ${address.slice(0, 10)}...`);
    return d.result.slice(0, 15).map(tx => ({
      hash: tx.hash,
      from: tx.from,
      to:   tx.to || "Contract",
      value: ethers.formatEther(tx.value || "0") + " " + SYMBOLS[chainId],
      timestamp: tx.timeStamp ? new Date(parseInt(tx.timeStamp) * 1000).toISOString() : "Unknown",
      status: tx.isError === "0" ? "Success" : "Failed",
      type: tx.input && tx.input !== "0x" ? "Contract" : "Transfer",
      blockNumber: tx.blockNumber,
      chain: chainId,
      network: cfg.name,
      explorerUrl: cfg.explorer + tx.hash,
    }));
  } catch (err) {
    logger.warn(`[Blockscout] ${chainId} wallet history failed: ${err.message}`);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════
// WALLET HISTORY — Bitcoin
// ═══════════════════════════════════════════════════════════════

async function getWalletHistoryBTC(address) {
  try {
    const r = await safeFetch(`https://blockstream.info/api/address/${address}/txs`);
    if (!r.ok) return [];
    const txs = await r.json();
    return txs.slice(0, 15).map(tx => ({
      hash: tx.txid,
      from: tx.vin[0]?.prevout?.scriptpubkey_address  || "Unknown",
      to:   tx.vout[0]?.scriptpubkey_address           || "Unknown",
      value: (tx.vout.reduce((s, v) => s + (v.value || 0), 0) / 1e8).toFixed(8) + " BTC",
      timestamp: tx.status?.block_time ? new Date(tx.status.block_time * 1000).toISOString() : "Pending",
      status: tx.status?.confirmed ? "Success" : "Pending",
      type: "Bitcoin Transfer",
      blockNumber: tx.status?.block_height || "Pending",
      chain: "bitcoin", network: "Bitcoin Mainnet",
      explorerUrl: "https://blockstream.info/tx/" + tx.txid,
    }));
  } catch (err) {
    logger.warn(`[BTC] wallet history failed: ${err.message}`);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════
// WALLET HISTORY — Solana
// ═══════════════════════════════════════════════════════════════

async function getWalletHistorySolana(address) {
  try {
    const r = await safeFetch("https://api.mainnet-beta.solana.com", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getSignaturesForAddress", params: [address, { limit: 15 }] })
    });
    const d = await r.json();
    return (d.result || []).map(s => ({
      hash: s.signature,
      timestamp: s.blockTime ? new Date(s.blockTime * 1000).toISOString() : "Unknown",
      status: s.err ? "Failed" : "Success",
      type: "Solana Transaction",
      chain: "solana", network: "Solana Mainnet",
      explorerUrl: "https://explorer.solana.com/tx/" + s.signature,
    }));
  } catch (err) {
    logger.warn(`[Solana] wallet history failed: ${err.message}`);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════
// WALLET HISTORY — Tron
// ═══════════════════════════════════════════════════════════════

async function getWalletHistoryTron(address) {
  try {
    const r = await safeFetch(`https://api.trongrid.io/v1/accounts/${address}/transactions?limit=15`);
    if (!r.ok) return [];
    const d = await r.json();
    return (d.data || []).map(tx => ({
      hash: tx.txID,
      status: tx.ret?.[0]?.contractRet === "SUCCESS" ? "Success" : "Failed",
      type: "TRX Transfer",
      chain: "tron", network: "Tron Mainnet",
      explorerUrl: "https://tronscan.org/#/transaction/" + tx.txID,
    }));
  } catch (err) {
    logger.warn(`[Tron] wallet history failed: ${err.message}`);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════
// CONTRACT SERVICE — query smart contract total
// ═══════════════════════════════════════════════════════════════

async function getContractTotal() {
  const ABI = ["function totalTransactions() external view returns (uint256)"];
  const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
  const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, ABI, provider);
  const total    = await contract.totalTransactions();
  logger.info(`[Contract] totalTransactions() = ${total}`);
  return Number(total);
}

// ═══════════════════════════════════════════════════════════════
// STRUCTURED ERROR HELPER
// ═══════════════════════════════════════════════════════════════

function serviceError(message, code, status = 400) {
  const err = new Error(message);
  err.code   = code;
  err.status = status;
  return err;
}

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

module.exports = {
  // Validators
  VALIDATORS,
  detectHashType,
  detectAddressType,
  // Chain config
  EVM_CHAINS,
  // TX lookup
  lookupEVM,
  lookupBTC,
  lookupSolana,
  lookupTron,
  // Wallet history
  getWalletHistoryBlockscout,
  getWalletHistoryBTC,
  getWalletHistorySolana,
  getWalletHistoryTron,
  // Contract
  getContractTotal,
  // Error helper
  serviceError,
};
