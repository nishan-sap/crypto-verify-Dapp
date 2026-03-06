import { useState } from "react";

const API = "http://localhost:5000/api/transactions";
const ON_GITHUB = window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1";

const FAMILIES = [
  { id:"ethereum", label:"Ethereum",  icon:"⟠", color:"#627EEA", note:"Mainnet · Sepolia · Base · Optimism · Arbitrum · Linea" },
  { id:"polygon",  label:"Polygon",   icon:"⬡", color:"#8247E5", note:"Polygon Mainnet" },
  { id:"bnb",      label:"BNB Chain", icon:"◈", color:"#F0B90B", note:"BNB Smart Chain" },
  { id:"bitcoin",  label:"Bitcoin",   icon:"₿", color:"#F7931A", note:"Bitcoin Mainnet via Blockstream" },
  { id:"solana",   label:"Solana",    icon:"◎", color:"#9945FF", note:"Solana Mainnet" },
  { id:"tron",     label:"Tron",      icon:"⬤", color:"#FF0013", note:"Tron Mainnet via TronGrid" },
];

export default function App() {
  const [tab, setTab] = useState("explorer");

  // Explorer
  const [exFam, setExFam] = useState("ethereum");
  const [txInput, setTxInput] = useState("");
  const [exResult, setExResult] = useState(null);
  const [exLoading, setExLoading] = useState(false);
  const [exStatus, setExStatus] = useState("");
  const [exError, setExError] = useState("");

  // Wallet history
  const [whFam, setWhFam] = useState("ethereum");
  const [addrInput, setAddrInput] = useState("");
  const [whResult, setWhResult] = useState(null);
  const [whLoading, setWhLoading] = useState(false);
  const [whError, setWhError] = useState("");

  const lookupTx = async () => {
    const hash = txInput.trim();
    if (!hash) return setExError("Paste a transaction hash first");

    setExLoading(true);
    setExError("");
    setExResult(null);
    setExStatus("Connecting to backend...");

    try {
      const res = await fetch(`${API}/lookup/${encodeURIComponent(hash)}`);
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 404) {
          setExError(
            "Transaction not found on any supported blockchain.\n\n" +
            "Common reasons:\n" +
            "• Wrong chain selected — try a different family\n" +
            "• Hash is incomplete — must be 0x + 64 hex chars\n" +
            "• Transaction is on a network we don't yet support (e.g. 0g Galileo)\n\n" +
            "Tried: " + (data.tried?.join(", ") || "all chains")
          );
        } else {
          setExError(data.error || "Request failed");
        }
        return;
      }

      setExResult(data);
    } catch {
      setExError(
        "Cannot reach backend.\n\n" +
        "Make sure you have this running in a terminal:\n\n" +
        "  node backend/server.js\n\n" +
        "Then try again."
      );
    } finally {
      setExLoading(false);
      setExStatus("");
    }
  };

  const loadWallet = async () => {
    const addr = addrInput.trim();
    if (!addr) return setWhError("Enter a wallet address");

    setWhLoading(true);
    setWhError("");
    setWhResult(null);

    try {
      const res = await fetch(`${API}/wallet/${encodeURIComponent(addr)}`);
      const data = await res.json();

      if (!res.ok) {
        setWhError(data.error || "Request failed");
        return;
      }
      setWhResult(data);
    } catch {
      setWhError(
        "Cannot reach backend.\n\n" +
        "Make sure this is running:\n\n" +
        "  node backend/server.js"
      );
    } finally {
      setWhLoading(false);
    }
  };

  const fam = FAMILIES.find(f => f.id === exFam);
  const wFam = FAMILIES.find(f => f.id === whFam);

  return (
    <div style={s.root}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=DM+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        body{background:#08080e;}
        input{outline:none;font-family:'DM Mono',monospace;}
        input:focus{border-color:rgba(255,255,255,0.22)!important;background:rgba(255,255,255,0.05)!important;}
        button{font-family:'DM Sans',sans-serif;cursor:pointer;}
        button:hover:not(:disabled){opacity:0.85;}
        a{text-decoration:none;}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        .fadeUp{animation:fadeUp 0.2s ease forwards;}
        pre{white-space:pre-wrap;font-family:'DM Mono',monospace;font-size:0.78rem;line-height:1.6;}
      `}</style>

      <div style={s.bgGlow}/>
      <div style={s.bgGrid}/>

      {/* NAV */}
      <nav style={s.nav}>
        <div style={s.navW}>
          <div style={s.brand}>
            <HexLogo/>
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
          {tab==="explorer" ? "TRANSACTION EXPLORER — 10 BLOCKCHAINS" : "WALLET HISTORY — ALL CHAINS AUTO-SEARCHED"}
        </div>
        <h1 style={s.h1}>
          {tab==="explorer"
            ? <><GradText>Search</GradText> any transaction<br/>across any chain</>
            : <><GradText>Track</GradText> any wallet<br/>across all chains</>}
        </h1>
        <p style={s.hp}>
          {tab==="explorer"
            ? "Paste any transaction hash — the backend searches all chains automatically and returns verified on-chain data."
            : "Enter any wallet address. All matching chains are searched in parallel automatically."}
        </p>

        {ON_GITHUB && (
          <div style={s.githubNote}>
            ⚠️ GitHub Pages serves the static UI only. Both tabs require <code style={s.codeInline}>node backend/server.js</code> running locally.
            Clone the repo and run it to use all features.
          </div>
        )}
      </div>

      {/* MAIN */}
      <div style={s.wrap}>

        {/* ══ EXPLORER ══ */}
        {tab==="explorer" && (
          <div style={s.card} className="fadeUp" key="ex">
            <CardHead icon="⌕"
              title="Multi-Chain Transaction Explorer"
              sub="Auto-detects chain — searches Ethereum family, Polygon, BNB, Bitcoin, Solana, Tron" />

            <FieldLabel>Chain family hint <OptTag>(speeds up search)</OptTag></FieldLabel>
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

            <FieldLabel>
              Transaction Hash
              <HintTag>{exFam==="bitcoin"?"64 hex (no 0x)":exFam==="solana"?"Base58 signature":"0x + 64 hex chars"}</HintTag>
            </FieldLabel>
            <div style={s.iRow}>
              <input style={s.inp}
                placeholder={exFam==="bitcoin"?"a1b2c3d4...64chars":exFam==="solana"?"5Uvd9vQE...":"0x9503d70f..."}
                value={txInput}
                onChange={e=>{setTxInput(e.target.value);setExError("");setExResult(null);}}
                onKeyDown={e=>e.key==="Enter"&&lookupTx()}/>
              {txInput && <Xbtn onClick={()=>{setTxInput("");setExResult(null);setExError("");}}/>}
            </div>

            {exStatus && (
              <div style={s.statusRow}>
                <span style={{display:"inline-block",animation:"spin 0.8s linear infinite",marginRight:6}}>⟳</span>
                {exStatus}
              </div>
            )}

            <MainBtn loading={exLoading} color={fam?.color||"#4ade80"} onClick={lookupTx}>
              Search Transaction
            </MainBtn>

            {exError && <ErrBlock msg={exError}/>}

            {exResult && (
              <div style={s.resBox} className="fadeUp">
                <div style={s.resHead}>
                  <StatusPill status={exResult.status}/>
                  <span style={s.resNet}>{exResult.network}</span>
                  <a href={exResult.explorerUrl} target="_blank" rel="noreferrer" style={s.extLink}>
                    Block Explorer ↗
                  </a>
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
                  {ok(exResult.nonce !== undefined) && <RF k="NONCE" v={""+exResult.nonce}/>}
                  {exResult.timestamp && !["Pending","Unknown"].includes(exResult.timestamp) &&
                    <RF k="TIMESTAMP" v={new Date(exResult.timestamp).toLocaleString()}/>}
                  {exResult.verifiedBy && <RF k="DATA SOURCE" v={exResult.verifiedBy}/>}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══ WALLET HISTORY ══ */}
        {tab==="history" && (
          <div style={s.card} className="fadeUp" key="wh">
            <CardHead icon="☰"
              title="Wallet Transaction History"
              sub="All chains searched automatically — no network selection needed" />

            <div style={s.infoBox}>
              🌐 Paste any wallet address — auto-detects EVM (searches 8 chains simultaneously), Bitcoin, Solana, or Tron. Results come from public blockchain explorer APIs.
            </div>

            <FieldLabel>Address type hint <OptTag>(optional — auto-detected)</OptTag></FieldLabel>
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

            <FieldLabel>
              Wallet Address
              <HintTag>
                {whFam==="bitcoin"?"1.../3.../bc1..."
                  :whFam==="solana"?"Base58 address"
                  :whFam==="tron"?"T + 33 chars"
                  :"0x + 40 hex chars"}
              </HintTag>
            </FieldLabel>
            <div style={s.iRow}>
              <input style={s.inp}
                placeholder={
                  whFam==="bitcoin"?"1A1zP1eP5QGefi2DMPTfTL5SLmv7Divf..."
                  :whFam==="solana"?"So11111111111111111111111111111..."
                  :whFam==="tron"?"TLa2f6VPqDgRE67v1736s7bJ8Ray5wYjU7"
                  :"0x6Cc9397c3B38739daCbfaA68EaD5F5D77Ba5F455"}
                value={addrInput}
                onChange={e=>{setAddrInput(e.target.value);setWhError("");setWhResult(null);}}
                onKeyDown={e=>e.key==="Enter"&&loadWallet()}/>
              {addrInput && <Xbtn onClick={()=>{setAddrInput("");setWhResult(null);setWhError("");}}/>}
            </div>

            <MainBtn loading={whLoading} color={wFam?.color||"#4ade80"} onClick={loadWallet}>
              {whLoading ? "Searching all chains..." : "Load Transaction History"}
            </MainBtn>

            {whError && <ErrBlock msg={whError}/>}

            {whResult && (
              <div className="fadeUp">
                <div style={s.histHead}>
                  <span style={s.histCnt}>{whResult.count} transaction{whResult.count!==1?"s":""} found</span>
                  {whResult.chainsSearched?.length > 1 &&
                    <span style={s.histChain}>{whResult.chainsSearched.length} chains searched</span>}
                  <span style={s.histSrc}>via {whResult.source}</span>
                </div>

                {whResult.count===0 && (
                  <div style={s.empty}>
                    No transactions found for this address.<br/>
                    <span style={{fontSize:"0.72rem",color:"rgba(255,255,255,0.18)"}}>
                      Blockscout free API returns up to 15 recent txns. New wallets may show zero.
                    </span>
                  </div>
                )}

                {(whResult.transactions||[]).map((tx,i)=>(
                  <div key={i} style={s.txRow} className="fadeUp">
                    <div style={s.txLeft}>
                      <div style={s.txHash}>
                        {tx.hash?`${tx.hash.slice(0,14)}···${tx.hash.slice(-8)}`:"N/A"}
                      </div>
                      <div style={s.txMeta}>
                        {tx.network && <span style={s.txNet}>{tx.network}</span>}
                        {tx.type   && <span style={s.txType}>{tx.type}</span>}
                        {tx.timestamp && !["Unknown","Pending"].includes(tx.timestamp) &&
                          <span>{new Date(tx.timestamp).toLocaleDateString()}</span>}
                      </div>
                    </div>
                    <div style={s.txRight}>
                      {tx.value && <div style={s.txVal}>{tx.value}</div>}
                      <div style={{fontSize:"0.66rem",fontWeight:600,
                        color:tx.status==="Success"?"#4ade80":"#f87171"}}>
                        {tx.status}
                      </div>
                    </div>
                    <div style={s.txAct}>
                      {tx.explorerUrl &&
                        <a href={tx.explorerUrl} target="_blank" rel="noreferrer" style={s.txExtBtn}>↗</a>}
                      {tx.hash &&
                        <button style={s.txDetBtn} onClick={()=>{
                          setTxInput(tx.hash);
                          setExFam(tx.chain==="bitcoin"?"bitcoin":tx.chain==="solana"?"solana":"ethereum");
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

// ── Sub-components ────────────────────────────────
const ok = v => v != null && !["N/A","Pending","Unknown","0"].includes(String(v));

function HexLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{flexShrink:0}}>
      <polygon points="10,1 19,5.5 19,14.5 10,19 1,14.5 1,5.5"
        stroke="#4ade80" strokeWidth="1.4" fill="rgba(74,222,128,0.08)"/>
      <circle cx="10" cy="10" r="2.5" fill="#4ade80"/>
    </svg>
  );
}

function GradText({children}) {
  return (
    <span style={{background:"linear-gradient(135deg,#4ade80,#60a5fa)",
      WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>
      {children}
    </span>
  );
}

function CardHead({icon,title,sub}) {
  return (
    <div style={{display:"flex",gap:12,alignItems:"flex-start",marginBottom:22}}>
      <div style={{width:40,height:40,background:"rgba(74,222,128,0.07)",
        border:"1px solid rgba(74,222,128,0.14)",borderRadius:9,display:"flex",
        alignItems:"center",justifyContent:"center",fontSize:"1.05rem",color:"#4ade80",flexShrink:0}}>
        {icon}
      </div>
      <div>
        <div style={{fontSize:"0.97rem",fontWeight:700,color:"#fff",marginBottom:2}}>{title}</div>
        <div style={{fontSize:"0.72rem",color:"rgba(255,255,255,0.26)"}}>{sub}</div>
      </div>
    </div>
  );
}

function FieldLabel({children}) {
  return (
    <div style={{fontSize:"0.61rem",color:"rgba(255,255,255,0.26)",letterSpacing:"0.11em",
      textTransform:"uppercase",marginBottom:9,marginTop:18,display:"flex",
      alignItems:"center",gap:8,flexWrap:"wrap"}}>
      {children}
    </div>
  );
}
function OptTag({children}) {
  return <span style={{fontSize:"0.6rem",color:"rgba(255,255,255,0.18)",fontWeight:400,
    textTransform:"none",letterSpacing:0}}>{children}</span>;
}
function HintTag({children}) {
  return <span style={{fontFamily:"'DM Mono',monospace",fontSize:"0.6rem",
    color:"rgba(255,255,255,0.16)",background:"rgba(255,255,255,0.04)",
    padding:"2px 7px",borderRadius:4,textTransform:"none",letterSpacing:0}}>{children}</span>;
}
function Xbtn({onClick}) {
  return (
    <button style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.07)",
      color:"rgba(255,255,255,0.28)",borderRadius:7,padding:"0 12px",fontSize:"0.78rem",flexShrink:0}}
      onClick={onClick}>✕</button>
  );
}

function MainBtn({loading,color,onClick,children}) {
  const lightBg = color==="#F0B90B"||color==="#F7931A";
  return (
    <button style={{width:"100%",marginTop:16,padding:"12px 0",fontWeight:700,fontSize:"0.88rem",
      borderRadius:8,border:"none",
      background:loading?"rgba(255,255,255,0.04)":`linear-gradient(135deg,${color},${color}aa)`,
      color:loading?"rgba(255,255,255,0.2)":lightBg?"#000":"#fff",
      display:"flex",alignItems:"center",justifyContent:"center",gap:8,
      cursor:loading?"not-allowed":"pointer"}}
      onClick={onClick} disabled={loading}>
      {loading
        ? <><span style={{display:"inline-block",animation:"spin 0.7s linear infinite"}}>⟳</span>Searching...</>
        : children}
    </button>
  );
}

function ErrBlock({msg}) {
  return (
    <div style={{marginTop:12,padding:"12px 14px",background:"rgba(248,113,113,0.06)",
      border:"1px solid rgba(248,113,113,0.16)",borderRadius:8,color:"#fca5a5",fontSize:"0.8rem"}}>
      <pre>{msg}</pre>
    </div>
  );
}

function RF({k,v,mono,green}) {
  return (
    <div style={{paddingBottom:8,borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
      <div style={{fontSize:"0.58rem",color:"rgba(255,255,255,0.18)",letterSpacing:"0.13em",
        textTransform:"uppercase",marginBottom:3}}>{k}</div>
      <div style={{fontSize:"0.8rem",wordBreak:"break-all",
        color:green?"#4ade80":"rgba(255,255,255,0.7)",
        fontFamily:mono?"'DM Mono',monospace":"'DM Sans',sans-serif",
        fontWeight:green?600:400}}>{v}</div>
    </div>
  );
}

function StatusPill({status}) {
  const ok=status==="Success", pend=status==="Pending";
  const col=ok?"#4ade80":pend?"#fbbf24":"#f87171";
  return (
    <span style={{borderRadius:6,padding:"3px 9px",fontSize:"0.65rem",fontWeight:700,
      letterSpacing:"0.06em",background:`${col}15`,color:col,border:`1px solid ${col}30`}}>
      {ok?"✓ SUCCESS":pend?"⏳ PENDING":"✗ FAILED"}
    </span>
  );
}

// ── Styles ────────────────────────────────────────
const s = {
  root:{minHeight:"100vh",background:"#08080e",color:"#c5c7d8",fontFamily:"'DM Sans',sans-serif",
    position:"relative",overflowX:"hidden"},
  bgGlow:{position:"fixed",top:"-10%",left:"50%",transform:"translateX(-50%)",width:"80vw",
    height:"40vh",background:"radial-gradient(ellipse,rgba(74,222,128,0.055) 0%,transparent 70%)",
    pointerEvents:"none",zIndex:0},
  bgGrid:{position:"fixed",inset:0,
    backgroundImage:"linear-gradient(rgba(255,255,255,0.011) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.011) 1px,transparent 1px)",
    backgroundSize:"54px 54px",pointerEvents:"none",zIndex:0},

  nav:{position:"sticky",top:0,zIndex:100,background:"rgba(8,8,14,0.92)",
    backdropFilter:"blur(20px)",borderBottom:"1px solid rgba(255,255,255,0.055)"},
  navW:{maxWidth:860,margin:"0 auto",padding:"11px 24px",display:"flex",
    alignItems:"center",justifyContent:"space-between",gap:16},
  brand:{display:"flex",alignItems:"center",gap:8},
  bName:{fontSize:"0.98rem",fontWeight:700,color:"rgba(255,255,255,0.78)",letterSpacing:"-0.02em"},
  bGreen:{color:"#4ade80"},
  navPills:{display:"flex",gap:3,background:"rgba(255,255,255,0.04)",borderRadius:8,padding:"3px"},
  pillOn:{background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.11)",
    color:"#fff",padding:"5px 15px",borderRadius:6,fontSize:"0.78rem",fontWeight:600},
  pillOff:{background:"transparent",border:"none",color:"rgba(255,255,255,0.3)",
    padding:"5px 15px",borderRadius:6,fontSize:"0.78rem"},

  hero:{position:"relative",zIndex:1,maxWidth:860,margin:"0 auto",
    padding:"48px 24px 28px",textAlign:"center"},
  heroEye:{fontSize:"0.6rem",letterSpacing:"0.2em",color:"rgba(74,222,128,0.5)",
    marginBottom:14,textTransform:"uppercase"},
  h1:{fontSize:"clamp(1.7rem,4.2vw,2.8rem)",fontWeight:700,color:"#fff",
    lineHeight:1.1,letterSpacing:"-0.035em",marginBottom:12},
  hp:{fontSize:"0.86rem",color:"rgba(255,255,255,0.28)",lineHeight:1.75,
    maxWidth:500,margin:"0 auto"},
  githubNote:{marginTop:16,display:"inline-block",background:"rgba(251,191,36,0.06)",
    border:"1px solid rgba(251,191,36,0.2)",borderRadius:8,padding:"10px 16px",
    fontSize:"0.78rem",color:"rgba(253,224,71,0.75)",lineHeight:1.6,maxWidth:560},
  codeInline:{background:"rgba(255,255,255,0.08)",borderRadius:3,
    padding:"1px 5px",fontFamily:"'DM Mono',monospace",fontSize:"0.76rem"},

  wrap:{position:"relative",zIndex:1,maxWidth:860,margin:"0 auto",padding:"0 24px 60px"},
  card:{background:"rgba(255,255,255,0.022)",border:"1px solid rgba(255,255,255,0.065)",
    borderRadius:15,padding:"26px 28px"},

  infoBox:{background:"rgba(96,165,250,0.05)",border:"1px solid rgba(96,165,250,0.1)",
    borderRadius:8,padding:"11px 14px",fontSize:"0.76rem",color:"rgba(147,197,253,0.65)",
    marginBottom:4,lineHeight:1.6},

  famRow:{display:"flex",gap:6,flexWrap:"wrap",marginBottom:2},
  famBtn:{display:"flex",alignItems:"center",gap:6,background:"rgba(255,255,255,0.03)",
    border:"1px solid rgba(255,255,255,0.065)",borderRadius:8,padding:"7px 12px",
    color:"rgba(255,255,255,0.32)",transition:"all 0.15s"},
  famNote:{fontSize:"0.68rem",color:"rgba(255,255,255,0.2)",marginTop:6,paddingLeft:2},

  iRow:{display:"flex",gap:6},
  inp:{flex:1,padding:"11px 13px",background:"rgba(255,255,255,0.04)",
    border:"1px solid rgba(255,255,255,0.08)",borderRadius:8,color:"#dde0ec",
    fontSize:"0.82rem",transition:"all 0.2s"},

  statusRow:{marginTop:10,fontSize:"0.75rem",color:"rgba(74,222,128,0.55)",
    display:"flex",alignItems:"center"},

  resBox:{marginTop:16,background:"rgba(255,255,255,0.018)",
    border:"1px solid rgba(255,255,255,0.065)",borderRadius:11,padding:"17px 19px"},
  resHead:{display:"flex",alignItems:"center",gap:9,marginBottom:14,flexWrap:"wrap"},
  resNet:{fontSize:"0.66rem",color:"rgba(255,255,255,0.18)",marginLeft:"auto"},
  extLink:{fontSize:"0.72rem",color:"#4ade80",borderBottom:"1px solid rgba(74,222,128,0.2)",
    paddingBottom:1},
  resGrid:{display:"flex",flexDirection:"column",gap:8},

  histHead:{display:"flex",alignItems:"center",gap:10,marginTop:18,marginBottom:10,flexWrap:"wrap"},
  histCnt:{fontSize:"0.76rem",color:"rgba(255,255,255,0.42)",fontWeight:600},
  histChain:{fontSize:"0.67rem",color:"rgba(74,222,128,0.55)",
    background:"rgba(74,222,128,0.06)",padding:"2px 7px",borderRadius:4},
  histSrc:{fontSize:"0.64rem",color:"rgba(255,255,255,0.16)",marginLeft:"auto"},
  empty:{textAlign:"center",padding:"26px 16px",color:"rgba(255,255,255,0.18)",
    fontSize:"0.8rem",lineHeight:1.8},

  txRow:{display:"flex",alignItems:"center",gap:9,padding:"10px 13px",
    background:"rgba(255,255,255,0.018)",border:"1px solid rgba(255,255,255,0.045)",
    borderRadius:9,marginBottom:5},
  txLeft:{flex:1,minWidth:0},
  txHash:{fontSize:"0.7rem",fontFamily:"'DM Mono',monospace",
    color:"rgba(255,255,255,0.45)",marginBottom:3},
  txMeta:{fontSize:"0.64rem",color:"rgba(255,255,255,0.18)",
    display:"flex",gap:7,flexWrap:"wrap",alignItems:"center"},
  txNet:{background:"rgba(255,255,255,0.05)",borderRadius:3,padding:"1px 5px"},
  txType:{background:"rgba(255,255,255,0.04)",borderRadius:3,padding:"1px 5px"},
  txRight:{textAlign:"right",flexShrink:0},
  txVal:{fontSize:"0.77rem",fontWeight:600,color:"#4ade80",marginBottom:2},
  txAct:{display:"flex",gap:4,flexShrink:0},
  txExtBtn:{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.07)",
    color:"rgba(255,255,255,0.3)",borderRadius:6,padding:"5px 8px",fontSize:"0.72rem"},
  txDetBtn:{background:"rgba(74,222,128,0.06)",border:"1px solid rgba(74,222,128,0.14)",
    color:"rgba(74,222,128,0.65)",borderRadius:6,padding:"5px 9px",
    fontSize:"0.66rem",whiteSpace:"nowrap"},

  footer:{position:"relative",zIndex:1,borderTop:"1px solid rgba(255,255,255,0.04)",
    padding:"16px 24px",display:"flex",justifyContent:"space-between",
    maxWidth:1100,margin:"0 auto"},
  fL:{fontSize:"0.76rem",fontWeight:700,color:"rgba(255,255,255,0.16)"},
  fR:{fontSize:"0.72rem",color:"rgba(255,255,255,0.12)"},
};
