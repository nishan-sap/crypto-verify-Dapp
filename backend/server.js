const express  = require("express");
const cors     = require("cors");
const helmet   = require("helmet");
const rateLimit = require("express-rate-limit");
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });

const app = express();

// ── 1. Security headers (OWASP recommended) ───────
app.use(helmet());
app.disable("x-powered-by");

// ── 2. Strict CORS whitelist ──────────────────────
app.use(cors({
  origin: [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://nishan-sap.github.io"
  ],
  methods: ["GET"],
  allowedHeaders: ["Content-Type"]
}));

// ── 3. Body size limit (prevents payload attacks) ─
app.use(express.json({ limit: "5kb" }));

// ── 4. Global rate limit: 100 req / min / IP ─────
app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Rate limit exceeded. Max 100 requests per minute." }
}));

// ── 5. Tighter limit for blockchain calls: 30/min ─
const chainLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: "Too many blockchain queries. Max 30 per minute." }
});

const txRoutes = require("./routes/transactions");
app.use("/api/transactions", chainLimiter, txRoutes);

// ── Health check ──────────────────────────────────
app.get("/", (req, res) => {
  res.json({
    status: "CryptoVerify API v3.0 running",
    security: ["helmet", "cors-whitelist", "rate-limiting", "input-validation"],
    endpoints: [
      "GET /api/transactions/lookup/:txHash   — auto-detect chain",
      "GET /api/transactions/wallet/:address  — all chains auto-detected",
      "GET /api/transactions/total            — DApp contract stat"
    ]
  });
});

// ── 404 ───────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: "Endpoint not found" }));

// ── Global error handler ──────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal server error" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🚀 CryptoVerify API  →  http://localhost:${PORT}`);
  console.log(`🔒 Security: helmet | cors | rate-limit | input-validation\n`);
});
