import { useState } from "react";

// ══════════════════════════════════════════════════
// ALL API CALLS ARE BROWSER-DIRECT — NO BACKEND
// Works on GitHub Pages and locally
// ══════════════════════════════════════════════════

// Blockscout supports browser CORS — free, no API key
const BLOCKSCOUT = {
  ethereum: { name:"Ethereum Mainnet",  url:"https://eth.blockscout.com/api",              explorer:"https://eth.blockscout.com/tx/",         symbol:"ETH"  },
  sepolia:  { name:"Sepolia TestNet",   url:"https://eth-sepolia.blockscout.com/api",       explorer:"https://eth-sepolia.blockscout.com/tx/",  symbol:"ETH"  },
  base:     { name:"Base",              url:"https://base.blockscout.com/api",              explorer:"https://base.blockscout.com/tx/",         symbol:"ETH"  },
  op:       { name:"Optimism",          url:"https://optimism.blockscout.com/api",          explorer:"https://optimism.blockscout.com/tx/",     symbol:"ETH"  },
  arbitrum: { name:"Arbitrum One",      url:"https://arbitrum.blockscout.com/api",          explorer:"https://arbitrum.blockscout.com/tx/",     symbol:"ETH"  },
  polygon:  { name:"Polygon",           url:"https://polygon.blockscout.com/api",           explorer:"https://polygon.blockscout.com/tx/",      symbol:"POL"  },
  linea:    { name:"Linea",             url:"https://explorer.linea.build/api",             explorer:"https://explorer.linea.build/tx/",        symbol:"ETH"  },
  bnb:      { name:"BNB Chain",         url:"https://bsc.blockscout.com/api",               explorer:"https://bsc.blockscout.com/tx/",          symbol:"BNB"  },
};

const FAMILIES = [
  { id:"ethereum", label:"Ethereum",  icon:"⟠", color:"#627EEA", note:"Mainnet · Sepolia · Base · Optimism · Arbitrum · Linea", chains:["sepolia","ethereum","base","op","arbitrum","linea"] },
  { id:"polygon",  label:"Polygon",   icon:"⬡", color:"#8247E5", note:"Polygon Mainnet",  chains:["polygon"] },
  { id:"bnb",      label:"BNB Chain", icon:"◈", color:"#F0B90B", note:"BNB Smart Chain",  chains:["bnb"] },
  { id:"bitcoin",  label:"Bitcoin",   icon:"₿", color:"#F7931A", note:"Bitcoin Mainnet via Blockstream API", chains:[] },
  { id:"solana",   label:"Solana",    icon:"◎", color:"#9945FF", note:"Solana Mainnet via public RPC",        chains:[] },
  { id:"tron",     label:"Tron",      icon:"⬤", color:"#FF0013", note:"Tron Mainnet via TronGrid API",        chains:[] },
];

// ── Fetch with timeout ─────────────────────────────
const ft = (url, opts={}, ms=8000) => {
  const ctrl = new AbortController();
  const t = setTimeout(()=>ctrl.abort(), ms);
  return fetch(url, {...opts, signal:ctrl.signal})
    .finally(()=>clearTimeout(t));
};

// ── EVM tx lookup via Blockscout ──────────────────
async function evmLookupTx(chainId, hash) {
  const c = BLOCKSCOUT[chainId];
  try {
    const r = await ft(`${c.url}?module=transaction&action=gettxinfo&txhash=${hash}`);
    const d = await r.json();
    if (d.status !== "1" || !d.result) return null;
    const tx = d.result;
    return {
      found:true, chain:chainId, network:c.name, symbol:c.symbol, txHash:hash,
      from: tx.from,
      to: tx.to || "Contract Creation",
      value: (parseInt(tx.value||"0")/1e18).toFixed(6) + " " + c.symbol,
      blockNumber: tx.blockNumber,
      confirmations: tx.confirmations || "Confirmed",
      timestamp: tx.timeStamp ? new Date(parseInt(tx.timeStamp)*1000).toISOString() : "Unknown",
      status: tx.isError === "0" ? "Success" : (tx.isError === "1" ? "Failed" : "Confirmed"),
      gasUsed: tx.gasUsed,
      gasPrice: tx.gasPrice ? (parseInt(tx.gasPrice)/1e9).toFixed(2)+" Gwei" : null,
      nonce: tx.nonce,
      type: tx.input && tx.input !== "0x" ? "Contract Interaction" : "ETH Transfer",
      verifiedBy: "Blockscout API (" + c.url.replace("https://","").split("/")[0] + ")",
      explorerUrl: c.explorer + hash,
    };
  } catch { return null; }
}

// ── EVM wallet history via Blockscout ─────────────
async function evmWalletHistory(chainId, addr) {
  const c = BLOCKSCOUT[chainId];
  try {
    const r = await ft(`${c.url}?module=account&action=txlist&address=${addr}&sort=desc&page=1&offset=10`);
    const d = await r.json();
    if (d.status !== "1" || !Array.isArray(d.result)) return [];
    return d.result.slice(0,10).map(tx=>({
      hash: tx.hash,
      from: tx.from,
      to: tx.to || "Contract",
      value: (parseInt(tx.value||"0")/1e18).toFixed(6) + " " + c.symbol,
      timestamp: tx.timeStamp ? new Date(parseInt(tx.timeStamp)*1000).toISOString() : "Unknown",
      status: tx.isError === "0" ? "Success" : "Failed",
      type: tx.input && tx.input !== "0x" ? "Contract" : "Transfer",
      chain: chainId, network: c.name,
      explorerUrl: c.explorer + tx.hash,
    }));
  } catch { return []; }
}

// ── Bitcoin via Blockstream (CORS-enabled) ────────
async function btcLookupTx(hash) {
  try {
    const r = await ft(`https://blockstream.info/api/tx/${hash}`);
    if (!r.ok) return null;
    const d = await r.json();
    const out = d.vout.reduce((s,v)=>s+(v.value||0),0);
    const inp = d.vin.reduce((s,v)=>s+(v.prevout?.value||0),0);
    return {
      found:true, chain:"bitcoin", network:"Bitcoin Mainnet", symbol:"BTC", txHash:hash,
      from: d.vin[0]?.prevout?.scriptpubkey_address || "Coinbase",
      to:   d.vout[0]?.scriptpubkey_address || "Multiple",
      value: (out/1e8).toFixed(8)+" BTC",
      fee: inp>0 ? ((inp-out)/1e8).toFixed(8)+" BTC" : null,
      blockNumber: d.status?.block_height || "Pending",
      confirmations: d.status?.confirmed ? "Confirmed" : "Unconfirmed",
      timestamp: d.status?.block_time ? new Date(d.status.block_time*1000).toISOString() : "Pending",
      status: d.status?.confirmed ? "Success" : "Pending",
      size: d.size+" bytes",
      type: "Bitcoin Transfer",
      verifiedBy: "Blockstream.info API",
      explorerUrl: "https://blockstream.info/tx/"+hash,
    };
  } catch { return null; }
}

async function btcWalletHistory(addr) {
  try {
    const r = await ft(`https://blockstream.info/api/address/${addr}/txs`);
    if (!r.ok) return [];
    const txs = await r.json();
    return txs.slice(0,15).map(tx=>({
      hash: tx.txid,
      from: tx.vin[0]?.prevout?.scriptpubkey_address||"Unknown",
      to:   tx.vout[0]?.scriptpubkey_address||"Unknown",
      value: (tx.vout.reduce((s,v)=>s+(v.value||0),0)/1e8).toFixed(8)+" BTC",
      timestamp: tx.status?.block_time ? new Date(tx.status.block_time*1000).toISOString() : "Pending",
      status: tx.status?.confirmed?"Success":"Pending",
      type:"Bitcoin Transfer", chain:"bitcoin", network:"Bitcoin Mainnet",
      explorerUrl:"https://blockstream.info/tx/"+tx.txid,
    }));
  } catch { return []; }
}

// ── Solana (CORS-enabled public RPC) ─────────────
async function solLookupTx(sig) {
  try {
    const r = await ft("https://api.mainnet-beta.solana.com",{
      method:"POST", headers:{"Content-Type":"application/json"},
      body:JSON.stringify({jsonrpc:"2.0",id:1,method:"getTransaction",
        params:[sig,{encoding:"json",maxSupportedTransactionVersion:0}]})
    });
    const d = await r.json();
    if (!d.result) return null;
    const tx = d.result;
    const lam = tx.meta ? Math.abs((tx.meta.preBalances[0]||0)-(tx.meta.postBalances[0]||0)) : 0;
    return {
      found:true, chain:"solana", network:"Solana Mainnet", symbol:"SOL", txHash:sig,
      from: tx.transaction?.message?.accountKeys?.[0]||"Unknown",
      to:   tx.transaction?.message?.accountKeys?.[1]||"Unknown",
      value: (lam/1e9).toFixed(9)+" SOL",
      fee: tx.meta?.fee ? (tx.meta.fee/1e9).toFixed(9)+" SOL" : null,
      blockNumber: tx.slot||"Unknown",
      confirmations: "Confirmed",
      timestamp: tx.blockTime ? new Date(tx.blockTime*1000).toISOString() : "Unknown",
      status: tx.meta?.err?"Failed":"Success",
      type:"Solana Transaction",
      verifiedBy:"Solana Mainnet RPC (api.mainnet-beta.solana.com)",
      explorerUrl:"https://explorer.solana.com/tx/"+sig,
    };
  } catch { return null; }
}

async function solWalletHistory(addr) {
  try {
    const r = await ft("https://api.mainnet-beta.solana.com",{
      method:"POST", headers:{"Content-Type":"application/json"},
      body:JSON.stringify({jsonrpc:"2.0",id:1,method:"getSignaturesForAddress",params:[addr,{limit:15}]})
    });
    const d = await r.json();
    return (d.result||[]).map(s=>({
      hash:s.signature, status:s.err?"Failed":"Success",
      timestamp: s.blockTime?new Date(s.blockTime*1000).toISOString():"Unknown",
      type:"Solana Transaction", chain:"solana", network:"Solana Mainnet",
      explorerUrl:"https://explorer.solana.com/tx/"+s.signature,
    }));
  } catch { return []; }
}

// ── Tron (TronGrid CORS-enabled) ──────────────────
async function tronLookupTx(hash) {
  try {
    const r = await ft(`https://api.trongrid.io/v1/transactions/${hash}`);
    if (!r.ok) return null;
    const d = await r.json();
    if (!d.data?.[0]) return null;
    const tx = d.data[0];
    const amt = tx.raw_data?.contract?.[0]?.parameter?.value?.amount||0;
    return {
      found:true, chain:"tron", network:"Tron Mainnet", symbol:"TRX", txHash:hash,
      from: tx.raw_data?.contract?.[0]?.parameter?.value?.owner_address||"Unknown",
      to:   tx.raw_data?.contract?.[0]?.parameter?.value?.to_address||"Unknown",
      value:(amt/1e6).toFixed(6)+" TRX",
      blockNumber: tx.blockNumber||"Unknown",
      confirmations:"Confirmed",
      timestamp: tx.block_timestamp?new Date(tx.block_timestamp).toISOString():"Unknown",
      status: tx.ret?.[0]?.contractRet==="SUCCESS"?"Success":"Failed",
      type:"TRX Transfer",
      verifiedBy:"TronGrid API (api.trongrid.io)",
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
      type:"TRX Transfer", chain:"tron", network:"Tron Mainnet",
      explorerUrl:"https://tronscan.org/#/transaction/"+tx.txID,
    }));
  } catch { return []; }
}

// ══════════════════════════════════════════════════
// REACT APP
// ══════════════════════════════════════════════════
export default function App() {
  const [tab, setTab] = useState("explorer");

  const [exFam, setExFam] = useState("ethereum");
  const [txInput, setTxInput] = useState("");
  const [exResult, setExResult] = useState(null);
  const [exLoading, setExLoading] = useState(false);
  const [exStatus, setExStatus] = useState("");
  const [exError, setExError] = useState("");

  const [whFam, setWhFam] = useState("ethereum");
  const [addrInput, setAddrInput] = useState("");
  const [whResult, setWhResult] = useState(null);
  const [whLoading, setWhLoading] = useState(false);
  const [whError, setWhError] = useState("");

  const fam = FAMILIES.find(f=>f.id===exFam);
  const wFam = FAMILIES.find(f=>f.id===whFam);

  // ── Explorer search ──────────────────────────────
  const lookupTx = async () => {
    const hash = txInput.trim();
    if (!hash) return setExError("Paste a transaction hash");
    setExLoading(true); setExError(""); setExResult(null);

    const isEVM = /^0x[a-fA-F0-9]{64}$/.test(hash);
    const isBTC = /^[a-fA-F0-9]{64}$/.test(hash) && !hash.startsWith("0x");
    const isSol = /^[1-9A-HJ-NP-Za-km-z]{80,100}$/.test(hash);

    try {
      // Bitcoin
      if (exFam === "bitcoin" || isBTC) {
        setExStatus("Searching Bitcoin...");
        const r = await btcLookupTx(hash.replace("0x",""));
        if (r) return setExResult(r);
      }

      // Solana
      if (exFam === "solana" || isSol) {
        setExStatus("Searching Solana...");
        const r = await solLookupTx(hash);
        if (r) return setExResult(r);
      }

      // Tron
      if (exFam === "tron" || isBTC) {
        setExStatus("Searching Tron...");
        const r = await tronLookupTx(hash.replace("0x",""));
        if (r) return setExResult(r);
      }

      // EVM chains — search selected family first, then all others
      if (isEVM) {
        const priority = fam?.chains?.length ? fam.chains : Object.keys(BLOCKSCOUT);
        const rest = Object.keys(BLOCKSCOUT).filter(c=>!priority.includes(c));
        const allChains = [...priority, ...rest];

        for (const chainId of allChains) {
          setExStatus(`Searching ${BLOCKSCOUT[chainId].name}...`);
          const r = await evmLookupTx(chainId, hash);
          if (r) return setExResult(r);
        }
      }

      setExError(
        "Transaction not found on any supported blockchain.\n\n" +
        "Common reasons:\n" +
        "• Select the correct chain family (e.g. Bitcoin for BTC hashes)\n" +
        "• The hash must be complete — 0x + 64 hex characters for EVM\n" +
        "• Very recent transactions may take 30s to appear"
      );
    } catch (e) {
      setExError("Search failed: " + (e.message||"Unknown error"));
    } finally {
      setExLoading(false);
      setExStatus("");
    }
  };

  // ── Wallet history ───────────────────────────────
  const loadWallet = async () => {
    const addr = addrInput.trim();
    if (!addr) return setWhError("Enter a wallet address");

    const isEVM  = /^0x[a-fA-F0-9]{40}$/.test(addr);
    const isBTC  = /^(1|3|bc1)[a-zA-Z0-9]{25,62}$/.test(addr);
    const isSol  = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(addr);
    const isTron = /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(addr);

    if (!isEVM && !isBTC && !isSol && !isTron) {
      return setWhError("Unrecognised address format.\n\nEVM: 0x + 40 hex\nBitcoin: starts with 1, 3, or bc1\nSolana: Base58 (32-44 chars)\nTron: starts with T");
    }

    setWhLoading(true); setWhError(""); setWhResult(null);

    try {
      if (isBTC) {
        const txs = await btcWalletHistory(addr);
        return setWhResult({ address:addr, transactions:txs, count:txs.length,
          chainsSearched:["Bitcoin"], source:"Blockstream.info API" });
      }
      if (isSol) {
        const txs = await solWalletHistory(addr);
        return setWhResult({ address:addr, transactions:txs, count:txs.length,
          chainsSearched:["Solana"], source:"Solana Mainnet RPC" });
      }
      if (isTron) {
        const txs = await tronWalletHistory(addr);
        return setWhResult({ address:addr, transactions:txs, count:txs.length,
          chainsSearched:["Tron"], source:"TronGrid API" });
      }

      // EVM — search all 8 chains in parallel
      const chains = Object.keys(BLOCKSCOUT);
      const results = await Promise.allSettled(chains.map(c=>evmWalletHistory(c,addr)));
      let all = [];
      results.forEach(r=>{ if(r.status==="fulfilled") all.push(...r.value); });
      all.sort((a,b)=>{
        if(!a.timestamp||a.timestamp==="Unknown") return 1;
        if(!b.timestamp||b.timestamp==="Unknown") return -1;
        return new Date(b.timestamp)-new Date(a.timestamp);
      });
      setWhResult({ address:addr, transactions:all, count:all.length,
        chainsSearched:chains.map(c=>BLOCKSCOUT[c].name),
        source:"Blockscout API (blockscout.com)" });
    } catch(e) {
      setWhError("Search failed: "+(e.message||"Unknown error"));
    } finally {
      setWhLoading(false);
    }
  };

  return (
    <div style={s.root}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=DM+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        body{background:#08080e;}
        input{outline:none;font-family:'DM Mono',monospace;}
        input:focus{border-color:rgba(255,255,255,0.22)!important;background:rgba(255,255,255,0.06)!important;}
        button{font-family:'DM Sans',sans-serif;cursor:pointer;}
        button:hover:not(:disabled){opacity:0.85;}
        a{text-decoration:none;}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        .fadeUp{animation:fadeUp 0.2s ease forwards;}
        pre{white-space:pre-wrap;font-family:'DM Mono',monospace;font-size:0.78rem;line-height:1.6;}
      `}</style>

      <div style={s.bgGlow}/><div style={s.bgGrid}/>

      {/* NAV */}
      <nav style={s.nav}>
        <div style={s.navW}>
          <div style={s.brand}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{flexShrink:0}}>
              <polygon points="10,1 19,5.5 19,14.5 10,19 1,14.5 1,5.5" stroke="#4ade80" strokeWidth="1.4" fill="rgba(74,222,128,0.08)"/>
              <circle cx="10" cy="10" r="2.5" fill="#4ade80"/>
            </svg>
            <span style={s.bName}>Crypto<span style={s.bGreen}>Verify</span></span>
          </div>
          <div style={s.navPills}>
            {[{k:"explorer",l:"Explorer"},{k:"history",l:"Wallet History"}].map(t=>(
              <button key={t.k} style={tab===t.k?s.pillOn:s.pillOff}
                onClick={()=>setTab(t.k)}>
                {t.l}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* HERO */}
      <div style={s.hero}>
        <div style={s.heroEye}>
          {tab==="explorer"?"TRANSACTION EXPLORER — 10 BLOCKCHAINS":"WALLET HISTORY — ALL CHAINS AUTO-SEARCHED"}
        </div>
        <h1 style={s.h1}>
          {tab==="explorer"
            ? <><G>Search</G> any transaction<br/>across any chain</>
            : <><G>Track</G> any wallet<br/>across all chains</>}
        </h1>
        <p style={s.hp}>
          {tab==="explorer"
            ? "Paste any transaction hash — all blockchain APIs are queried directly from your browser. No backend required."
            : "Enter any wallet address. All chains are searched in parallel directly from the browser. No backend required."}
        </p>
        <div style={s.liveBadge}>✅ Fully client-side — works on GitHub Pages</div>
      </div>

      {/* MAIN */}
      <div style={s.wrap}>

        {/* ══ EXPLORER ══ */}
        {tab==="explorer" && (
          <div style={s.card} className="fadeUp" key="ex">
            <CH icon="⌕" title="Multi-Chain Transaction Explorer"
              sub="Browser queries Blockscout, Blockstream, Solana RPC and TronGrid directly — no backend needed" />

            <FL>Chain family hint <Opt>(speeds up search)</Opt></FL>
            <div style={s.famRow}>
              {FAMILIES.map(f=>(
                <button key={f.id}
                  style={{...s.famBtn,...(exFam===f.id?{borderColor:f.color,background:`${f.color}12`,color:"#fff"}:{})}}
                  onClick={()=>{setExFam(f.id);setExError("");setExResult(null);}}>
                  <span style={{color:exFam===f.id?f.color:"rgba(255,255,255,0.28)",fontSize:"0.9rem"}}>{f.icon}</span>
                  <span style={{fontSize:"0.74rem",fontWeight:exFam===f.id?600:400}}>{f.label}</span>
                </button>
              ))}
            </div>
            {fam && <div style={s.famNote}>{fam.note}</div>}

            <FL>Transaction Hash
              <HT>{exFam==="bitcoin"?"64 hex (no 0x)":exFam==="solana"?"Base58 signature":"0x + 64 hex chars"}</HT>
            </FL>
            <div style={s.iRow}>
              <input style={s.inp}
                placeholder={exFam==="bitcoin"?"a1b2c3...64chars":exFam==="solana"?"5Uvd9vQE...":"0x9503d70f..."}
                value={txInput}
                onChange={e=>{setTxInput(e.target.value);setExError("");setExResult(null);}}
                onKeyDown={e=>e.key==="Enter"&&lookupTx()}/>
              {txInput&&<Xb onClick={()=>{setTxInput("");setExResult(null);setExError("");}}/>}
            </div>

            {exStatus&&(
              <div style={s.statusRow}>
                <span style={{display:"inline-block",animation:"spin 0.8s linear infinite",marginRight:6}}>⟳</span>
                {exStatus}
              </div>
            )}

            <MB loading={exLoading} color={fam?.color||"#4ade80"} onClick={lookupTx}>
              Search Transaction
            </MB>

            {exError&&<EB msg={exError}/>}

            {exResult&&(
              <div style={s.resBox} className="fadeUp">
                <div style={s.resHead}>
                  <SP status={exResult.status}/>
                  <span style={s.resNet}>{exResult.network}</span>
                  <a href={exResult.explorerUrl} target="_blank" rel="noreferrer" style={s.extLink}>Block Explorer ↗</a>
                </div>
                <div style={s.resGrid}>
                  <RF k="FROM"          v={exResult.from}  mono />
                  <RF k="TO"            v={exResult.to}    mono />
                  <RF k="VALUE"         v={exResult.value} green />
                  <RF k="STATUS"        v={exResult.status} />
                  <RF k="TYPE"          v={exResult.type} />
                  <RF k="BLOCK"         v={""+exResult.blockNumber} />
                  <RF k="CONFIRMATIONS" v={""+exResult.confirmations} />
                  {ok(exResult.gasUsed)  && <RF k="GAS USED"  v={exResult.gasUsed}/>}
                  {ok(exResult.gasPrice) && <RF k="GAS PRICE" v={exResult.gasPrice}/>}
                  {ok(exResult.fee)      && <RF k="FEE"       v={exResult.fee}/>}
                  {ok(exResult.size)     && <RF k="SIZE"      v={exResult.size}/>}
                  {ok(exResult.nonce)    && <RF k="NONCE"     v={""+exResult.nonce}/>}
                  {exResult.timestamp&&!["Pending","Unknown"].includes(exResult.timestamp)&&
                    <RF k="TIMESTAMP" v={new Date(exResult.timestamp).toLocaleString()}/>}
                  {exResult.verifiedBy&&<RF k="DATA SOURCE" v={exResult.verifiedBy}/>}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══ WALLET HISTORY ══ */}
        {tab==="history" && (
          <div style={s.card} className="fadeUp" key="wh">
            <CH icon="☰" title="Wallet Transaction History"
              sub="All chains searched in parallel from your browser — no backend needed" />

            <div style={s.infoBox}>
              🌐 Paste any wallet address — auto-detects EVM (searches all 8 chains simultaneously), Bitcoin, Solana, or Tron. Results come directly from public blockchain APIs.
            </div>

            <FL>Address type hint <Opt>(auto-detected from format)</Opt></FL>
            <div style={s.famRow}>
              {FAMILIES.map(f=>(
                <button key={f.id}
                  style={{...s.famBtn,...(whFam===f.id?{borderColor:f.color,background:`${f.color}12`,color:"#fff"}:{})}}
                  onClick={()=>{setWhFam(f.id);setWhError("");setWhResult(null);}}>
                  <span style={{color:whFam===f.id?f.color:"rgba(255,255,255,0.28)",fontSize:"0.9rem"}}>{f.icon}</span>
                  <span style={{fontSize:"0.74rem",fontWeight:whFam===f.id?600:400}}>{f.label}</span>
                </button>
              ))}
            </div>

            <FL>Wallet Address
              <HT>{whFam==="bitcoin"?"1.../3.../bc1...":whFam==="solana"?"Base58":whFam==="tron"?"T + 33 chars":"0x + 40 hex"}</HT>
            </FL>
            <div style={s.iRow}>
              <input style={s.inp}
                placeholder={whFam==="bitcoin"?"1A1zP1...":whFam==="solana"?"So11111...":whFam==="tron"?"TLa2f6...":"0x6Cc9397c3B38739..."}
                value={addrInput}
                onChange={e=>{setAddrInput(e.target.value);setWhError("");setWhResult(null);}}
                onKeyDown={e=>e.key==="Enter"&&loadWallet()}/>
              {addrInput&&<Xb onClick={()=>{setAddrInput("");setWhResult(null);setWhError("");}}/>}
            </div>

            <MB loading={whLoading} color={wFam?.color||"#4ade80"} onClick={loadWallet}>
              {whLoading?"Searching all chains...":"Load Transaction History"}
            </MB>

            {whError&&<EB msg={whError}/>}

            {whResult&&(
              <div className="fadeUp">
                <div style={s.histHead}>
                  <span style={s.histCnt}>{whResult.count} transaction{whResult.count!==1?"s":""} found</span>
                  {whResult.chainsSearched?.length>1&&
                    <span style={s.histChain}>{whResult.chainsSearched.length} chains searched</span>}
                  <span style={s.histSrc}>via {whResult.source}</span>
                </div>
                {whResult.count===0&&(
                  <div style={s.empty}>
                    No transactions found.<br/>
                    <span style={{fontSize:"0.72rem",color:"rgba(255,255,255,0.18)"}}>
                      Blockscout returns up to 10 recent txns per chain. New or test wallets may show zero.
                    </span>
                  </div>
                )}
                {(whResult.transactions||[]).map((tx,i)=>(
                  <div key={i} style={s.txRow} className="fadeUp">
                    <div style={s.txLeft}>
                      <div style={s.txHash}>{tx.hash?`${tx.hash.slice(0,14)}···${tx.hash.slice(-8)}`:"N/A"}</div>
                      <div style={s.txMeta}>
                        {tx.network&&<span style={s.txNet}>{tx.network}</span>}
                        {tx.type&&<span style={s.txType}>{tx.type}</span>}
                        {tx.timestamp&&!["Unknown","Pending"].includes(tx.timestamp)&&
                          <span>{new Date(tx.timestamp).toLocaleDateString()}</span>}
                      </div>
                    </div>
                    <div style={s.txRight}>
                      {tx.value&&<div style={s.txVal}>{tx.value}</div>}
                      <div style={{fontSize:"0.66rem",fontWeight:600,color:tx.status==="Success"?"#4ade80":"#f87171"}}>
                        {tx.status}
                      </div>
                    </div>
                    <div style={s.txAct}>
                      {tx.explorerUrl&&
                        <a href={tx.explorerUrl} target="_blank" rel="noreferrer" style={s.txExtBtn}>↗</a>}
                      {tx.hash&&
                        <button style={s.txDetBtn} onClick={()=>{
                          setTxInput(tx.hash);
                          setExFam(tx.chain==="bitcoin"?"bitcoin":tx.chain==="solana"?"solana":tx.chain==="tron"?"tron":"ethereum");
                          setTab("explorer");
                        }}>Details</button>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <footer style={s.footer}>
        <span style={s.fL}>CryptoVerify</span>
        <span style={s.fR}>Nishan Sapkota</span>
      </footer>
    </div>
  );
}

// ── Tiny components ───────────────────────────────
const ok = v => v!=null && !["N/A","Pending","Unknown","0","null"].includes(String(v));
const G = ({children})=><span style={{background:"linear-gradient(135deg,#4ade80,#60a5fa)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>{children}</span>;
const Opt = ({c})=><span style={{fontSize:"0.6rem",color:"rgba(255,255,255,0.18)",fontWeight:400,textTransform:"none",letterSpacing:0}}>{c}</span>;
function FL({children}){return <div style={{fontSize:"0.61rem",color:"rgba(255,255,255,0.26)",letterSpacing:"0.11em",textTransform:"uppercase",marginBottom:9,marginTop:18,display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>{children}</div>;}
function HT({children}){return <span style={{fontFamily:"'DM Mono',monospace",fontSize:"0.6rem",color:"rgba(255,255,255,0.16)",background:"rgba(255,255,255,0.04)",padding:"2px 7px",borderRadius:4,textTransform:"none",letterSpacing:0}}>{children}</span>;}
function Xb({onClick}){return <button style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.07)",color:"rgba(255,255,255,0.28)",borderRadius:7,padding:"0 12px",fontSize:"0.78rem",flexShrink:0}} onClick={onClick}>✕</button>;}
function CH({icon,title,sub}){return <div style={{display:"flex",gap:12,alignItems:"flex-start",marginBottom:22}}><div style={{width:40,height:40,background:"rgba(74,222,128,0.07)",border:"1px solid rgba(74,222,128,0.14)",borderRadius:9,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.05rem",color:"#4ade80",flexShrink:0}}>{icon}</div><div><div style={{fontSize:"0.97rem",fontWeight:700,color:"#fff",marginBottom:2}}>{title}</div><div style={{fontSize:"0.72rem",color:"rgba(255,255,255,0.26)"}}>{sub}</div></div></div>;}
function MB({loading,color,onClick,children}){const light=color==="#F0B90B"||color==="#F7931A";return <button style={{width:"100%",marginTop:16,padding:"12px 0",fontWeight:700,fontSize:"0.88rem",borderRadius:8,border:"none",background:loading?"rgba(255,255,255,0.04)":`linear-gradient(135deg,${color},${color}aa)`,color:loading?"rgba(255,255,255,0.2)":light?"#000":"#fff",display:"flex",alignItems:"center",justifyContent:"center",gap:8,cursor:loading?"not-allowed":"pointer"}} onClick={onClick} disabled={loading}>{loading?<><span style={{display:"inline-block",animation:"spin 0.7s linear infinite"}}>⟳</span>Searching...</>:children}</button>;}
function EB({msg}){return <div style={{marginTop:12,padding:"12px 14px",background:"rgba(248,113,113,0.06)",border:"1px solid rgba(248,113,113,0.16)",borderRadius:8,color:"#fca5a5",fontSize:"0.8rem"}}><pre>{msg}</pre></div>;}
function RF({k,v,mono,green}){return <div style={{paddingBottom:8,borderBottom:"1px solid rgba(255,255,255,0.04)"}}><div style={{fontSize:"0.58rem",color:"rgba(255,255,255,0.18)",letterSpacing:"0.13em",textTransform:"uppercase",marginBottom:3}}>{k}</div><div style={{fontSize:"0.8rem",wordBreak:"break-all",color:green?"#4ade80":"rgba(255,255,255,0.7)",fontFamily:mono?"'DM Mono',monospace":"'DM Sans',sans-serif",fontWeight:green?600:400}}>{v}</div></div>;}
function SP({status}){const ok=status==="Success",pend=status==="Pending";const col=ok?"#4ade80":pend?"#fbbf24":"#f87171";return <span style={{borderRadius:6,padding:"3px 9px",fontSize:"0.65rem",fontWeight:700,letterSpacing:"0.06em",background:`${col}15`,color:col,border:`1px solid ${col}30`}}>{ok?"✓ SUCCESS":pend?"⏳ PENDING":"✗ FAILED"}</span>;}

const s={
  root:{minHeight:"100vh",background:"#08080e",color:"#c5c7d8",fontFamily:"'DM Sans',sans-serif",position:"relative",overflowX:"hidden"},
  bgGlow:{position:"fixed",top:"-10%",left:"50%",transform:"translateX(-50%)",width:"80vw",height:"40vh",background:"radial-gradient(ellipse,rgba(74,222,128,0.055) 0%,transparent 70%)",pointerEvents:"none",zIndex:0},
  bgGrid:{position:"fixed",inset:0,backgroundImage:"linear-gradient(rgba(255,255,255,0.011) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.011) 1px,transparent 1px)",backgroundSize:"54px 54px",pointerEvents:"none",zIndex:0},
  nav:{position:"sticky",top:0,zIndex:100,background:"rgba(8,8,14,0.92)",backdropFilter:"blur(20px)",borderBottom:"1px solid rgba(255,255,255,0.055)"},
  navW:{maxWidth:860,margin:"0 auto",padding:"11px 24px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:16},
  brand:{display:"flex",alignItems:"center",gap:8},
  bName:{fontSize:"0.98rem",fontWeight:700,color:"rgba(255,255,255,0.78)",letterSpacing:"-0.02em"},
  bGreen:{color:"#4ade80"},
  navPills:{display:"flex",gap:3,background:"rgba(255,255,255,0.04)",borderRadius:8,padding:"3px"},
  pillOn:{background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.11)",color:"#fff",padding:"5px 15px",borderRadius:6,fontSize:"0.78rem",fontWeight:600},
  pillOff:{background:"transparent",border:"none",color:"rgba(255,255,255,0.3)",padding:"5px 15px",borderRadius:6,fontSize:"0.78rem"},
  hero:{position:"relative",zIndex:1,maxWidth:860,margin:"0 auto",padding:"48px 24px 28px",textAlign:"center"},
  heroEye:{fontSize:"0.6rem",letterSpacing:"0.2em",color:"rgba(74,222,128,0.5)",marginBottom:14,textTransform:"uppercase"},
  h1:{fontSize:"clamp(1.7rem,4.2vw,2.8rem)",fontWeight:700,color:"#fff",lineHeight:1.1,letterSpacing:"-0.035em",marginBottom:12},
  hp:{fontSize:"0.86rem",color:"rgba(255,255,255,0.28)",lineHeight:1.75,maxWidth:500,margin:"0 auto"},
  liveBadge:{display:"inline-block",marginTop:14,background:"rgba(74,222,128,0.08)",border:"1px solid rgba(74,222,128,0.2)",borderRadius:20,padding:"4px 14px",fontSize:"0.72rem",color:"rgba(74,222,128,0.8)"},
  wrap:{position:"relative",zIndex:1,maxWidth:860,margin:"0 auto",padding:"0 24px 60px"},
  card:{background:"rgba(255,255,255,0.022)",border:"1px solid rgba(255,255,255,0.065)",borderRadius:15,padding:"26px 28px"},
  infoBox:{background:"rgba(96,165,250,0.05)",border:"1px solid rgba(96,165,250,0.1)",borderRadius:8,padding:"11px 14px",fontSize:"0.76rem",color:"rgba(147,197,253,0.65)",marginBottom:4,lineHeight:1.6},
  famRow:{display:"flex",gap:6,flexWrap:"wrap",marginBottom:2},
  famBtn:{display:"flex",alignItems:"center",gap:6,background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.065)",borderRadius:8,padding:"7px 12px",color:"rgba(255,255,255,0.32)",transition:"all 0.15s"},
  famNote:{fontSize:"0.68rem",color:"rgba(255,255,255,0.2)",marginTop:6,paddingLeft:2},
  iRow:{display:"flex",gap:6},
  inp:{flex:1,padding:"11px 13px",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:8,color:"#dde0ec",fontSize:"0.82rem",transition:"all 0.2s"},
  statusRow:{marginTop:10,fontSize:"0.75rem",color:"rgba(74,222,128,0.55)",display:"flex",alignItems:"center"},
  resBox:{marginTop:16,background:"rgba(255,255,255,0.018)",border:"1px solid rgba(255,255,255,0.065)",borderRadius:11,padding:"17px 19px"},
  resHead:{display:"flex",alignItems:"center",gap:9,marginBottom:14,flexWrap:"wrap"},
  resNet:{fontSize:"0.66rem",color:"rgba(255,255,255,0.18)",marginLeft:"auto"},
  extLink:{fontSize:"0.72rem",color:"#4ade80",borderBottom:"1px solid rgba(74,222,128,0.2)",paddingBottom:1},
  resGrid:{display:"flex",flexDirection:"column",gap:8},
  histHead:{display:"flex",alignItems:"center",gap:10,marginTop:18,marginBottom:10,flexWrap:"wrap"},
  histCnt:{fontSize:"0.76rem",color:"rgba(255,255,255,0.42)",fontWeight:600},
  histChain:{fontSize:"0.67rem",color:"rgba(74,222,128,0.55)",background:"rgba(74,222,128,0.06)",padding:"2px 7px",borderRadius:4},
  histSrc:{fontSize:"0.64rem",color:"rgba(255,255,255,0.16)",marginLeft:"auto"},
  empty:{textAlign:"center",padding:"26px 16px",color:"rgba(255,255,255,0.18)",fontSize:"0.8rem",lineHeight:1.8},
  txRow:{display:"flex",alignItems:"center",gap:9,padding:"10px 13px",background:"rgba(255,255,255,0.018)",border:"1px solid rgba(255,255,255,0.045)",borderRadius:9,marginBottom:5},
  txLeft:{flex:1,minWidth:0},
  txHash:{fontSize:"0.7rem",fontFamily:"'DM Mono',monospace",color:"rgba(255,255,255,0.45)",marginBottom:3},
  txMeta:{fontSize:"0.64rem",color:"rgba(255,255,255,0.18)",display:"flex",gap:7,flexWrap:"wrap",alignItems:"center"},
  txNet:{background:"rgba(255,255,255,0.05)",borderRadius:3,padding:"1px 5px"},
  txType:{background:"rgba(255,255,255,0.04)",borderRadius:3,padding:"1px 5px"},
  txRight:{textAlign:"right",flexShrink:0},
  txVal:{fontSize:"0.77rem",fontWeight:600,color:"#4ade80",marginBottom:2},
  txAct:{display:"flex",gap:4,flexShrink:0},
  txExtBtn:{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.07)",color:"rgba(255,255,255,0.3)",borderRadius:6,padding:"5px 8px",fontSize:"0.72rem"},
  txDetBtn:{background:"rgba(74,222,128,0.06)",border:"1px solid rgba(74,222,128,0.14)",color:"rgba(74,222,128,0.65)",borderRadius:6,padding:"5px 9px",fontSize:"0.66rem",whiteSpace:"nowrap"},
  footer:{position:"relative",zIndex:1,borderTop:"1px solid rgba(255,255,255,0.04)",padding:"16px 24px",display:"flex",justifyContent:"space-between",maxWidth:1100,margin:"0 auto"},
  fL:{fontSize:"0.76rem",fontWeight:700,color:"rgba(255,255,255,0.16)"},
  fR:{fontSize:"0.72rem",color:"rgba(255,255,255,0.12)"},
};
