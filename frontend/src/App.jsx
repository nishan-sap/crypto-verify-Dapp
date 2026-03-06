import { useState } from "react";
import axios from "axios";

const API = "http://localhost:5000/api/transactions";

// Chain families — each has sub-networks but shown as ONE family
const FAMILIES = [
  {
    id: "ethereum", label: "Ethereum", icon: "⟠", color: "#627EEA",
    networks: [
      { id:"ethereum", label:"Mainnet" },
      { id:"sepolia",  label:"Sepolia" },
      { id:"linea",    label:"Linea" },
      { id:"base",     label:"Base" },
      { id:"op",       label:"Optimism" },
      { id:"arbitrum", label:"Arbitrum" },
    ],
    addrHint: "0x + 40 hex chars",
    hashHint:  "0x + 64 hex chars",
  },
  {
    id: "polygon", label: "Polygon", icon: "⬡", color: "#8247E5",
    networks: [{ id:"polygon", label:"Mainnet" }],
    addrHint: "0x + 40 hex chars",
    hashHint:  "0x + 64 hex chars",
  },
  {
    id: "bnb", label: "BNB Chain", icon: "◈", color: "#F0B90B",
    networks: [{ id:"bnb", label:"Mainnet" }],
    addrHint: "0x + 40 hex chars",
    hashHint:  "0x + 64 hex chars",
  },
  {
    id: "bitcoin", label: "Bitcoin", icon: "₿", color: "#F7931A",
    networks: [{ id:"bitcoin", label:"Mainnet" }],
    addrHint: "1... / 3... / bc1...",
    hashHint:  "64 hex chars (no 0x)",
  },
  {
    id: "solana", label: "Solana", icon: "◎", color: "#9945FF",
    networks: [{ id:"solana", label:"Mainnet" }],
    addrHint: "Base58 address",
    hashHint:  "Base58 signature",
  },
  {
    id: "tron", label: "Tron", icon: "⬤", color: "#FF0013",
    networks: [{ id:"tron", label:"Mainnet" }],
    addrHint: "T + 33 chars",
    hashHint:  "64 hex chars",
  },
];

export default function App() {
  const [tab, setTab] = useState("explorer");
  const [family, setFamily] = useState("ethereum");
  const [network, setNetwork] = useState("ethereum");
  const [txHash, setTxHash] = useState("");
  const [lookupResult, setLookupResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // History
  const [hFamily, setHFamily] = useState("ethereum");
  const [hNetwork, setHNetwork] = useState("ethereum");
  const [hAddr, setHAddr] = useState("");
  const [hResult, setHResult] = useState(null);
  const [hLoading, setHLoading] = useState(false);
  const [hError, setHError] = useState("");

  const fam = FAMILIES.find(f => f.id === family);
  const hFam = FAMILIES.find(f => f.id === hFamily);

  const selectFamily = (fid) => {
    setFamily(fid);
    setNetwork(FAMILIES.find(f=>f.id===fid).networks[0].id);
    setLookupResult(null); setError("");
  };

  const selectHFamily = (fid) => {
    setHFamily(fid);
    setHNetwork(FAMILIES.find(f=>f.id===fid).networks[0].id);
    setHResult(null); setHError("");
  };

  const lookup = async () => {
    const hash = txHash.trim();
    if (!hash) return setError("Enter a transaction hash");
    setLoading(true); setError(""); setLookupResult(null);
    try {
      const res = await axios.get(`${API}/lookup/${network}/${hash}`);
      setLookupResult(res.data);
    } catch (e) {
      const msg = e.response?.data?.error;
      if (e.response?.status === 404) setError("Transaction not found on " + fam.label);
      else if (e.response?.status === 429) setError("Too many requests — please wait a moment.");
      else if (e.response?.status === 400) setError(msg || "Invalid input format.");
      else setError("⚠️ Backend not running. Open terminal and run: node backend/server.js");
    } finally { setLoading(false); }
  };

  const loadHistory = async () => {
    const addr = hAddr.trim();
    if (!addr) return setHError("Enter a wallet address");
    setHLoading(true); setHError(""); setHResult(null);
    try {
      const res = await axios.get(`${API}/wallet/${hNetwork}/${addr}`);
      setHResult(res.data);
    } catch (e) {
      const msg = e.response?.data?.error;
      if (e.response?.status === 400) setHError(msg || "Invalid address format");
      else if (e.response?.status === 429) setHError("Too many requests — please wait.");
      else setHError("⚠️ Backend not running. Open terminal and run: node backend/server.js");
    } finally { setHLoading(false); }
  };

  return (
    <div style={s.root}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        input{outline:none;font-family:'DM Mono',monospace;}
        input:focus{border-color:rgba(255,255,255,0.3)!important;}
        button{font-family:'DM Sans',sans-serif;cursor:pointer;}
        a{text-decoration:none;}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
        .fadeUp{animation:fadeUp 0.25s ease forwards;}
      `}</style>

      <div style={s.bg}/><div style={s.mesh}/>

      {/* ── NAV ── */}
      <nav style={s.nav}>
        <div style={s.navW}>
          <div style={s.brand}>
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <polygon points="11,1 21,6 21,16 11,21 1,16 1,6" stroke="#4ade80" strokeWidth="1.5" fill="none"/>
              <polygon points="11,5 17,8.5 17,15.5 11,19 5,15.5 5,8.5" fill="rgba(74,222,128,0.12)" stroke="#4ade80" strokeWidth="1"/>
            </svg>
            <span style={s.brandTxt}>Crypto<span style={s.brandAccent}>Verify</span></span>
          </div>
          <div style={s.tabs}>
            {[{k:"explorer",l:"Explorer"},{k:"history",l:"Wallet History"}].map(t=>(
              <button key={t.k} style={tab===t.k?s.tOn:s.tOff}
                onClick={()=>{setTab(t.k);setError("");setHError("");}}>
                {t.l}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <div style={s.hero}>
        <div style={s.heroChip}>
          {tab==="explorer" ? "TRANSACTION EXPLORER" : "WALLET HISTORY"}
        </div>
        <h1 style={s.h1}>
          {tab==="explorer"
            ? <><span style={s.hGr}>Look up</span> any transaction<br/>across 10 blockchains</>
            : <><span style={s.hGr}>Track</span> all transactions<br/>for any wallet</>}
        </h1>
        <p style={s.hp}>
          {tab==="explorer"
            ? "Enter any transaction hash from Ethereum, Polygon, BNB Chain, Arbitrum, Base, Optimism, Linea, Bitcoin, Solana or Tron."
            : "Enter any wallet address to retrieve its complete public transaction history across supported blockchains."}
        </p>
      </div>

      {/* ── PANEL ── */}
      <div style={s.panelWrap}>

        {/* EXPLORER */}
        {tab==="explorer" && (
          <div style={s.panel} className="fadeUp" key="explorer">

            {/* Chain family pills */}
            <div style={s.sectionLabel}>Select Blockchain</div>
            <div style={s.famRow}>
              {FAMILIES.map(f=>(
                <button key={f.id} style={{...s.famBtn,...(family===f.id?{borderColor:f.color,background:`${f.color}18`,color:"#fff"}:{})}}
                  onClick={()=>selectFamily(f.id)}>
                  <span style={{color:family===f.id?f.color:"rgba(255,255,255,0.35)",fontSize:"1rem"}}>{f.icon}</span>
                  <span style={{fontSize:"0.78rem",fontWeight:family===f.id?600:400}}>{f.label}</span>
                </button>
              ))}
            </div>

            {/* Sub-network (if Ethereum family with multiple) */}
            {fam && fam.networks.length > 1 && (
              <>
                <div style={s.sectionLabel} >Network</div>
                <div style={s.netRow}>
                  {fam.networks.map(n=>(
                    <button key={n.id}
                      style={{...s.netBtn,...(network===n.id?{background:"rgba(255,255,255,0.08)",color:"#fff",borderColor:"rgba(255,255,255,0.2)"}:{})}}
                      onClick={()=>setNetwork(n.id)}>
                      {n.label}
                    </button>
                  ))}
                </div>
              </>
            )}

            <div style={s.sectionLabel}>
              Transaction Hash
              <span style={s.hintTag}>{fam?.hashHint}</span>
            </div>
            <div style={s.inputRow}>
              <input
                style={s.inp}
                placeholder={family==="bitcoin"?"a1b2c3...":"0x1a2b3c..."}
                value={txHash}
                onChange={e=>setTxHash(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&lookup()}
              />
              {txHash && <button style={s.clearBtn} onClick={()=>{setTxHash("");setLookupResult(null);}}>✕</button>}
            </div>

            <Btn loading={loading} color={fam?.color||"#4ade80"} onClick={lookup}>
              Search Transaction
            </Btn>

            {error && <ErrBox>{error}</ErrBox>}

            {lookupResult && (
              <div style={s.resultBox} className="fadeUp">
                <div style={s.rHead}>
                  <StatusPill status={lookupResult.status}/>
                  <span style={s.rNet}>{lookupResult.network}</span>
                  <a href={lookupResult.explorerUrl} target="_blank" rel="noreferrer" style={s.rLink}>
                    View on Explorer ↗
                  </a>
                </div>
                <div style={s.rGrid}>
                  <RF k="FROM"          v={lookupResult.from}  mono />
                  <RF k="TO"            v={lookupResult.to}    mono />
                  <RF k="VALUE"         v={lookupResult.value} accent />
                  <RF k="STATUS"        v={lookupResult.status} />
                  <RF k="TYPE"          v={lookupResult.type} />
                  <RF k="BLOCK"         v={String(lookupResult.blockNumber)} />
                  <RF k="CONFIRMATIONS" v={String(lookupResult.confirmations)} />
                  {lookupResult.gasUsed && lookupResult.gasUsed !== "Pending" && lookupResult.gasUsed !== "N/A" &&
                    <RF k="GAS USED" v={lookupResult.gasUsed}/>}
                  {lookupResult.gasPrice && lookupResult.gasPrice !== "N/A" &&
                    <RF k="GAS PRICE" v={lookupResult.gasPrice}/>}
                  {lookupResult.fee && <RF k="FEE" v={lookupResult.fee}/>}
                  {lookupResult.size && <RF k="SIZE" v={lookupResult.size}/>}
                  {lookupResult.timestamp && lookupResult.timestamp !== "Pending" && lookupResult.timestamp !== "Unknown" &&
                    <RF k="TIMESTAMP" v={new Date(lookupResult.timestamp).toLocaleString()}/>}
                  {lookupResult.verifiedBy && <RF k="VERIFIED BY" v={lookupResult.verifiedBy}/>}
                </div>
              </div>
            )}
          </div>
        )}

        {/* WALLET HISTORY */}
        {tab==="history" && (
          <div style={s.panel} className="fadeUp" key="history">
            <div style={s.sectionLabel}>Select Blockchain</div>
            <div style={s.famRow}>
              {FAMILIES.map(f=>(
                <button key={f.id} style={{...s.famBtn,...(hFamily===f.id?{borderColor:f.color,background:`${f.color}18`,color:"#fff"}:{})}}
                  onClick={()=>selectHFamily(f.id)}>
                  <span style={{color:hFamily===f.id?f.color:"rgba(255,255,255,0.35)",fontSize:"1rem"}}>{f.icon}</span>
                  <span style={{fontSize:"0.78rem",fontWeight:hFamily===f.id?600:400}}>{f.label}</span>
                </button>
              ))}
            </div>

            {hFam && hFam.networks.length > 1 && (
              <>
                <div style={s.sectionLabel}>Network</div>
                <div style={s.netRow}>
                  {hFam.networks.map(n=>(
                    <button key={n.id}
                      style={{...s.netBtn,...(hNetwork===n.id?{background:"rgba(255,255,255,0.08)",color:"#fff",borderColor:"rgba(255,255,255,0.2)"}:{})}}
                      onClick={()=>setHNetwork(n.id)}>
                      {n.label}
                    </button>
                  ))}
                </div>
              </>
            )}

            <div style={s.sectionLabel}>
              Wallet Address
              <span style={s.hintTag}>{hFam?.addrHint}</span>
            </div>
            <div style={s.inputRow}>
              <input
                style={s.inp}
                placeholder={hFamily==="bitcoin"?"1A1zP1...":hFamily==="solana"?"So11...":hFamily==="tron"?"TLa2f6...":"0x1234..."}
                value={hAddr}
                onChange={e=>setHAddr(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&loadHistory()}
              />
              {hAddr && <button style={s.clearBtn} onClick={()=>{setHAddr("");setHResult(null);}}>✕</button>}
            </div>

            <Btn loading={hLoading} color={hFam?.color||"#4ade80"} onClick={loadHistory}>
              Load Transaction History
            </Btn>

            {hError && <ErrBox>{hError}</ErrBox>}

            {hResult && (
              <div className="fadeUp">
                <div style={s.histHead}>
                  <span style={s.histCount}>{hResult.count} transactions found</span>
                  <span style={s.histSrc}>via {hResult.source}</span>
                </div>
                {hResult.transactions.length === 0 && (
                  <div style={s.empty}>No transactions found for this address on {hResult.network}</div>
                )}
                {hResult.transactions.map((tx, i) => (
                  <div key={i} style={s.txRow} className="fadeUp">
                    <div style={s.txLeft}>
                      <div style={s.txHash}>
                        {tx.hash ? `${tx.hash.slice(0,12)}...${tx.hash.slice(-8)}` : "N/A"}
                      </div>
                      <div style={s.txMeta}>
                        {tx.timestamp && tx.timestamp !== "Unknown" && tx.timestamp !== "Pending"
                          ? new Date(tx.timestamp).toLocaleString()
                          : tx.timestamp || ""}
                        {tx.type && <span style={s.txType}>{tx.type}</span>}
                      </div>
                    </div>
                    <div style={s.txRight}>
                      {tx.value && <div style={s.txVal}>{tx.value}</div>}
                      <div style={{...s.txStatus,...(tx.status==="Success"?{color:"#4ade80"}:{color:"#f87171"})}}>
                        {tx.status}
                      </div>
                    </div>
                    <div style={s.txActions}>
                      {tx.hash && (
                        <a href={tx.explorerUrl} target="_blank" rel="noreferrer" style={s.txLink}>↗</a>
                      )}
                      {tx.hash && (
                        <button style={s.txLookupBtn}
                          onClick={()=>{setTxHash(tx.hash||"");setFamily(hFamily);setNetwork(hNetwork);setTab("explorer");}}>
                          Details
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── FOOTER ── */}
      <footer style={s.foot}>
        <span style={s.footL}>CryptoVerify</span>
        <span style={s.footR}>Nishan Sapkota</span>
      </footer>
    </div>
  );
}

// ── Tiny components ──────────────────────────────
function Btn({loading, color, onClick, children}) {
  return (
    <button
      style={{width:"100%",marginTop:16,padding:"13px 0",background:loading?"rgba(255,255,255,0.04)":`linear-gradient(135deg,${color},${color}bb)`,
        color:loading?"rgba(255,255,255,0.3)":"#000",border:loading?`1px solid ${color}22`:"none",
        borderRadius:9,fontSize:"0.9rem",fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",gap:8,
        transition:"opacity 0.2s", opacity: loading?1:1}}
      onClick={onClick} disabled={loading}>
      {loading
        ? <><span style={{display:"inline-block",animation:"spin 0.7s linear infinite"}}>⟳</span> Searching...</>
        : children}
    </button>
  );
}

function ErrBox({children}) {
  return <div style={{marginTop:14,padding:"12px 14px",background:"rgba(248,113,113,0.07)",border:"1px solid rgba(248,113,113,0.2)",borderRadius:8,color:"#f87171",fontSize:"0.82rem",lineHeight:1.6}}>{children}</div>;
}

function RF({k,v,mono,accent}) {
  return (
    <div style={{paddingBottom:10,borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
      <div style={{fontSize:"0.6rem",color:"rgba(255,255,255,0.22)",letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:3}}>{k}</div>
      <div style={{fontSize:"0.82rem",wordBreak:"break-all",color:accent?"#4ade80":"rgba(255,255,255,0.72)",fontFamily:mono?"'DM Mono',monospace":"'DM Sans',sans-serif",fontWeight:accent?600:400}}>{v}</div>
    </div>
  );
}

function StatusPill({status}) {
  const ok = status==="Success", pend = status==="Pending";
  return <span style={{background:ok?"rgba(74,222,128,0.1)":pend?"rgba(250,204,21,0.1)":"rgba(248,113,113,0.1)",color:ok?"#4ade80":pend?"#facc15":"#f87171",border:`1px solid ${ok?"rgba(74,222,128,0.25)":pend?"rgba(250,204,21,0.25)":"rgba(248,113,113,0.25)"}`,borderRadius:6,padding:"3px 10px",fontSize:"0.68rem",fontWeight:700,letterSpacing:"0.06em"}}>{ok?"✓ SUCCESS":pend?"⏳ PENDING":"✗ FAILED"}</span>;
}

// ── Styles ────────────────────────────────────────
const s = {
  root:{minHeight:"100vh",background:"#0a0a0f",color:"#c8cad8",fontFamily:"'DM Sans',sans-serif",position:"relative",overflowX:"hidden"},
  bg:{position:"fixed",inset:0,background:"radial-gradient(ellipse 80% 50% at 50% -10%,rgba(74,222,128,0.07),transparent)",pointerEvents:"none",zIndex:0},
  mesh:{position:"fixed",inset:0,backgroundImage:"linear-gradient(rgba(255,255,255,0.015) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.015) 1px,transparent 1px)",backgroundSize:"60px 60px",pointerEvents:"none",zIndex:0},

  nav:{position:"sticky",top:0,zIndex:100,background:"rgba(10,10,15,0.9)",backdropFilter:"blur(20px)",borderBottom:"1px solid rgba(255,255,255,0.05)"},
  navW:{maxWidth:860,margin:"0 auto",padding:"13px 24px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:16},
  brand:{display:"flex",alignItems:"center",gap:9},
  brandTxt:{fontSize:"1.05rem",fontWeight:700,color:"rgba(255,255,255,0.85)",letterSpacing:"-0.02em"},
  brandAccent:{color:"#4ade80"},
  tabs:{display:"flex",gap:4,background:"rgba(255,255,255,0.04)",borderRadius:8,padding:3},
  tOn:{background:"rgba(255,255,255,0.09)",border:"1px solid rgba(255,255,255,0.12)",color:"#fff",padding:"6px 16px",borderRadius:6,fontSize:"0.8rem",fontWeight:600},
  tOff:{background:"transparent",border:"1px solid transparent",color:"rgba(255,255,255,0.35)",padding:"6px 16px",borderRadius:6,fontSize:"0.8rem",fontWeight:500},

  hero:{position:"relative",zIndex:1,maxWidth:860,margin:"0 auto",padding:"56px 24px 36px",textAlign:"center"},
  heroChip:{display:"inline-block",fontSize:"0.65rem",letterSpacing:"0.18em",color:"rgba(74,222,128,0.6)",marginBottom:16,textTransform:"uppercase"},
  h1:{fontSize:"clamp(1.8rem,4.5vw,3rem)",fontWeight:700,color:"#fff",lineHeight:1.12,letterSpacing:"-0.035em",marginBottom:14},
  hGr:{background:"linear-gradient(135deg,#4ade80,#60a5fa)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"},
  hp:{fontSize:"0.9rem",color:"rgba(255,255,255,0.3)",lineHeight:1.7,maxWidth:540,margin:"0 auto"},

  panelWrap:{position:"relative",zIndex:1,maxWidth:860,margin:"0 auto",padding:"0 24px 60px"},
  panel:{background:"rgba(255,255,255,0.025)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:16,padding:"28px 32px"},

  sectionLabel:{fontSize:"0.65rem",color:"rgba(255,255,255,0.28)",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:10,marginTop:20,display:"flex",alignItems:"center",gap:10},
  hintTag:{fontFamily:"'DM Mono',monospace",fontSize:"0.62rem",color:"rgba(255,255,255,0.15)",textTransform:"none",letterSpacing:0,background:"rgba(255,255,255,0.04)",padding:"2px 8px",borderRadius:4},

  famRow:{display:"flex",gap:7,flexWrap:"wrap"},
  famBtn:{display:"flex",alignItems:"center",gap:7,background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:9,padding:"9px 14px",color:"rgba(255,255,255,0.38)",fontSize:"0.78rem",transition:"all 0.15s"},

  netRow:{display:"flex",gap:6,flexWrap:"wrap"},
  netBtn:{background:"transparent",border:"1px solid rgba(255,255,255,0.08)",color:"rgba(255,255,255,0.3)",borderRadius:6,padding:"5px 13px",fontSize:"0.76rem",transition:"all 0.15s"},

  inputRow:{display:"flex",gap:7,alignItems:"center"},
  inp:{flex:1,width:"100%",padding:"11px 13px",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.09)",borderRadius:8,color:"#e0e2f0",fontSize:"0.83rem",letterSpacing:"0.01em",transition:"border 0.2s"},
  clearBtn:{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.08)",color:"rgba(255,255,255,0.3)",borderRadius:7,padding:"11px 13px",fontSize:"0.75rem"},

  resultBox:{marginTop:18,background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:12,padding:"18px 20px"},
  rHead:{display:"flex",alignItems:"center",gap:10,marginBottom:16,flexWrap:"wrap"},
  rNet:{fontSize:"0.7rem",color:"rgba(255,255,255,0.22)",marginLeft:"auto"},
  rLink:{fontSize:"0.75rem",color:"#4ade80",borderBottom:"1px solid rgba(74,222,128,0.25)",paddingBottom:1},
  rGrid:{display:"flex",flexDirection:"column",gap:10},

  histHead:{display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:20,marginBottom:12,flexWrap:"wrap",gap:8},
  histCount:{fontSize:"0.78rem",color:"rgba(255,255,255,0.4)",fontWeight:600},
  histSrc:{fontSize:"0.68rem",color:"rgba(255,255,255,0.18)"},
  empty:{textAlign:"center",padding:"28px 0",color:"rgba(255,255,255,0.18)",fontSize:"0.82rem"},

  txRow:{display:"flex",alignItems:"center",gap:10,padding:"12px 14px",background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.05)",borderRadius:9,marginBottom:6},
  txLeft:{flex:1,minWidth:0},
  txHash:{fontSize:"0.75rem",fontFamily:"'DM Mono',monospace",color:"rgba(255,255,255,0.5)",marginBottom:3},
  txMeta:{fontSize:"0.68rem",color:"rgba(255,255,255,0.2)",display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"},
  txType:{background:"rgba(255,255,255,0.05)",borderRadius:4,padding:"1px 7px",fontSize:"0.65rem"},
  txRight:{textAlign:"right",flexShrink:0},
  txVal:{fontSize:"0.8rem",fontWeight:600,color:"#4ade80",marginBottom:2},
  txStatus:{fontSize:"0.68rem",fontWeight:600},
  txActions:{display:"flex",gap:5,alignItems:"center",flexShrink:0},
  txLink:{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.08)",color:"rgba(255,255,255,0.4)",borderRadius:6,padding:"4px 8px",fontSize:"0.75rem"},
  txLookupBtn:{background:"rgba(74,222,128,0.08)",border:"1px solid rgba(74,222,128,0.15)",color:"rgba(74,222,128,0.8)",borderRadius:6,padding:"4px 10px",fontSize:"0.68rem",whiteSpace:"nowrap"},

  foot:{position:"relative",zIndex:1,borderTop:"1px solid rgba(255,255,255,0.04)",padding:"18px 24px",display:"flex",justifyContent:"space-between",alignItems:"center",maxWidth:1100,margin:"0 auto"},
  footL:{fontSize:"0.8rem",fontWeight:700,color:"rgba(255,255,255,0.2)"},
  footR:{fontSize:"0.72rem",color:"rgba(255,255,255,0.14)"},
};
