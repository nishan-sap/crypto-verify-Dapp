import { useState, useEffect } from "react";
import axios from "axios";
import { ethers } from "ethers";

const API = "http://localhost:5000/api/transactions";
const CONTRACT_ADDRESS = "0x04BDEeDE281D1c0b63449CAc4EDc30d9b2B369aE";
const ABI = [
  "function sendAndRecord(address payable _receiver, string memory _message) external payable returns (bytes32)",
  "function verifyTransaction(bytes32 _txId) external view returns (address sender, address receiver, uint256 amount, uint256 timestamp, string memory message, bool exists)",
  "function getWalletHistory(address _wallet) external view returns (bytes32[])",
  "function totalTransactions() external view returns (uint256)"
];

const CHAINS = [
  { id:"sepolia",  name:"Ethereum Sepolia", icon:"⟠", color:"#627EEA", hint:"0x + 64 hex chars" },
  { id:"ethereum", name:"Ethereum Mainnet", icon:"⟠", color:"#627EEA", hint:"0x + 64 hex chars" },
  { id:"polygon",  name:"Polygon",          icon:"⬡", color:"#8247E5", hint:"0x + 64 hex chars" },
  { id:"bsc",      name:"BNB Chain",        icon:"◈", color:"#F0B90B", hint:"0x + 64 hex chars" },
  { id:"arbitrum", name:"Arbitrum",         icon:"◎", color:"#28A0F0", hint:"0x + 64 hex chars" },
  { id:"base",     name:"Base",             icon:"⬤", color:"#0052FF", hint:"0x + 64 hex chars" },
  { id:"bitcoin",  name:"Bitcoin",          icon:"₿", color:"#F7931A", hint:"64 hex chars (no 0x)" },
];

export default function App() {
  const [tab, setTab] = useState("explorer");
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [totalTx, setTotalTx] = useState(null);
  const [selectedChain, setSelectedChain] = useState("sepolia");
  const [txHash, setTxHash] = useState("");
  const [lookupResult, setLookupResult] = useState(null);
  const [receiver, setReceiver] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [verifyId, setVerifyId] = useState("");
  const [verifyResult, setVerifyResult] = useState(null);
  const [histAddr, setHistAddr] = useState("");
  const [history, setHistory] = useState([]);

  useEffect(() => {
    axios.get(`${API}/total`).then(r => setTotalTx(r.data.total)).catch(() => {});
  }, []);

  const reset = () => { setError(""); setSuccess(""); setLookupResult(null); setVerifyResult(null); };

  const connectWallet = async () => {
    try {
      if (!window.ethereum) return setError("MetaMask not installed.");
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      const prov = new ethers.BrowserProvider(window.ethereum);
      const net = await prov.getNetwork();
      setWallet(accounts[0]);
      setError("");
      if (net.chainId !== 11155111n) setError("⚠️ Switch MetaMask to Sepolia TestNet to send.");
    } catch { setError("Wallet connection failed."); }
  };

  const lookupTx = async () => {
    const hash = txHash.trim();
    if (!hash) return setError("Enter a transaction hash");
    const evmReg = /^0x[a-fA-F0-9]{64}$/;
    const btcReg = /^[a-fA-F0-9]{64}$/;
    if (selectedChain !== "bitcoin" && !evmReg.test(hash))
      return setError("Invalid format — needs 0x + 64 hex characters for EVM chains");
    if (selectedChain === "bitcoin" && !btcReg.test(hash) && !evmReg.test(hash))
      return setError("Invalid Bitcoin TX hash format");
    setLoading(true); reset();
    try {
      const res = await axios.get(`${API}/lookup/${selectedChain}/${hash}`);
      setLookupResult(res.data);
    } catch (e) {
      const msg = e.response?.data?.error;
      if (e.response?.status === 404) setError("Transaction not found on " + CHAINS.find(c=>c.id===selectedChain)?.name);
      else if (e.response?.status === 429) setError("Too many requests — please wait.");
      else if (e.response?.status === 400) setError(msg || "Invalid input.");
      else setError("Backend not running. Start with: node backend/server.js");
    } finally { setLoading(false); }
  };

  const sendTx = async () => {
    if (!wallet) return setError("Connect MetaMask first");
    if (!/^0x[a-fA-F0-9]{40}$/.test(receiver.trim())) return setError("Invalid receiver address");
    if (!amount || parseFloat(amount) <= 0) return setError("Enter a valid ETH amount");
    setLoading(true); reset();
    try {
      const prov = new ethers.BrowserProvider(window.ethereum);
      const signer = await prov.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
      const tx = await contract.sendAndRecord(receiver.trim(), note||"", { value: ethers.parseEther(amount) });
      setSuccess("⏳ Submitted — awaiting confirmation...");
      await tx.wait();
      setSuccess(`✅ Confirmed!\n\nTX Hash:\n${tx.hash}\n\n💡 Use this hash in Explorer to verify.`);
      setReceiver(""); setAmount(""); setNote("");
      axios.get(`${API}/total`).then(r=>setTotalTx(r.data.total)).catch(()=>{});
    } catch (e) {
      if (e.code === "ACTION_REJECTED") setError("Cancelled.");
      else setError((e.reason || e.message || "Failed").slice(0, 150));
    } finally { setLoading(false); }
  };

  const verifyDApp = async () => {
    const id = verifyId.trim();
    if (!/^0x[a-fA-F0-9]{64}$/.test(id)) return setError("Invalid DApp transaction ID format");
    setLoading(true); reset();
    try {
      const res = await axios.get(`${API}/verify/${id}`);
      setVerifyResult(res.data);
    } catch (e) {
      if (e.response?.status === 404) setError("Not found in DApp smart contract records.");
      else setError("Backend not running.");
    } finally { setLoading(false); }
  };

  const loadHistory = async () => {
    const addr = histAddr.trim();
    if (!/^0x[a-fA-F0-9]{40}$/.test(addr)) return setError("Invalid wallet address format");
    setLoading(true); reset(); setHistory([]);
    try {
      const res = await axios.get(`${API}/history/${addr}`);
      setHistory(res.data.transactions || []);
    } catch { setError("Backend not running."); }
    finally { setLoading(false); }
  };

  const chain = CHAINS.find(c => c.id === selectedChain);
  const sh = a => a ? `${a.slice(0,6)}···${a.slice(-4)}` : "";

  return (
    <div style={c.root}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:2px}
        input{outline:none;}
        input:focus{border-color:rgba(99,255,180,0.5)!important;box-shadow:0 0 0 3px rgba(99,255,180,0.08)!important;}
        button{font-family:'Outfit',sans-serif;}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.5;transform:scale(0.95)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes glow{0%,100%{opacity:0.4}50%{opacity:0.7}}
        .fadeUp{animation:fadeUp 0.3s ease forwards;}
        .spin{animation:spin 0.7s linear infinite;display:inline-block;}
      `}</style>

      {/* BG */}
      <div style={c.bg1}/><div style={c.bg2}/><div style={c.bg3}/>
      <div style={c.grid}/>

      {/* NAV */}
      <nav style={c.nav}>
        <div style={c.navW}>
          <div style={c.logo}>
            <div style={c.logoHex}>⬡</div>
            <div>
              <div style={c.logoName}>ChainVerify</div>
              <div style={c.logoMeta}>Multi-Chain Explorer</div>
            </div>
          </div>
          <div style={c.navR}>
            {totalTx !== null &&
              <div style={c.pill}><span style={c.dot}/>{totalTx} on-chain</div>}
            {wallet
              ? <div style={c.wpill}><span style={c.wdot}/>{sh(wallet)}</div>
              : <button style={c.cBtn} onClick={connectWallet}>🦊 Connect</button>}
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section style={c.hero}>
        <div style={c.heroEye}>BLOCKCHAIN EXPLORER · 7 CHAINS</div>
        <h1 style={c.h1}>Track Any Transaction<br/><em style={c.em}>Across Any Chain</em></h1>
        <p style={c.heroP}>Look up any public transaction on Ethereum, Polygon, BNB Chain, Arbitrum, Base or Bitcoin by hash. Send ETH via smart contract and record it permanently on-chain.</p>
        <div style={c.tags}>
          {["⟠ Ethereum","⬡ Polygon","◈ BNB Chain","◎ Arbitrum","⬤ Base","₿ Bitcoin"].map(t=>(
            <span key={t} style={c.tag}>{t}</span>
          ))}
        </div>
      </section>

      {/* TABS */}
      <div style={c.tabsRow}>
        {[
          {k:"explorer",  i:"⌕",  l:"Explorer"},
          {k:"send",      i:"↗",  l:"Send"},
          {k:"verify",    i:"◉",  l:"DApp Verify"},
          {k:"history",   i:"☰",  l:"History"},
        ].map(t=>(
          <button key={t.k} style={tab===t.k?c.tOn:c.tOff}
            onClick={()=>{setTab(t.k);reset();}}>
            <span style={{fontSize:"1rem"}}>{t.i}</span>{t.l}
          </button>
        ))}
      </div>

      {/* MAIN */}
      <main style={c.main}>

        {/* ── EXPLORER ── */}
        {tab==="explorer" && (
          <div style={c.card} className="fadeUp">
            <CardHead icon="⌕" title="Multi-Chain Transaction Explorer"
              sub="Look up ANY transaction on 7 supported blockchains" />

            <div style={c.info}>
              🌐 Works with any <b>public</b> transaction — faucets, swaps, transfers, NFT mints. Just paste the hash and select the chain.
            </div>

            {/* Chain selector */}
            <div style={c.fl}>Chain</div>
            <div style={c.chainGrid}>
              {CHAINS.map(ch => (
                <button key={ch.id}
                  style={{...c.chainBtn, ...(selectedChain===ch.id?{borderColor:ch.color,background:`${ch.color}15`,color:"#fff"}:{})}}
                  onClick={()=>setSelectedChain(ch.id)}>
                  <span style={{color:ch.color,fontSize:"1rem"}}>{ch.icon}</span>
                  <span style={{fontSize:"0.72rem",fontWeight:600}}>{ch.name}</span>
                </button>
              ))}
            </div>

            <div style={c.fl}>Transaction Hash
              <span style={c.hint}>({chain?.hint})</span>
            </div>
            <div style={c.inputRow}>
              <input style={c.inp} placeholder={selectedChain==="bitcoin"?"a1b2c3...64chars":"0x1a2b3c...64chars"}
                value={txHash} onChange={e=>setTxHash(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&lookupTx()} />
              <button style={c.clearBtn} onClick={()=>{setTxHash("");setLookupResult(null);}}>✕</button>
            </div>
            <Btn loading={loading} onClick={lookupTx}>⌕ Look Up Transaction</Btn>

            {error && <Err>{error}</Err>}

            {lookupResult && (
              <div style={c.res} className="fadeUp">
                <div style={c.resHd}>
                  <StatusBadge status={lookupResult.status}/>
                  <span style={c.resMeta}>{lookupResult.network}</span>
                  <a href={lookupResult.explorerUrl} target="_blank" rel="noreferrer" style={c.extBtn}>
                    Block Explorer ↗
                  </a>
                </div>
                <div style={c.resGrid}>
                  <RF k="FROM"          v={lookupResult.from}          mono />
                  <RF k="TO"            v={lookupResult.to}            mono />
                  <RF k="VALUE"         v={lookupResult.value}         green />
                  <RF k="STATUS"        v={lookupResult.status} />
                  <RF k="TYPE"          v={lookupResult.type} />
                  <RF k="BLOCK"         v={String(lookupResult.blockNumber)} />
                  <RF k="CONFIRMATIONS" v={String(lookupResult.confirmations)} />
                  {lookupResult.gasUsed && lookupResult.gasUsed !== "Pending" &&
                    <RF k="GAS USED" v={lookupResult.gasUsed}/>}
                  {lookupResult.gasPrice && lookupResult.gasPrice !== "N/A" &&
                    <RF k="GAS PRICE" v={lookupResult.gasPrice}/>}
                  {lookupResult.fee && <RF k="FEE" v={lookupResult.fee}/>}
                  {lookupResult.size && <RF k="SIZE" v={lookupResult.size}/>}
                  {lookupResult.timestamp && lookupResult.timestamp !== "Pending" &&
                    <RF k="TIMESTAMP" v={new Date(lookupResult.timestamp).toLocaleString()}/>}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── SEND ── */}
        {tab==="send" && (
          <div style={c.card} className="fadeUp">
            <CardHead icon="↗" title="Send & Record on Sepolia"
              sub="Transfer ETH via smart contract — permanently logged on blockchain" />
            <div style={c.info}>
              💡 Only transactions sent through this DApp are stored in the smart contract. After sending, copy the TX hash and use the Explorer to track it.
            </div>
            <Field label="Receiver Wallet Address">
              <input style={c.inp} placeholder="0x..." value={receiver} onChange={e=>setReceiver(e.target.value)}/>
            </Field>
            <Field label="Amount (ETH)">
              <input style={c.inp} placeholder="0.001" type="number" step="0.001" min="0.0001"
                value={amount} onChange={e=>setAmount(e.target.value)}/>
            </Field>
            <Field label="Note (optional)">
              <input style={c.inp} placeholder="Payment for..." value={note} onChange={e=>setNote(e.target.value)}/>
            </Field>
            <Btn loading={loading} onClick={sendTx}>↗ Send Transaction</Btn>
            {error && <Err>{error}</Err>}
            {success && <Suc>{success}</Suc>}
          </div>
        )}

        {/* ── DAPP VERIFY ── */}
        {tab==="verify" && (
          <div style={c.card} className="fadeUp">
            <CardHead icon="◉" title="Verify DApp Transaction"
              sub="Verify a transaction stored in our smart contract (bytes32 ID)" />
            <div style={c.info}>
              💡 Use the bytes32 ID emitted by our contract — not a regular TX hash. For regular hashes use the Explorer tab.
            </div>
            <Field label="Smart Contract Transaction ID">
              <input style={c.inp} placeholder="0x..." value={verifyId} onChange={e=>setVerifyId(e.target.value)}/>
            </Field>
            <Btn loading={loading} onClick={verifyDApp}>◉ Verify</Btn>
            {error && <Err>{error}</Err>}
            {verifyResult && (
              <div style={c.res} className="fadeUp">
                <div style={c.resHd}>
                  <span style={c.badge}>✓ VERIFIED ON-CHAIN</span>
                </div>
                <div style={c.resGrid}>
                  <RF k="FROM"      v={verifyResult.sender}   mono />
                  <RF k="TO"        v={verifyResult.receiver} mono />
                  <RF k="AMOUNT"    v={verifyResult.amount}   green />
                  <RF k="TIMESTAMP" v={new Date(verifyResult.timestamp).toLocaleString()} />
                  {verifyResult.message && <RF k="NOTE" v={verifyResult.message}/>}
                </div>
                <a href={`https://sepolia.etherscan.io/address/${verifyResult.sender}`}
                  target="_blank" rel="noreferrer" style={c.extBtn}>View on Etherscan ↗</a>
              </div>
            )}
          </div>
        )}

        {/* ── HISTORY ── */}
        {tab==="history" && (
          <div style={c.card} className="fadeUp">
            <CardHead icon="☰" title="Wallet Transaction History"
              sub="All DApp transactions recorded for any wallet address" />
            <Field label="Wallet Address">
              <input style={c.inp} placeholder="0x..." value={histAddr} onChange={e=>setHistAddr(e.target.value)}/>
            </Field>
            <Btn loading={loading} onClick={loadHistory}>☰ Load History</Btn>
            {error && <Err>{error}</Err>}
            {history.length > 0 && (
              <div style={{marginTop:20}} className="fadeUp">
                <div style={c.histHd}>{history.length} transaction{history.length!==1?"s":""}</div>
                {history.map((id,i) => (
                  <div key={i} style={c.histRow}>
                    <div style={c.histNum}>#{String(i+1).padStart(2,"0")}</div>
                    <div style={c.histId}>{id.slice(0,22)}···{id.slice(-8)}</div>
                    <button style={c.histAct} onClick={()=>{setVerifyId(id);setTab("verify");}}>DApp Verify</button>
                    <button style={{...c.histAct,...c.histActB}} onClick={()=>{setTxHash(id);setSelectedChain("sepolia");setTab("explorer");}}>Explorer</button>
                  </div>
                ))}
              </div>
            )}
            {history.length===0 && !loading && histAddr &&
              <div style={c.empty}>No DApp transactions for this wallet</div>}
          </div>
        )}

      </main>

      {/* CONTRACT BAR */}
      <div style={c.cBar}>
        <span style={c.cLabel}>CONTRACT</span>
        <span style={c.cAddr}>{CONTRACT_ADDRESS}</span>
        <a href={`https://sepolia.etherscan.io/address/${CONTRACT_ADDRESS}`}
          target="_blank" rel="noreferrer" style={c.cLink}>Etherscan ↗</a>
      </div>

      {/* FOOTER */}
      <footer style={c.foot}>
        <span style={c.footL}>⬡ ChainVerify</span>
        <span style={c.footR}>Built by Nishan Sapkota</span>
      </footer>
    </div>
  );
}

// ── Sub-components ────────────────────────────────
function CardHead({icon,title,sub}) {
  return (
    <div style={{display:"flex",gap:14,alignItems:"flex-start",marginBottom:20}}>
      <div style={{width:44,height:44,background:"rgba(99,255,180,0.08)",border:"1px solid rgba(99,255,180,0.15)",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.15rem",color:"#63ffb4",flexShrink:0}}>{icon}</div>
      <div><div style={{fontSize:"1.05rem",fontWeight:700,color:"#fff",marginBottom:3}}>{title}</div><div style={{fontSize:"0.75rem",color:"rgba(255,255,255,0.28)"}}>{sub}</div></div>
    </div>
  );
}

function Field({label,children}) {
  return <div><div style={{fontSize:"0.65rem",color:"rgba(255,255,255,0.28)",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:7,marginTop:16}}>{label}</div>{children}</div>;
}

function RF({k,v,mono,green}) {
  return (
    <div style={{borderBottom:"1px solid rgba(255,255,255,0.05)",paddingBottom:10}}>
      <div style={{fontSize:"0.6rem",color:"rgba(255,255,255,0.2)",letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:3}}>{k}</div>
      <div style={{fontSize:"0.82rem",color:green?"#63ffb4":"rgba(255,255,255,0.7)",fontFamily:mono?"'JetBrains Mono',monospace":"inherit",fontWeight:green?700:400,wordBreak:"break-all"}}>{v}</div>
    </div>
  );
}

function Btn({loading,onClick,children}) {
  return (
    <button style={{width:"100%",marginTop:18,padding:"13px",background:loading?"rgba(99,255,180,0.07)":"linear-gradient(135deg,#63ffb4,#00cc88)",color:loading?"rgba(99,255,180,0.5)":"#06060f",border:loading?"1px solid rgba(99,255,180,0.15)":"none",borderRadius:9,fontSize:"0.9rem",fontWeight:800,cursor:loading?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}
      onClick={onClick} disabled={loading}>
      {loading?<><span className="spin">⟳</span>Working...</>:children}
    </button>
  );
}

function Err({children}) {
  return <div style={{marginTop:14,padding:"12px 14px",background:"rgba(255,60,60,0.07)",border:"1px solid rgba(255,60,60,0.15)",borderRadius:8,color:"#ff7777",fontSize:"0.82rem",lineHeight:1.6}}>{children}</div>;
}

function Suc({children}) {
  return <div style={{marginTop:14,padding:"12px 14px",background:"rgba(99,255,180,0.06)",border:"1px solid rgba(99,255,180,0.15)",borderRadius:8,color:"#63ffb4",fontSize:"0.82rem",lineHeight:1.7}}><pre style={{margin:0,whiteSpace:"pre-wrap",fontFamily:"inherit"}}>{children}</pre></div>;
}

function StatusBadge({status}) {
  const ok = status==="Success";
  const pend = status==="Pending";
  const col = ok?"#63ffb4":pend?"#ffcc44":"#ff7777";
  const bg = ok?"rgba(99,255,180,0.1)":pend?"rgba(255,204,68,0.1)":"rgba(255,60,60,0.1)";
  return <span style={{background:bg,color:col,border:`1px solid ${col}30`,borderRadius:6,padding:"3px 10px",fontSize:"0.68rem",fontWeight:700,letterSpacing:"0.06em"}}>{ok?"✓ SUCCESS":pend?"⏳ PENDING":"✗ FAILED"}</span>;
}

// ── Styles ────────────────────────────────────────
const c = {
  root:{minHeight:"100vh",background:"#07070e",color:"#d8dae8",fontFamily:"'Outfit',sans-serif",position:"relative",overflowX:"hidden"},
  bg1:{position:"fixed",top:"-20%",right:"-15%",width:"65vw",height:"65vw",background:"radial-gradient(circle,rgba(99,255,180,0.055) 0%,transparent 65%)",pointerEvents:"none",zIndex:0,animation:"glow 10s ease-in-out infinite"},
  bg2:{position:"fixed",bottom:"-25%",left:"-15%",width:"55vw",height:"55vw",background:"radial-gradient(circle,rgba(98,126,234,0.06) 0%,transparent 65%)",pointerEvents:"none",zIndex:0,animation:"glow 13s ease-in-out infinite reverse"},
  bg3:{position:"fixed",top:"40%",left:"40%",width:"30vw",height:"30vw",background:"radial-gradient(circle,rgba(247,147,26,0.025) 0%,transparent 65%)",pointerEvents:"none",zIndex:0},
  grid:{position:"fixed",inset:0,backgroundImage:"linear-gradient(rgba(99,255,180,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(99,255,180,0.02) 1px,transparent 1px)",backgroundSize:"48px 48px",pointerEvents:"none",zIndex:0},

  nav:{position:"sticky",top:0,zIndex:100,backdropFilter:"blur(28px) saturate(180%)",background:"rgba(7,7,14,0.88)",borderBottom:"1px solid rgba(255,255,255,0.05)"},
  navW:{maxWidth:1100,margin:"0 auto",padding:"13px 24px",display:"flex",alignItems:"center",justifyContent:"space-between"},
  logo:{display:"flex",alignItems:"center",gap:10},
  logoHex:{fontSize:28,color:"#63ffb4",lineHeight:1,fontWeight:900},
  logoName:{fontSize:"1rem",fontWeight:800,color:"#fff",letterSpacing:"-0.03em"},
  logoMeta:{fontSize:"0.6rem",color:"rgba(255,255,255,0.22)",letterSpacing:"0.1em",textTransform:"uppercase"},
  navR:{display:"flex",alignItems:"center",gap:10},
  pill:{display:"flex",alignItems:"center",gap:6,background:"rgba(99,255,180,0.06)",border:"1px solid rgba(99,255,180,0.12)",borderRadius:20,padding:"5px 12px",fontSize:"0.7rem",color:"rgba(99,255,180,0.75)"},
  dot:{width:5,height:5,borderRadius:"50%",background:"#63ffb4",animation:"pulse 2s infinite"},
  wpill:{display:"flex",alignItems:"center",gap:7,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.09)",borderRadius:20,padding:"6px 14px",fontSize:"0.75rem",fontFamily:"'JetBrains Mono',monospace"},
  wdot:{width:5,height:5,borderRadius:"50%",background:"#63ffb4"},
  cBtn:{background:"#63ffb4",color:"#07070e",border:"none",borderRadius:8,padding:"9px 18px",fontSize:"0.8rem",fontWeight:800,cursor:"pointer"},

  hero:{position:"relative",zIndex:1,maxWidth:760,margin:"0 auto",padding:"72px 24px 48px",textAlign:"center"},
  heroEye:{fontSize:"0.62rem",letterSpacing:"0.22em",color:"rgba(99,255,180,0.5)",marginBottom:18,textTransform:"uppercase"},
  h1:{fontSize:"clamp(2rem,5.5vw,3.8rem)",fontWeight:900,lineHeight:1.05,margin:"0 0 18px",letterSpacing:"-0.04em",color:"#fff"},
  em:{fontStyle:"normal",background:"linear-gradient(135deg,#63ffb4 0%,#00aaff 100%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"},
  heroP:{fontSize:"0.92rem",color:"rgba(255,255,255,0.32)",lineHeight:1.8,maxWidth:560,margin:"0 auto 24px"},
  tags:{display:"flex",flexWrap:"wrap",gap:7,justifyContent:"center"},
  tag:{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:20,padding:"4px 13px",fontSize:"0.72rem",color:"rgba(255,255,255,0.38)"},

  tabsRow:{position:"relative",zIndex:1,display:"flex",justifyContent:"center",gap:3,padding:"0 16px 28px",flexWrap:"wrap"},
  tOn:{display:"flex",alignItems:"center",gap:6,background:"rgba(99,255,180,0.1)",border:"1px solid rgba(99,255,180,0.22)",color:"#63ffb4",padding:"9px 18px",borderRadius:8,cursor:"pointer",fontSize:"0.78rem",fontWeight:700,letterSpacing:"-0.01em"},
  tOff:{display:"flex",alignItems:"center",gap:6,background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",color:"rgba(255,255,255,0.28)",padding:"9px 18px",borderRadius:8,cursor:"pointer",fontSize:"0.78rem",fontWeight:500},

  main:{position:"relative",zIndex:1,maxWidth:720,margin:"0 auto",padding:"0 24px 60px"},

  card:{background:"rgba(255,255,255,0.025)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:18,padding:"28px 32px",backdropFilter:"blur(14px)"},
  info:{background:"rgba(0,170,255,0.05)",border:"1px solid rgba(0,170,255,0.1)",borderRadius:8,padding:"11px 14px",fontSize:"0.77rem",color:"rgba(0,170,255,0.65)",marginBottom:18,lineHeight:1.55},

  chainGrid:{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:7,marginBottom:4},
  chainBtn:{display:"flex",alignItems:"center",gap:7,background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:8,padding:"9px 12px",cursor:"pointer",color:"rgba(255,255,255,0.4)",transition:"all 0.15s"},

  fl:{fontSize:"0.65rem",color:"rgba(255,255,255,0.28)",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:7,marginTop:14,display:"flex",gap:8,alignItems:"center"},
  hint:{color:"rgba(255,255,255,0.15)",fontSize:"0.62rem",fontFamily:"'JetBrains Mono',monospace",textTransform:"none",letterSpacing:0},
  inputRow:{display:"flex",gap:6},
  inp:{flex:1,width:"100%",padding:"11px 14px",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:8,color:"#d8dae8",fontSize:"0.83rem",fontFamily:"'JetBrains Mono',monospace",transition:"border 0.2s,box-shadow 0.2s"},
  clearBtn:{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",color:"rgba(255,255,255,0.3)",borderRadius:8,padding:"0 12px",cursor:"pointer",fontSize:"0.8rem"},

  res:{marginTop:18,background:"rgba(99,255,180,0.03)",border:"1px solid rgba(99,255,180,0.1)",borderRadius:12,padding:20},
  resHd:{display:"flex",alignItems:"center",gap:10,marginBottom:16,flexWrap:"wrap"},
  resMeta:{fontSize:"0.7rem",color:"rgba(255,255,255,0.22)",marginLeft:"auto"},
  resGrid:{display:"flex",flexDirection:"column",gap:10},
  badge:{background:"rgba(99,255,180,0.1)",color:"#63ffb4",border:"1px solid rgba(99,255,180,0.22)",borderRadius:6,padding:"4px 10px",fontSize:"0.67rem",fontWeight:700,letterSpacing:"0.07em"},
  extBtn:{color:"rgba(99,255,180,0.7)",fontSize:"0.75rem",textDecoration:"none",borderBottom:"1px solid rgba(99,255,180,0.2)",paddingBottom:1},

  histHd:{fontSize:"0.7rem",color:"rgba(255,255,255,0.22)",marginBottom:10,letterSpacing:"0.05em"},
  histRow:{display:"flex",alignItems:"center",gap:7,padding:"10px 12px",background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.05)",borderRadius:8,marginBottom:6},
  histNum:{fontSize:"0.65rem",color:"rgba(255,255,255,0.18)",fontFamily:"'JetBrains Mono',monospace",minWidth:26},
  histId:{flex:1,fontSize:"0.7rem",fontFamily:"'JetBrains Mono',monospace",color:"rgba(255,255,255,0.35)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"},
  histAct:{background:"rgba(99,255,180,0.08)",border:"1px solid rgba(99,255,180,0.15)",color:"#63ffb4",borderRadius:6,padding:"4px 9px",cursor:"pointer",fontSize:"0.68rem",whiteSpace:"nowrap"},
  histActB:{background:"rgba(0,170,255,0.08)",borderColor:"rgba(0,170,255,0.15)",color:"#44aaff"},
  empty:{textAlign:"center",padding:"24px 0",color:"rgba(255,255,255,0.15)",fontSize:"0.82rem"},

  cBar:{position:"relative",zIndex:1,maxWidth:720,margin:"0 auto 32px",padding:"0 24px"},
  cLabel:{fontSize:"0.6rem",color:"rgba(255,255,255,0.18)",letterSpacing:"0.12em",textTransform:"uppercase"},
  cAddr:{fontFamily:"'JetBrains Mono',monospace",fontSize:"0.72rem",color:"rgba(255,255,255,0.3)",wordBreak:"break-all",margin:"0 12px"},
  cLink:{color:"rgba(99,255,180,0.6)",fontSize:"0.72rem",textDecoration:"none"},

  foot:{position:"relative",zIndex:1,borderTop:"1px solid rgba(255,255,255,0.04)",padding:"20px 24px",display:"flex",justifyContent:"space-between",alignItems:"center",maxWidth:1100,margin:"0 auto"},
  footL:{fontSize:"0.85rem",fontWeight:800,color:"rgba(255,255,255,0.18)"},
  footR:{fontSize:"0.72rem",color:"rgba(255,255,255,0.13)"},
};
