import { useState, useCallback, useRef } from "react";

// ══════════════════════════════════════════════════════════════
// CryptoVerify — 100% client-side, no backend required
// Works on GitHub Pages + locally
// Blockscout · Blockstream · Solana RPC · TronGrid
// ══════════════════════════════════════════════════════════════

const BLOCKSCOUT = {
  sepolia:  { name:"Sepolia TestNet",  url:"https://eth-sepolia.blockscout.com/api",  explorer:"https://eth-sepolia.blockscout.com/tx/",  addrExp:"https://eth-sepolia.blockscout.com/address/", symbol:"ETH",  color:"#627EEA" },
  ethereum: { name:"Ethereum Mainnet", url:"https://eth.blockscout.com/api",          explorer:"https://eth.blockscout.com/tx/",          addrExp:"https://eth.blockscout.com/address/",         symbol:"ETH",  color:"#627EEA" },
  base:     { name:"Base",             url:"https://base.blockscout.com/api",         explorer:"https://base.blockscout.com/tx/",         addrExp:"https://base.blockscout.com/address/",        symbol:"ETH",  color:"#0052FF" },
  op:       { name:"Optimism",         url:"https://optimism.blockscout.com/api",     explorer:"https://optimism.blockscout.com/tx/",     addrExp:"https://optimism.blockscout.com/address/",    symbol:"ETH",  color:"#FF0420" },
  arbitrum: { name:"Arbitrum One",     url:"https://arbitrum.blockscout.com/api",     explorer:"https://arbitrum.blockscout.com/tx/",     addrExp:"https://arbitrum.blockscout.com/address/",    symbol:"ETH",  color:"#28A0F0" },
  polygon:  { name:"Polygon",          url:"https://polygon.blockscout.com/api",      explorer:"https://polygon.blockscout.com/tx/",      addrExp:"https://polygon.blockscout.com/address/",     symbol:"POL",  color:"#8247E5" },
  linea:    { name:"Linea",            url:"https://explorer.linea.build/api",        explorer:"https://explorer.linea.build/tx/",        addrExp:"https://explorer.linea.build/address/",       symbol:"ETH",  color:"#61DFFF" },
  bnb:      { name:"BNB Chain",        url:"https://bsc.blockscout.com/api",          explorer:"https://bsc.blockscout.com/tx/",          addrExp:"https://bsc.blockscout.com/address/",         symbol:"BNB",  color:"#F0B90B" },
};

const FAMILIES = [
  { id:"ethereum", label:"Ethereum",  icon:"⟠", color:"#627EEA", note:"Sepolia · Mainnet · Base · Optimism · Arbitrum · Linea", chains:["sepolia","ethereum","base","op","arbitrum","linea"] },
  { id:"polygon",  label:"Polygon",   icon:"⬡", color:"#8247E5", note:"Polygon Mainnet",         chains:["polygon"] },
  { id:"bnb",      label:"BNB Chain", icon:"◈", color:"#F0B90B", note:"BNB Smart Chain",          chains:["bnb"]     },
  { id:"bitcoin",  label:"Bitcoin",   icon:"₿", color:"#F7931A", note:"Bitcoin Mainnet · Blockstream API", chains:[] },
  { id:"solana",   label:"Solana",    icon:"◎", color:"#9945FF", note:"Solana Mainnet · Public RPC",        chains:[] },
  { id:"tron",     label:"Tron",      icon:"⬤", color:"#FF0013", note:"Tron Mainnet · TronGrid API",        chains:[] },
];

// ── Auto-detect chain family from input string ─────
function detectFamily(input) {
  const s = input.trim();
  if (/^[1-9A-HJ-NP-Za-km-z]{80,100}$/.test(s)) return "solana";
  if (/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(s))    return "tron";
  if (/^(1|3|bc1)[a-zA-Z0-9]{25,62}$/.test(s))  return "bitcoin";
  if (/^[a-fA-F0-9]{64}$/.test(s) && !s.startsWith("0x")) return "bitcoin";
  return "ethereum";
}

// ── Fetch with timeout helper ─────────────────────
const ft = (url, opts={}, ms=9000) => {
  const c = new AbortController();
  const t = setTimeout(()=>c.abort(), ms);
  return fetch(url, {...opts, signal:c.signal}).finally(()=>clearTimeout(t));
};

// ── Normalize status from any API ────────────────
const normStatus = (isError, raw) => {
  if (isError === "1") return "Failed";
  if (raw && ["fail","error","revert"].some(k=>String(raw).toLowerCase().includes(k))) return "Failed";
  return "Success";
};

// ── EVM TX lookup (Blockscout) ────────────────────
async function evmLookupTx(chainId, hash) {
  const c = BLOCKSCOUT[chainId];
  try {
    const r = await ft(`${c.url}?module=transaction&action=gettxinfo&txhash=${hash}`);
    const d = await r.json();
    if (d.status !== "1" || !d.result) return null;
    const tx = d.result;
    const raw = parseInt(tx.value||"0");
    return {
      found:true, chain:chainId, network:c.name, symbol:c.symbol,
      chainColor: c.color, txHash:hash,
      from: tx.from, to: tx.to || "Contract Creation",
      value: raw > 0 ? (raw/1e18).toFixed(raw < 1e15 ? 8 : 6)+" "+c.symbol : "0 "+c.symbol,
      blockNumber: tx.blockNumber,
      confirmations: tx.confirmations ? Number(tx.confirmations).toLocaleString() : "Confirmed",
      timestamp: tx.timeStamp ? new Date(parseInt(tx.timeStamp)*1000) : null,
      status: normStatus(tx.isError, tx.txreceipt_status),
      gasUsed: tx.gasUsed ? Number(tx.gasUsed).toLocaleString() : null,
      gasPrice: tx.gasPrice ? (parseInt(tx.gasPrice)/1e9).toFixed(4)+" Gwei" : null,
      gasFee: (tx.gasUsed && tx.gasPrice) ? ((parseInt(tx.gasUsed)*parseInt(tx.gasPrice))/1e18).toFixed(8)+" "+c.symbol : null,
      nonce: tx.nonce,
      type: tx.input && tx.input !== "0x" ? "Contract Interaction" : "ETH Transfer",
      verifiedBy: c.url.replace("https://","").split("/")[0],
      explorerUrl: c.explorer + hash,
      addrExplorer: c.addrExp,
    };
  } catch { return null; }
}

// ── EVM wallet history ────────────────────────────
async function evmWalletHistory(chainId, addr) {
  const c = BLOCKSCOUT[chainId];
  try {
    const r = await ft(`${c.url}?module=account&action=txlist&address=${addr}&sort=desc&page=1&offset=15`);
    const d = await r.json();
    if (!Array.isArray(d.result)) return [];
    return d.result.slice(0,15).map(tx=>({
      hash: tx.hash,
      from: tx.from, to: tx.to || "Contract",
      value: (parseInt(tx.value||"0")/1e18).toFixed(6)+" "+c.symbol,
      timestamp: tx.timeStamp ? new Date(parseInt(tx.timeStamp)*1000) : null,
      status: normStatus(tx.isError),
      type: tx.input && tx.input!=="0x" ? "Contract" : "Transfer",
      chain:chainId, network:c.name, chainColor:c.color,
      explorerUrl: c.explorer+tx.hash,
    }));
  } catch { return []; }
}

// ── Bitcoin ───────────────────────────────────────
async function btcLookupTx(hash) {
  try {
    const r = await ft(`https://blockstream.info/api/tx/${hash}`);
    if (!r.ok) return null;
    const d = await r.json();
    const out = d.vout.reduce((s,v)=>s+(v.value||0),0);
    const inp = d.vin.reduce((s,v)=>s+(v.prevout?.value||0),0);
    return {
      found:true, chain:"bitcoin", network:"Bitcoin Mainnet", symbol:"BTC",
      chainColor:"#F7931A", txHash:hash,
      from: d.vin[0]?.prevout?.scriptpubkey_address||"Coinbase",
      to: d.vout[0]?.scriptpubkey_address||"Multiple outputs",
      value: (out/1e8).toFixed(8)+" BTC",
      fee: inp>0?((inp-out)/1e8).toFixed(8)+" BTC":null,
      blockNumber: d.status?.block_height||"Pending",
      confirmations: d.status?.confirmed?"Confirmed":"Unconfirmed",
      timestamp: d.status?.block_time?new Date(d.status.block_time*1000):null,
      status: d.status?.confirmed?"Success":"Pending",
      size: d.size+" bytes", inputs:d.vin.length+" inputs", outputs:d.vout.length+" outputs",
      type:"Bitcoin Transfer",
      verifiedBy:"blockstream.info",
      explorerUrl:"https://blockstream.info/tx/"+hash,
    };
  } catch { return null; }
}

async function btcWalletHistory(addr) {
  try {
    const r = await ft(`https://blockstream.info/api/address/${addr}/txs`);
    if (!r.ok) return [];
    const txs = await r.json();
    return txs.slice(0,15).map(tx=>({
      hash:tx.txid,
      from:tx.vin[0]?.prevout?.scriptpubkey_address||"Unknown",
      to:tx.vout[0]?.scriptpubkey_address||"Unknown",
      value:(tx.vout.reduce((s,v)=>s+(v.value||0),0)/1e8).toFixed(8)+" BTC",
      timestamp:tx.status?.block_time?new Date(tx.status.block_time*1000):null,
      status:tx.status?.confirmed?"Success":"Pending",
      type:"Bitcoin Transfer",chain:"bitcoin",network:"Bitcoin Mainnet",chainColor:"#F7931A",
      explorerUrl:"https://blockstream.info/tx/"+tx.txid,
    }));
  } catch { return []; }
}

// ── Solana ────────────────────────────────────────
async function solLookupTx(sig) {
  try {
    const r = await ft("https://api.mainnet-beta.solana.com",{
      method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({jsonrpc:"2.0",id:1,method:"getTransaction",
        params:[sig,{encoding:"json",maxSupportedTransactionVersion:0}]})
    });
    const d = await r.json();
    if (!d.result) return null;
    const tx=d.result;
    const lam=tx.meta?Math.abs((tx.meta.preBalances[0]||0)-(tx.meta.postBalances[0]||0)):0;
    return {
      found:true,chain:"solana",network:"Solana Mainnet",symbol:"SOL",
      chainColor:"#9945FF",txHash:sig,
      from:tx.transaction?.message?.accountKeys?.[0]||"Unknown",
      to:tx.transaction?.message?.accountKeys?.[1]||"Unknown",
      value:(lam/1e9).toFixed(9)+" SOL",
      fee:tx.meta?.fee?(tx.meta.fee/1e9).toFixed(9)+" SOL":null,
      blockNumber:tx.slot||"Unknown",confirmations:"Confirmed",
      timestamp:tx.blockTime?new Date(tx.blockTime*1000):null,
      status:tx.meta?.err?"Failed":"Success",
      type:"Solana Transaction",
      verifiedBy:"api.mainnet-beta.solana.com",
      explorerUrl:"https://explorer.solana.com/tx/"+sig,
    };
  } catch { return null; }
}

async function solWalletHistory(addr) {
  try {
    const r = await ft("https://api.mainnet-beta.solana.com",{
      method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({jsonrpc:"2.0",id:1,method:"getSignaturesForAddress",params:[addr,{limit:15}]})
    });
    const d = await r.json();
    return (d.result||[]).map(s=>({
      hash:s.signature,status:s.err?"Failed":"Success",
      timestamp:s.blockTime?new Date(s.blockTime*1000):null,
      type:"Solana Transaction",chain:"solana",network:"Solana Mainnet",chainColor:"#9945FF",
      explorerUrl:"https://explorer.solana.com/tx/"+s.signature,
    }));
  } catch { return []; }
}

// ── Tron ──────────────────────────────────────────
async function tronLookupTx(hash) {
  try {
    const r = await ft(`https://api.trongrid.io/v1/transactions/${hash}`);
    if (!r.ok) return null;
    const d = await r.json();
    if (!d.data?.[0]) return null;
    const tx=d.data[0];
    const amt=tx.raw_data?.contract?.[0]?.parameter?.value?.amount||0;
    return {
      found:true,chain:"tron",network:"Tron Mainnet",symbol:"TRX",
      chainColor:"#FF0013",txHash:hash,
      from:tx.raw_data?.contract?.[0]?.parameter?.value?.owner_address||"Unknown",
      to:tx.raw_data?.contract?.[0]?.parameter?.value?.to_address||"Unknown",
      value:(amt/1e6).toFixed(6)+" TRX",
      blockNumber:tx.blockNumber||"Unknown",confirmations:"Confirmed",
      timestamp:tx.block_timestamp?new Date(tx.block_timestamp):null,
      status:tx.ret?.[0]?.contractRet==="SUCCESS"?"Success":"Failed",
      type:"TRX Transfer",
      verifiedBy:"api.trongrid.io",
      explorerUrl:"https://tronscan.org/#/transaction/"+hash,
    };
  } catch { return null; }
}

async function tronWalletHistory(addr) {
  try {
    const r = await ft(`https://api.trongrid.io/v1/accounts/${addr}/transactions?limit=15`);
    if (!r.ok) return [];
    const d = await r.json();
    return (d.data||[]).map(tx=>({
      hash:tx.txID,
      status:tx.ret?.[0]?.contractRet==="SUCCESS"?"Success":"Failed",
      type:"TRX Transfer",chain:"tron",network:"Tron Mainnet",chainColor:"#FF0013",
      explorerUrl:"https://tronscan.org/#/transaction/"+tx.txID,
    }));
  } catch { return []; }
}

// ══════════════════════════════════════════════════
// REACT APP
// ══════════════════════════════════════════════════
export default function App() {
  const [tab, setTab] = useState("explorer");

  // Explorer
  const [exFam, setExFam] = useState("ethereum");
  const [txInput, setTxInput] = useState("");
  const [exResult, setExResult] = useState(null);
  const [exLoading, setExLoading] = useState(false);
  const [exStatus, setExStatus] = useState("");
  const [exError, setExError] = useState("");
  const [recentSearches, setRecentSearches] = useState([]);

  // Wallet history
  const [whFam, setWhFam] = useState("ethereum");
  const [addrInput, setAddrInput] = useState("");
  const [whResult, setWhResult] = useState(null);
  const [whLoading, setWhLoading] = useState(false);
  const [whError, setWhError] = useState("");
  const [chainFilter, setChainFilter] = useState("all");

  // Toast
  const [toast, setToast] = useState("");
  const toastRef = useRef(null);

  const fam  = FAMILIES.find(f=>f.id===exFam);
  const wFam = FAMILIES.find(f=>f.id===whFam);

  const showToast = (msg) => {
    setToast(msg);
    if (toastRef.current) clearTimeout(toastRef.current);
    toastRef.current = setTimeout(()=>setToast(""),2000);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(()=>showToast("Copied to clipboard"));
  };

  // ── Auto-detect family when user types ──────────
  const handleTxInput = (val) => {
    setTxInput(val);
    setExError(""); setExResult(null);
    if (val.length > 20) {
      const detected = detectFamily(val);
      if (detected !== "ethereum" || val.startsWith("0x")) setExFam(detected);
    }
  };

  // ── Explorer: parallel search ────────────────────
  const lookupTx = useCallback(async () => {
    const hash = txInput.trim();
    if (!hash) return setExError("Paste a transaction hash");
    setExLoading(true); setExError(""); setExResult(null);
    const isEVM = /^0x[a-fA-F0-9]{64}$/.test(hash);
    const isBTC = /^[a-fA-F0-9]{64}$/.test(hash) && !hash.startsWith("0x");
    const isSol = /^[1-9A-HJ-NP-Za-km-z]{80,100}$/.test(hash);

    try {
      // BTC
      if (exFam==="bitcoin"||isBTC) {
        setExStatus("Searching Bitcoin...");
        const r = await btcLookupTx(hash.replace("0x",""));
        if (r) { addRecent(hash,"bitcoin"); return setExResult(r); }
      }
      // Solana
      if (exFam==="solana"||isSol) {
        setExStatus("Searching Solana...");
        const r = await solLookupTx(hash);
        if (r) { addRecent(hash,"solana"); return setExResult(r); }
      }
      // Tron
      if (exFam==="tron"||isBTC) {
        setExStatus("Searching Tron...");
        const r = await tronLookupTx(hash.replace("0x",""));
        if (r) { addRecent(hash,"tron"); return setExResult(r); }
      }
      // EVM — search selected family FIRST in parallel, then remaining
      if (isEVM) {
        const priority = fam?.chains?.length ? fam.chains : Object.keys(BLOCKSCOUT);
        const rest = Object.keys(BLOCKSCOUT).filter(c=>!priority.includes(c));

        setExStatus(`Searching ${priority.length} chains in parallel...`);
        // Race all priority chains — return whichever finds it first
        const found = await raceFirst(priority.map(c=>evmLookupTx(c,hash)));
        if (found) { addRecent(hash, found.chain); return setExResult(found); }

        if (rest.length) {
          setExStatus(`Expanding search to ${rest.length} more chains...`);
          const found2 = await raceFirst(rest.map(c=>evmLookupTx(c,hash)));
          if (found2) { addRecent(hash, found2.chain); return setExResult(found2); }
        }

        // Try Tron with 0x-stripped hash
        setExStatus("Checking Tron...");
        const tron = await tronLookupTx(hash.replace("0x",""));
        if (tron) { addRecent(hash,"tron"); return setExResult(tron); }
      }
      setExError("Transaction not found on any supported blockchain.\n\nCheck:\n• Correct chain family selected\n• Hash is complete (0x + 64 hex for EVM)\n• Very recent txns may take ~30s to index");
    } catch(e) {
      setExError("Search failed: "+(e.message||"Unknown error"));
    } finally { setExLoading(false); setExStatus(""); }
  }, [txInput, exFam, fam]);

  const addRecent = (hash, chain) => {
    setRecentSearches(p=>[{hash,chain,time:new Date()}, ...p.filter(r=>r.hash!==hash)].slice(0,5));
  };

  // ── Wallet history ───────────────────────────────
  const loadWallet = useCallback(async () => {
    const addr = addrInput.trim();
    if (!addr) return setWhError("Enter a wallet address");
    const isEVM  = /^0x[a-fA-F0-9]{40}$/.test(addr);
    const isBTC  = /^(1|3|bc1)[a-zA-Z0-9]{25,62}$/.test(addr);
    const isSol  = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(addr) && !isBTC;
    const isTron = /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(addr);
    if (!isEVM&&!isBTC&&!isSol&&!isTron) return setWhError("Unrecognised address format.\n\nEVM → 0x + 40 hex\nBitcoin → starts with 1, 3, or bc1\nSolana → Base58 (32-44 chars)\nTron → starts with T");
    setWhLoading(true); setWhError(""); setWhResult(null); setChainFilter("all");
    try {
      if (isBTC) {
        const txs = await btcWalletHistory(addr);
        return setWhResult({address:addr,transactions:txs,count:txs.length,chainsSearched:["Bitcoin"],source:"Blockstream.info"});
      }
      if (isSol) {
        const txs = await solWalletHistory(addr);
        return setWhResult({address:addr,transactions:txs,count:txs.length,chainsSearched:["Solana"],source:"Solana RPC"});
      }
      if (isTron) {
        const txs = await tronWalletHistory(addr);
        return setWhResult({address:addr,transactions:txs,count:txs.length,chainsSearched:["Tron"],source:"TronGrid"});
      }
      // EVM — all 8 chains in parallel
      const chains = Object.keys(BLOCKSCOUT);
      const results = await Promise.allSettled(chains.map(c=>evmWalletHistory(c,addr)));
      let all = [];
      results.forEach(r=>{ if(r.status==="fulfilled") all.push(...r.value); });
      all.sort((a,b)=>{
        if(!a.timestamp) return 1; if(!b.timestamp) return -1;
        return b.timestamp - a.timestamp;
      });
      setWhResult({address:addr,transactions:all,count:all.length,chainsSearched:chains.map(c=>BLOCKSCOUT[c].name),source:"Blockscout API"});
    } catch(e) { setWhError("Search failed: "+(e.message||"Unknown")); }
    finally { setWhLoading(false); }
  }, [addrInput]);

  // Jump from result address → wallet history
  const goToWallet = (addr) => {
    setAddrInput(addr); setWhFam("ethereum"); setTab("history");
    setWhResult(null); setWhError("");
  };

  // Wallet history chain filter
  const filteredTxs = whResult?.transactions?.filter(tx=>
    chainFilter==="all" || tx.chain===chainFilter
  ) || [];
  const chainCounts = whResult?.transactions?.reduce((acc,tx)=>{
    acc[tx.chain]=(acc[tx.chain]||0)+1; return acc;
  },{}) || {};

  return (
    <div style={s.root}>
      <style>{CSS}</style>
      <div style={s.bgGlow}/><div style={s.bgGrid}/>

      {/* Toast */}
      {toast && <div style={s.toast}>{toast}</div>}

      {/* NAV */}
      <nav style={s.nav}>
        <div style={s.navW}>
          <div style={s.brand}>
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <polygon points="11,1.5 20.5,6.25 20.5,15.75 11,20.5 1.5,15.75 1.5,6.25" stroke="#4ade80" strokeWidth="1.5" fill="rgba(74,222,128,0.07)"/>
              <polygon points="11,6 16.5,9 16.5,15 11,18 5.5,15 5.5,9" fill="rgba(74,222,128,0.06)" stroke="rgba(74,222,128,0.3)" strokeWidth="1"/>
              <circle cx="11" cy="11" r="2.5" fill="#4ade80"/>
            </svg>
            <span style={s.bName}>Crypto<span style={s.bGreen}>Verify</span></span>
          </div>
          <div style={s.navPills}>
            {[{k:"explorer",l:"🔍 Explorer"},{k:"history",l:"📋 Wallet History"}].map(t=>(
              <button key={t.k} style={tab===t.k?s.pillOn:s.pillOff}
                onClick={()=>setTab(t.k)}>{t.l}</button>
            ))}
          </div>
        </div>
      </nav>

      {/* HERO */}
      <div style={s.hero}>
        <div style={s.heroEye}>{tab==="explorer"?"MULTI-CHAIN TRANSACTION EXPLORER":"WALLET TRANSACTION HISTORY"}</div>
        <h1 style={s.h1}>
          {tab==="explorer"
            ? <><G>Search</G> any transaction<br/>across 10 blockchains</>
            : <><G>Track</G> any wallet<br/>across all chains</>}
        </h1>
        <p style={s.hp}>
          {tab==="explorer"
            ? "Paste any transaction hash — all chains searched in parallel directly from your browser. Zero backend required."
            : "Paste any wallet address — auto-detects chain type and searches all matching networks simultaneously."}
        </p>
        <div style={s.liveBadge}>✅ Fully client-side · Works on GitHub Pages · No backend required</div>
      </div>

      <div style={s.wrap}>

        {/* ══════ EXPLORER TAB ══════ */}
        {tab==="explorer" && (
          <div style={s.card} className="fadeUp" key="ex">
            <SectionHead icon="🔍" title="Multi-Chain Transaction Explorer"
              sub="Blockscout · Blockstream · Solana RPC · TronGrid — all queried in parallel" />

            {/* Recent searches */}
            {recentSearches.length>0 && (
              <div style={s.recentWrap}>
                <span style={s.recentLabel}>Recent</span>
                {recentSearches.map((r,i)=>(
                  <button key={i} style={s.recentBtn}
                    onClick={()=>{setTxInput(r.hash);setExFam(r.chain==="bitcoin"?"bitcoin":r.chain==="solana"?"solana":r.chain==="tron"?"tron":"ethereum");setExError("");setExResult(null);}}>
                    <span style={{color:FAMILIES.find(f=>f.id===(r.chain==="sepolia"||r.chain==="ethereum"||r.chain==="base"||r.chain==="op"||r.chain==="arbitrum"||r.chain==="linea"?"ethereum":r.chain))?.color||"#4ade80",marginRight:4}}>●</span>
                    {r.hash.slice(0,10)}…{r.hash.slice(-6)}
                  </button>
                ))}
              </div>
            )}

            <FieldLabel>Chain family <OptTag>auto-detected as you type</OptTag></FieldLabel>
            <div style={s.famRow}>
              {FAMILIES.map(f=>(
                <button key={f.id}
                  style={{...s.famBtn,...(exFam===f.id?{borderColor:f.color,background:`${f.color}12`,color:"#fff"}:{})}}
                  onClick={()=>{setExFam(f.id);setExError("");setExResult(null);}}>
                  <span style={{color:exFam===f.id?f.color:"rgba(255,255,255,0.3)",fontSize:"0.9rem"}}>{f.icon}</span>
                  <span style={{fontSize:"0.74rem",fontWeight:exFam===f.id?600:400}}>{f.label}</span>
                </button>
              ))}
            </div>
            {fam && <div style={s.famNote}>{fam.note}</div>}

            <FieldLabel>
              Transaction Hash
              <HintTag>{exFam==="bitcoin"?"64 hex chars (no 0x)":exFam==="solana"?"Base58 signature":"0x + 64 hex chars"}</HintTag>
            </FieldLabel>
            <div style={s.iRow}>
              <input style={s.inp}
                placeholder={exFam==="bitcoin"?"a1b2c3d4...":exFam==="solana"?"5Uvd9vQE...":"0x9503d70f..."}
                value={txInput}
                onChange={e=>handleTxInput(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&lookupTx()}/>
              {txInput&&<Xbtn onClick={()=>{setTxInput("");setExResult(null);setExError("");}}/>}
            </div>

            {exStatus&&(
              <div style={s.statusRow}>
                <span className="spin" style={{marginRight:6}}>⟳</span>{exStatus}
              </div>
            )}

            <ActionBtn loading={exLoading} color={fam?.color||"#4ade80"} onClick={lookupTx}>
              Search Transaction
            </ActionBtn>

            {exError&&<ErrBlock msg={exError}/>}

            {exResult&&(
              <div style={{...s.resBox,borderColor:`${exResult.chainColor}30`}} className="fadeUp">
                <div style={s.resHead}>
                  <StatusPill status={exResult.status}/>
                  <span style={{...s.resNet,color:exResult.chainColor}}>{exResult.network}</span>
                  <div style={{marginLeft:"auto",display:"flex",gap:8,alignItems:"center"}}>
                    <button style={s.copyBtn} onClick={()=>copyToClipboard(exResult.txHash)} title="Copy TX hash">⧉ Copy Hash</button>
                    <a href={exResult.explorerUrl} target="_blank" rel="noreferrer" style={s.extLink}>Explorer ↗</a>
                  </div>
                </div>
                <div style={s.resGrid}>
                  <RFAddr k="FROM" v={exResult.from} onCopy={copyToClipboard} onWallet={()=>goToWallet(exResult.from)} explorerBase={exResult.addrExplorer}/>
                  <RFAddr k="TO"   v={exResult.to}   onCopy={copyToClipboard} onWallet={()=>goToWallet(exResult.to)}   explorerBase={exResult.addrExplorer} isContract={exResult.type==="Contract Interaction"}/>
                  <RF k="VALUE"         v={exResult.value}         green />
                  <RF k="STATUS"        v={exResult.status} />
                  <RF k="TYPE"          v={exResult.type} />
                  <RF k="BLOCK"         v={""+exResult.blockNumber} />
                  <RF k="CONFIRMATIONS" v={""+exResult.confirmations} />
                  {exResult.timestamp && <RF k="TIMESTAMP" v={exResult.timestamp.toLocaleString()}/>}
                  {ok(exResult.gasUsed)  && <RF k="GAS USED"  v={exResult.gasUsed}/>}
                  {ok(exResult.gasPrice) && <RF k="GAS PRICE" v={exResult.gasPrice}/>}
                  {ok(exResult.gasFee)   && <RF k="GAS FEE"   v={exResult.gasFee}/>}
                  {ok(exResult.fee)      && <RF k="NETWORK FEE" v={exResult.fee}/>}
                  {ok(exResult.nonce)    && <RF k="NONCE"     v={""+exResult.nonce}/>}
                  {ok(exResult.size)     && <RF k="SIZE"      v={exResult.size}/>}
                  {ok(exResult.inputs)   && <RF k="INPUTS"    v={exResult.inputs}/>}
                  {ok(exResult.outputs)  && <RF k="OUTPUTS"   v={exResult.outputs}/>}
                  <RF k="DATA SOURCE" v={exResult.verifiedBy}/>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════ WALLET HISTORY TAB ══════ */}
        {tab==="history" && (
          <div style={s.card} className="fadeUp" key="wh">
            <SectionHead icon="📋" title="Wallet Transaction History"
              sub="All chains searched simultaneously from your browser — no backend, no API key" />

            <div style={s.infoBox}>
              🌐 Auto-detects address type — EVM addresses search <strong>8 chains in parallel</strong>. Bitcoin, Solana, and Tron detected automatically.
            </div>

            <FieldLabel>Address type <OptTag>auto-detected from format</OptTag></FieldLabel>
            <div style={s.famRow}>
              {FAMILIES.map(f=>(
                <button key={f.id}
                  style={{...s.famBtn,...(whFam===f.id?{borderColor:f.color,background:`${f.color}12`,color:"#fff"}:{})}}
                  onClick={()=>{setWhFam(f.id);setWhError("");setWhResult(null);}}>
                  <span style={{color:whFam===f.id?f.color:"rgba(255,255,255,0.3)",fontSize:"0.9rem"}}>{f.icon}</span>
                  <span style={{fontSize:"0.74rem",fontWeight:whFam===f.id?600:400}}>{f.label}</span>
                </button>
              ))}
            </div>

            <FieldLabel>
              Wallet Address
              <HintTag>{whFam==="bitcoin"?"1.../3.../bc1...":whFam==="solana"?"Base58":whFam==="tron"?"T + 33":"0x + 40 hex"}</HintTag>
            </FieldLabel>
            <div style={s.iRow}>
              <input style={s.inp}
                placeholder={whFam==="bitcoin"?"1A1zP1...":whFam==="solana"?"So11111...":whFam==="tron"?"TLa2f6...":"0x6Cc9397c3B38739..."}
                value={addrInput}
                onChange={e=>{setAddrInput(e.target.value);setWhError("");setWhResult(null);}}
                onKeyDown={e=>e.key==="Enter"&&loadWallet()}/>
              {addrInput&&(
                <>
                  <button style={s.iconBtn} onClick={()=>copyToClipboard(addrInput)} title="Copy address">⧉</button>
                  <Xbtn onClick={()=>{setAddrInput("");setWhResult(null);setWhError("");}}/>
                </>
              )}
            </div>

            <ActionBtn loading={whLoading} color={wFam?.color||"#4ade80"} onClick={loadWallet}>
              {whLoading?"Searching all chains...":"Load Transaction History"}
            </ActionBtn>

            {whError&&<ErrBlock msg={whError}/>}

            {whResult&&(
              <div className="fadeUp">
                <div style={s.histHead}>
                  <span style={s.histCnt}>{whResult.count} transaction{whResult.count!==1?"s":""}</span>
                  {whResult.chainsSearched?.length>1&&
                    <span style={s.histChain}>{whResult.chainsSearched.length} chains searched</span>}
                  <span style={s.histSrc}>via {whResult.source}</span>
                  {whResult.address&&(
                    <button style={s.copyBtn} onClick={()=>copyToClipboard(whResult.address)}>⧉ Copy Address</button>
                  )}
                </div>

                {/* Chain filter */}
                {Object.keys(chainCounts).length>1&&(
                  <div style={s.filterRow}>
                    <button style={{...s.filterBtn,...(chainFilter==="all"?s.filterBtnOn:{})}}
                      onClick={()=>setChainFilter("all")}>
                      All ({whResult.count})
                    </button>
                    {Object.entries(chainCounts).map(([chain,count])=>(
                      <button key={chain}
                        style={{...s.filterBtn,...(chainFilter===chain?{...s.filterBtnOn,borderColor:BLOCKSCOUT[chain]?.color||"#4ade80",color:BLOCKSCOUT[chain]?.color||"#4ade80"}:{})}}
                        onClick={()=>setChainFilter(chain)}>
                        {BLOCKSCOUT[chain]?.name||chain} ({count})
                      </button>
                    ))}
                  </div>
                )}

                {filteredTxs.length===0&&(
                  <div style={s.empty}>
                    No transactions found{chainFilter!=="all"?` on ${BLOCKSCOUT[chainFilter]?.name||chainFilter}`:""}.<br/>
                    <span style={{fontSize:"0.72rem",color:"rgba(255,255,255,0.18)"}}>
                      Blockscout returns up to 15 recent transactions per chain.
                    </span>
                  </div>
                )}

                {filteredTxs.map((tx,i)=>(
                  <div key={i} style={{...s.txRow,...(tx.status!=="Success"?{borderColor:"rgba(248,113,113,0.12)"}:{})}} className="fadeUp">
                    <div style={{width:3,alignSelf:"stretch",borderRadius:2,background:tx.chainColor||"#4ade80",flexShrink:0}}/>
                    <div style={s.txLeft}>
                      <div style={s.txHash}>
                        {tx.hash?`${tx.hash.slice(0,16)}···${tx.hash.slice(-8)}`:"N/A"}
                        {tx.hash&&<button style={s.inlineCopy} onClick={()=>copyToClipboard(tx.hash)}>⧉</button>}
                      </div>
                      <div style={s.txMeta}>
                        <span style={{...s.txNet,borderColor:tx.chainColor||"rgba(255,255,255,0.1)",color:tx.chainColor||"rgba(255,255,255,0.4)"}}>{tx.network}</span>
                        {tx.type&&<span style={s.txType}>{tx.type}</span>}
                        {tx.timestamp&&<span>{tx.timestamp.toLocaleDateString()+" "+tx.timestamp.toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}</span>}
                      </div>
                    </div>
                    <div style={s.txRight}>
                      {tx.value&&<div style={s.txVal}>{tx.value}</div>}
                      <div style={{fontSize:"0.66rem",fontWeight:600,color:tx.status==="Success"?"#4ade80":"#f87171"}}>{tx.status}</div>
                    </div>
                    <div style={s.txAct}>
                      {tx.explorerUrl&&<a href={tx.explorerUrl} target="_blank" rel="noreferrer" style={s.txExtBtn} title="View on block explorer">↗</a>}
                      {tx.hash&&(
                        <button style={s.txDetBtn} onClick={()=>{
                          setTxInput(tx.hash);
                          setExFam(tx.chain==="bitcoin"?"bitcoin":tx.chain==="solana"?"solana":tx.chain==="tron"?"tron":"ethereum");
                          setTab("explorer");
                        }}>Details</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <footer style={s.footer}>
        <div style={s.fL}>
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none" style={{marginRight:5,verticalAlign:"middle"}}>
            <polygon points="10,1.5 19,6 19,14 10,18.5 1,14 1,6" stroke="#4ade80" strokeWidth="1.5" fill="none"/>
          </svg>
          CryptoVerify
        </div>
        <div style={s.fMid}>
          <a href="https://eth-sepolia.blockscout.com" target="_blank" rel="noreferrer" style={s.fLink}>Blockscout</a>
          <span style={{color:"rgba(255,255,255,0.1)"}}>·</span>
          <a href="https://blockstream.info" target="_blank" rel="noreferrer" style={s.fLink}>Blockstream</a>
          <span style={{color:"rgba(255,255,255,0.1)"}}>·</span>
          <a href="https://explorer.solana.com" target="_blank" rel="noreferrer" style={s.fLink}>Solana</a>
          <span style={{color:"rgba(255,255,255,0.1)"}}>·</span>
          <a href="https://tronscan.org" target="_blank" rel="noreferrer" style={s.fLink}>Tron</a>
        </div>
        <span style={s.fR}>Nishan Sapkota</span>
      </footer>
    </div>
  );
}

// ── Race helper: resolves with first non-null result ──
async function raceFirst(promises) {
  return new Promise(resolve => {
    let settled = 0;
    const total = promises.length;
    if (total === 0) { resolve(null); return; }
    promises.forEach(p =>
      Promise.resolve(p).then(r => {
        if (r) resolve(r);
        else { settled++; if (settled===total) resolve(null); }
      }).catch(() => { settled++; if (settled===total) resolve(null); })
    );
  });
}

// ── Small components ──────────────────────────────
const ok = v => v!=null && !["N/A","Pending","Unknown","0","null","undefined"].includes(String(v));
const G = ({children})=><span style={{background:"linear-gradient(135deg,#4ade80,#60a5fa)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>{children}</span>;

function SectionHead({icon,title,sub}) {
  return (
    <div style={{display:"flex",gap:12,alignItems:"flex-start",marginBottom:22}}>
      <div style={{width:42,height:42,background:"rgba(74,222,128,0.07)",border:"1px solid rgba(74,222,128,0.14)",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.1rem",flexShrink:0}}>{icon}</div>
      <div><div style={{fontSize:"1rem",fontWeight:700,color:"#fff",marginBottom:3}}>{title}</div><div style={{fontSize:"0.72rem",color:"rgba(255,255,255,0.26)"}}>{sub}</div></div>
    </div>
  );
}

function FieldLabel({children}) {
  return <div style={{fontSize:"0.6rem",color:"rgba(255,255,255,0.26)",letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:9,marginTop:18,display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>{children}</div>;
}
function OptTag({children}){return <span style={{fontSize:"0.6rem",color:"rgba(255,255,255,0.18)",textTransform:"none",letterSpacing:0,fontWeight:400}}>{children}</span>;}
function HintTag({children}){return <span style={{fontFamily:"'DM Mono',monospace",fontSize:"0.6rem",color:"rgba(255,255,255,0.16)",background:"rgba(255,255,255,0.04)",padding:"2px 7px",borderRadius:4,textTransform:"none",letterSpacing:0}}>{children}</span>;}
function Xbtn({onClick}){return <button style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.07)",color:"rgba(255,255,255,0.3)",borderRadius:7,padding:"0 12px",fontSize:"0.78rem",flexShrink:0,cursor:"pointer"}} onClick={onClick}>✕</button>;}

function ActionBtn({loading,color,onClick,children}) {
  const light = color==="#F0B90B"||color==="#F7931A";
  return (
    <button style={{width:"100%",marginTop:16,padding:"13px 0",fontWeight:700,fontSize:"0.9rem",borderRadius:9,border:"none",
      background:loading?"rgba(255,255,255,0.04)":`linear-gradient(135deg,${color},${color}99)`,
      color:loading?"rgba(255,255,255,0.2)":light?"#000":"#fff",
      display:"flex",alignItems:"center",justifyContent:"center",gap:8,
      cursor:loading?"not-allowed":"pointer",transition:"opacity 0.15s"}}
      onClick={onClick} disabled={loading}>
      {loading?<><span className="spin">⟳</span>Searching...</>:children}
    </button>
  );
}

function ErrBlock({msg}){
  return <div style={{marginTop:12,padding:"13px 15px",background:"rgba(248,113,113,0.06)",border:"1px solid rgba(248,113,113,0.16)",borderRadius:9,color:"#fca5a5",fontSize:"0.8rem"}}><pre style={{whiteSpace:"pre-wrap",fontFamily:"'DM Mono',monospace",lineHeight:1.65}}>{msg}</pre></div>;
}

function RF({k,v,mono,green}) {
  return (
    <div style={{paddingBottom:9,borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
      <div style={{fontSize:"0.57rem",color:"rgba(255,255,255,0.18)",letterSpacing:"0.13em",textTransform:"uppercase",marginBottom:3}}>{k}</div>
      <div style={{fontSize:"0.81rem",wordBreak:"break-all",color:green?"#4ade80":"rgba(255,255,255,0.72)",fontFamily:mono?"'DM Mono',monospace":"'DM Sans',sans-serif",fontWeight:green?600:400}}>{v}</div>
    </div>
  );
}

function RFAddr({k,v,onCopy,onWallet,explorerBase,isContract}) {
  const isAddr = /^0x[a-fA-F0-9]{40}$/.test(v);
  return (
    <div style={{paddingBottom:9,borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
      <div style={{fontSize:"0.57rem",color:"rgba(255,255,255,0.18)",letterSpacing:"0.13em",textTransform:"uppercase",marginBottom:3}}>
        {k}{isContract&&<span style={{marginLeft:6,color:"#60a5fa",fontSize:"0.55rem",background:"rgba(96,165,250,0.1)",padding:"1px 5px",borderRadius:3}}>CONTRACT</span>}
      </div>
      <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
        <span style={{fontSize:"0.81rem",wordBreak:"break-all",color:"rgba(255,255,255,0.72)",fontFamily:"'DM Mono',monospace"}}>{v}</span>
        {isAddr&&(
          <div style={{display:"flex",gap:4,flexShrink:0}}>
            <button style={s.inlineAction} onClick={()=>onCopy(v)} title="Copy">⧉</button>
            {explorerBase&&<a href={explorerBase+v} target="_blank" rel="noreferrer" style={s.inlineAction} title="View on explorer">↗</a>}
            <button style={{...s.inlineAction,color:"#4ade80"}} onClick={onWallet} title="View wallet history">📋</button>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusPill({status}) {
  const ok=["Success","Confirmed"].includes(status), pend=status==="Pending";
  const col=ok?"#4ade80":pend?"#fbbf24":"#f87171";
  return <span style={{borderRadius:6,padding:"3px 10px",fontSize:"0.65rem",fontWeight:700,letterSpacing:"0.06em",background:`${col}15`,color:col,border:`1px solid ${col}30`}}>{ok?"✓ SUCCESS":pend?"⏳ PENDING":"✗ FAILED"}</span>;
}

// ── Styles ────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=DM+Mono:wght@400;500&display=swap');
  *{box-sizing:border-box;margin:0;padding:0;}
  body{background:#08080e;}
  input{outline:none;font-family:'DM Mono',monospace;}
  input:focus{border-color:rgba(255,255,255,0.25)!important;background:rgba(255,255,255,0.06)!important;}
  button{font-family:'DM Sans',sans-serif;cursor:pointer;transition:opacity 0.15s;}
  button:hover:not(:disabled){opacity:0.82;}
  a{text-decoration:none;transition:opacity 0.15s;}
  a:hover{opacity:0.8;}
  @keyframes spin{to{transform:rotate(360deg)}}
  @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
  @keyframes slideIn{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:translateY(0)}}
  .fadeUp{animation:fadeUp 0.22s ease forwards;}
  .spin{display:inline-block;animation:spin 0.7s linear infinite;}
`;

const s = {
  root:{minHeight:"100vh",background:"#08080e",color:"#c5c7d8",fontFamily:"'DM Sans',sans-serif",position:"relative",overflowX:"hidden"},
  bgGlow:{position:"fixed",top:"-8%",left:"50%",transform:"translateX(-50%)",width:"80vw",height:"45vh",background:"radial-gradient(ellipse,rgba(74,222,128,0.05) 0%,transparent 70%)",pointerEvents:"none",zIndex:0},
  bgGrid:{position:"fixed",inset:0,backgroundImage:"linear-gradient(rgba(255,255,255,0.01) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.01) 1px,transparent 1px)",backgroundSize:"54px 54px",pointerEvents:"none",zIndex:0},

  toast:{position:"fixed",top:20,left:"50%",transform:"translateX(-50%)",background:"rgba(74,222,128,0.12)",border:"1px solid rgba(74,222,128,0.3)",color:"#4ade80",padding:"8px 20px",borderRadius:20,fontSize:"0.8rem",fontWeight:600,zIndex:999,animation:"slideIn 0.2s ease",backdropFilter:"blur(12px)"},

  nav:{position:"sticky",top:0,zIndex:100,background:"rgba(8,8,14,0.92)",backdropFilter:"blur(20px)",borderBottom:"1px solid rgba(255,255,255,0.055)"},
  navW:{maxWidth:900,margin:"0 auto",padding:"11px 24px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:16,flexWrap:"wrap"},
  brand:{display:"flex",alignItems:"center",gap:9},
  bName:{fontSize:"1rem",fontWeight:700,color:"rgba(255,255,255,0.8)",letterSpacing:"-0.02em"},
  bGreen:{color:"#4ade80"},
  navPills:{display:"flex",gap:3,background:"rgba(255,255,255,0.04)",borderRadius:8,padding:"3px"},
  pillOn:{background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.12)",color:"#fff",padding:"6px 16px",borderRadius:6,fontSize:"0.78rem",fontWeight:600},
  pillOff:{background:"transparent",border:"none",color:"rgba(255,255,255,0.3)",padding:"6px 16px",borderRadius:6,fontSize:"0.78rem"},

  hero:{position:"relative",zIndex:1,maxWidth:900,margin:"0 auto",padding:"52px 24px 30px",textAlign:"center"},
  heroEye:{fontSize:"0.58rem",letterSpacing:"0.22em",color:"rgba(74,222,128,0.5)",marginBottom:14,textTransform:"uppercase"},
  h1:{fontSize:"clamp(1.8rem,4.5vw,3rem)",fontWeight:700,color:"#fff",lineHeight:1.08,letterSpacing:"-0.035em",marginBottom:14},
  hp:{fontSize:"0.87rem",color:"rgba(255,255,255,0.28)",lineHeight:1.75,maxWidth:520,margin:"0 auto"},
  liveBadge:{display:"inline-block",marginTop:14,background:"rgba(74,222,128,0.07)",border:"1px solid rgba(74,222,128,0.18)",borderRadius:20,padding:"5px 16px",fontSize:"0.71rem",color:"rgba(74,222,128,0.75)"},

  wrap:{position:"relative",zIndex:1,maxWidth:900,margin:"0 auto",padding:"0 24px 70px"},
  card:{background:"rgba(255,255,255,0.022)",border:"1px solid rgba(255,255,255,0.065)",borderRadius:16,padding:"28px 30px"},

  recentWrap:{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap",marginBottom:4,marginTop:4},
  recentLabel:{fontSize:"0.6rem",color:"rgba(255,255,255,0.2)",textTransform:"uppercase",letterSpacing:"0.1em"},
  recentBtn:{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.07)",color:"rgba(255,255,255,0.35)",borderRadius:6,padding:"3px 9px",fontSize:"0.67rem",fontFamily:"'DM Mono',monospace"},

  infoBox:{background:"rgba(96,165,250,0.05)",border:"1px solid rgba(96,165,250,0.1)",borderRadius:8,padding:"11px 14px",fontSize:"0.76rem",color:"rgba(147,197,253,0.65)",marginBottom:4,lineHeight:1.65},

  famRow:{display:"flex",gap:6,flexWrap:"wrap",marginBottom:2},
  famBtn:{display:"flex",alignItems:"center",gap:6,background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.065)",borderRadius:8,padding:"7px 13px",color:"rgba(255,255,255,0.3)",transition:"all 0.15s"},
  famNote:{fontSize:"0.67rem",color:"rgba(255,255,255,0.2)",marginTop:6,paddingLeft:2},

  iRow:{display:"flex",gap:6},
  inp:{flex:1,padding:"11px 14px",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:8,color:"#dde0ec",fontSize:"0.82rem",transition:"all 0.2s"},
  iconBtn:{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.07)",color:"rgba(255,255,255,0.3)",borderRadius:7,padding:"0 11px",fontSize:"0.82rem",flexShrink:0},

  statusRow:{marginTop:10,fontSize:"0.74rem",color:"rgba(74,222,128,0.55)",display:"flex",alignItems:"center",gap:6},

  resBox:{marginTop:18,background:"rgba(255,255,255,0.018)",border:"1px solid rgba(255,255,255,0.065)",borderRadius:12,padding:"18px 20px"},
  resHead:{display:"flex",alignItems:"center",gap:9,marginBottom:16,flexWrap:"wrap"},
  resNet:{fontSize:"0.7rem",fontWeight:600},
  extLink:{fontSize:"0.73rem",color:"#4ade80",borderBottom:"1px solid rgba(74,222,128,0.2)",paddingBottom:1},
  copyBtn:{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.08)",color:"rgba(255,255,255,0.35)",borderRadius:6,padding:"4px 10px",fontSize:"0.68rem"},
  resGrid:{display:"flex",flexDirection:"column",gap:9},

  inlineAction:{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.08)",color:"rgba(255,255,255,0.4)",borderRadius:5,padding:"2px 7px",fontSize:"0.68rem",flexShrink:0},
  inlineCopy:{background:"none",border:"none",color:"rgba(255,255,255,0.2)",fontSize:"0.68rem",padding:"0 4px",marginLeft:2},

  histHead:{display:"flex",alignItems:"center",gap:10,marginTop:20,marginBottom:10,flexWrap:"wrap"},
  histCnt:{fontSize:"0.77rem",color:"rgba(255,255,255,0.45)",fontWeight:600},
  histChain:{fontSize:"0.67rem",color:"rgba(74,222,128,0.6)",background:"rgba(74,222,128,0.07)",padding:"2px 8px",borderRadius:4},
  histSrc:{fontSize:"0.64rem",color:"rgba(255,255,255,0.16)"},
  empty:{textAlign:"center",padding:"28px 16px",color:"rgba(255,255,255,0.18)",fontSize:"0.8rem",lineHeight:1.8},

  filterRow:{display:"flex",gap:5,flexWrap:"wrap",marginBottom:12},
  filterBtn:{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",color:"rgba(255,255,255,0.28)",borderRadius:6,padding:"4px 10px",fontSize:"0.67rem"},
  filterBtnOn:{background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.16)",color:"#fff"},

  txRow:{display:"flex",alignItems:"center",gap:10,padding:"10px 13px",background:"rgba(255,255,255,0.018)",border:"1px solid rgba(255,255,255,0.045)",borderRadius:9,marginBottom:5},
  txLeft:{flex:1,minWidth:0},
  txHash:{fontSize:"0.7rem",fontFamily:"'DM Mono',monospace",color:"rgba(255,255,255,0.45)",marginBottom:4,display:"flex",alignItems:"center"},
  txMeta:{fontSize:"0.63rem",color:"rgba(255,255,255,0.18)",display:"flex",gap:7,flexWrap:"wrap",alignItems:"center"},
  txNet:{borderRadius:4,padding:"1px 6px",border:"1px solid",fontSize:"0.62rem"},
  txType:{background:"rgba(255,255,255,0.04)",borderRadius:4,padding:"1px 5px"},
  txRight:{textAlign:"right",flexShrink:0},
  txVal:{fontSize:"0.78rem",fontWeight:600,color:"#4ade80",marginBottom:2},
  txAct:{display:"flex",gap:4,flexShrink:0},
  txExtBtn:{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.07)",color:"rgba(255,255,255,0.3)",borderRadius:6,padding:"5px 8px",fontSize:"0.72rem"},
  txDetBtn:{background:"rgba(74,222,128,0.06)",border:"1px solid rgba(74,222,128,0.14)",color:"rgba(74,222,128,0.65)",borderRadius:6,padding:"5px 9px",fontSize:"0.66rem",whiteSpace:"nowrap"},

  footer:{position:"relative",zIndex:1,borderTop:"1px solid rgba(255,255,255,0.04)",padding:"18px 24px",display:"flex",justifyContent:"space-between",alignItems:"center",maxWidth:1100,margin:"0 auto",flexWrap:"wrap",gap:10},
  fL:{fontSize:"0.78rem",fontWeight:700,color:"rgba(255,255,255,0.2)",display:"flex",alignItems:"center"},
  fMid:{display:"flex",gap:10,alignItems:"center"},
  fLink:{fontSize:"0.68rem",color:"rgba(255,255,255,0.2)"},
  fR:{fontSize:"0.7rem",color:"rgba(255,255,255,0.14)"},
};
