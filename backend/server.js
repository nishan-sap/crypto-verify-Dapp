const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const app = express();

// ── Security Headers ──────────────────────────────
app.use(helmet());
app.disable("x-powered-by");

// ── CORS Whitelist ────────────────────────────────
app.use(cors({
  origin: [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://nishan-sap.github.io"
  ],
  methods: ["GET"],
  allowedHeaders: ["Content-Type"]
}));

// ── Body limit ────────────────────────────────────
app.use(express.json({ limit: "5kb" }));

// ── Global rate limit: 100 req/min per IP ─────────
app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Rate limit exceeded. Please wait." }
}));

// ── Stricter limit for chain queries: 30/min ──────
const chainLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: "Too many blockchain queries. Please slow down." }
});

const txRoutes = require("./routes/transactions");
app.use("/api/transactions", chainLimiter, txRoutes);

app.get("/", (req, res) => {
  res.json({
    status: "ChainVerify API v2.0",
    chains: ["ethereum", "sepolia", "polygon", "bsc", "arbitrum", "base", "bitcoin"],
    endpoints: [
      "GET /api/transactions/lookup/:chain/:txHash",
      "GET /api/transactions/verify/:txId",
      "GET /api/transactions/history/:wallet",
      "GET /api/transactions/total"
    ]
  });
});

app.use((req, res) => res.status(404).json({ error: "Not found" }));
app.use((err, req, res, next) => res.status(500).json({ error: "Server error" }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`ChainVerify API on http://localhost:${PORT}`));
