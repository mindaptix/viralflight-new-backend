import express from "express";
import cors from "cors";
import authRoutes from "./routes/authRoutes.js";
import influencerRoutes from "./routes/influencerRoutes.js";

const app = express();

app.use(cors());

const sendHealth = (req, res) => {
  res.json({
    success: true,
    message: "Viral Flight API is running",
    env: process.env.NODE_ENV || "development",
  });
};

app.get("/api/health", sendHealth);
app.get("/health", sendHealth);

app.use("/api/auth", express.json(), authRoutes);
app.use("/api/influencer", express.json(), influencerRoutes);

app.get("/", (req, res) => {
  res.send("Viral Flight API running");
});

export default app;
