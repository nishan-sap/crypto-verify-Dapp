const express = require("express");
const { ethers } = require("ethers");
require("dotenv").config();
const router = express.Router();

// ═══════════════════════════════════════════════════════════════
// INPUT VALIDATION — regex only, zero SQL/NoSQL risk
// ═══════════════════════════════════════════════════════════════
const isEVMHash    = h => /^0x[a-fA-F0-9]{64}$/.test(h);
const isBTCHash    = h => /^[a-fA-F0-9]{64}$/.test(h);
const isSolHash    = h => /^[1-9A-HJ-NP-Za-km-z]{80,100}$/.test(h);
const isEVMAddr    = a => /^0x[a-fA-F0-9]{40}$/.test(a);
const isBTCAddr    = a => /^(1|3|bc1)[a-zA-Z0-9]{25,62}$/.test(a);
const isSolAddr    = a => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(a);
const isTronAddr   = a => /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(a);

// ═══════════════════════════════════════════════════════════════
// CHAIN CONFIG
// ═══════════════════════════════════════════════════════════════
const EVM_CHAINS = {
  sepolia:  { name:"Sepolia TestNet",   rpc: process.env.SEPOLIA_RPC_URL, explorer:"https://sepolia.etherscan.io/tx/",         blockscout:"https://eth-sepolia.blockscout.com/api" },
  ethereum: { name:"Ethereum Mainnet",  rpc:"https://ethereum.publicnode.com",                explorer:"https://etherscan.io/tx/",                     blockscout:"https://eth.blockscout.com/api" },
  base:     { name:"Base",              rpc:"https://base.publicnode.com",                    explorer:"https://basescan.org/tx/",                     blockscout:"https://base.blockscout.com/api" },
  op:       { name:"Optimism",          rpc:"https://optimism.publicnode.com",                explorer:"https://optimistic.etherscan.io/tx/",          blockscout:"https://optimism.blockscout.com/api" },
  arbitrum: { name:"Arbitrum One",      rpc:"https://arbitrum-one.publicnode.com",            explorer:"https://arbiscan.io/tx/",                      blockscout:"https://arbitrum.blockscout.com/api" },
  polygon:  { name:"Polygon",           rpc:"https://polygon-bsc.publicnode.com",             explorer:"https://polygonscan.com/tx/",                  blockscout:"https://polygon.blockscout.com/api" },
  linea:    { name:"Linea",             rpc:"https://linea.publicnode.com",                   explorer:"https://lineascan.build/tx/",                  blockscout:"https://explorer.linea.build/api" },
  bnb:      { name:"BNB Chain",         rpc:"https://bsc.publicnode.com",                     explorer:"https://bscscan.com/tx/",                      blockscout:"https://bsc.blockscout.com/api" },
};

const SYMBOLS = { sepolia:"SepoliaETH", ethereum:"ETH", base:"ETH", op:"ETH", arbitrum:"ETH", polygon:"MATIC", linea:"ETH", bnb:"BNB" };

// ═══════════════════════════════════════════════════════════════
// FETCH HELPER — with timeout
// ═══════════════════════════════════════════════════════════════
async function safeFetch(url, options = {}) {
  const { default: fetch } = await import("node-fetch");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal, headers: { "User-Agent": "CryptoVerify/3.0", ...(options.headers||{}) } });
    return res;
  } finally { clearTimeout(timer); }
}

// ═══════════════════════════════════════════════════════════════
// EVM TX LOOKUP via JSON-RPC
// ═══════════════════════════════════════════════════════════════
async function lookupEVM(chainId, txHash) {
  const cfg = EVM_CHAINS[chainId];
  const provider = new ethers.JsonRpcProvider(cfg.rpc);
  const [tx, receipt] = await Promise.all([
    provider.getTransaction(txHash),
    provider.getTransactionReceipt(txHash).catch(() => null)
  ]);
  if (!tx) return null;
  const block = tx.blockNumber ? await provider.getBlock(tx.blockNumber).catch(()=>null) : null;
  const latest = await provider.getBlockNumber().catch(() => 0);
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
}

// ═══════════════════════════════════════════════════════════════
// BITCOIN TX LOOKUP
// ═══════════════════════════════════════════════════════════════
async function lookupBTC(txHash) {
  const r = await safeFetch(`https://blockstream.info/api/tx/${txHash}`);
  if (!r.ok) return null;
  const d = await r.json();
  const out = d.vout.reduce((s,v) => s + (v.value||0), 0);
  const inp = d.vin.reduce((s,v) => s + (v.prevout?.value||0), 0);
  return {
    found: true, chain: "bitcoin", network: "Bitcoin Mainnet", symbol: "BTC", txHash,
    from: d.vin[0]?.prevout?.scriptpubkey_address || "Coinbase",
    to: d.vout[0]?.scriptpubkey_address || "Multiple",
    value: (out / 1e8).toFixed(8) + " BTC",
    fee: inp > 0 ? ((inp - out) / 1e8).toFixed(8) + " BTC" : "N/A",
    blockNumber: d.status?.block_height || "Pending",
    confirmations: d.status?.confirmed ? "Confirmed" : "Unconfirmed",
    timestamp: d.status?.block_time ? new Date(d.status.block_time * 1000).toISOString() : "Pending",
    status: d.status?.confirmed ? "Success" : "Pending",
    size: d.size + " bytes", inputs: d.vin.length, outputs: d.vout.length,
    type: "Bitcoin Transfer",
    verifiedBy: "Blockstream.info API (blockstream.info)",
    explorerUrl: "https://blockstream.info/tx/" + txHash,
  };
}

// ═══════════════════════════════════════════════════════════════
// SOLANA TX LOOKUP
// ═══════════════════════════════════════════════════════════════
async function lookupSolana(sig) {
  const r = await safeFetch("https://api.mainnet-beta.solana.com", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc:"2.0", id:1, method:"getTransaction", params:[sig,{encoding:"json",maxSupportedTransactionVersion:0}] })
  });
  const d = await r.json();
  if (!d.result) return null;
  const tx = d.result;
  const lamports = tx.meta ? Math.abs((tx.meta.preBalances[0]||0) - (tx.meta.postBalances[0]||0)) : 0;
  return {
    found: true, chain: "solana", network: "Solana Mainnet", symbol: "SOL", txHash: sig,
    from: tx.transaction?.message?.accountKeys?.[0] || "Unknown",
    to: tx.transaction?.message?.accountKeys?.[1] || "Unknown",
    value: (lamports / 1e9).toFixed(9) + " SOL",
    fee: tx.meta?.fee ? (tx.meta.fee / 1e9).toFixed(9) + " SOL" : "N/A",
    blockNumber: tx.slot || "Unknown",
    confirmations: "Confirmed",
    timestamp: tx.blockTime ? new Date(tx.blockTime * 1000).toISOString() : "Unknown",
    status: tx.meta?.err ? "Failed" : "Success",
    type: "Solana Transaction",
    verifiedBy: "Solana Mainnet RPC (api.mainnet-beta.solana.com)",
    explorerUrl: "https://explorer.solana.com/tx/" + sig,
  };
}

// ═══════════════════════════════════════════════════════════════
// TRON TX LOOKUP
// ═══════════════════════════════════════════════════════════════
async function lookupTron(txHash) {
  const r = await safeFetch(`https://api.trongrid.io/v1/transactions/${txHash}`);
  if (!r.ok) return null;
  const d = await r.json();
  if (!d.data?.[0]) return null;
  const tx = d.data[0];
  const amt = tx.raw_data?.contract?.[0]?.parameter?.value?.amount || 0;
  return {
    found: true, chain: "tron", network: "Tron Mainnet", symbol: "TRX", txHash,
    from: tx.raw_data?.contract?.[0]?.parameter?.value?.owner_address || "Unknown",
    to: tx.raw_data?.contract?.[0]?.parameter?.value?.to_address || "Unknown",
    value: (amt / 1e6).toFixed(6) + " TRX",
    blockNumber: tx.blockNumber || "Unknown",
    confirmations: "Confirmed",
    timestamp: tx.block_timestamp ? new Date(tx.block_timestamp).toISOString() : "Unknown",
    status: tx.ret?.[0]?.contractRet === "SUCCESS" ? "Success" : "Failed",
    type: "TRX Transfer",
    verifiedBy: "TronGrid API (api.trongrid.io)",
    explorerUrl: "https://tronscan.org/#/transaction/" + txHash,
  };
}

// ═══════════════════════════════════════════════════════════════
// WALLET HISTORY — Blockscout (free, no API key)
// ═══════════════════════════════════════════════════════════════
async function getWalletHistoryBlockscout(chainId, address) {
  const cfg = EVM_CHAINS[chainId];
  const url = `${cfg.blockscout}?module=account&action=txlist&address=${address}&sort=desc&offset=15&page=1`;
  try {
    const r = await safeFetch(url);
    if (!r.ok) return [];
    const d = await r.json();
    if (!Array.isArray(d.result)) return [];
    return d.result.slice(0, 15).map(tx => ({
      hash: tx.hash,
      from: tx.from,
      to: tx.to || "Contract",
      value: ethers.formatEther(tx.value || "0") + " " + SYMBOLS[chainId],
      timestamp: tx.timeStamp ? new Date(parseInt(tx.timeStamp) * 1000).toISOString() : "Unknown",
      status: tx.isError === "0" ? "Success" : "Failed",
      type: tx.input && tx.input !== "0x" ? "Contract" : "Transfer",
      blockNumber: tx.blockNumber,
      chain: chainId,
      network: cfg.name,
      explorerUrl: cfg.explorer + tx.hash,
    }));
  } catch { return []; }
}

async function getWalletHistoryBTC(address) {
  try {
    const r = await safeFetch(`https://blockstream.info/api/address/${address}/txs`);
    if (!r.ok) return [];
    const txs = await r.json();
    return txs.slice(0, 15).map(tx => ({
      hash: tx.txid,
      from: tx.vin[0]?.prevout?.scriptpubkey_address || "Unknown",
      to: tx.vout[0]?.scriptpubkey_address || "Unknown",
      value: (tx.vout.reduce((s,v)=>s+(v.value||0),0)/1e8).toFixed(8) + " BTC",
      timestamp: tx.status?.block_time ? new Date(tx.status.block_time*1000).toISOString() : "Pending",
      status: tx.status?.confirmed ? "Success" : "Pending",
      type: "Bitcoin Transfer",
      blockNumber: tx.status?.block_height || "Pending",
      chain: "bitcoin", network: "Bitcoin Mainnet",
      explorerUrl: "https://blockstream.info/tx/" + tx.txid,
    }));
  } catch { return []; }
}

async function getWalletHistorySolana(address) {
  try {
    const r = await safeFetch("https://api.mainnet-beta.solana.com", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({jsonrpc:"2.0",id:1,method:"getSignaturesForAddress",params:[address,{limit:15}]})
    });
    const d = await r.json();
    return (d.result||[]).map(s => ({
      hash: s.signature,
      timestamp: s.blockTime ? new Date(s.blockTime*1000).toISOString() : "Unknown",
      status: s.err ? "Failed" : "Success",
      type: "Solana Transaction",
      chain: "solana", network: "Solana Mainnet",
      explorerUrl: "https://explorer.solana.com/tx/" + s.signature,
    }));
  } catch { return []; }
}

async function getWalletHistoryTron(address) {
  try {
    const r = await safeFetch(`https://api.trongrid.io/v1/accounts/${address}/transactions?limit=15`);
    if (!r.ok) return [];
    const d = await r.json();
    return (d.data||[]).map(tx => ({
      hash: tx.txID,
      status: tx.ret?.[0]?.contractRet === "SUCCESS" ? "Success" : "Failed",
      type: "TRX Transfer",
      chain: "tron", network: "Tron Mainnet",
      explorerUrl: "https://tronscan.org/#/transaction/" + tx.txID,
    }));
  } catch { return []; }
}

// ═══════════════════════════════════════════════════════════════
// ROUTE 1: GET /api/transactions/lookup/:txHash
// Auto-detects chain — tries all in parallel
// ═══════════════════════════════════════════════════════════════
router.get("/lookup/:txHash", async (req, res) => {
  const { txHash } = req.params;
  const clean = txHash.trim();

  // Bitcoin hash (64 hex, no 0x)?
  if (isBTCHash(clean) && !clean.startsWith("0x")) {
    try {
      const r = await lookupBTC(clean);
      if (r) return res.json(r);
    } catch {}
  }

  // Solana signature?
  if (isSolHash(clean)) {
    try {
      const r = await lookupSolana(clean);
      if (r) return res.json(r);
    } catch {}
  }

  // Tron hash (64 hex)?
  if (isBTCHash(clean)) {
    try {
      const r = await lookupTron(clean);
      if (r) return res.json(r);
    } catch {}
  }

  // EVM hash (0x + 64)?
  if (isEVMHash(clean)) {
    // Try all EVM chains in parallel — return first found
    const chains = Object.keys(EVM_CHAINS);
    const results = await Promise.allSettled(chains.map(c => lookupEVM(c, clean)));
    for (const r of results) {
      if (r.status === "fulfilled" && r.value) return res.json(r.value);
    }
  }

  return res.status(404).json({
    found: false,
    message: "Transaction not found on any supported blockchain.",
    tried: ["Sepolia", "Ethereum", "Base", "Optimism", "Arbitrum", "Polygon", "Linea", "BNB Chain", "Bitcoin", "Solana", "Tron"]
  });
});

// ═══════════════════════════════════════════════════════════════
// ROUTE 2: GET /api/transactions/wallet/:address
// Auto-detects address type → searches ALL matching chains
// ═══════════════════════════════════════════════════════════════
router.get("/wallet/:address", async (req, res) => {
  const { address } = req.params;
  const clean = address.trim();
  let allTxns = [];
  let chains = [];
  let source = "";

  if (isEVMAddr(clean)) {
    // Search ALL EVM chains in parallel
    chains = Object.keys(EVM_CHAINS);
    source = "Blockscout API (blockscout.com)";
    const results = await Promise.allSettled(chains.map(c => getWalletHistoryBlockscout(c, clean)));
    results.forEach(r => { if (r.status === "fulfilled") allTxns.push(...r.value); });

    // Sort by timestamp, newest first
    allTxns.sort((a, b) => {
      if (a.timestamp === "Unknown" || a.timestamp === "Pending") return 1;
      if (b.timestamp === "Unknown" || b.timestamp === "Pending") return -1;
      return new Date(b.timestamp) - new Date(a.timestamp);
    });

  } else if (isBTCAddr(clean)) {
    source = "Blockstream.info API";
    allTxns = await getWalletHistoryBTC(clean);

  } else if (isSolAddr(clean)) {
    source = "Solana Mainnet RPC";
    allTxns = await getWalletHistorySolana(clean);

  } else if (isTronAddr(clean)) {
    source = "TronGrid API";
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
});

// ═══════════════════════════════════════════════════════════════
// ROUTE 3: GET /api/transactions/total
// ═══════════════════════════════════════════════════════════════
router.get("/total", async (req, res) => {
  try {
    const ABI = ["function totalTransactions() external view returns (uint256)"];
    const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
    const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, ABI, provider);
    const total = await contract.totalTransactions();
    res.json({ total: Number(total) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
