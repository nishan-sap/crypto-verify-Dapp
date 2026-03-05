import { useState } from "react";
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

export default function App() {
  const [tab, setTab] = useState("send");
  const [wallet, setWallet] = useState(null);
  const [txId, setTxId] = useState("");
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyWallet, setHistoryWallet] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [receiver, setReceiver] = useState("");
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");

  const connectWallet = async () => {
    try {
      if (!window.ethereum) return setError("MetaMask not found! Please install it.");
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      setWallet(accounts[0]);
      setError("");
    } catch (e) {
      setError("Failed to connect wallet");
    }
  };

  const sendTransaction = async () => {
    if (!wallet) return setError("Please connect MetaMask first");
    if (!receiver || !amount) return setError("Fill in receiver and amount");
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
      const tx = await contract.sendAndRecord(
        receiver,
        message || "",
        { value: ethers.parseEther(amount) }
      );
      await tx.wait();
      setSuccess("✅ Transaction sent! TX Hash: " + tx.hash);
      setReceiver("");
      setAmount("");
      setMessage("");
    } catch (e) {
      setError("Transaction failed: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const verifyTx = async () => {
    if (!txId) return setError("Please enter a transaction ID");
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await axios.get(`${API}/verify/${txId}`);
      setResult(res.data);
    } catch (e) {
      setError("Transaction not found or invalid");
    } finally {
      setLoading(false);
    }
  };

  const getHistory = async () => {
    if (!historyWallet) return setError("Please enter a wallet address");
    setLoading(true);
    setError("");
    try {
      const res = await axios.get(`${API}/history/${historyWallet}`);
      setHistory(res.data.transactions);
    } catch (e) {
      setError("Could not fetch history");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.app}>
      <div style={styles.header}>
        <h1 style={styles.title}>🔗 Crypto Transaction Verifier</h1>
        <p style={styles.subtitle}>Send and Verify transactions on Ethereum Sepolia Blockchain</p>
        <div style={styles.badge}>Powered by Solidity Smart Contract · CN6035</div>
        <div style={{ marginTop: 16 }}>
          {wallet ? (
            <div style={styles.connected}>
              ✅ Connected: {wallet.slice(0, 6)}...{wallet.slice(-4)}
            </div>
          ) : (
            <button style={styles.connectBtn} onClick={connectWallet}>
              🦊 Connect MetaMask
            </button>
          )}
        </div>
      </div>

      <div style={styles.tabs}>
        {["send", "verify", "history"].map((t) => (
          <button
            key={t}
            style={tab === t ? styles.tabActive : styles.tab}
            onClick={() => { setTab(t); setError(""); setSuccess(""); }}
          >
            {t === "send" ? "💸 Send" : t === "verify" ? "🔍 Verify" : "📜 History"}
          </button>
        ))}
      </div>

      <div style={styles.container}>
        {tab === "send" && (
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Send and Record Transaction</h2>
            <p style={styles.hint}>Send ETH and record it permanently on the blockchain</p>
            <input style={styles.input} placeholder="Receiver Wallet Address (0x...)" value={receiver} onChange={(e) => setReceiver(e.target.value)} />
            <input style={styles.input} placeholder="Amount in ETH (e.g. 0.001)" value={amount} onChange={(e) => setAmount(e.target.value)} type="number" step="0.001" />
            <input style={styles.input} placeholder="Message / Note (optional)" value={message} onChange={(e) => setMessage(e.target.value)} />
            <button style={loading ? styles.btnDisabled : styles.btn} onClick={sendTransaction} disabled={loading}>
              {loading ? "⏳ Sending..." : "💸 Send Transaction"}
            </button>
            {error && <div style={styles.error}>{error}</div>}
            {success && <div style={styles.successBox}>{success}</div>}
          </div>
        )}

        {tab === "verify" && (
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Verify a Transaction</h2>
            <p style={styles.hint}>Paste a Transaction ID to verify it on the blockchain</p>
            <input style={styles.input} placeholder="Enter Transaction ID (0x...)" value={txId} onChange={(e) => setTxId(e.target.value)} />
            <button style={loading ? styles.btnDisabled : styles.btn} onClick={verifyTx} disabled={loading}>
              {loading ? "⏳ Querying Blockchain..." : "🔍 Verify Now"}
            </button>
            {error && <div style={styles.error}>{error}</div>}
            {result && (
              <div style={styles.result}>
                <div style={styles.validBadge}>✅ VALID TRANSACTION</div>
                <div style={styles.row}><span style={styles.label}>From:</span><span style={styles.value}>{result.sender}</span></div>
                <div style={styles.row}><span style={styles.label}>To:</span><span style={styles.value}>{result.receiver}</span></div>
                <div style={styles.row}><span style={styles.label}>Amount:</span><span style={styles.valueGreen}>{result.amount}</span></div>
                <div style={styles.row}><span style={styles.label}>Date:</span><span style={styles.value}>{new Date(result.timestamp).toLocaleString()}</span></div>
                {result.message && <div style={styles.row}><span style={styles.label}>Note:</span><span style={styles.value}>{result.message}</span></div>}
                <a href={`https://sepolia.etherscan.io/address/${result.sender}`} target="_blank" rel="noreferrer" style={styles.link}>🔗 View on Etherscan</a>
              </div>
            )}
          </div>
        )}

        {tab === "history" && (
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Wallet Transaction History</h2>
            <p style={styles.hint}>Enter any wallet address to see all recorded transactions</p>
            <input style={styles.input} placeholder="Enter Wallet Address (0x...)" value={historyWallet} onChange={(e) => setHistoryWallet(e.target.value)} />
            <button style={loading ? styles.btnDisabled : styles.btn} onClick={getHistory} disabled={loading}>
              {loading ? "⏳ Fetching..." : "📜 Get History"}
            </button>
            {error && <div style={styles.error}>{error}</div>}
            {history.length > 0 && (
              <div style={styles.historyList}>
                <p style={styles.historyCount}>Found {history.length} transaction(s)</p>
                {history.map((id, i) => (
                  <div key={i} style={styles.historyItem}>
                    <span style={styles.historyNum}>#{i + 1}</span>
                    <span style={styles.historyId}>{id.slice(0, 20)}...{id.slice(-10)}</span>
                    <button style={styles.copyBtn} onClick={() => { setTxId(id); setTab("verify"); }}>Verify →</button>
                  </div>
                ))}
              </div>
            )}
            {history.length === 0 && !loading && historyWallet && <div style={styles.empty}>No transactions found</div>}
          </div>
        )}
      </div>

      <div style={styles.footer}>
        CN6035 Mobile and Distributed Systems · University of East London · Nishan Sapkota
      </div>
    </div>
  );
}

const styles = {
  app: { minHeight: "100vh", background: "#0f0f1a", color: "#eee", fontFamily: "Segoe UI, sans-serif" },
  header: { background: "linear-gradient(135deg, #1a1a3e, #0d7377)", padding: "40px 20px", textAlign: "center" },
  title: { fontSize: "2.2rem", margin: 0, color: "#fff" },
  subtitle: { color: "#aad4d7", marginTop: 10 },
  badge: { display: "inline-block", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 20, padding: "5px 18px", fontSize: 13, marginTop: 12 },
  connectBtn: { background: "#f6851b", border: "none", color: "#fff", padding: "10px 24px", borderRadius: 8, cursor: "pointer", fontSize: 15, fontWeight: "bold", marginTop: 8 },
  connected: { background: "rgba(46,204,113,0.2)", border: "1px solid #2ecc71", color: "#2ecc71", borderRadius: 8, padding: "8px 20px", display: "inline-block", fontSize: 14 },
  tabs: { display: "flex", justifyContent: "center", gap: 12, padding: "24px 20px 0" },
  tab: { background: "#1a1a2e", border: "1px solid #333", color: "#aaa", padding: "10px 24px", borderRadius: 8, cursor: "pointer", fontSize: 15 },
  tabActive: { background: "#0d7377", border: "1px solid #0d7377", color: "#fff", padding: "10px 24px", borderRadius: 8, cursor: "pointer", fontSize: 15, fontWeight: "bold" },
  container: { maxWidth: 700, margin: "24px auto", padding: "0 20px" },
  card: { background: "#1a1a2e", borderRadius: 16, padding: 32, border: "1px solid #2a2a4a" },
  cardTitle: { fontSize: "1.4rem", marginTop: 0, color: "#0d7377" },
  hint: { color: "#888", fontSize: 14, marginBottom: 18 },
  input: { width: "100%", padding: "13px 16px", borderRadius: 8, border: "1px solid #333", background: "#0f0f1a", color: "#eee", fontSize: 14, marginBottom: 14, boxSizing: "border-box" },
  btn: { width: "100%", padding: "13px", borderRadius: 8, border: "none", background: "#0d7377", color: "#fff", fontSize: 16, cursor: "pointer", fontWeight: "bold" },
  btnDisabled: { width: "100%", padding: "13px", borderRadius: 8, border: "none", background: "#333", color: "#888", fontSize: 16, cursor: "not-allowed" },
  error: { background: "#2a1a1a", border: "1px solid #c0392b", color: "#e74c3c", borderRadius: 8, padding: 14, marginTop: 16, textAlign: "center" },
  successBox: { background: "#0f2a1a", border: "1px solid #2ecc71", color: "#2ecc71", borderRadius: 8, padding: 14, marginTop: 16 },
  result: { background: "#0f1f1f", border: "1px solid #0d7377", borderRadius: 10, padding: 20, marginTop: 18 },
  validBadge: { background: "#0d7377", color: "#fff", borderRadius: 6, padding: "6px 14px", display: "inline-block", fontWeight: "bold", marginBottom: 14 },
  row: { display: "flex", gap: 10, marginBottom: 10, flexWrap: "wrap" },
  label: { color: "#888", minWidth: 80, fontSize: 14 },
  value: { color: "#eee", fontSize: 14, wordBreak: "break-all" },
  valueGreen: { color: "#2ecc71", fontWeight: "bold", fontSize: 15 },
  link: { color: "#0d7377", textDecoration: "none", display: "block", marginTop: 10 },
  historyList: { marginTop: 18 },
  historyCount: { color: "#0d7377", fontWeight: "bold" },
  historyItem: { display: "flex", alignItems: "center", gap: 12, background: "#0f0f1a", borderRadius: 8, padding: "10px 14px", marginBottom: 10 },
  historyNum: { color: "#888", fontSize: 12, minWidth: 24 },
  historyId: { color: "#eee", fontSize: 13, flex: 1, fontFamily: "monospace" },
  copyBtn: { background: "#0d7377", border: "none", color: "#fff", padding: "5px 12px", borderRadius: 6, cursor: "pointer", fontSize: 13 },
  empty: { color: "#888", textAlign: "center", padding: 20 },
  footer: { textAlign: "center", padding: "30px 20px", color: "#555", fontSize: 13, borderTop: "1px solid #1a1a2e", marginTop: 40 },
};
