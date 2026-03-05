const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const certRoutes = require("./routes/transactions");
app.use("/api/transactions", certRoutes);

app.get("/", (req, res) => {
  res.json({ status: "✅ Crypto Verify API is running!" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});