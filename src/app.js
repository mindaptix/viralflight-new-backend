const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/authRoutes");
const influencerRoutes = require("./routes/influencerRoutes");
const adminRoutes = require("./routes/adminRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/influencer", influencerRoutes);
app.use("/api/admin", adminRoutes);

app.get("/", (req, res) => {
  res.send("Viral Flight API running");
});

module.exports = app;
