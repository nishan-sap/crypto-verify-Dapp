const express = require("express");
const { ethers } = require("ethers");
require("dotenv").config();
const router = express.Router();

// ── Input validators (regex only, no SQL) ─────────
const isEVMHash  = h => /^0x[a-fA-F0-9]{64}$/.test(h);
const isBTCHash  = h => /^[a-fA-F0-9]{64}$/.test(h);
const isEVMAddr  = a => /^0x[a-fA-F0-9]{40}$/.test(a);
const isSolAddr  = a => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(a);
const isTronAddr = a => /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(a);

// ── Public RPC endpoints (no API key needed) ──────
const RPCS = {
  ethereum: "https://ethereum.publicnode.com",
  sepolia:  process.env.SEPOLIA_RPC_URL,
  linea:    "https://linea.publicnode.com",
  base:     "https://base.publicnode.com",
  op:       "https://optimism.publicnode.com",
  arbitrum: "https://arbitrum-one.publicnode.com",
  polygon:  "https://polygon-bsc.publicnode.com",
  bnb:      "https://bsc.publicnode.com",
};

const SYMBOLS = {
  ethereum:"ETH", sepolia:"ETH", linea:"ETH", base:"ETH",
  op:"ETH", arbitrum:"ETH", polygon:"MATIC", bnb:"BNB"
};

const NAMES = {
  ethereum:"Ethereum Mainnet", sepolia:"Sepolia TestNet",
  linea:"Linea", base:"Base", op:"Optimism",
  arbitrum:"Arbitrum One", polygon:"Polygon", bnb:"BNB Chain",
  bitcoin:"Bitcoin", solana:"Solana", tron:"Tron"
};

const EXPLORERS = {
  ethereum:"https://etherscan.io/tx/",
  sepolia: "https://sepolia.etherscan.io/tx/",
  linea:   "https://lineascan.build/tx/",
  base:    "https://basescan.org/tx/",
  op:      "https://optimistic.etherscan.io/tx/",
  arbitrum:"https://arbiscan.io/tx/",
  polygon: "https://polygonscan.com/tx/",
  bnb:     "https://bscscan.com/tx/",
  bitcoin: "https://blockstream.info/tx/",
  solana:  "https://explorer.solana.com/tx/",
  tron:    "https://tronscan.org/#/transaction/",
};

// Explorer APIs for wallet history (free, no key)
const HISTORY_APIS = {
  ethereum: "https://api.etherscan.io/api",
  sepolia:  "https://api-sepolia.etherscan.io/api",
  linea:    "https://api.lineascan.build/api",
  base:     "https://api.basescan.org/api",
  op:       "https://api-optimistic.etherscan.io/api",
  arbitrum: "https://api.arbiscan.io/api",
  polygon:  "https://api.polygonscan.com/api",
  bnb:      "https://api.bscscan.com/api",
};

const VALID_CHAINS = ["ethereum","sepolia","linea","base","op","arbitrum","polygon","bnb","bitcoin","solana","tron"];

// ── EVM TX Lookup ─────────────────────────────────
async function lookupEVM(chain, txHash) {
  const provider = new ethers.JsonRpcProvider(RPCS[chain]);
  const [tx, receipt] = await Promise.all([
    provider.getTransaction(txHash),
    provider.getTransactionReceipt(txHash).catch(() => null)
  ]);
  if (!tx) return null;
  const block = tx.blockNumber ? await provider.getBlock(tx.blockNumber).catch(()=>null) : null;
  const currentBlock = await provider.getBlockNumber().catch(() => tx.blockNumber || 0);
  return {
    found: true, chain, network: NAMES[chain], symbol: SYMBOLS[chain], txHash,
    from: tx.from, to: tx.to || "Contract Creation",
    value: ethers.formatEther(tx.value) + " " + SYMBOLS[chain],
    blockNumber: tx.blockNumber || "Pending",
    confirmations: tx.blockNumber ? Math.max(0, currentBlock - tx.blockNumber) : 0,
    timestamp: block ? new Date(block.timestamp*1000).toISOString() : "Pending",
    status: receipt ? (receipt.status===1?"Success":"Failed") : "Pending",
    gasLimit: tx.gasLimit.toString(),
    gasUsed: receipt ? receipt.gasUsed.toString() : "Pending",
    gasPrice: tx.gasPrice ? ethers.formatUnits(tx.gasPrice,"gwei")+" Gwei" : "N/A",
    type: tx.data && tx.data!=="0x" ? "Contract Interaction" : "Transfer",
    nonce: tx.nonce,
    verifiedBy: "Public JSON-RPC Node (publicnode.com)",
    explorerUrl: EXPLORERS[chain]+txHash,
  };
}

// ── Bitcoin TX Lookup ─────────────────────────────
async function lookupBTC(txHash) {
  const { default: fetch } = await import("node-fetch");
  const urls = [
    `https://blockstream.info/api/tx/${txHash}`,
    `https://blockstream.info/testnet/api/tx/${txHash}`,
  ];
  for (const url of urls) {
    const r = await fetch(url, { headers:{"User-Agent":"CryptoVerify/2.0"} });
    if (!r.ok) continue;
    const d = await r.json();
    const out = d.vout.reduce((s,v)=>s+(v.value||0),0);
    const inp = d.vin.reduce((s,v)=>s+(v.prevout?.value||0),0);
    return {
      found:true, chain:"bitcoin", network:NAMES.bitcoin, symbol:"BTC", txHash,
      from: d.vin[0]?.prevout?.scriptpubkey_address || "Coinbase",
      to: d.vout[0]?.scriptpubkey_address || "Multiple outputs",
      value: (out/1e8).toFixed(8)+" BTC",
      fee: inp>0?((inp-out)/1e8).toFixed(8)+" BTC":"N/A",
      blockNumber: d.status?.block_height||"Pending",
      confirmations: d.status?.confirmed?"Confirmed":"Unconfirmed",
      timestamp: d.status?.block_time ? new Date(d.status.block_time*1000).toISOString() : "Pending",
      status: d.status?.confirmed?"Success":"Pending",
      size: d.size+" bytes", inputs:d.vin.length, outputs:d.vout.length,
      type:"Bitcoin Transfer",
      verifiedBy:"Blockstream.info API",
      explorerUrl: EXPLORERS.bitcoin+txHash,
    };
  }
  return null;
}

// ── Solana TX Lookup ──────────────────────────────
async function lookupSolana(txHash) {
  const { default: fetch } = await import("node-fetch");
  const r = await fetch("https://api.mainnet-beta.solana.com", {
    method:"POST", headers:{"Content-Type":"application/json"},
    body: JSON.stringify({ jsonrpc:"2.0", id:1, method:"getTransaction",
      params:[txHash,{encoding:"json",maxSupportedTransactionVersion:0}]})
  });
  const d = await r.json();
  if (!d.result) return null;
  const tx = d.result;
  const lamports = tx.meta?.postBalances && tx.meta?.preBalances
    ? Math.abs(tx.meta.preBalances[0]-tx.meta.postBalances[0]) : 0;
  return {
    found:true, chain:"solana", network:"Solana Mainnet", symbol:"SOL", txHash,
    from: tx.transaction?.message?.accountKeys?.[0]||"Unknown",
    to: tx.transaction?.message?.accountKeys?.[1]||"Unknown",
    value: (lamports/1e9).toFixed(9)+" SOL",
    fee: tx.meta?.fee ? (tx.meta.fee/1e9).toFixed(9)+" SOL" : "N/A",
    blockNumber: tx.slot||"Unknown",
    confirmations: "Confirmed",
    timestamp: tx.blockTime ? new Date(tx.blockTime*1000).toISOString() : "Unknown",
    status: tx.meta?.err ? "Failed" : "Success",
    type:"Solana Transaction",
    verifiedBy:"Solana Mainnet RPC (api.mainnet-beta.solana.com)",
    explorerUrl: EXPLORERS.solana+txHash,
  };
}

// ── Tron TX Lookup ────────────────────────────────
async function lookupTron(txHash) {
  const { default: fetch } = await import("node-fetch");
  const r = await fetch(`https://api.trongrid.io/v1/transactions/${txHash}`, {
    headers:{"TRON-PRO-API-KEY":"", "User-Agent":"CryptoVerify/2.0"}
  });
  if (!r.ok) return null;
  const d = await r.json();
  if (!d.data?.[0]) return null;
  const tx = d.data[0];
  const amt = tx.raw_data?.contract?.[0]?.parameter?.value?.amount||0;
  return {
    found:true, chain:"tron", network:"Tron Mainnet", symbol:"TRX", txHash,
    from: tx.raw_data?.contract?.[0]?.parameter?.value?.owner_address||"Unknown",
    to: tx.raw_data?.contract?.[0]?.parameter?.value?.to_address||"Unknown",
    value: (amt/1e6).toFixed(6)+" TRX",
    blockNumber: tx.blockNumber||"Unknown",
    confirmations: "Confirmed",
    timestamp: tx.block_timestamp ? new Date(tx.block_timestamp).toISOString() : "Unknown",
    status: tx.ret?.[0]?.contractRet==="SUCCESS"?"Success":"Failed",
    type:"TRX Transfer",
    verifiedBy:"TronGrid API (api.trongrid.io)",
    explorerUrl: EXPLORERS.tron+txHash,
  };
}

// ── EVM Wallet History (all public txns) ──────────
async function walletHistoryEVM(chain, address) {
  const { default: fetch } = await import("node-fetch");
  const apiBase = HISTORY_APIS[chain];
  if (!apiBase) return [];
  const url = `${apiBase}?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=desc&offset=20&page=1`;
  const r = await fetch(url, { headers:{"User-Agent":"CryptoVerify/2.0"} });
  if (!r.ok) return [];
  const d = await r.json();
  if (d.status!=="1" || !Array.isArray(d.result)) return [];
  return d.result.slice(0,20).map(tx => ({
    hash: tx.hash,
    from: tx.from,
    to: tx.to || "Contract",
    value: ethers.formatEther(tx.value||"0") + " " + SYMBOLS[chain],
    timestamp: new Date(parseInt(tx.timeStamp)*1000).toISOString(),
    status: tx.isError==="0" ? "Success" : "Failed",
    type: tx.input && tx.input!=="0x" ? "Contract Interaction" : "Transfer",
    blockNumber: tx.blockNumber,
    explorerUrl: EXPLORERS[chain]+tx.hash,
  }));
}

// ── Bitcoin Wallet History ────────────────────────
async function walletHistoryBTC(address) {
  const { default: fetch } = await import("node-fetch");
  const r = await fetch(`https://blockstream.info/api/address/${address}/txs`, {
    headers:{"User-Agent":"CryptoVerify/2.0"}
  });
  if (!r.ok) return [];
  const txs = await r.json();
  return txs.slice(0,20).map(tx => ({
    hash: tx.txid,
    from: tx.vin[0]?.prevout?.scriptpubkey_address||"Unknown",
    to: tx.vout[0]?.scriptpubkey_address||"Unknown",
    value: (tx.vout.reduce((s,v)=>s+(v.value||0),0)/1e8).toFixed(8)+" BTC",
    timestamp: tx.status?.block_time ? new Date(tx.status.block_time*1000).toISOString() : "Pending",
    status: tx.status?.confirmed?"Success":"Pending",
    type:"Bitcoin Transfer",
    blockNumber: tx.status?.block_height||"Pending",
    explorerUrl: EXPLORERS.bitcoin+tx.txid,
  }));
}

// ═══════════════════════════════════════════════════
// ROUTES
// ═══════════════════════════════════════════════════

// GET /api/transactions/lookup/:chain/:txHash
router.get("/lookup/:chain/:txHash", async (req, res) => {
  const { chain, txHash } = req.params;
  if (!VALID_CHAINS.includes(chain))
    return res.status(400).json({ error:`Invalid chain. Supported: ${VALID_CHAINS.join(", ")}` });

  if (chain==="bitcoin") {
    const clean = txHash.startsWith("0x") ? txHash.slice(2) : txHash;
    if (!isBTCHash(clean)) return res.status(400).json({ error:"Invalid Bitcoin hash" });
    try {
      const r = await lookupBTC(clean);
      return r ? res.json(r) : res.status(404).json({ found:false, message:"Not found on Bitcoin network." });
    } catch(e) { return res.status(500).json({ error:e.message }); }
  }
  if (chain==="solana") {
    try {
      const r = await lookupSolana(txHash);
      return r ? res.json(r) : res.status(404).json({ found:false, message:"Not found on Solana." });
    } catch(e) { return res.status(500).json({ error:e.message }); }
  }
  if (chain==="tron") {
    try {
      const r = await lookupTron(txHash);
      return r ? res.json(r) : res.status(404).json({ found:false, message:"Not found on Tron." });
    } catch(e) { return res.status(500).json({ error:e.message }); }
  }
  // EVM chains
  if (!isEVMHash(txHash)) return res.status(400).json({ error:"Invalid EVM hash (0x + 64 hex chars)" });
  try {
    const r = await lookupEVM(chain, txHash);
    return r ? res.json(r) : res.status(404).json({ found:false, message:`Not found on ${NAMES[chain]}.` });
  } catch(e) { return res.status(500).json({ error:e.message }); }
});

// GET /api/transactions/wallet/:chain/:address
// Returns ALL public transactions for any wallet
router.get("/wallet/:chain/:address", async (req, res) => {
  const { chain, address } = req.params;
  if (!VALID_CHAINS.includes(chain))
    return res.status(400).json({ error:"Invalid chain" });

  if (chain==="bitcoin") {
    if (!address.match(/^[13bc][a-zA-Z0-9]{25,62}$/))
      return res.status(400).json({ error:"Invalid Bitcoin address" });
    try {
      const txs = await walletHistoryBTC(address);
      return res.json({ address, chain, network:NAMES[chain], transactions:txs, count:txs.length, source:"Blockstream.info" });
    } catch(e) { return res.status(500).json({ error:e.message }); }
  }

  if (chain==="solana") {
    if (!isSolAddr(address)) return res.status(400).json({ error:"Invalid Solana address" });
    try {
      const { default: fetch } = await import("node-fetch");
      const r = await fetch("https://api.mainnet-beta.solana.com", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({jsonrpc:"2.0",id:1,method:"getSignaturesForAddress",params:[address,{limit:20}]})
      });
      const d = await r.json();
      const sigs = (d.result||[]).map(s=>({
        hash:s.signature,
        timestamp:s.blockTime?new Date(s.blockTime*1000).toISOString():"Unknown",
        status:s.err?"Failed":"Success",
        type:"Solana Transaction",
        explorerUrl:EXPLORERS.solana+s.signature,
      }));
      return res.json({ address, chain, network:"Solana Mainnet", transactions:sigs, count:sigs.length, source:"Solana RPC" });
    } catch(e) { return res.status(500).json({ error:e.message }); }
  }

  if (chain==="tron") {
    if (!isTronAddr(address)) return res.status(400).json({ error:"Invalid Tron address" });
    try {
      const { default: fetch } = await import("node-fetch");
      const r = await fetch(`https://api.trongrid.io/v1/accounts/${address}/transactions?limit=20`, {
        headers:{"User-Agent":"CryptoVerify/2.0"}
      });
      const d = await r.json();
      const txs = (d.data||[]).map(tx=>({
        hash:tx.txID,
        status:tx.ret?.[0]?.contractRet==="SUCCESS"?"Success":"Failed",
        type:"TRX Transfer",
        explorerUrl:EXPLORERS.tron+tx.txID,
      }));
      return res.json({ address, chain, network:"Tron Mainnet", transactions:txs, count:txs.length, source:"TronGrid API" });
    } catch(e) { return res.status(500).json({ error:e.message }); }
  }

  // EVM chains
  if (!isEVMAddr(address)) return res.status(400).json({ error:"Invalid EVM wallet address" });
  try {
    const txs = await walletHistoryEVM(chain, address);
    return res.json({
      address, chain, network:NAMES[chain],
      transactions:txs, count:txs.length,
      source:"Etherscan-compatible Explorer API"
    });
  } catch(e) { return res.status(500).json({ error:e.message }); }
});

// GET /api/transactions/total  (DApp contract stat)
router.get("/total", async (req, res) => {
  try {
    const ABI = ["function totalTransactions() external view returns (uint256)"];
    const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
    const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, ABI, provider);
    const total = await contract.totalTransactions();
    res.json({ total: Number(total) });
  } catch(e) { res.status(500).json({ error:e.message }); }
});

module.exports = router;
