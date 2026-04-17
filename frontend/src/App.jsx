import { useState, useEffect, useCallback, useRef } from "react";
import { scoreAddress, getRiskLevel, detectPatterns, fetchBalance, fetchBtcBalance, fetchSolBalance, fetchTronBalance, fetchTokenTransfers, fetchCurrentPrice, exportTxtReport, exportCsv, KNOWN_ENTITIES, OFAC_SANCTIONS } from './intel.js';

// ══════════════════════════════════════════════════════════════
// NSTCrypto — Multi-Chain Blockchain Explorer
// Explorer · Wallet History · Block Tracker
// Blockscout · Blockstream · Solana RPC · TronGrid
// 100% client-side — no backend required
// ══════════════════════════════════════════════════════════════

const BLOCKSCOUT = {
  sepolia:  { name:"Sepolia TestNet",  url:"https://eth-sepolia.blockscout.com/api",  explorer:"https://eth-sepolia.blockscout.com/tx/",  addrExp:"https://eth-sepolia.blockscout.com/address/",  symbol:"ETH", color:"#627EEA" },
  ethereum: { name:"Ethereum Mainnet", url:"https://eth.blockscout.com/api",          explorer:"https://eth.blockscout.com/tx/",          addrExp:"https://eth.blockscout.com/address/",          symbol:"ETH", color:"#627EEA" },
  base:     { name:"Base",             url:"https://base.blockscout.com/api",         explorer:"https://base.blockscout.com/tx/",         addrExp:"https://base.blockscout.com/address/",         symbol:"ETH", color:"#0052FF" },
  op:       { name:"Optimism",         url:"https://optimism.blockscout.com/api",     explorer:"https://optimism.blockscout.com/tx/",     addrExp:"https://optimism.blockscout.com/address/",     symbol:"ETH", color:"#FF0420" },
  arbitrum: { name:"Arbitrum One",     url:"https://arbitrum.blockscout.com/api",     explorer:"https://arbitrum.blockscout.com/tx/",     addrExp:"https://arbitrum.blockscout.com/address/",     symbol:"ETH", color:"#28A0F0" },
  polygon:  { name:"Polygon",          url:"https://polygon.blockscout.com/api",      explorer:"https://polygon.blockscout.com/tx/",      addrExp:"https://polygon.blockscout.com/address/",      symbol:"POL", color:"#8247E5" },
  linea:    { name:"Linea",            url:"https://explorer.linea.build/api",        explorer:"https://explorer.linea.build/tx/",        addrExp:"https://explorer.linea.build/address/",        symbol:"ETH", color:"#61DFFF" },
  bnb:      { name:"BNB Chain",        url:"https://bsc.blockscout.com/api",          explorer:"https://bsc.blockscout.com/tx/",          addrExp:"https://bsc.blockscout.com/address/",          symbol:"BNB", color:"#F0B90B" },
};

const FAMILIES = [
  { id:"ethereum", label:"Ethereum",  icon:"⟠", color:"#627EEA", note:"Sepolia · Mainnet · Base · Optimism · Arbitrum · Linea", chains:["sepolia","ethereum","base","op","arbitrum","linea"] },
  { id:"polygon",  label:"Polygon",   icon:"⬡", color:"#8247E5", note:"Polygon Mainnet",                    chains:["polygon"] },
  { id:"bnb",      label:"BNB Chain", icon:"◈", color:"#F0B90B", note:"BNB Smart Chain",                    chains:["bnb"]     },
  { id:"bitcoin",  label:"Bitcoin",   icon:"₿", color:"#F7931A", note:"Bitcoin Mainnet · Blockstream API",  chains:[] },
  { id:"solana",   label:"Solana",    icon:"◎", color:"#9945FF", note:"Solana Mainnet · Public RPC",        chains:[] },
  { id:"tron",     label:"Tron",      icon:"⬤", color:"#FF0013", note:"Tron Mainnet · TronGrid API",        chains:[] },
];

const TRACKER_CHAINS = [
  { id:"ethereum", label:"Ethereum",  color:"#627EEA" },
  { id:"base",     label:"Base",      color:"#0052FF" },
  { id:"op",       label:"Optimism",  color:"#FF0420" },
  { id:"arbitrum", label:"Arbitrum",  color:"#28A0F0" },
  { id:"polygon",  label:"Polygon",   color:"#8247E5" },
  { id:"bnb",      label:"BNB",       color:"#F0B90B" },
  { id:"sepolia",  label:"Sepolia",   color:"#627EEA" },
];

// ── Fetch with timeout ────────────────────────────
const ft = (url, opts={}, ms=9000) => {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  return fetch(url, {...opts, signal:c.signal}).finally(() => clearTimeout(t));
};

function detectFamily(input) {
  const s = input.trim();
  if (/^0x[a-fA-F0-9]{40}$/.test(s))            return "ethereum"; // EVM address
  if (/^[1-9A-HJ-NP-Za-km-z]{80,100}$/.test(s)) return "solana";  // Solana tx sig
  if (/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(s))    return "tron";    // Tron address
  if (/^(1|3|bc1)[a-zA-Z0-9]{25,62}$/.test(s))  return "bitcoin"; // BTC address
  if (/^[a-fA-F0-9]{64}$/.test(s) && !s.startsWith("0x")) return "bitcoin"; // BTC/EVM tx hash
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(s))  return "solana";  // Solana wallet address
  return "ethereum";
}

const normStatus = (isError, raw) => {
  if (isError === "1") return "Failed";
  if (raw && ["fail","error","revert"].some(k => String(raw).toLowerCase().includes(k))) return "Failed";
  return "Success";
};

const RPC_FALLBACK = {
  bnb:"https://bsc-dataseed1.binance.org/",polygon:"https://polygon-rpc.com/",
  arbitrum:"https://arb1.arbitrum.io/rpc", op:"https://mainnet.optimism.io",
  base:"https://mainnet.base.org",          linea:"https://rpc.linea.build",
  ethereum:"https://cloudflare-eth.com",    sepolia:"https://rpc.sepolia.org",
};

async function rpcGetTx(chainId, hash) {
  const rpc = RPC_FALLBACK[chainId]; if (!rpc) return null;
  try {
    const r = await ft(rpc,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({jsonrpc:"2.0",id:1,method:"eth_getTransactionByHash",params:[hash]})},10000);
    const d = await r.json(); if (!d.result) return null;
    const tx = d.result; const c = BLOCKSCOUT[chainId]; const raw = parseInt(tx.value||"0x0",16);
    const r2 = await ft(rpc,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({jsonrpc:"2.0",id:2,method:"eth_getTransactionReceipt",params:[hash]})},10000);
    const d2 = await r2.json(); const receipt = d2.result;
    const status = receipt?.status==="0x1"?"Success":receipt?.status==="0x0"?"Failed":"Confirmed";
    return {
      found:true,chain:chainId,network:c.name,symbol:c.symbol,chainColor:c.color,txHash:hash,
      from:tx.from,to:tx.to||"Contract Creation",
      value:raw>0?(raw/1e18).toFixed(raw<1e15?8:6)+" "+c.symbol:"0 "+c.symbol,
      blockNumber:parseInt(tx.blockNumber||"0x0",16).toString(),confirmations:"Confirmed",timestamp:null,status,
      gasUsed:receipt?.gasUsed?parseInt(receipt.gasUsed,16).toLocaleString():null,
      gasPrice:tx.gasPrice?(parseInt(tx.gasPrice,16)/1e9).toFixed(4)+" Gwei":null,
      gasFee:(receipt?.gasUsed&&tx.gasPrice)?((parseInt(receipt.gasUsed,16)*parseInt(tx.gasPrice,16))/1e18).toFixed(8)+" "+c.symbol:null,
      nonce:parseInt(tx.nonce||"0x0",16).toString(),
      type:tx.input&&tx.input!=="0x"?"Contract Interaction":"ETH Transfer",
      verifiedBy:rpc.replace("https://","").split("/")[0]+" (RPC)",
      explorerUrl:c.explorer+hash,addrExplorer:c.addrExp,
    };
  } catch { return null; }
}

async function evmLookupTx(chainId, hash) {
  const c = BLOCKSCOUT[chainId];
  try {
    const r = await ft(`${c.url}?module=transaction&action=gettxinfo&txhash=${hash}`,{},8000);
    const d = await r.json();
    if (d.status==="1"&&d.result) {
      const tx=d.result; const raw=parseInt(tx.value||"0");
      return {
        found:true,chain:chainId,network:c.name,symbol:c.symbol,chainColor:c.color,txHash:hash,
        from:tx.from,to:tx.to||"Contract Creation",
        value:raw>0?(raw/1e18).toFixed(raw<1e15?8:6)+" "+c.symbol:"0 "+c.symbol,
        blockNumber:tx.blockNumber,
        confirmations:tx.confirmations?Number(tx.confirmations).toLocaleString():"Confirmed",
        timestamp:tx.timeStamp?new Date(parseInt(tx.timeStamp)*1000):null,
        status:normStatus(tx.isError,tx.txreceipt_status),
        gasUsed:tx.gasUsed?Number(tx.gasUsed).toLocaleString():null,
        gasPrice:tx.gasPrice?(parseInt(tx.gasPrice)/1e9).toFixed(4)+" Gwei":null,
        gasFee:(tx.gasUsed&&tx.gasPrice)?((parseInt(tx.gasUsed)*parseInt(tx.gasPrice))/1e18).toFixed(8)+" "+c.symbol:null,
        nonce:tx.nonce,type:tx.input&&tx.input!=="0x"?"Contract Interaction":"ETH Transfer",
        verifiedBy:c.url.replace("https://","").split("/")[0],
        explorerUrl:c.explorer+hash,addrExplorer:c.addrExp,
      };
    }
  } catch {}
  return await rpcGetTx(chainId, hash);
}

async function evmWalletHistory(chainId, addr, limit=15) {
  const c = BLOCKSCOUT[chainId];
  try {
    const r = await ft(`${c.url}?module=account&action=txlist&address=${addr}&sort=desc&page=1&offset=${limit}`);
    const d = await r.json();
    if (!Array.isArray(d.result)) return [];
    return d.result.slice(0,limit).map(tx=>({
      hash:tx.hash,from:tx.from,to:tx.to||"Contract",
      value:(parseInt(tx.value||"0")/1e18).toFixed(6)+" "+c.symbol,
      timestamp:tx.timeStamp?new Date(parseInt(tx.timeStamp)*1000):null,
      status:normStatus(tx.isError),type:tx.input&&tx.input!=="0x"?"Contract":"Transfer",
      chain:chainId,network:c.name,chainColor:c.color,explorerUrl:c.explorer+tx.hash,
    }));
  } catch { return []; }
}

// ══════════════════════════════════════════════════
// BLOCK TRACKER — fetch ALL incoming, return the full pool
// fetchSize=150 grabs a large batch; filtering for incoming
// may reduce count significantly, so we over-fetch.
// ══════════════════════════════════════════════════
async function fetchIncomingPool(chainId, address, fetchSize=150) {
  const c = BLOCKSCOUT[chainId]; if (!c) return [];
  try {
    const r = await ft(`${c.url}?module=account&action=txlist&address=${address}&sort=desc&page=1&offset=${fetchSize}`);
    const d = await r.json();
    if (!Array.isArray(d.result)) return [];
    const addr = address.toLowerCase();
    return d.result
      .filter(tx => tx.to && tx.to.toLowerCase() === addr)
      .map(tx => ({
        hash:tx.hash, from:tx.from, to:tx.to,
        value:(parseInt(tx.value||"0")/1e18).toFixed(6)+" "+c.symbol,
        rawValue:parseInt(tx.value||"0"),
        timestamp:tx.timeStamp?new Date(parseInt(tx.timeStamp)*1000):null,
        status:normStatus(tx.isError),
        type:tx.input&&tx.input!=="0x"?"Contract":"Transfer",
        blockNumber:tx.blockNumber,
        chain:chainId,network:c.name,chainColor:c.color,
        explorerUrl:c.explorer+tx.hash,addrExplorer:c.addrExp,
      }));
  } catch { return []; }
}

// ── Bitcoin ───────────────────────────────────────
async function btcLookupTx(hash) {
  try {
    const r = await ft(`https://blockstream.info/api/tx/${hash}`); if(!r.ok) return null;
    const d=await r.json(); const out=d.vout.reduce((s,v)=>s+(v.value||0),0); const inp=d.vin.reduce((s,v)=>s+(v.prevout?.value||0),0);
    return {found:true,chain:"bitcoin",network:"Bitcoin Mainnet",symbol:"BTC",chainColor:"#F7931A",txHash:hash,
      from:d.vin[0]?.prevout?.scriptpubkey_address||"Coinbase",to:d.vout[0]?.scriptpubkey_address||"Multiple",
      value:(out/1e8).toFixed(8)+" BTC",fee:inp>0?((inp-out)/1e8).toFixed(8)+" BTC":null,
      blockNumber:d.status?.block_height||"Pending",confirmations:d.status?.confirmed?"Confirmed":"Unconfirmed",
      timestamp:d.status?.block_time?new Date(d.status.block_time*1000):null,status:d.status?.confirmed?"Success":"Pending",
      size:d.size+" bytes",inputs:d.vin.length+" inputs",outputs:d.vout.length+" outputs",
      type:"Bitcoin Transfer",verifiedBy:"blockstream.info",explorerUrl:"https://blockstream.info/tx/"+hash};
  } catch { return null; }
}
async function btcWalletHistory(addr) {
  try {
    const r=await ft(`https://blockstream.info/api/address/${addr}/txs`); if(!r.ok) return [];
    return (await r.json()).slice(0,15).map(tx=>({
      hash:tx.txid,from:tx.vin[0]?.prevout?.scriptpubkey_address||"Unknown",to:tx.vout[0]?.scriptpubkey_address||"Unknown",
      value:(tx.vout.reduce((s,v)=>s+(v.value||0),0)/1e8).toFixed(8)+" BTC",
      timestamp:tx.status?.block_time?new Date(tx.status.block_time*1000):null,
      status:tx.status?.confirmed?"Success":"Pending",type:"Bitcoin Transfer",
      chain:"bitcoin",network:"Bitcoin Mainnet",chainColor:"#F7931A",explorerUrl:"https://blockstream.info/tx/"+tx.txid}));
  } catch { return []; }
}

// ── Solana ────────────────────────────────────────
const SOL_RPCS=["https://api.mainnet-beta.solana.com","https://rpc.ankr.com/solana","https://solana.public-rpc.com"];
async function solRPC(method,params) {
  for(const url of SOL_RPCS){try{const r=await ft(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({jsonrpc:"2.0",id:1,method,params})},14000);const d=await r.json();if(d.result!==undefined&&d.result!==null)return d.result;}catch{}}return null;
}
async function solLookupTx(sig) {
  let tx=await solRPC("getTransaction",[sig,{encoding:"jsonParsed",maxSupportedTransactionVersion:0}]);
  if(!tx)tx=await solRPC("getTransaction",[sig,{encoding:"json",maxSupportedTransactionVersion:0}]);
  if(!tx){if(!/^[1-9A-HJ-NP-Za-km-z]{80,100}$/.test(sig))return null;
    return{found:true,chain:"solana",network:"Solana Mainnet",symbol:"SOL",chainColor:"#9945FF",txHash:sig,from:"RPC rate-limited → see Explorer",to:"N/A",value:"N/A",blockNumber:"N/A",confirmations:"See Explorer",timestamp:null,status:"Confirmed",type:"Solana Transaction",verifiedBy:"Solana Explorer",explorerUrl:"https://explorer.solana.com/tx/"+sig,rpcNote:"Public Solana RPC rate-limited. Click Explorer ↗ to verify."};}
  const keys=tx.transaction?.message?.accountKeys||[];const from=keys[0]?.pubkey||keys[0]||"Unknown";const to=keys[1]?.pubkey||keys[1]||"Unknown";
  const pre=tx.meta?.preBalances||[];const post=tx.meta?.postBalances||[];const lam=pre[0]&&post[0]?Math.abs(pre[0]-post[0]):0;const tokenBal=tx.meta?.preTokenBalances?.length>0;
  return{found:true,chain:"solana",network:"Solana Mainnet",symbol:"SOL",chainColor:"#9945FF",txHash:sig,from:String(from),to:String(to),
    value:lam>0?(lam/1e9).toFixed(9)+" SOL":tokenBal?"Token Transfer":"0 SOL",fee:tx.meta?.fee?(tx.meta.fee/1e9).toFixed(9)+" SOL":null,
    blockNumber:tx.slot||"Unknown",confirmations:"Confirmed",timestamp:tx.blockTime?new Date(tx.blockTime*1000):null,
    status:tx.meta?.err?"Failed":"Success",type:tokenBal?"Token Transfer":"SOL Transfer",
    verifiedBy:"api.mainnet-beta.solana.com",explorerUrl:"https://explorer.solana.com/tx/"+sig};
}
async function solWalletHistory(addr){
  try{const sigs=await solRPC("getSignaturesForAddress",[addr,{limit:15}]);if(!sigs)return[];
    return sigs.map(s=>({hash:s.signature,status:s.err?"Failed":"Success",timestamp:s.blockTime?new Date(s.blockTime*1000):null,type:"Solana Transaction",chain:"solana",network:"Solana Mainnet",chainColor:"#9945FF",explorerUrl:"https://explorer.solana.com/tx/"+s.signature}));}
  catch{return[];}
}

// ── Tron ──────────────────────────────────────────
async function tronLookupTx(hash) {
  const h=hash.replace(/^0x/,"");
  try{const r=await ft(`https://api.trongrid.io/v1/transactions/${h}`,{headers:{"TRON-PRO-API-KEY":""}},10000);
    if(r.ok){const d=await r.json();if(d.data?.[0]){const tx=d.data[0];const con=tx.raw_data?.contract?.[0];const val=con?.parameter?.value||{};const amt=val.amount||val.call_value||0;
      return{found:true,chain:"tron",network:"Tron Mainnet",symbol:"TRX",chainColor:"#FF0013",txHash:h,from:val.owner_address||"Unknown",to:val.to_address||val.contract_address||"Unknown",value:amt>0?(amt/1e6).toFixed(6)+" TRX":"0 TRX",blockNumber:tx.blockNumber||"Unknown",confirmations:"Confirmed",timestamp:tx.block_timestamp?new Date(tx.block_timestamp):null,status:tx.ret?.[0]?.contractRet==="SUCCESS"?"Success":"Failed",type:con?.type==="TransferContract"?"TRX Transfer":con?.type==="TriggerSmartContract"?"Contract Call":"Tron Tx",verifiedBy:"api.trongrid.io",explorerUrl:"https://tronscan.org/#/transaction/"+h};}}}catch{}
  try{const r=await ft("https://api.trongrid.io/wallet/gettransactionbyid",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({value:h})},10000);
    if(r.ok){const tx=await r.json();if(tx?.txID){const con=tx.raw_data?.contract?.[0];const val=con?.parameter?.value||{};const amt=val.amount||0;
      return{found:true,chain:"tron",network:"Tron Mainnet",symbol:"TRX",chainColor:"#FF0013",txHash:h,from:val.owner_address||"Unknown",to:val.to_address||"Unknown",value:amt>0?(amt/1e6).toFixed(6)+" TRX":"0 TRX",blockNumber:"Confirmed",confirmations:"Confirmed",timestamp:tx.raw_data?.timestamp?new Date(tx.raw_data.timestamp):null,status:tx.ret?.[0]?.contractRet==="SUCCESS"?"Success":"Failed",type:"TRX Transfer",verifiedBy:"api.trongrid.io",explorerUrl:"https://tronscan.org/#/transaction/"+h};}}}catch{}
  return null;
}
async function tronWalletHistory(addr){
  try{const r=await ft(`https://api.trongrid.io/v1/accounts/${addr}/transactions?limit=15&only_confirmed=true`,{headers:{"TRON-PRO-API-KEY":""}},10000);if(!r.ok)return[];
    const d=await r.json();return(d.data||[]).map(tx=>{const val=tx.raw_data?.contract?.[0]?.parameter?.value||{};const amt=val.amount||0;return{hash:tx.txID,from:val.owner_address||"Unknown",to:val.to_address||"Unknown",value:amt>0?(amt/1e6).toFixed(6)+" TRX":"TRX Tx",status:tx.ret?.[0]?.contractRet==="SUCCESS"?"Success":"Failed",type:"TRX Transfer",chain:"tron",network:"Tron Mainnet",chainColor:"#FF0013",explorerUrl:"https://tronscan.org/#/transaction/"+tx.txID};});}
  catch{return[];}
}

// ── Fetch transactions in a block by block number ─────────────
// Use boolean=false to fetch only block header + tx hash array (small response, never times out).
// Then parallel-fetch first 10 TXs individually for full from/to/value details.
async function fetchBlockTransactions(chainId, blockNumber) {
  const c = BLOCKSCOUT[chainId]; if (!c) return null;
  const hexBlock = "0x" + parseInt(blockNumber).toString(16);
  let meta = null;

  // Step 1 — block header only (boolean=false keeps response tiny)
  try {
    const r = await ft(`${c.url}?module=proxy&action=eth_getBlockByNumber&tag=${hexBlock}&boolean=false`,{},10000);
    const d = await r.json();
    if (d.result?.number) meta = d.result;
  } catch {}

  if (!meta) {
    const rpc = RPC_FALLBACK[chainId];
    if (rpc) try {
      const r = await ft(rpc,{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({jsonrpc:"2.0",id:1,method:"eth_getBlockByNumber",params:[hexBlock,false]})},10000);
      const d = await r.json();
      if (d.result?.number) meta = d.result;
    } catch {}
  }
  if (!meta) return null;

  // boolean=false → transactions is an array of hash strings (not objects)
  const hashes = Array.isArray(meta.transactions) ? meta.transactions : [];
  const txCount = hashes.length;

  // Step 2 — fetch first 10 TX details in parallel
  const first10 = hashes.slice(0, 10);
  let transactions = [];
  if (first10.length > 0) {
    const results = await Promise.allSettled(first10.map(h => evmLookupTx(chainId, h)));
    transactions = first10.map((h, i) => {
      const r = results[i];
      if (r.status === "fulfilled" && r.value) {
        const tx = r.value;
        return { hash:tx.txHash, from:tx.from||"?", to:tx.to||"Contract Creation",
          value:tx.value||"0", type:tx.type||"Transfer",
          explorerUrl:tx.explorerUrl, addrExplorer:tx.addrExplorer };
      }
      return { hash:h, from:"?", to:"?", value:"—", type:"—",
        explorerUrl:c.explorer+h, addrExplorer:c.addrExp };
    });
  }

  return {
    blockNumber: parseInt(meta.number,16),
    timestamp: meta.timestamp ? new Date(parseInt(meta.timestamp,16)*1000) : null,
    txCount, transactions,
    gasUsed:  meta.gasUsed  ? parseInt(meta.gasUsed,16).toLocaleString()  : "?",
    gasLimit: meta.gasLimit ? parseInt(meta.gasLimit,16).toLocaleString() : "?",
    miner: meta.miner || null,
    symbol: c.symbol, chainColor: c.color, chainName: c.name,
  };
}

async function raceFirst(promises){
  return new Promise(resolve=>{
    let settled=0;const total=promises.length;if(total===0){resolve(null);return;}
    promises.forEach(p=>Promise.resolve(p).then(r=>{if(r)resolve(r);else{settled++;if(settled===total)resolve(null);}}).catch(()=>{settled++;if(settled===total)resolve(null);}));
  });
}

// ══════════════════════════════════════════════════
// COMPONENTS
// ══════════════════════════════════════════════════

function NSTLogo({size=28}) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" style={{flexShrink:0}}>
      <defs><linearGradient id="nstg" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor="#0EA5E9"/><stop offset="100%" stopColor="#10B981"/></linearGradient></defs>
      <rect width="32" height="32" rx="8" fill="url(#nstg)"/>
      <path d="M8 23V9l8 14V9M24 23V9" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function GasWidget() {
  const [gas,setGas]=useState(null);const [loading,setLoading]=useState(true);
  useEffect(()=>{
    let mounted=true;
    async function fetchGas(){
      const fmt=v=>parseFloat(v.toFixed(3));
      const trySet=(s,a,f)=>{if(a>0&&mounted){setGas({slow:fmt(s),avg:fmt(a),fast:fmt(f)});setLoading(false);return true;}return false;};
      // eth_feeHistory — same source as Etherscan, real base fee
      try{
        const rpc=await fetch("https://ethereum.publicnode.com",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({jsonrpc:"2.0",method:"eth_feeHistory",params:["0x5","latest",[25,50,75]],id:1}),signal:AbortSignal.timeout(6000)});
        const d=await rpc.json();
        const fees=(d.result?.baseFeePerGas||[]).map(h=>parseInt(h,16)/1e9);
        const base=fees.reduce((a,b)=>a+b,0)/fees.length;
        if(trySet(base*0.9,base,base*1.3))return;
      }catch{}
      // fallback: Blockscout stats
      try{const r=await ft("https://eth.blockscout.com/api/v2/stats",{},8000);const d=await r.json();if(trySet(parseFloat(d?.gas_prices?.slow||0),parseFloat(d?.gas_prices?.average||0),parseFloat(d?.gas_prices?.fast||0)))return;}catch{}
      if(mounted)setLoading(false);
    }
    fetchGas();const iv=setInterval(fetchGas,30000);return()=>{mounted=false;clearInterval(iv);};
  },[]);
  const col=!gas?"#64748b":gas.avg<10?"#10b981":gas.avg<30?"#eab308":gas.avg<80?"#f97316":"#ef4444";
  return(
    <div style={s.gasWidget}>
      <span style={{color:col,fontSize:"0.65rem"}}>⬡</span>
      <span style={{color:"rgba(255,255,255,0.3)",fontSize:"0.6rem",letterSpacing:"0.08em"}}>GAS</span>
      {loading?<span style={{color:"rgba(255,255,255,0.2)",fontSize:"0.7rem"}}>…</span>
        :!gas?<span style={{color:"rgba(255,255,255,0.2)",fontSize:"0.7rem"}}>N/A</span>
        :<><span style={{color:col,fontWeight:700,fontSize:"0.78rem"}}>{gas.avg}</span><span style={{color:"rgba(255,255,255,0.25)",fontSize:"0.65rem"}}>Gwei</span></>}
    </div>
  );
}

const ok = v => v!=null&&!["N/A","Pending","Unknown","0","null","undefined"].includes(String(v));
const Grad = ({children})=><span style={{background:"linear-gradient(135deg,#0EA5E9,#10B981)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",fontWeight:700}}>{children}</span>;

function StatusBadge({status}) {
  const isOk=["Success","Confirmed"].includes(status),isPend=status==="Pending";
  const col=isOk?"#10b981":isPend?"#eab308":"#ef4444";
  return <span style={{borderRadius:6,padding:"3px 10px",fontSize:"0.63rem",fontWeight:700,letterSpacing:"0.06em",background:`${col}18`,color:col,border:`1px solid ${col}35`,display:"inline-flex",alignItems:"center",gap:4}}><span style={{fontSize:"0.55rem"}}>{isOk?"●":isPend?"◐":"✕"}</span>{isOk?"SUCCESS":isPend?"PENDING":"FAILED"}</span>;
}

function ChainTag({name,color}){
  return <span style={{background:`${color}15`,border:`1px solid ${color}35`,color,borderRadius:4,padding:"2px 7px",fontSize:"0.62rem",fontWeight:600}}>{name}</span>;
}

// ── Risk Badge: local OFAC + known-entity lookup (no API call) ─
function RiskBadge({address}){
  if(!address||!/^0x[a-fA-F0-9]{40}$/i.test(address))return null;
  const addr=address.toLowerCase();
  const sanction=OFAC_SANCTIONS[addr];
  if(sanction)return(
    <span style={{background:"rgba(239,68,68,0.12)",border:"1px solid rgba(239,68,68,0.4)",color:"#ef4444",borderRadius:4,padding:"1px 7px",fontSize:"0.54rem",fontWeight:700,letterSpacing:"0.05em",display:"inline-flex",alignItems:"center",gap:2,flexShrink:0,whiteSpace:"nowrap"}}>
      🚫 OFAC
    </span>
  );
  const entity=KNOWN_ENTITIES[addr];
  if(!entity)return null;
  const rl=getRiskLevel(entity.risk);
  return(
    <span style={{background:rl.bg,border:`1px solid ${rl.border}`,color:rl.color,borderRadius:4,padding:"1px 7px",fontSize:"0.54rem",fontWeight:600,display:"inline-flex",alignItems:"center",gap:2,flexShrink:0,maxWidth:140,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
      {entity.icon} {entity.label}
    </span>
  );
}

// ── Circular risk-score gauge ─────────────────────────────────
function RiskScoreMeter({score}){
  const rl=getRiskLevel(score);
  const r=44,circ=2*Math.PI*r,dash=Math.min(score/100,1)*circ;
  return(
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",padding:"16px 24px 8px",flexShrink:0}}>
      <svg width="130" height="130" viewBox="0 0 120 120" style={{filter:`drop-shadow(0 0 14px ${rl.color}44)`}}>
        <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="9"/>
        <circle cx="60" cy="60" r={r} fill="none" stroke={rl.color} strokeWidth="9"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          transform="rotate(-90 60 60)" style={{transition:"stroke-dasharray 0.9s ease"}}/>
        <text x="60" y="56" textAnchor="middle" fill={rl.color} fontSize="27" fontWeight="700" fontFamily="Inter,sans-serif">{score}</text>
        <text x="60" y="73" textAnchor="middle" fill={rl.color} fontSize="9.5" fontWeight="700" fontFamily="Inter,sans-serif" letterSpacing="1">{rl.label}</text>
      </svg>
      <div style={{fontSize:"0.6rem",color:"rgba(255,255,255,0.18)",letterSpacing:"0.14em",textTransform:"uppercase",marginTop:4}}>Risk Score / 100</div>
    </div>
  );
}

function CopyBtn({text,label="Copy"}){
  const [copied,setCopied]=useState(false);
  const copy=()=>{navigator.clipboard.writeText(text).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),1500);});};
  return <button style={s.copyBtn} onClick={copy}>{copied?"✓":label}</button>;
}

function Field({label,value,green,wide}){
  return(
    <div style={{paddingBottom:10,borderBottom:"1px solid rgba(255,255,255,0.04)",gridColumn:wide?"span 2":""}}>
      <div style={{fontSize:"0.55rem",color:"rgba(255,255,255,0.2)",letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:3}}>{label}</div>
      <div style={{fontSize:"0.82rem",wordBreak:"break-all",color:green?"#10b981":"rgba(255,255,255,0.75)",fontWeight:green?600:400}}>{value}</div>
    </div>
  );
}

// FieldAddr: shows address with copy, explorer link, wallet history, AND trace button
function FieldAddr({label,value,onWallet,onTrace,explorerBase,isContract}){
  const isAddr=/^0x[a-fA-F0-9]{40}$/.test(value);
  return(
    <div style={{paddingBottom:10,borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
      <div style={{fontSize:"0.55rem",color:"rgba(255,255,255,0.2)",letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:4,display:"flex",alignItems:"center",gap:6}}>
        {label}
        {isContract&&<span style={{color:"#60a5fa",fontSize:"0.53rem",background:"rgba(96,165,250,0.1)",padding:"1px 5px",borderRadius:3}}>CONTRACT</span>}
      </div>
      <div style={{display:"flex",alignItems:"flex-start",gap:6,flexWrap:"wrap"}}>
        <span style={{fontSize:"0.78rem",wordBreak:"break-all",color:"rgba(255,255,255,0.7)",fontFamily:"'JetBrains Mono',monospace",flex:1}}>{value}</span>
        <RiskBadge address={value}/>
        {isAddr&&(
          <div style={{display:"flex",gap:4,flexShrink:0,marginTop:1,flexWrap:"wrap"}}>
            <CopyBtn text={value} label="⧉"/>
            {explorerBase&&<a href={explorerBase+value} target="_blank" rel="noreferrer" style={s.iconAction} title="View on explorer">↗</a>}
            <button style={{...s.iconAction}} onClick={onWallet} title="View wallet history">📋</button>
            {onTrace&&<button style={{...s.iconAction,color:"#10b981",borderColor:"rgba(16,185,129,0.3)",fontWeight:700}} onClick={()=>onTrace(value)} title="Trace in Block Tracker">🌿 Trace</button>}
          </div>
        )}
      </div>
    </div>
  );
}

// TxRow: each transaction in wallet history — now with 🌿 trace on the from address
function TxRow({tx,onDetails,onCopy,onTrace}){
  const isEVMFrom = /^0x[a-fA-F0-9]{40}$/.test(tx.from||"");
  return(
    <div style={s.txRow} className="fadeUp">
      <div style={{width:3,alignSelf:"stretch",borderRadius:3,background:tx.chainColor||"#0EA5E9",flexShrink:0}}/>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:"0.69rem",fontFamily:"'JetBrains Mono',monospace",color:"rgba(255,255,255,0.4)",marginBottom:5,display:"flex",alignItems:"center",gap:6}}>
          {tx.hash?`${tx.hash.slice(0,14)}···${tx.hash.slice(-8)}`:"N/A"}
          {tx.hash&&<button style={s.inlineCopy} onClick={()=>onCopy(tx.hash)}>⧉</button>}
        </div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center",fontSize:"0.63rem",color:"rgba(255,255,255,0.2)"}}>
          <ChainTag name={tx.network||tx.chain} color={tx.chainColor||"#0EA5E9"}/>
          {tx.type&&<span style={{background:"rgba(255,255,255,0.04)",borderRadius:4,padding:"1px 5px"}}>{tx.type}</span>}
          {tx.timestamp&&<span>{tx.timestamp.toLocaleDateString()} {tx.timestamp.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</span>}
        </div>
        {tx.from&&tx.to&&(
          <div style={{fontSize:"0.62rem",color:"rgba(255,255,255,0.18)",marginTop:4,fontFamily:"'JetBrains Mono',monospace",display:"flex",alignItems:"center",gap:5,flexWrap:"wrap"}}>
            <span>{tx.from.slice(0,8)}…{tx.from.slice(-4)}</span>
            <RiskBadge address={tx.from}/>
            <span style={{color:"rgba(255,255,255,0.1)"}}>→</span>
            <span>{tx.to.slice(0,8)}…{tx.to.slice(-4)}</span>
            <RiskBadge address={tx.to}/>
            {/* Trace button right inline with the address */}
            {isEVMFrom&&onTrace&&(
              <button style={{...s.traceInline}} onClick={()=>onTrace(tx.from)} title={`Trace ${tx.from} in Block Tracker`}>🌿</button>
            )}
          </div>
        )}
      </div>
      <div style={{textAlign:"right",flexShrink:0,minWidth:80}}>
        {tx.value&&<div style={{fontSize:"0.78rem",fontWeight:700,color:"#10b981",marginBottom:3}}>{tx.value}</div>}
        <span style={{fontSize:"0.63rem",fontWeight:700,color:tx.status==="Success"?"#10b981":"#ef4444"}}>{tx.status}</span>
      </div>
      <div style={{display:"flex",gap:4,flexShrink:0,flexDirection:"column"}}>
        {tx.explorerUrl&&<a href={tx.explorerUrl} target="_blank" rel="noreferrer" style={s.txBtn}>↗</a>}
        {tx.hash&&<button style={{...s.txBtn,color:"#0EA5E9",borderColor:"rgba(14,165,233,0.2)"}} onClick={()=>onDetails(tx)}>Details</button>}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════
// BLOCK TRACKER — Tree Node
// Supports: unlimited Load More, configurable depth
// ══════════════════════════════════════════════════
function TreeNode({address, chainId, depth, isRoot, label, parentTx, pageSize, maxDepth, onTrace}) {
  const [status,setStatus]         = useState("idle");
  const [allIncoming,setAllIncoming] = useState([]); // full pool from API
  const [visibleCount,setVisibleCount] = useState(pageSize); // how many to show
  const [expanded,setExpanded]     = useState(isRoot);
  const [childOpen,setChildOpen]   = useState({});   // txHash → bool
  const [childPool,setChildPool]   = useState({});   // senderAddr → [{tx}]
  const [childLoading,setChildLoading] = useState({});
  const chainCfg = BLOCKSCOUT[chainId];
  const chainColor = chainCfg?.color || "#0EA5E9";

  const load = useCallback(async () => {
    if (status==="loaded"||status==="loading") return;
    setStatus("loading"); setExpanded(true);
    const pool = await fetchIncomingPool(chainId, address, 150);
    setAllIncoming(pool);
    setStatus("loaded");
  }, [address,chainId,status]);

  useEffect(() => { if (isRoot) load(); }, []);

  const toggle = () => { if (status==="idle") load(); else setExpanded(p=>!p); };
  const loadMore = () => setVisibleCount(p => p + pageSize);

  const traceSender = async (tx) => {
    if (childLoading[tx.hash]) return;
    if (childPool[tx.from]) {
      // Already loaded — just toggle open/close
      setChildOpen(p => ({...p, [tx.hash]: !p[tx.hash]}));
      return;
    }
    setChildLoading(p=>({...p,[tx.hash]:true}));
    setChildOpen(p=>({...p,[tx.hash]:true}));
    const pool = await fetchIncomingPool(chainId, tx.from, 150);
    setChildPool(p=>({...p,[tx.from]:pool}));
    setChildLoading(p=>({...p,[tx.hash]:false}));
  };

  const visible = allIncoming.slice(0, visibleCount);
  const hasMore = allIncoming.length > visibleCount;
  const addrShort = a => a?`${a.slice(0,8)}…${a.slice(-6)}`:"Unknown";
  const fmtTime   = ts => ts?ts.toLocaleDateString()+" "+ts.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}):"—";

  return (
    <div style={{marginLeft:isRoot?0:20,position:"relative"}}>
      {!isRoot&&<div style={{position:"absolute",left:-14,top:0,bottom:0,width:1,background:"rgba(255,255,255,0.06)"}}/>}

      {/* Node header */}
      <div style={{background:isRoot?"rgba(14,165,233,0.07)":"rgba(255,255,255,0.025)",border:`1px solid ${isRoot?"rgba(14,165,233,0.22)":"rgba(255,255,255,0.06)"}`,borderRadius:10,padding:"12px 14px",marginBottom:6,display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
        <div style={{width:9,height:9,borderRadius:"50%",background:chainColor,flexShrink:0,boxShadow:`0 0 8px ${chainColor}55`}}/>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:"0.6rem",color:"rgba(255,255,255,0.2)",marginBottom:3}}>{isRoot?"📍 Tracking address":label||"Sender"}</div>
          <div style={{fontSize:"0.76rem",fontFamily:"'JetBrains Mono',monospace",color:"rgba(255,255,255,0.82)",wordBreak:"break-all"}}>{address}</div>
          {parentTx&&<div style={{fontSize:"0.62rem",color:"#10b981",marginTop:3}}>Sent <strong>{parentTx.value}</strong> · {fmtTime(parentTx.timestamp)}</div>}
        </div>
        <div style={{display:"flex",gap:5,flexShrink:0,flexWrap:"wrap",alignItems:"center"}}>
          <ChainTag name={chainCfg?.name||chainId} color={chainColor}/>
          {chainCfg?.addrExp&&<a href={chainCfg.addrExp+address} target="_blank" rel="noreferrer" style={s.txBtn}>↗</a>}
          <CopyBtn text={address} label="⧉"/>
          {onTrace&&<button style={{...s.txBtn,color:"#10b981",borderColor:"rgba(16,185,129,0.2)"}} onClick={()=>onTrace(address)}>🌿 Re-trace</button>}
          <button style={{...s.txBtn,minWidth:28,color:expanded?"rgba(255,255,255,0.4)":"#0EA5E9"}} onClick={toggle}>
            {status==="loading"?<span className="spin">⟳</span>:expanded?"▲":"▼ Load"}
          </button>
        </div>
      </div>

      {/* Incoming list */}
      {expanded&&status==="loaded"&&(
        <div style={{marginLeft:14}}>
          {allIncoming.length===0?(
            <div style={{fontSize:"0.72rem",color:"rgba(255,255,255,0.18)",padding:"8px 12px",fontStyle:"italic"}}>
              No incoming transactions found on {chainCfg?.name||chainId}
            </div>
          ):(
            <>
              {/* Stats bar */}
              <div style={{fontSize:"0.6rem",color:"rgba(14,165,233,0.5)",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:8,display:"flex",gap:10,alignItems:"center"}}>
                <span>↓ Showing {Math.min(visibleCount,allIncoming.length)} of {allIncoming.length} incoming</span>
              </div>

              {visible.map((tx,i)=>(
                <div key={tx.hash||i} style={{marginBottom:8}}>
                  <div style={{display:"flex",alignItems:"flex-start",gap:8}}>
                    {/* Tree connector dot */}
                    <div style={{display:"flex",flexDirection:"column",alignItems:"center",flexShrink:0,paddingTop:7}}>
                      <div style={{width:6,height:6,borderRadius:"50%",background:"rgba(16,185,129,0.7)",border:"1px solid rgba(16,185,129,0.3)"}}/>
                      {childOpen[tx.hash]&&<div style={{width:1,flex:1,background:"rgba(255,255,255,0.06)",marginTop:2}}/>}
                    </div>

                    <div style={{flex:1}}>
                      {/* TX card */}
                      <div style={{background:"rgba(255,255,255,0.017)",border:"1px solid rgba(255,255,255,0.05)",borderRadius:8,padding:"10px 12px"}}>
                        <div style={{display:"flex",alignItems:"flex-start",gap:8,flexWrap:"wrap"}}>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontSize:"0.68rem",fontFamily:"'JetBrains Mono',monospace",color:"rgba(14,165,233,0.85)",marginBottom:4,display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                              <span>FROM: {addrShort(tx.from)}</span>
                              <RiskBadge address={tx.from}/>
                              <CopyBtn text={tx.from} label="⧉"/>
                              {tx.addrExplorer&&<a href={tx.addrExplorer+tx.from} target="_blank" rel="noreferrer" style={{...s.iconAction,fontSize:"0.6rem"}}>addr ↗</a>}
                            </div>
                            <div style={{fontSize:"0.67rem",color:"rgba(255,255,255,0.3)",display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
                              <span style={{color:"#10b981",fontWeight:700,fontSize:"0.74rem"}}>{tx.value}</span>
                              <span>{fmtTime(tx.timestamp)}</span>
                              {tx.blockNumber&&<span>Block #{Number(tx.blockNumber).toLocaleString()}</span>}
                              <span style={{background:tx.status==="Success"?"rgba(16,185,129,0.1)":"rgba(239,68,68,0.1)",color:tx.status==="Success"?"#10b981":"#ef4444",borderRadius:4,padding:"1px 6px",fontSize:"0.6rem",fontWeight:700}}>{tx.status}</span>
                            </div>
                          </div>
                          <div style={{display:"flex",gap:4,flexShrink:0,flexWrap:"wrap"}}>
                            {tx.explorerUrl&&<a href={tx.explorerUrl} target="_blank" rel="noreferrer" style={s.txBtn}>TX ↗</a>}
                            {depth<maxDepth&&(
                              <button
                                style={{...s.txBtn,color:childPool[tx.from]?"#10b981":"#0EA5E9",borderColor:childPool[tx.from]?"rgba(16,185,129,0.3)":"rgba(14,165,233,0.25)",fontWeight:600,minWidth:72}}
                                onClick={()=>traceSender(tx)}>
                                {childLoading[tx.hash]?<span className="spin">⟳</span>
                                  :childPool[tx.from]?(childOpen[tx.hash]?"▲ Hide":"▼ Senders")
                                  :"🔍 Trace"}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Recursive child senders */}
                      {childOpen[tx.hash]&&childPool[tx.from]&&(
                        <div style={{marginTop:6}}>
                          {childPool[tx.from].length===0?(
                            <div style={{fontSize:"0.68rem",color:"rgba(255,255,255,0.16)",padding:"8px 12px 8px 20px",fontStyle:"italic"}}>
                              No incoming txs for {addrShort(tx.from)} on {chainCfg?.name||chainId}
                            </div>
                          ):(
                            <TreeNode
                              address={tx.from}
                              chainId={chainId}
                              depth={depth+1}
                              isRoot={false}
                              label="Sender's address"
                              parentTx={tx}
                              pageSize={pageSize}
                              maxDepth={maxDepth}
                              onTrace={onTrace}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Load More */}
              {hasMore&&(
                <button style={{...s.loadMoreBtn}} onClick={loadMore}>
                  Load {Math.min(pageSize, allIncoming.length-visibleCount)} more
                  <span style={{opacity:0.5,marginLeft:4,fontSize:"0.65rem"}}>({allIncoming.length-visibleCount} remaining)</span>
                </button>
              )}
              {!hasMore&&allIncoming.length>0&&(
                <div style={{fontSize:"0.63rem",color:"rgba(255,255,255,0.1)",textAlign:"center",padding:"6px 0"}}>
                  All {allIncoming.length} incoming transactions loaded
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════
// BLOCK VIEW — shows block header + last 10 TXs
// ══════════════════════════════════════════════════
function BlockView({data, onTrace}) {
  const {blockNumber,timestamp,txCount,gasUsed,gasLimit,miner,transactions,symbol,chainColor,chainName}=data;
  const fmtTime=ts=>ts?ts.toLocaleString():"—";
  return(
    <div style={{marginTop:24}} className="fadeUp">
      {/* Block header */}
      <div style={{background:"rgba(14,165,233,0.06)",border:"1px solid rgba(14,165,233,0.18)",borderRadius:14,padding:"20px 24px",marginBottom:16}}>
        <div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap",marginBottom:14}}>
          <div style={{fontSize:"1.3rem",fontWeight:800,color:"#0EA5E9",fontFamily:"'JetBrains Mono',monospace"}}>Block #{blockNumber?.toLocaleString()}</div>
          <ChainTag name={chainName} color={chainColor}/>
          {timestamp&&<span style={{fontSize:"0.7rem",color:"rgba(255,255,255,0.3)"}}>{fmtTime(timestamp)}</span>}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:10,marginBottom:miner?12:0}}>
          {[["Transactions in Block",txCount],["Gas Used",gasUsed],["Gas Limit",gasLimit]].map(([lbl,val])=>(
            <div key={lbl} style={{background:"rgba(255,255,255,0.03)",borderRadius:8,padding:"10px 14px"}}>
              <div style={{fontSize:"0.53rem",color:"rgba(255,255,255,0.2)",letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:4}}>{lbl}</div>
              <div style={{fontSize:"0.82rem",color:"rgba(255,255,255,0.75)",wordBreak:"break-all",fontWeight:600}}>{val||"—"}</div>
            </div>
          ))}
        </div>
        {miner&&(
          <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",paddingTop:10,borderTop:"1px solid rgba(255,255,255,0.04)"}}>
            <span style={{fontSize:"0.55rem",color:"rgba(255,255,255,0.2)",textTransform:"uppercase",letterSpacing:"0.1em"}}>Miner</span>
            <span style={{fontSize:"0.7rem",color:"rgba(255,255,255,0.5)",fontFamily:"'JetBrains Mono',monospace"}}>{miner}</span>
            <RiskBadge address={miner}/>
            <CopyBtn text={miner} label="⧉"/>
          </div>
        )}
      </div>

      {/* TX list */}
      <div style={{fontSize:"0.6rem",color:"rgba(14,165,233,0.4)",letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:10,display:"flex",alignItems:"center",gap:8}}>
        <span>Last {transactions.length} transactions in this block</span>
        {txCount>10&&<span style={{color:"rgba(255,255,255,0.15)"}}>({txCount} total)</span>}
      </div>
      {transactions.length===0&&(
        <div style={{textAlign:"center",padding:"24px",color:"rgba(255,255,255,0.15)",fontSize:"0.8rem",fontStyle:"italic"}}>No transactions in this block</div>
      )}
      {transactions.map((tx,i)=>(
        <div key={tx.hash||i} style={{background:"rgba(255,255,255,0.018)",border:"1px solid rgba(255,255,255,0.04)",borderRadius:10,padding:"12px 14px",marginBottom:5,display:"flex",alignItems:"flex-start",gap:10,flexWrap:"wrap"}} className="fadeUp">
          <div style={{width:3,alignSelf:"stretch",borderRadius:3,background:chainColor||"#0EA5E9",flexShrink:0}}/>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:"0.67rem",fontFamily:"'JetBrains Mono',monospace",color:"rgba(14,165,233,0.8)",marginBottom:5,display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
              {tx.hash?`${tx.hash.slice(0,14)}···${tx.hash.slice(-8)}`:"N/A"}
              {tx.hash&&<CopyBtn text={tx.hash} label="⧉"/>}
              {tx.explorerUrl&&<a href={tx.explorerUrl} target="_blank" rel="noreferrer" style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",color:"rgba(255,255,255,0.35)",borderRadius:5,padding:"2px 7px",fontSize:"0.64rem"}}>TX ↗</a>}
            </div>
            <div style={{fontSize:"0.62rem",color:"rgba(255,255,255,0.2)",fontFamily:"'JetBrains Mono',monospace",display:"flex",alignItems:"center",gap:5,flexWrap:"wrap"}}>
              <span style={{color:"rgba(14,165,233,0.5)"}}>FROM</span>
              <span>{tx.from.slice(0,8)}…{tx.from.slice(-4)}</span>
              <RiskBadge address={tx.from}/>
              {onTrace&&/^0x[a-fA-F0-9]{40}$/.test(tx.from)&&(
                <button style={{background:"rgba(16,185,129,0.08)",border:"1px solid rgba(16,185,129,0.2)",color:"#10b981",borderRadius:5,padding:"1px 7px",fontSize:"0.6rem",cursor:"pointer",fontWeight:600}} onClick={()=>onTrace(tx.from)} title="Trace this address">🌿</button>
              )}
              <span style={{color:"rgba(255,255,255,0.1)"}}>→</span>
              <span>{typeof tx.to==="string"&&tx.to.startsWith("0x")?`${tx.to.slice(0,8)}…${tx.to.slice(-4)}`:tx.to}</span>
              <RiskBadge address={tx.to}/>
            </div>
          </div>
          <div style={{textAlign:"right",flexShrink:0,minWidth:80}}>
            <div style={{fontSize:"0.78rem",fontWeight:700,color:"#10b981",marginBottom:3}}>{tx.value}</div>
            <span style={{fontSize:"0.6rem",background:"rgba(255,255,255,0.04)",borderRadius:4,padding:"1px 6px",color:"rgba(255,255,255,0.3)"}}>{tx.type}</span>
          </div>
        </div>
      ))}
      {txCount>10&&(
        <div style={{fontSize:"0.67rem",color:"rgba(255,255,255,0.18)",textAlign:"center",padding:"8px 0",fontStyle:"italic"}}>
          Showing first 10 of {txCount} transactions · View full block on explorer
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════
// FLOATING QUICK TRACK — always visible on every tab
// ══════════════════════════════════════════════════
function FloatingTracker({onTrace}) {
  const [open,setOpen]   = useState(false);
  const [addr,setAddr]   = useState("");
  const [err,setErr]     = useState("");
  const [chain,setChain] = useState("ethereum");

  const go = () => {
    const a = addr.trim();
    if (!a) return setErr("Enter an address");
    if (!/^0x[a-fA-F0-9]{40}$/.test(a)) return setErr("EVM address only (0x…)");
    onTrace(a, chain);
    setOpen(false); setAddr(""); setErr("");
  };

  return (
    <div style={{position:"fixed",bottom:24,right:24,zIndex:500,display:"flex",flexDirection:"column",alignItems:"flex-end",gap:10}}>
      {open&&(
        <div style={{background:"rgba(6,11,20,0.97)",border:"1px solid rgba(14,165,233,0.25)",borderRadius:14,padding:"16px",width:300,boxShadow:"0 20px 60px rgba(0,0,0,0.6)",backdropFilter:"blur(20px)"}} className="fadeUp">
          <div style={{fontSize:"0.72rem",fontWeight:700,color:"#0EA5E9",marginBottom:10,display:"flex",alignItems:"center",gap:6}}>
            🌿 Quick Block Tracker
          </div>
          {/* Mini chain selector */}
          <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:10}}>
            {TRACKER_CHAINS.slice(0,4).map(c=>(
              <button key={c.id} style={{fontSize:"0.62rem",borderRadius:5,padding:"3px 8px",border:`1px solid ${chain===c.id?c.color:"rgba(255,255,255,0.08)"}`,background:chain===c.id?`${c.color}15`:"rgba(255,255,255,0.03)",color:chain===c.id?c.color:"rgba(255,255,255,0.3)"}}
                onClick={()=>setChain(c.id)}>{c.label}</button>
            ))}
            {TRACKER_CHAINS.slice(4).map(c=>(
              <button key={c.id} style={{fontSize:"0.62rem",borderRadius:5,padding:"3px 8px",border:`1px solid ${chain===c.id?c.color:"rgba(255,255,255,0.08)"}`,background:chain===c.id?`${c.color}15`:"rgba(255,255,255,0.03)",color:chain===c.id?c.color:"rgba(255,255,255,0.3)"}}
                onClick={()=>setChain(c.id)}>{c.label}</button>
            ))}
          </div>
          <input
            style={{...s.input,width:"100%",fontSize:"0.75rem",padding:"9px 11px",marginBottom:6}}
            placeholder="0x wallet address…"
            value={addr} onChange={e=>{setAddr(e.target.value);setErr("");}}
            onKeyDown={e=>e.key==="Enter"&&go()}
            autoFocus/>
          {err&&<div style={{fontSize:"0.67rem",color:"#fca5a5",marginBottom:6}}>{err}</div>}
          <button style={{...s.primaryBtn,marginTop:0,padding:"9px 0",fontSize:"0.8rem",borderRadius:8}} onClick={go}>
            🌿 Track Now
          </button>
        </div>
      )}
      <button
        style={{display:"flex",alignItems:"center",gap:6,background:open?"rgba(239,68,68,0.15)":"linear-gradient(135deg,#0EA5E9,#10B981)",border:`1px solid ${open?"rgba(239,68,68,0.3)":"transparent"}`,color:open?"#ef4444":"#fff",borderRadius:50,padding:"10px 16px",fontSize:"0.8rem",fontWeight:700,boxShadow:"0 4px 24px rgba(14,165,233,0.3)",cursor:"pointer",transition:"all 0.2s"}}
        onClick={()=>{setOpen(p=>!p);setErr("");}}>
        {open?"✕ Close":"🌿 Track"}
      </button>
    </div>
  );
}

// ══════════════════════════════════════════════════
// INTELLIGENCE TAB — OSINT Analysis (all chains)
// ══════════════════════════════════════════════════
const FAMILY_META = {
  ethereum: { label:"EVM",     icon:"⟠", color:"#627EEA", hint:"Ethereum · Base · Polygon · BNB · Optimism · Arbitrum · Sepolia" },
  bitcoin:  { label:"Bitcoin", icon:"₿", color:"#F7931A", hint:"Bitcoin Mainnet — Blockstream API" },
  solana:   { label:"Solana",  icon:"◎", color:"#9945FF", hint:"Solana Mainnet — Public RPC" },
  tron:     { label:"Tron",    icon:"⬤", color:"#FF0013", hint:"Tron Mainnet — TronGrid API" },
};

function IntelligenceTab({ onTrace, prefill }) {
  const [addr,    setAddr]    = useState("");
  const [chain,   setChain]   = useState("ethereum");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [data,    setData]    = useState(null);
  const [section, setSection] = useState("patterns");

  useEffect(() => {
    if (prefill?.addr) {
      setAddr(prefill.addr);
      const fam = detectFamily(prefill.addr);
      if (fam === "ethereum" && prefill.chain && BLOCKSCOUT[prefill.chain]) setChain(prefill.chain);
    }
  }, [prefill]);

  const detectedFamily = addr.trim() ? detectFamily(addr.trim()) : "ethereum";
  const famMeta = FAMILY_META[detectedFamily] || FAMILY_META.ethereum;

  const analyze = async () => {
    const a = addr.trim();
    if (!a) return setError("Enter a wallet address — any chain (EVM · Bitcoin · Solana · Tron)");
    const family = detectFamily(a);
    setLoading(true); setError(""); setData(null);
    try {
      let transactions=[], tokens=[], rawBal=null, usdPrice=null;
      let chainLabel="", chainColor="#0EA5E9", explorerLink="", balDivisor=1e18, balSymbol="ETH", balDecimals=6;

      if (family === "ethereum") {
        if (!/^0x[a-fA-F0-9]{40}$/.test(a)) return setError("EVM address required — 0x + 40 hex characters");
        const c = BLOCKSCOUT[chain] || BLOCKSCOUT.ethereum;
        chainLabel=c.name; chainColor=c.color; explorerLink=c.addrExp+a;
        balSymbol=c.symbol; balDivisor=1e18; balDecimals=6;
        const [b,t,tk,p] = await Promise.allSettled([fetchBalance(c.url,a), evmWalletHistory(chain,a,50), fetchTokenTransfers(c.url,c.explorer,c.color,c.name,c.symbol,a), fetchCurrentPrice(c.symbol)]);
        rawBal=b.status==="fulfilled"?b.value:null; transactions=t.status==="fulfilled"?t.value:[]; tokens=tk.status==="fulfilled"?tk.value:[]; usdPrice=p.status==="fulfilled"?p.value:null;

      } else if (family === "bitcoin") {
        chainLabel="Bitcoin Mainnet"; chainColor="#F7931A"; explorerLink=`https://blockstream.info/address/${a}`;
        balSymbol="BTC"; balDivisor=1e8; balDecimals=8;
        const [b,t,p] = await Promise.allSettled([fetchBtcBalance(a), btcWalletHistory(a), fetchCurrentPrice("BTC")]);
        rawBal=b.status==="fulfilled"?b.value:null; transactions=t.status==="fulfilled"?t.value:[]; usdPrice=p.status==="fulfilled"?p.value:null;

      } else if (family === "solana") {
        chainLabel="Solana Mainnet"; chainColor="#9945FF"; explorerLink=`https://explorer.solana.com/address/${a}`;
        balSymbol="SOL"; balDivisor=1e9; balDecimals=6;
        const [b,t,p] = await Promise.allSettled([fetchSolBalance(a), solWalletHistory(a), fetchCurrentPrice("SOL")]);
        rawBal=b.status==="fulfilled"?b.value:null; transactions=t.status==="fulfilled"?t.value:[]; usdPrice=p.status==="fulfilled"?p.value:null;

      } else if (family === "tron") {
        chainLabel="Tron Mainnet"; chainColor="#FF0013"; explorerLink=`https://tronscan.org/#/address/${a}`;
        balSymbol="TRX"; balDivisor=1e6; balDecimals=6;
        const [b,t,p] = await Promise.allSettled([fetchTronBalance(a), tronWalletHistory(a), fetchCurrentPrice("TRX")]);
        rawBal=b.status==="fulfilled"?b.value:null; transactions=t.status==="fulfilled"?t.value:[]; usdPrice=p.status==="fulfilled"?p.value:null;
      }

      const balNative = rawBal ? parseInt(rawBal) / balDivisor : 0;
      const usdValue  = usdPrice && balNative > 0 ? balNative * usdPrice : null;
      const risk      = scoreAddress(a, transactions);
      const patterns  = detectPatterns(transactions);
      const tss       = transactions.filter(t=>t.timestamp).map(t=>t.timestamp.getTime());
      const firstSeen  = tss.length ? new Date(Math.min(...tss)) : null;
      const lastActive = tss.length ? new Date(Math.max(...tss)) : null;
      const cpSet = new Set(transactions.flatMap(tx=>[tx.from?.toLowerCase(),tx.to?.toLowerCase()]).filter(x=>x&&x!==a.toLowerCase()));
      const cpRisk=[];
      cpSet.forEach(cp=>{
        if(!cp)return;
        const sanction=OFAC_SANCTIONS[cp]; const entity=KNOWN_ENTITIES[cp];
        if(sanction||(entity&&entity.risk>=50)) cpRisk.push({address:cp,sanction,entity,score:sanction?100:entity.risk});
      });
      cpRisk.sort((x,y)=>y.score-x.score);

      setData({
        address:a, family, chain:family==="ethereum"?chain:family,
        chainLabel, chainColor, explorerLink, risk, patterns,
        stats:{
          balance:`${balNative.toFixed(balDecimals)} ${balSymbol}`,
          usdValue:usdValue?`$${usdValue.toLocaleString(undefined,{maximumFractionDigits:2})}`:"N/A",
          txCount:transactions.length, uniqueCounterparties:cpSet.size,
          firstSeen:firstSeen?firstSeen.toLocaleDateString():"N/A",
          lastActive:lastActive?lastActive.toLocaleDateString():"N/A",
        },
        transactions, tokens, cpRisk, generatedAt:new Date().toISOString(),
      });
      setSection("patterns");
    } catch(e) {
      setError("Analysis failed: "+(e.message||"Unknown error"));
    } finally { setLoading(false); }
  };

  const doExportTxt  = () => data && exportTxtReport({address:data.address,chain:data.chainLabel,risk:data.risk,stats:data.stats,transactions:data.transactions,tokenTxs:data.tokens,generatedAt:data.generatedAt});
  const doExportCsv  = () => data && exportCsv([...data.transactions,...data.tokens], data.address);
  const doExportJson = () => {
    if(!data)return;
    const payload={address:data.address,chain:data.chainLabel,generatedAt:data.generatedAt,riskScore:data.risk.score,riskLevel:getRiskLevel(data.risk.score).label,flags:data.risk.flags,entity:data.risk.entity,stats:data.stats,behavioralPatterns:data.patterns,counterpartyRisk:data.cpRisk,transactions:data.transactions,tokenTransfers:data.tokens};
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob); const el=document.createElement("a");
    el.href=url; el.download=`intel_${data.address.slice(0,10)}_${Date.now()}.json`; el.click(); URL.revokeObjectURL(url);
  };

  const flagCol = level => ({CRITICAL:"#ef4444",HIGH:"#f97316",MEDIUM:"#eab308",LOW:"#60a5fa",SAFE:"#10b981",INFO:"rgba(255,255,255,0.4)"}[level]||"rgba(255,255,255,0.3)");

  return (
    <div style={s.card} className="fadeUp" key="intel">
      <div style={s.cardHeader}>
        <div style={s.cardTitle}>🧠 Blockchain Intelligence Analysis</div>
        <div style={s.cardSub}>OFAC sanctions · AML patterns · Token tracking · Counterparty exposure · Export — All chains: EVM · Bitcoin · Solana · Tron</div>
      </div>

      <div style={{...s.infoBox,borderColor:"rgba(124,58,237,0.2)",background:"rgba(124,58,237,0.05)"}}>
        <strong style={{color:"#a78bfa"}}>Law Enforcement Grade OSINT:</strong> OFAC SDN sanctions screening across all chains (EVM · BTC · SOL · TRX), 70+ labelled exchange/mixer/DeFi wallets, six AML behavioral patterns (layering, structuring, smurfing, high-frequency, rapid movement, dormancy). Generates case-file quality investigation reports.
      </div>

      <label style={s.fieldLabel}>
        Target Address
        <span style={s.fieldHint}>any chain — auto-detected</span>
        {addr.trim()&&<span style={{fontSize:"0.6rem",color:famMeta.color,background:`${famMeta.color}12`,border:`1px solid ${famMeta.color}25`,borderRadius:4,padding:"1px 8px",fontWeight:600}}>{famMeta.icon} {famMeta.label} — {famMeta.hint}</span>}
      </label>
      <div style={s.inputRow}>
        <input style={s.input} placeholder="0x… EVM wallet    or    1A… BTC    or    SOL address    or    T… TRX"
          value={addr} onChange={e=>{setAddr(e.target.value);setError("");setData(null);}}
          onKeyDown={e=>e.key==="Enter"&&analyze()}/>
        {addr&&<button style={s.xBtn} onClick={()=>{setAddr("");setData(null);setError("");}}>✕</button>}
      </div>

      {detectedFamily==="ethereum"&&addr.trim()&&(
        <>
          <label style={s.fieldLabel}>EVM Chain</label>
          <div style={s.famRow}>
            {TRACKER_CHAINS.map(tc=>(
              <button key={tc.id} style={{...s.famBtn,...(chain===tc.id?{borderColor:tc.color,background:`${tc.color}12`,color:"#fff"}:{})}} onClick={()=>setChain(tc.id)}>
                <span style={{width:7,height:7,borderRadius:"50%",background:tc.color,display:"inline-block"}}/>
                <span style={{fontSize:"0.72rem",fontWeight:chain===tc.id?700:400}}>{tc.label}</span>
              </button>
            ))}
          </div>
        </>
      )}

      <button style={{...s.primaryBtn,...(loading?s.primaryBtnDisabled:{background:"linear-gradient(135deg,#7C3AED,#0EA5E9)"})}} onClick={analyze} disabled={loading}>
        {loading?<><span className="spin">⟳</span> Analyzing…</>:"🧠 Run Intelligence Analysis"}
      </button>
      {error&&<pre style={s.errBlock}>{error}</pre>}

      {data&&(
        <div className="fadeUp" style={{marginTop:20}}>

          {/* ── Target header ── */}
          <div style={{display:"flex",alignItems:"flex-start",gap:12,marginBottom:16,padding:"14px 16px",background:"rgba(255,255,255,0.02)",border:`1px solid ${data.chainColor}18`,borderRadius:10,flexWrap:"wrap"}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:"0.55rem",color:"rgba(255,255,255,0.18)",letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:4,display:"flex",alignItems:"center",gap:6}}>
                Target Address
                <ChainTag name={data.chainLabel} color={data.chainColor}/>
              </div>
              <div style={{fontSize:"0.76rem",fontFamily:"'JetBrains Mono',monospace",color:"rgba(255,255,255,0.72)",wordBreak:"break-all",marginBottom:4}}>{data.address}</div>
              {data.risk.entity&&(
                <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                  <span style={{fontSize:"0.85rem"}}>{data.risk.entity.icon}</span>
                  <span style={{fontSize:"0.76rem",fontWeight:700,color:"rgba(255,255,255,0.8)"}}>{data.risk.entity.label}</span>
                  <span style={{fontSize:"0.6rem",color:"rgba(255,255,255,0.3)",background:"rgba(255,255,255,0.05)",borderRadius:4,padding:"1px 6px"}}>{data.risk.entity.type}</span>
                  {data.risk.entity.verified&&<span style={{fontSize:"0.55rem",color:"#10b981",background:"rgba(16,185,129,0.08)",borderRadius:4,padding:"1px 6px"}}>✓ VERIFIED</span>}
                </div>
              )}
            </div>
            <div style={{display:"flex",gap:5,flexShrink:0,flexWrap:"wrap",alignItems:"flex-start"}}>
              <CopyBtn text={data.address} label="⧉"/>
              {data.explorerLink&&<a href={data.explorerLink} target="_blank" rel="noreferrer" style={s.txBtn}>Explorer ↗</a>}
              {onTrace&&data.family==="ethereum"&&<button style={{...s.txBtn,color:"#10b981",borderColor:"rgba(16,185,129,0.2)"}} onClick={()=>onTrace(data.address,data.chain)}>🌿 Block Trace</button>}
            </div>
          </div>

          {/* ── Risk gauge + flags ── */}
          <div style={{display:"grid",gridTemplateColumns:"auto 1fr",gap:12,marginBottom:16,background:"rgba(255,255,255,0.018)",border:"1px solid rgba(255,255,255,0.05)",borderRadius:12,padding:"4px 14px 14px"}}>
            <RiskScoreMeter score={data.risk.score}/>
            <div style={{paddingTop:14}}>
              <div style={{fontSize:"0.57rem",color:"rgba(255,255,255,0.18)",letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:8}}>Risk Indicators</div>
              {data.risk.flags.map((f,i)=>(
                <div key={i} style={{display:"flex",alignItems:"flex-start",gap:8,marginBottom:5,padding:"7px 10px",background:`${flagCol(f.level)}08`,border:`1px solid ${flagCol(f.level)}20`,borderLeft:`3px solid ${flagCol(f.level)}`,borderRadius:"0 7px 7px 0"}}>
                  <span style={{fontSize:"0.82rem",flexShrink:0,marginTop:1}}>{f.icon}</span>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:1}}>
                      <span style={{fontSize:"0.53rem",fontWeight:700,color:flagCol(f.level),letterSpacing:"0.08em"}}>{f.level}</span>
                      {f.detail&&<span style={{fontSize:"0.53rem",color:"rgba(255,255,255,0.18)"}}>{f.detail}</span>}
                    </div>
                    <div style={{fontSize:"0.71rem",color:"rgba(255,255,255,0.68)",lineHeight:1.4}}>{f.msg}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Stats grid ── */}
          <div style={{...s.resultGrid,marginBottom:16}}>
            <Field label="BALANCE"               value={data.stats.balance} green/>
            <Field label="USD VALUE"             value={data.stats.usdValue}/>
            <Field label="TRANSACTIONS ANALYZED" value={String(data.stats.txCount)}/>
            <Field label="UNIQUE COUNTERPARTIES" value={String(data.stats.uniqueCounterparties)}/>
            <Field label="FIRST SEEN"            value={data.stats.firstSeen}/>
            <Field label="LAST ACTIVE"           value={data.stats.lastActive}/>
          </div>

          {/* ── Sub-section tabs ── */}
          <div style={{display:"flex",gap:5,marginBottom:12,borderBottom:"1px solid rgba(255,255,255,0.06)",paddingBottom:10,flexWrap:"wrap"}}>
            {[
              ["patterns","🔎 Patterns"],
              ["tokens",`🪙 Tokens${data.tokens.length?` (${data.tokens.length})`:""}`],
              ["cp",`⚠️ Counterparties${data.cpRisk.length?` (${data.cpRisk.length})`:""}`],
            ].map(([k,label])=>(
              <button key={k} style={{...s.filterBtn,...(section===k?s.filterBtnOn:{})}} onClick={()=>setSection(k)}>{label}</button>
            ))}
          </div>

          {section==="patterns"&&(
            <div style={{marginBottom:12}}>
              <div style={{fontSize:"0.57rem",color:"rgba(255,255,255,0.18)",letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:8}}>AML Behavioral Patterns</div>
              {[
                ["rapidMovement","⚡","Rapid Fund Movement","Transactions within 6 hours — classic layering to obscure fund origin."],
                ["structuring","🔢","Structuring","Multiple round-number transactions — potential structuring below reporting thresholds."],
                ["smurfing","🔹","Smurfing / Placement","5+ small sub-threshold transactions — classic placement technique."],
                ["highFrequency","📈","High-Frequency Activity","10+ transactions in one day — bot activity or rapid distribution."],
                ["newWallet","🆕","New Wallet","Wallet active less than 30 days — common in temporary pass-through schemes."],
                ["dormant","💤","Dormant Wallet","No activity for 6+ months — sudden reactivation may indicate delayed laundering."],
              ].map(([key,icon,name,desc])=>(
                <div key={key} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 13px",marginBottom:4,borderRadius:8,background:data.patterns[key]?"rgba(249,115,22,0.05)":"rgba(255,255,255,0.015)",border:`1px solid ${data.patterns[key]?"rgba(249,115,22,0.2)":"rgba(255,255,255,0.04)"}`}}>
                  <span style={{fontSize:"0.9rem",flexShrink:0,width:22,textAlign:"center"}}>{data.patterns[key]?icon:"—"}</span>
                  <div style={{flex:1}}>
                    <div style={{fontSize:"0.71rem",fontWeight:600,color:data.patterns[key]?"#f97316":"rgba(255,255,255,0.22)",marginBottom:data.patterns[key]?2:0}}>{name}</div>
                    {data.patterns[key]&&<div style={{fontSize:"0.63rem",color:"rgba(255,255,255,0.28)",lineHeight:1.5}}>{desc}</div>}
                  </div>
                  <div style={{fontSize:"0.6rem",fontWeight:700,color:data.patterns[key]?"#f97316":"rgba(255,255,255,0.1)",flexShrink:0,letterSpacing:"0.05em"}}>{data.patterns[key]?"DETECTED":"CLEAN"}</div>
                </div>
              ))}
              {data.family!=="ethereum"&&<div style={{fontSize:"0.63rem",color:"rgba(255,255,255,0.15)",marginTop:8,fontStyle:"italic"}}>Note: counterparty-based scoring and entity labels are EVM-only. Pattern detection applies to all chains.</div>}
            </div>
          )}

          {section==="tokens"&&(
            <div style={{marginBottom:12}}>
              {data.tokens.length===0?(
                <div style={s.emptyState}>{data.family==="ethereum"?"No ERC-20 token transfers found":data.family==="bitcoin"?"Bitcoin has no token standard":"No token transfers fetched for "+data.chainLabel}</div>
              ):(
                data.tokens.map((tk,i)=>(
                  <div key={i} style={{...s.txRow,marginBottom:4}}>
                    <div style={{width:3,alignSelf:"stretch",borderRadius:3,background:"#a78bfa",flexShrink:0}}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3,flexWrap:"wrap"}}>
                        <span style={{fontSize:"0.72rem",fontWeight:700,color:"#a78bfa"}}>{tk.tokenName}</span>
                        <span style={{fontSize:"0.6rem",color:"rgba(255,255,255,0.25)",background:"rgba(255,255,255,0.04)",borderRadius:4,padding:"1px 5px"}}>{tk.tokenSymbol}</span>
                        {tk.timestamp&&<span style={{fontSize:"0.62rem",color:"rgba(255,255,255,0.2)"}}>{tk.timestamp.toLocaleDateString()}</span>}
                      </div>
                      <div style={{fontSize:"0.62rem",color:"rgba(255,255,255,0.2)",fontFamily:"'JetBrains Mono',monospace",display:"flex",alignItems:"center",gap:5,flexWrap:"wrap"}}>
                        <span>{tk.from?.slice(0,10)}…{tk.from?.slice(-4)}</span>
                        <RiskBadge address={tk.from}/>
                        <span style={{color:"rgba(255,255,255,0.1)"}}>→</span>
                        <span>{tk.to?.slice(0,10)}…{tk.to?.slice(-4)}</span>
                        <RiskBadge address={tk.to}/>
                      </div>
                    </div>
                    <div style={{textAlign:"right",flexShrink:0}}>
                      <div style={{fontSize:"0.78rem",fontWeight:700,color:"#a78bfa",marginBottom:3}}>{tk.value}</div>
                      {tk.explorerUrl&&<a href={tk.explorerUrl} target="_blank" rel="noreferrer" style={s.txBtn}>TX ↗</a>}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {section==="cp"&&(
            <div style={{marginBottom:12}}>
              {data.cpRisk.length===0?(
                <div style={s.emptyState}>No high-risk counterparties detected in the analyzed transaction history</div>
              ):(
                <>
                  <div style={{fontSize:"0.63rem",color:"rgba(255,255,255,0.2)",marginBottom:8,lineHeight:1.6}}>
                    Addresses appearing in this wallet's transaction history that are flagged in the OFAC SDN list or known-entity database (risk ≥ 50).
                  </div>
                  {data.cpRisk.map((cp,i)=>{
                    const rl2=getRiskLevel(cp.score);
                    return(
                      <div key={i} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"10px 13px",marginBottom:4,background:rl2.bg,border:`1px solid ${rl2.border}`,borderLeft:`3px solid ${rl2.color}`,borderRadius:"0 9px 9px 0"}}>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4,flexWrap:"wrap"}}>
                            <span style={{fontSize:"0.7rem",fontWeight:700,color:rl2.color}}>{rl2.icon} {rl2.label}</span>
                            {cp.sanction&&<span style={{fontSize:"0.6rem",color:"#ef4444",background:"rgba(239,68,68,0.1)",borderRadius:4,padding:"1px 6px"}}>🚫 OFAC: {cp.sanction.entity}</span>}
                            {cp.entity&&<span style={{fontSize:"0.6rem",color:"rgba(255,255,255,0.4)",background:"rgba(255,255,255,0.05)",borderRadius:4,padding:"1px 6px"}}>{cp.entity.icon} {cp.entity.label}</span>}
                          </div>
                          <div style={{fontSize:"0.68rem",fontFamily:"'JetBrains Mono',monospace",color:"rgba(255,255,255,0.5)",wordBreak:"break-all",marginBottom:cp.sanction?4:0}}>{cp.address}</div>
                          {cp.sanction&&<div style={{fontSize:"0.62rem",color:"rgba(255,255,255,0.22)"}}>Program: {cp.sanction.program} · Sanctioned: {cp.sanction.date} · {cp.sanction.note}</div>}
                        </div>
                        <div style={{display:"flex",gap:4,flexShrink:0}}>
                          <CopyBtn text={cp.address} label="⧉"/>
                          {onTrace&&data.family==="ethereum"&&<button style={{...s.txBtn,color:"#10b981",borderColor:"rgba(16,185,129,0.2)"}} onClick={()=>onTrace(cp.address,data.chain)}>🌿</button>}
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          )}

          <div style={{marginTop:16,padding:"14px 16px",background:"rgba(255,255,255,0.015)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:10}}>
            <div style={{fontSize:"0.57rem",color:"rgba(255,255,255,0.18)",letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:10}}>Export Investigation Report</div>
            <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
              <button style={{...s.txBtn,color:"#0EA5E9",borderColor:"rgba(14,165,233,0.25)",padding:"8px 16px",fontSize:"0.75rem",fontWeight:600}} onClick={doExportTxt}>📄 TXT Report</button>
              <button style={{...s.txBtn,color:"#10b981",borderColor:"rgba(16,185,129,0.25)",padding:"8px 16px",fontSize:"0.75rem",fontWeight:600}} onClick={doExportCsv}>📊 CSV Data</button>
              <button style={{...s.txBtn,color:"#a78bfa",borderColor:"rgba(167,139,250,0.25)",padding:"8px 16px",fontSize:"0.75rem",fontWeight:600}} onClick={doExportJson}>⬢ JSON Full</button>
            </div>
            <div style={{fontSize:"0.61rem",color:"rgba(255,255,255,0.12)",marginTop:8,lineHeight:1.6}}>
              TXT — formatted case-file report · CSV — all transactions (native + tokens) · JSON — full machine-readable data with risk scores
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════
// MAIN APP
// ══════════════════════════════════════════════════
export default function App() {
  const [tab,setTab]   = useState("explorer");

  // Explorer
  const [exFam,setExFam]           = useState("ethereum");
  const [txInput,setTxInput]       = useState("");
  const [exResult,setExResult]     = useState(null);
  const [exLoading,setExLoading]   = useState(false);
  const [exStatus,setExStatus]     = useState("");
  const [exError,setExError]       = useState("");
  const [recentSearches,setRecentSearches] = useState([]);

  // Wallet history
  const [addrInput,setAddrInput]   = useState("");
  const [whResult,setWhResult]     = useState(null);
  const [whLoading,setWhLoading]   = useState(false);
  const [whError,setWhError]       = useState("");
  const [chainFilter,setChainFilter] = useState("all");

  // Intel tab
  const [intelPrefill,setIntelPrefill] = useState(null);

  // Block Tracker
  const [trackerAddr,setTrackerAddr]     = useState("");
  const [trackerChain,setTrackerChain]   = useState("ethereum");
  const [trackerKey,setTrackerKey]       = useState(0);
  const [trackerActive,setTrackerActive] = useState(false);
  const [trackerError,setTrackerError]   = useState("");
  const [trackerPageSize,setTrackerPageSize] = useState(10);
  const [trackerMaxDepth,setTrackerMaxDepth] = useState(3);
  const [blockData,setBlockData]             = useState(null);
  const [blockLoading,setBlockLoading]       = useState(false);

  // Toast
  const [toast,setToast] = useState("");
  const toastRef = useRef(null);

  const fam = FAMILIES.find(f=>f.id===exFam);

  const showToast = (msg) => {
    setToast(msg);
    if(toastRef.current) clearTimeout(toastRef.current);
    toastRef.current = setTimeout(()=>setToast(""),2000);
  };

  const copyToClipboard = (text) => navigator.clipboard.writeText(text).then(()=>showToast("Copied!"));

  // ── Universal trace handler — used by floating btn, address buttons, tx rows ──
  const handleTrace = useCallback((address, chain) => {
    const finalChain = chain&&TRACKER_CHAINS.find(c=>c.id===chain)?chain:"ethereum";
    setTrackerAddr(address);
    setTrackerChain(finalChain);
    setTrackerActive(true);
    setTrackerKey(k=>k+1);
    setTrackerError("");
    setTab("tracker");
    window.scrollTo({top:0,behavior:"smooth"});
  }, []);

  // ENS + auto-detect
  const handleTxInput = async (val) => {
    setTxInput(val);setExError("");setExResult(null);
    if(val.length>20){const detected=detectFamily(val);if(detected!=="ethereum"||val.startsWith("0x"))setExFam(detected);}
    if(val.endsWith(".eth")&&val.length>6){
      setExStatus("Resolving ENS…");
      try{const r=await ft(`https://api.ensideas.com/ens/resolve/${encodeURIComponent(val)}`,{},6000);if(r.ok){const d=await r.json();const addr=d.address;if(addr&&addr!=="0x0000000000000000000000000000000000000000"){setTxInput(addr);setExFam("ethereum");setExStatus(`✓ ENS → ${addr.slice(0,8)}…${addr.slice(-4)}`);setTimeout(()=>setExStatus(""),4000);}else{setExStatus("ENS not found");setTimeout(()=>setExStatus(""),2000);}}}catch{setExStatus("");}
    }
  };

  // TX lookup
  const lookupTx = useCallback(async () => {
    const hash=txInput.trim();if(!hash)return setExError("Paste a transaction hash");
    setExLoading(true);setExError("");setExResult(null);
    const isEVM=/^0x[a-fA-F0-9]{64}$/.test(hash),isBTC=/^[a-fA-F0-9]{64}$/.test(hash)&&!hash.startsWith("0x"),isSol=/^[1-9A-HJ-NP-Za-km-z]{80,100}$/.test(hash);
    try{
      const h=hash.trim();
      if(exFam==="tron"){setExStatus("Searching Tron…");const r=await tronLookupTx(h.replace(/^0x/,""));if(r){addRecent(h,"tron");return setExResult(r);}}
      if(exFam==="solana"||isSol){setExStatus("Searching Solana…");const r=await solLookupTx(h);if(r){addRecent(h,"solana");return setExResult(r);}
        if(exFam==="solana"){if(/^[1-9A-HJ-NP-Za-km-z]{80,100}$/.test(h))return setExResult({found:true,chain:"solana",network:"Solana Mainnet",symbol:"SOL",chainColor:"#9945FF",txHash:h,from:"RPC rate-limited",to:"N/A",value:"N/A",blockNumber:"N/A",confirmations:"See Explorer",timestamp:null,status:"Confirmed",type:"Solana Transaction",verifiedBy:"Solana Explorer",explorerUrl:"https://explorer.solana.com/tx/"+h,rpcNote:"RPC rate-limited. Click Explorer ↗ to verify."});
          return setExError("Invalid Solana signature (Base58, ~87 chars).");}}
      if(exFam==="bitcoin"){setExStatus("Searching Bitcoin…");const r=await btcLookupTx(h.replace(/^0x/,""));if(r){addRecent(h,"bitcoin");return setExResult(r);}}
      if(isEVM){
        const priority=fam?.chains?.length&&exFam!=="tron"?fam.chains:Object.keys(BLOCKSCOUT);
        const rest=Object.keys(BLOCKSCOUT).filter(c=>!priority.includes(c));
        setExStatus(`Searching ${priority.length} chains…`);
        const found=await raceFirst(priority.map(c=>evmLookupTx(c,h)));if(found){addRecent(h,found.chain);return setExResult(found);}
        if(rest.length){setExStatus(`Checking ${rest.length} more…`);const found2=await raceFirst(rest.map(c=>evmLookupTx(c,h)));if(found2){addRecent(h,found2.chain);return setExResult(found2);}}
        setExStatus("Checking Tron…");const tron=await tronLookupTx(h.replace(/^0x/,""));if(tron){addRecent(h,"tron");return setExResult(tron);}
      }
      if(isBTC){setExStatus("Searching Bitcoin…");const btc=await btcLookupTx(h);if(btc){addRecent(h,"bitcoin");return setExResult(btc);}setExStatus("Checking Tron…");const tron=await tronLookupTx(h);if(tron){addRecent(h,"tron");return setExResult(tron);}}
      setExError("Transaction not found on any supported blockchain.\n\n• EVM: 0x + 64 hex chars\n• Tron: 64 hex WITHOUT 0x\n• Bitcoin: 64 hex WITHOUT 0x\n• Solana: Base58 ~87 chars\n• Very recent txs may take 30–60s to index");
    }catch(e){setExError("Search failed: "+(e.message||"Unknown"));}
    finally{setExLoading(false);setExStatus("");}
  },[txInput,exFam,fam]);

  const addRecent = (hash,chain) => setRecentSearches(p=>[{hash,chain,time:new Date()},...p.filter(r=>r.hash!==hash)].slice(0,5));

  // Wallet history
  const loadWallet = useCallback(async () => {
    const addr=addrInput.trim();if(!addr)return setWhError("Enter a wallet address");
    const isEVM=/^0x[a-fA-F0-9]{40}$/.test(addr),isBTC=/^(1|3|bc1)[a-zA-Z0-9]{25,62}$/.test(addr),isSol=/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(addr)&&!isBTC,isTron=/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(addr);
    if(!isEVM&&!isBTC&&!isSol&&!isTron)return setWhError("Unrecognised address.\n\nEVM → 0x + 40 hex\nBitcoin → starts 1, 3, or bc1\nSolana → Base58 (32-44 chars)\nTron → starts with T");
    setWhLoading(true);setWhError("");setWhResult(null);setChainFilter("all");
    try{
      if(isBTC){const txs=await btcWalletHistory(addr);return setWhResult({address:addr,transactions:txs,count:txs.length,chainsSearched:["Bitcoin"],source:"Blockstream.info"});}
      if(isSol){const txs=await solWalletHistory(addr);return setWhResult({address:addr,transactions:txs,count:txs.length,chainsSearched:["Solana"],source:"Solana RPC"});}
      if(isTron){const txs=await tronWalletHistory(addr);return setWhResult({address:addr,transactions:txs,count:txs.length,chainsSearched:["Tron"],source:"TronGrid"});}
      const chains=Object.keys(BLOCKSCOUT);const results=await Promise.allSettled(chains.map(c=>evmWalletHistory(c,addr)));
      let all=[];results.forEach(r=>{if(r.status==="fulfilled")all.push(...r.value);});
      all.sort((a,b)=>{if(!a.timestamp)return 1;if(!b.timestamp)return -1;return b.timestamp-a.timestamp;});
      setWhResult({address:addr,transactions:all,count:all.length,chainsSearched:chains.map(c=>BLOCKSCOUT[c].name),source:"Blockscout API"});
    }catch(e){setWhError("Search failed: "+(e.message||"Unknown"));}
    finally{setWhLoading(false);}
  },[addrInput]);

  const goToWallet = (addr) => {setAddrInput(addr);setTab("history");setWhResult(null);setWhError("");};
  const goToIntel  = (addr, chain) => { setIntelPrefill({addr, chain:chain||"ethereum"}); setTab("intel"); window.scrollTo({top:0,behavior:"smooth"}); };

  const filteredTxs = whResult?.transactions?.filter(tx=>chainFilter==="all"||tx.chain===chainFilter)||[];
  const chainCounts = whResult?.transactions?.reduce((acc,tx)=>{acc[tx.chain]=(acc[tx.chain]||0)+1;return acc;},{})||{};

  // Block Tracker: start — accepts wallet address OR tx hash
  // TX hash: auto-detects chain (races all 8 EVM chains) — no manual chain selection needed
  const [blockStatus, setBlockStatus] = useState("");
  const startTracker = async () => {
    const input=trackerAddr.trim();
    if(!input)return setTrackerError("Enter an EVM wallet address or transaction hash");
    const isWallet=/^0x[a-fA-F0-9]{40}$/.test(input);
    const isTxHash=/^0x[a-fA-F0-9]{64}$/.test(input);
    if(!isWallet&&!isTxHash)return setTrackerError("Enter an EVM wallet address (0x + 40 hex)\nor a transaction hash (0x + 64 hex).\n\nSupported: Ethereum, Base, Polygon, BNB, Optimism, Arbitrum, Sepolia.");
    setTrackerError("");setBlockData(null);setBlockStatus("");
    if(isTxHash){
      setBlockLoading(true);setTrackerActive(false);
      try{
        setBlockStatus("Searching all 8 EVM chains…");
        const tx=await raceFirst(Object.keys(BLOCKSCOUT).map(c=>evmLookupTx(c,input)));
        if(!tx||!tx.blockNumber){setBlockStatus("");return setTrackerError("Transaction not found on any supported EVM chain.");}
        setBlockStatus(`Found on ${tx.network} · Block #${Number(tx.blockNumber).toLocaleString()} · Fetching block…`);
        const bd=await fetchBlockTransactions(tx.chain,tx.blockNumber);
        setBlockStatus("");
        if(!bd)return setTrackerError(`Could not load block #${tx.blockNumber} on ${tx.network}. The block may be too old or the RPC unavailable.`);
        setBlockData(bd);
      }catch(e){setBlockStatus("");setTrackerError("Error: "+(e.message||"Unknown"));}
      finally{setBlockLoading(false);}
    }else{
      setTrackerActive(true);setTrackerKey(k=>k+1);
    }
  };

  const TABS=[{k:"explorer",label:"Explorer",icon:"🔍"},{k:"history",label:"Wallet",icon:"📋"},{k:"tracker",label:"Block Tracker",icon:"🌿"},{k:"intel",label:"Intel",icon:"🧠"}];

  return (
    <div style={s.root}>
      <style>{CSS}</style>
      <div style={s.bgGlow1}/><div style={s.bgGlow2}/><div style={s.bgGrid}/>

      {toast&&<div style={s.toast}>{toast}</div>}

      {/* Floating quick tracker — always visible */}
      <FloatingTracker onTrace={handleTrace}/>

      {/* ── NAV ─────────────────────────────────── */}
      <nav style={s.nav}>
        <div style={s.navW}>
          <div style={s.brand}>
            <NSTLogo size={28}/>
            <div><div style={s.brandName}>NST<span style={s.brandAccent}>Crypto</span></div><div style={s.brandSub}>Multi-Chain Explorer</div></div>
          </div>
          <div style={s.navCenter}>
            {TABS.map(t=>(
              <button key={t.k} style={tab===t.k?s.tabOn:s.tabOff} onClick={()=>setTab(t.k)}>
                <span style={{fontSize:"0.8rem"}}>{t.icon}</span>{t.label}
              </button>
            ))}
          </div>
          <GasWidget/>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────── */}
      <div style={s.hero}>
        <div style={s.heroEyebrow}>
          {tab==="explorer"?"MULTI-CHAIN TRANSACTION EXPLORER":tab==="history"?"WALLET TRANSACTION HISTORY":tab==="tracker"?"BLOCK TRACKER — TRANSACTION PROVENANCE TREE":"BLOCKCHAIN INTELLIGENCE & OSINT ANALYSIS"}
        </div>
        <h1 style={s.h1}>
          {tab==="explorer"?<><Grad>Search</Grad> any transaction<br/>across 11 blockchains</>
            :tab==="history"?<><Grad>Track</Grad> any wallet<br/>across all chains</>
            :tab==="tracker"?<><Grad>Trace</Grad> wallets &amp; blocks<br/>on any EVM chain</>
            :<><Grad>Investigate</Grad> any address<br/>OFAC · Risk · Patterns</>}
        </h1>
        <p style={s.heroSub}>
          {tab==="explorer"?"Paste any transaction hash — all chains searched in parallel. Zero backend."
            :tab==="history"?"Auto-detects chain type. Searches all matching networks simultaneously."
            :tab==="tracker"?"Enter a wallet to trace who sent funds (full provenance tree), or a transaction hash to inspect that block's contents and last 10 transactions."
            :"OFAC sanctions screening, AML pattern detection, counterparty exposure mapping — law enforcement grade OSINT in your browser."}
        </p>
        <div style={s.liveBadge}><span style={{color:"#10b981"}}>●</span> Fully client-side · No backend · No API key · 11 chains</div>
      </div>

      <div style={s.wrap}>

        {/* ════════════════════════════════ EXPLORER ════ */}
        {tab==="explorer"&&(
          <div style={s.card} className="fadeUp" key="ex">
            <div style={s.cardHeader}>
              <div style={s.cardTitle}>Multi-Chain Transaction Explorer</div>
              <div style={s.cardSub}>Blockscout · Blockstream · Solana RPC · TronGrid — all queried in parallel</div>
            </div>

            {recentSearches.length>0&&(
              <div style={s.recentRow}>
                <span style={s.recentLabel}>Recent</span>
                {recentSearches.map((r,i)=>{const fc=FAMILIES.find(f=>f.id===(!["bitcoin","solana","tron"].includes(r.chain)?"ethereum":r.chain));return(
                  <button key={i} style={s.recentBtn} onClick={()=>{setTxInput(r.hash);setExFam(fc?.id||"ethereum");setExError("");setExResult(null);}}>
                    <span style={{color:fc?.color||"#0EA5E9"}}>●</span>{r.hash.slice(0,10)}…{r.hash.slice(-6)}
                  </button>);})}
              </div>
            )}

            <label style={s.fieldLabel}>Chain Family <span style={s.fieldHint}>auto-detected</span></label>
            <div style={s.famRow}>
              {FAMILIES.map(f=>(
                <button key={f.id} style={{...s.famBtn,...(exFam===f.id?{borderColor:f.color,background:`${f.color}12`,color:"#fff"}:{})}}
                  onClick={()=>{setExFam(f.id);setExError("");setExResult(null);}}>
                  <span style={{color:exFam===f.id?f.color:"rgba(255,255,255,0.25)",fontSize:"1rem"}}>{f.icon}</span>
                  <span style={{fontSize:"0.72rem",fontWeight:exFam===f.id?700:400}}>{f.label}</span>
                </button>))}
            </div>
            {fam&&<div style={s.famNote}>{fam.note}</div>}

            <label style={s.fieldLabel}>Transaction Hash <span style={s.fieldHint}>{exFam==="bitcoin"?"64 hex (no 0x)":exFam==="solana"?"Base58 ~87 chars":"0x + 64 hex"}</span></label>
            <div style={s.inputRow}>
              <input style={s.input} placeholder={exFam==="bitcoin"?"a1b2c3d4...":exFam==="solana"?"5Uvd9vQE...":"0x9503d70f..."}
                value={txInput} onChange={e=>handleTxInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&lookupTx()}/>
              {txInput&&<button style={s.xBtn} onClick={()=>{setTxInput("");setExResult(null);setExError("");}}>✕</button>}
            </div>
            {exStatus&&<div style={s.statusLine}><span className="spin">⟳</span>{exStatus}</div>}

            <button style={{...s.primaryBtn,...(exLoading?s.primaryBtnDisabled:{background:`linear-gradient(135deg,${fam?.color||"#0EA5E9"},${fam?.color||"#0EA5E9"}99)`})}} onClick={lookupTx} disabled={exLoading}>
              {exLoading?<><span className="spin">⟳</span> Searching…</>:"Search Transaction"}
            </button>

            {exError&&<pre style={s.errBlock}>{exError}</pre>}

            {exResult&&(
              <div style={{...s.resultCard,borderColor:`${exResult.chainColor}28`}} className="fadeUp">
                <div style={s.resultHeader}>
                  <StatusBadge status={exResult.status}/>
                  <ChainTag name={exResult.network} color={exResult.chainColor||"#0EA5E9"}/>
                  <div style={{marginLeft:"auto",display:"flex",gap:8}}>
                    <CopyBtn text={exResult.txHash} label="⧉ Hash"/>
                    <a href={exResult.explorerUrl} target="_blank" rel="noreferrer" style={s.explorerLink}>Explorer ↗</a>
                  </div>
                </div>
                {exResult.rpcNote&&<div style={s.warningBox}>⚠️ {exResult.rpcNote}</div>}
                <div style={s.resultGrid}>
                  <FieldAddr label="FROM" value={exResult.from} onWallet={()=>goToWallet(exResult.from)} onTrace={/^0x/.test(exResult.from)?handleTrace:null} explorerBase={exResult.addrExplorer}/>
                  <FieldAddr label="TO"   value={exResult.to}   onWallet={()=>goToWallet(exResult.to)}   onTrace={/^0x/.test(exResult.to)?handleTrace:null}   explorerBase={exResult.addrExplorer} isContract={exResult.type==="Contract Interaction"}/>
                  <Field label="VALUE"  value={exResult.value} green/>
                  <Field label="STATUS" value={exResult.status}/>
                  <Field label="TYPE"   value={exResult.type}/>
                  <Field label="BLOCK"  value={""+exResult.blockNumber}/>
                  <Field label="CONFIRMATIONS" value={""+exResult.confirmations}/>
                  {exResult.timestamp&&<Field label="TIMESTAMP" value={exResult.timestamp.toLocaleString()}/>}
                  {ok(exResult.gasUsed) &&<Field label="GAS USED"  value={exResult.gasUsed}/>}
                  {ok(exResult.gasPrice)&&<Field label="GAS PRICE" value={exResult.gasPrice}/>}
                  {ok(exResult.gasFee)  &&<Field label="GAS FEE"   value={exResult.gasFee}/>}
                  {ok(exResult.fee)     &&<Field label="NETWORK FEE" value={exResult.fee}/>}
                  {ok(exResult.nonce)   &&<Field label="NONCE"     value={""+exResult.nonce}/>}
                  {ok(exResult.size)    &&<Field label="SIZE"      value={exResult.size}/>}
                  {ok(exResult.inputs)  &&<Field label="INPUTS"    value={exResult.inputs}/>}
                  {ok(exResult.outputs) &&<Field label="OUTPUTS"   value={exResult.outputs}/>}
                  <Field label="DATA SOURCE" value={exResult.verifiedBy} wide/>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════ WALLET HISTORY ════ */}
        {tab==="history"&&(
          <div style={s.card} className="fadeUp" key="wh">
            <div style={s.cardHeader}>
              <div style={s.cardTitle}>Wallet Transaction History</div>
              <div style={s.cardSub}>All 11 chains searched simultaneously — no backend, no API key</div>
            </div>

            <div style={s.chainGrid}>
              {[{name:"Ethereum",color:"#627EEA",icon:"⟠"},{name:"Sepolia",color:"#627EEA",icon:"⟠"},{name:"Base",color:"#0052FF",icon:"🔵"},{name:"Optimism",color:"#FF0420",icon:"🔴"},{name:"Arbitrum",color:"#28A0F0",icon:"🔷"},{name:"Linea",color:"#61DFFF",icon:"◻"},{name:"Polygon",color:"#8247E5",icon:"⬡"},{name:"BNB",color:"#F0B90B",icon:"◈"},{name:"Bitcoin",color:"#F7931A",icon:"₿"},{name:"Solana",color:"#9945FF",icon:"◎"},{name:"Tron",color:"#FF0013",icon:"⬤"}].map(c=>(
                <div key={c.name} style={{...s.chainPill,borderColor:`${c.color}25`}}><span style={{color:c.color,fontSize:"0.8rem"}}>{c.icon}</span><span style={{fontSize:"0.67rem",color:"rgba(255,255,255,0.4)"}}>{c.name}</span></div>
              ))}
            </div>

            <label style={s.fieldLabel}>Wallet Address <span style={s.fieldHint}>EVM · Bitcoin · Solana · Tron</span></label>
            <div style={{fontSize:"0.68rem",color:"rgba(255,255,255,0.2)",marginBottom:8}}>
              {addrInput.startsWith("0x")?"⟠ EVM — searching 8 chains":addrInput.match(/^(1|3|bc1)/)?"₿ Bitcoin":addrInput.startsWith("T")&&addrInput.length===34?"⬤ Tron":addrInput.length>30&&!addrInput.startsWith("0x")?"◎ Solana":"Paste any wallet address — chain detected automatically"}
            </div>
            <div style={s.inputRow}>
              <input style={s.input} placeholder="0x… or 1A1zP1… or So111… or TLa2f6…"
                value={addrInput} onChange={e=>{setAddrInput(e.target.value);setWhError("");setWhResult(null);}} onKeyDown={e=>e.key==="Enter"&&loadWallet()}/>
              {addrInput&&<><button style={s.iconBtn} onClick={()=>copyToClipboard(addrInput)}>⧉</button><button style={s.xBtn} onClick={()=>{setAddrInput("");setWhResult(null);setWhError("");}}>✕</button></>}
            </div>

            <button style={{...s.primaryBtn,...(whLoading?s.primaryBtnDisabled:{})}} onClick={loadWallet} disabled={whLoading}>
              {whLoading?<><span className="spin">⟳</span> Searching all 11 chains…</>:"Load Transaction History"}
            </button>

            {whError&&<pre style={s.errBlock}>{whError}</pre>}

            {whResult&&(
              <div className="fadeUp">
                <div style={s.histMeta}>
                  <span style={{color:"rgba(255,255,255,0.6)",fontWeight:600}}>{whResult.count} transaction{whResult.count!==1?"s":""}</span>
                  {whResult.chainsSearched?.length>1&&<span style={s.histTag}>{whResult.chainsSearched.length} chains</span>}
                  <span style={{fontSize:"0.63rem",color:"rgba(255,255,255,0.16)"}}>via {whResult.source}</span>
                  <CopyBtn text={whResult.address} label="⧉ Address"/>
                  {/^0x[a-fA-F0-9]{40}$/.test(whResult.address)&&(
                    <>
                      <button style={{...s.txBtn,color:"#10b981",borderColor:"rgba(16,185,129,0.2)",fontWeight:600}}
                        onClick={()=>handleTrace(whResult.address)}>🌿 Block Tracker</button>
                      <button style={{...s.txBtn,color:"#a78bfa",borderColor:"rgba(167,139,250,0.25)",fontWeight:600}}
                        onClick={()=>goToIntel(whResult.address,"ethereum")}>🧠 Intel</button>
                    </>
                  )}
                </div>

                {Object.keys(chainCounts).length>1&&(
                  <div style={s.filterRow}>
                    <button style={{...s.filterBtn,...(chainFilter==="all"?s.filterBtnOn:{})}} onClick={()=>setChainFilter("all")}>All ({whResult.count})</button>
                    {Object.entries(chainCounts).map(([chain,cnt])=>(
                      <button key={chain} style={{...s.filterBtn,...(chainFilter===chain?{...s.filterBtnOn,borderColor:BLOCKSCOUT[chain]?.color||"#0EA5E9",color:BLOCKSCOUT[chain]?.color||"#0EA5E9"}:{})}} onClick={()=>setChainFilter(chain)}>
                        {BLOCKSCOUT[chain]?.name||chain} ({cnt})
                      </button>))}
                  </div>
                )}

                {filteredTxs.length===0?(
                  <div style={s.emptyState}>No transactions found{chainFilter!=="all"?` on ${BLOCKSCOUT[chainFilter]?.name||chainFilter}`:""}</div>
                ):(
                  filteredTxs.map((tx,i)=>(
                    <TxRow key={i} tx={tx}
                      onDetails={tx=>{setTxInput(tx.hash);setExFam(tx.chain==="bitcoin"?"bitcoin":tx.chain==="solana"?"solana":tx.chain==="tron"?"tron":"ethereum");setTab("explorer");}}
                      onCopy={copyToClipboard}
                      onTrace={handleTrace}/>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════ BLOCK TRACKER ════ */}
        {tab==="tracker"&&(
          <div style={s.card} className="fadeUp" key="tr">
            <div style={s.cardHeader}>
              <div style={s.cardTitle}>🌿 Block Tracker — Transaction Provenance</div>
              <div style={s.cardSub}>Trace who sent you crypto, see who funded them — unlimited depth & load more at every level</div>
            </div>

            <div style={s.infoBox}>
              <strong style={{color:"#0EA5E9"}}>How it works:</strong> Enter an EVM <strong>wallet address</strong> to build a full provenance tree — trace every sender's history, unlimited depth, load more at any level. Or enter a <strong>transaction hash</strong> to jump to that block and see the block header stats and last 10 transactions inside it with risk badges and trace buttons.
            </div>

            {/* Settings + chain — only shown for wallet mode */}
            {!/^0x[a-fA-F0-9]{64}$/.test(trackerAddr.trim())&&(
              <>
                <div style={{display:"flex",gap:24,flexWrap:"wrap",marginBottom:4}}>
                  <div>
                    <label style={s.fieldLabel}>Show per level</label>
                    <div style={{display:"flex",gap:5}}>
                      {[10,25,50].map(n=>(
                        <button key={n} style={{...s.settingBtn,...(trackerPageSize===n?s.settingBtnOn:{})}} onClick={()=>setTrackerPageSize(n)}>{n}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label style={s.fieldLabel}>Max depth</label>
                    <div style={{display:"flex",gap:5}}>
                      {[1,2,3,4,5].map(n=>(
                        <button key={n} style={{...s.settingBtn,...(trackerMaxDepth===n?s.settingBtnOn:{})}} onClick={()=>setTrackerMaxDepth(n)}>{n}</button>
                      ))}
                    </div>
                  </div>
                </div>
                <label style={s.fieldLabel}>Chain <span style={s.fieldHint}>for wallet mode</span></label>
                <div style={s.famRow}>
                  {TRACKER_CHAINS.map(c=>(
                    <button key={c.id} style={{...s.famBtn,...(trackerChain===c.id?{borderColor:c.color,background:`${c.color}12`,color:"#fff"}:{})}}
                      onClick={()=>{setTrackerChain(c.id);setTrackerActive(false);setTrackerError("");}}>
                      <span style={{width:8,height:8,borderRadius:"50%",background:c.color,display:"inline-block"}}/>
                      <span style={{fontSize:"0.72rem",fontWeight:trackerChain===c.id?700:400}}>{c.label}</span>
                    </button>))}
                </div>
              </>
            )}

            {/* TX hash mode — auto-detect chip */}
            {/^0x[a-fA-F0-9]{64}$/.test(trackerAddr.trim())&&(
              <div style={{display:"flex",alignItems:"center",gap:8,margin:"12px 0 4px",padding:"8px 14px",background:"rgba(14,165,233,0.06)",border:"1px solid rgba(14,165,233,0.18)",borderRadius:8}}>
                <span style={{fontSize:"0.65rem",color:"#0EA5E9",fontWeight:700,letterSpacing:"0.06em",textTransform:"uppercase"}}>🔍 Auto-detect</span>
                <span style={{fontSize:"0.72rem",color:"rgba(255,255,255,0.45)"}}>Chain detected automatically — all 8 EVM networks searched in parallel</span>
              </div>
            )}

            <label style={s.fieldLabel}>EVM Wallet Address or Transaction Hash <span style={s.fieldHint}>wallet: 0x+40 · tx hash: 0x+64</span></label>
            <div style={s.inputRow}>
              <input style={s.input} placeholder="0xd8dA6BF… (wallet) or 0x9503d70f… (tx hash)"
                value={trackerAddr} onChange={e=>{setTrackerAddr(e.target.value);setTrackerError("");setTrackerActive(false);setBlockData(null);setBlockStatus("");}} onKeyDown={e=>e.key==="Enter"&&startTracker()}/>
              {trackerAddr&&<><button style={s.iconBtn} onClick={()=>copyToClipboard(trackerAddr)}>⧉</button><button style={s.xBtn} onClick={()=>{setTrackerAddr("");setTrackerActive(false);setTrackerError("");setBlockData(null);setBlockStatus("");}}>✕</button></>}
            </div>

            <button style={{...s.primaryBtn,background:"linear-gradient(135deg,#0EA5E9,#0284c7)",...(blockLoading?s.primaryBtnDisabled:{})}} onClick={startTracker} disabled={blockLoading}>
              {blockLoading?<><span className="spin">⟳</span> {blockStatus||"Searching…"}</>:
                /^0x[a-fA-F0-9]{64}$/.test(trackerAddr.trim())?"🔍 Find Block":"🌿 Build Transaction Tree"}
            </button>

            {blockStatus&&!blockLoading&&<div style={s.statusLine}><span className="spin">⟳</span>{blockStatus}</div>}
            {trackerError&&<pre style={s.errBlock}>{trackerError}</pre>}

            {blockData&&(
              <BlockView data={blockData} onTrace={handleTrace}/>
            )}

            {trackerActive&&(
              <div style={{marginTop:24}} key={trackerKey} className="fadeUp">
                <div style={{fontSize:"0.6rem",color:"rgba(14,165,233,0.4)",letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:12,display:"flex",gap:12,alignItems:"center",flexWrap:"wrap"}}>
                  <span>Transaction tree — {BLOCKSCOUT[trackerChain]?.name||trackerChain}</span>
                  <span style={{color:"rgba(255,255,255,0.15)"}}>Showing {trackerPageSize}/level · Max {trackerMaxDepth} levels deep</span>
                </div>
                <div style={s.treeWrap}>
                  <TreeNode
                    key={trackerKey}
                    address={trackerAddr.trim()}
                    chainId={trackerChain}
                    depth={0}
                    isRoot={true}
                    pageSize={trackerPageSize}
                    maxDepth={trackerMaxDepth}
                    onTrace={handleTrace}
                  />
                </div>
                <div style={{marginTop:14,padding:"10px 14px",background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.04)",borderRadius:8,fontSize:"0.65rem",color:"rgba(255,255,255,0.18)",lineHeight:1.7}}>
                  ● Root address &nbsp;·&nbsp; ↓ Incoming transactions received &nbsp;·&nbsp; 🔍 Trace = load that sender's history &nbsp;·&nbsp; Load More = fetch next batch &nbsp;·&nbsp; 🌿 Re-trace = open in fresh tree
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════ INTEL ════ */}
        {tab==="intel"&&(
          <IntelligenceTab onTrace={handleTrace} prefill={intelPrefill}/>
        )}

      </div>

      {/* ── FOOTER ─────────────────────────────── */}
      <footer style={s.footer}>
        <div style={{display:"flex",alignItems:"center",gap:8}}><NSTLogo size={18}/><span style={{fontSize:"0.8rem",fontWeight:700,color:"rgba(255,255,255,0.3)"}}>NSTCrypto</span></div>
        <div style={{display:"flex",gap:12}}>
          {[["Blockscout","https://eth.blockscout.com"],["Blockstream","https://blockstream.info"],["Solana","https://explorer.solana.com"],["Tron","https://tronscan.org"]].map(([n,u])=>(
            <a key={n} href={u} target="_blank" rel="noreferrer" style={{fontSize:"0.67rem",color:"rgba(255,255,255,0.2)"}}>{n}</a>
          ))}
        </div>
        <span style={{fontSize:"0.67rem",color:"rgba(255,255,255,0.12)"}}>Nishan Sapkota</span>
      </footer>
    </div>
  );
}

// ══════════════════════════════════════════════════
// CSS + STYLES
// ══════════════════════════════════════════════════
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
  *{box-sizing:border-box;margin:0;padding:0;}
  body{background:#060B14;font-family:'Inter',sans-serif;}
  input{outline:none;font-family:'JetBrains Mono',monospace;}
  input:focus{border-color:rgba(14,165,233,0.4)!important;background:rgba(14,165,233,0.04)!important;box-shadow:0 0 0 3px rgba(14,165,233,0.08);}
  button{font-family:'Inter',sans-serif;cursor:pointer;transition:all 0.15s;}
  button:hover:not(:disabled){opacity:0.82;transform:translateY(-1px);}
  a{text-decoration:none;transition:opacity 0.15s;}
  a:hover{opacity:0.75;}
  ::-webkit-scrollbar{width:4px;height:4px;}
  ::-webkit-scrollbar-track{background:transparent;}
  ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:2px;}
  @keyframes spin{to{transform:rotate(360deg)}}
  @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
  @keyframes slideDown{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
  .fadeUp{animation:fadeUp 0.25s ease forwards;}
  .spin{display:inline-block;animation:spin 0.75s linear infinite;}
`;

const s = {
  root:{minHeight:"100vh",background:"#060B14",color:"#CBD5E1",fontFamily:"'Inter',sans-serif",position:"relative",overflowX:"hidden"},
  bgGlow1:{position:"fixed",top:"-10%",left:"30%",width:"50vw",height:"50vh",background:"radial-gradient(ellipse,rgba(14,165,233,0.04) 0%,transparent 70%)",pointerEvents:"none",zIndex:0},
  bgGlow2:{position:"fixed",top:"30%",right:"-5%",width:"35vw",height:"40vh",background:"radial-gradient(ellipse,rgba(16,185,129,0.03) 0%,transparent 70%)",pointerEvents:"none",zIndex:0},
  bgGrid:{position:"fixed",inset:0,backgroundImage:"linear-gradient(rgba(255,255,255,0.012) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.012) 1px,transparent 1px)",backgroundSize:"60px 60px",pointerEvents:"none",zIndex:0},

  toast:{position:"fixed",top:20,left:"50%",transform:"translateX(-50%)",background:"rgba(16,185,129,0.12)",border:"1px solid rgba(16,185,129,0.3)",color:"#10b981",padding:"8px 22px",borderRadius:24,fontSize:"0.78rem",fontWeight:600,zIndex:9999,animation:"slideDown 0.2s ease",backdropFilter:"blur(16px)"},

  nav:{position:"sticky",top:0,zIndex:100,background:"rgba(6,11,20,0.94)",backdropFilter:"blur(24px)",borderBottom:"1px solid rgba(255,255,255,0.06)"},
  navW:{maxWidth:960,margin:"0 auto",padding:"10px 24px",display:"flex",alignItems:"center",gap:16,flexWrap:"wrap"},
  brand:{display:"flex",alignItems:"center",gap:10,flexShrink:0},
  brandName:{fontSize:"1.05rem",fontWeight:700,color:"rgba(255,255,255,0.9)",letterSpacing:"-0.02em",lineHeight:1.1},
  brandAccent:{background:"linear-gradient(135deg,#0EA5E9,#10B981)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"},
  brandSub:{fontSize:"0.58rem",color:"rgba(255,255,255,0.2)",letterSpacing:"0.05em"},
  navCenter:{display:"flex",gap:2,background:"rgba(255,255,255,0.04)",borderRadius:10,padding:"3px",flex:1,maxWidth:480,margin:"0 auto"},
  tabOn:{background:"rgba(14,165,233,0.12)",border:"1px solid rgba(14,165,233,0.2)",color:"#0EA5E9",padding:"7px 14px",borderRadius:7,fontSize:"0.76rem",fontWeight:600,display:"flex",alignItems:"center",gap:5,flex:1,justifyContent:"center",whiteSpace:"nowrap"},
  tabOff:{background:"transparent",border:"1px solid transparent",color:"rgba(255,255,255,0.3)",padding:"7px 14px",borderRadius:7,fontSize:"0.76rem",display:"flex",alignItems:"center",gap:5,flex:1,justifyContent:"center",whiteSpace:"nowrap"},
  gasWidget:{display:"flex",alignItems:"center",gap:5,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:20,padding:"5px 12px",flexShrink:0},

  hero:{position:"relative",zIndex:1,maxWidth:960,margin:"0 auto",padding:"56px 24px 32px",textAlign:"center"},
  heroEyebrow:{fontSize:"0.56rem",letterSpacing:"0.2em",color:"rgba(14,165,233,0.5)",marginBottom:14,textTransform:"uppercase"},
  h1:{fontSize:"clamp(1.8rem,4.5vw,3.2rem)",fontWeight:700,color:"#F1F5F9",lineHeight:1.06,letterSpacing:"-0.04em",marginBottom:14},
  heroSub:{fontSize:"0.87rem",color:"rgba(255,255,255,0.28)",lineHeight:1.8,maxWidth:500,margin:"0 auto"},
  liveBadge:{display:"inline-flex",alignItems:"center",gap:7,marginTop:16,background:"rgba(16,185,129,0.05)",border:"1px solid rgba(16,185,129,0.15)",borderRadius:20,padding:"5px 16px",fontSize:"0.7rem",color:"rgba(16,185,129,0.65)"},

  wrap:{position:"relative",zIndex:1,maxWidth:960,margin:"0 auto",padding:"0 24px 80px"},
  card:{background:"rgba(255,255,255,0.025)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:18,padding:"28px 32px",backdropFilter:"blur(4px)"},
  cardHeader:{marginBottom:22},
  cardTitle:{fontSize:"1rem",fontWeight:700,color:"#F1F5F9",marginBottom:4},
  cardSub:{fontSize:"0.71rem",color:"rgba(255,255,255,0.22)"},

  recentRow:{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap",marginBottom:6},
  recentLabel:{fontSize:"0.58rem",color:"rgba(255,255,255,0.18)",textTransform:"uppercase",letterSpacing:"0.1em"},
  recentBtn:{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.07)",color:"rgba(255,255,255,0.3)",borderRadius:6,padding:"3px 10px",fontSize:"0.66rem",fontFamily:"'JetBrains Mono',monospace",display:"flex",alignItems:"center",gap:5},

  fieldLabel:{display:"flex",fontSize:"0.58rem",color:"rgba(255,255,255,0.22)",letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:9,marginTop:18,alignItems:"center",gap:8,flexWrap:"wrap"},
  fieldHint:{fontSize:"0.58rem",color:"rgba(255,255,255,0.14)",textTransform:"none",letterSpacing:0,fontWeight:400,background:"rgba(255,255,255,0.04)",padding:"2px 7px",borderRadius:4,fontFamily:"'JetBrains Mono',monospace"},

  famRow:{display:"flex",gap:6,flexWrap:"wrap",marginBottom:2},
  famBtn:{display:"flex",alignItems:"center",gap:7,background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:8,padding:"7px 13px",color:"rgba(255,255,255,0.3)",transition:"all 0.15s"},
  famNote:{fontSize:"0.66rem",color:"rgba(255,255,255,0.17)",marginTop:6},

  inputRow:{display:"flex",gap:6},
  input:{flex:1,padding:"11px 14px",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.09)",borderRadius:9,color:"#E2E8F0",fontSize:"0.82rem",transition:"all 0.2s"},
  iconBtn:{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.07)",color:"rgba(255,255,255,0.3)",borderRadius:8,padding:"0 12px",fontSize:"0.8rem",flexShrink:0},
  xBtn:{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.07)",color:"rgba(255,255,255,0.25)",borderRadius:8,padding:"0 12px",fontSize:"0.75rem",flexShrink:0},

  statusLine:{marginTop:10,fontSize:"0.73rem",color:"rgba(14,165,233,0.55)",display:"flex",alignItems:"center",gap:8},

  primaryBtn:{width:"100%",marginTop:16,padding:"13px 0",fontWeight:700,fontSize:"0.9rem",borderRadius:10,border:"none",background:"linear-gradient(135deg,#0EA5E9,#0284c7)",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",gap:8,transition:"all 0.2s"},
  primaryBtnDisabled:{background:"rgba(255,255,255,0.05)",color:"rgba(255,255,255,0.2)",cursor:"not-allowed"},

  errBlock:{marginTop:12,padding:"13px 15px",background:"rgba(239,68,68,0.06)",border:"1px solid rgba(239,68,68,0.15)",borderRadius:10,color:"#fca5a5",fontSize:"0.78rem",whiteSpace:"pre-wrap",fontFamily:"'JetBrains Mono',monospace",lineHeight:1.7},
  warningBox:{background:"rgba(234,179,8,0.06)",border:"1px solid rgba(234,179,8,0.18)",borderRadius:8,padding:"10px 13px",marginBottom:12,fontSize:"0.74rem",color:"rgba(250,204,21,0.8)",lineHeight:1.6},
  infoBox:{background:"rgba(14,165,233,0.05)",border:"1px solid rgba(14,165,233,0.15)",borderRadius:10,padding:"12px 16px",fontSize:"0.76rem",color:"rgba(147,197,253,0.7)",lineHeight:1.7,marginBottom:16},

  resultCard:{marginTop:20,background:"rgba(255,255,255,0.018)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:14,padding:"18px 22px"},
  resultHeader:{display:"flex",alignItems:"center",gap:9,marginBottom:18,flexWrap:"wrap"},
  resultGrid:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 20px",marginTop:4},
  explorerLink:{fontSize:"0.72rem",color:"#0EA5E9",borderBottom:"1px solid rgba(14,165,233,0.25)",paddingBottom:1,fontWeight:600},
  copyBtn:{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.08)",color:"rgba(255,255,255,0.4)",borderRadius:6,padding:"4px 10px",fontSize:"0.66rem"},
  iconAction:{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.08)",color:"rgba(255,255,255,0.4)",borderRadius:5,padding:"2px 7px",fontSize:"0.68rem",flexShrink:0,display:"inline-flex",alignItems:"center"},

  chainGrid:{display:"flex",flexWrap:"wrap",gap:6,marginBottom:20},
  chainPill:{display:"flex",alignItems:"center",gap:5,background:"rgba(255,255,255,0.025)",border:"1px solid rgba(255,255,255,0.05)",borderRadius:20,padding:"4px 10px"},

  histMeta:{display:"flex",alignItems:"center",gap:10,marginTop:20,marginBottom:10,flexWrap:"wrap"},
  histTag:{fontSize:"0.65rem",color:"rgba(14,165,233,0.7)",background:"rgba(14,165,233,0.07)",padding:"2px 8px",borderRadius:4},
  emptyState:{textAlign:"center",padding:"32px 16px",color:"rgba(255,255,255,0.15)",fontSize:"0.8rem"},

  filterRow:{display:"flex",gap:5,flexWrap:"wrap",marginBottom:12},
  filterBtn:{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",color:"rgba(255,255,255,0.28)",borderRadius:6,padding:"4px 10px",fontSize:"0.66rem"},
  filterBtnOn:{background:"rgba(14,165,233,0.08)",border:"1px solid rgba(14,165,233,0.2)",color:"#0EA5E9"},

  txRow:{display:"flex",alignItems:"flex-start",gap:10,padding:"11px 14px",background:"rgba(255,255,255,0.018)",border:"1px solid rgba(255,255,255,0.04)",borderRadius:10,marginBottom:5},
  txBtn:{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",color:"rgba(255,255,255,0.3)",borderRadius:6,padding:"5px 10px",fontSize:"0.67rem",display:"inline-flex",alignItems:"center",gap:3},
  inlineCopy:{background:"none",border:"none",color:"rgba(255,255,255,0.18)",fontSize:"0.66rem",padding:"0 4px",marginLeft:2},
  traceInline:{background:"rgba(16,185,129,0.08)",border:"1px solid rgba(16,185,129,0.2)",color:"#10b981",borderRadius:5,padding:"1px 7px",fontSize:"0.6rem",cursor:"pointer",fontWeight:600},

  treeWrap:{background:"rgba(14,165,233,0.02)",border:"1px solid rgba(14,165,233,0.08)",borderRadius:12,padding:"16px"},

  loadMoreBtn:{width:"100%",marginTop:8,padding:"9px 0",background:"rgba(14,165,233,0.05)",border:"1px solid rgba(14,165,233,0.15)",color:"rgba(14,165,233,0.7)",borderRadius:8,fontSize:"0.75rem",fontWeight:600,display:"flex",alignItems:"center",justifyContent:"center",gap:4,cursor:"pointer"},

  settingBtn:{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",color:"rgba(255,255,255,0.3)",borderRadius:6,padding:"4px 12px",fontSize:"0.7rem"},
  settingBtnOn:{background:"rgba(14,165,233,0.12)",border:"1px solid rgba(14,165,233,0.3)",color:"#0EA5E9",fontWeight:700},

  footer:{position:"relative",zIndex:1,borderTop:"1px solid rgba(255,255,255,0.04)",padding:"20px 24px",display:"flex",justifyContent:"space-between",alignItems:"center",maxWidth:960,margin:"0 auto",flexWrap:"wrap",gap:12},
};
