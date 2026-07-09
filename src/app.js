import express from "express";
import cors from "cors";
import authRoutes from "./routes/authRoutes.js";
import agencyRoutes from "./routes/agencyRoutes.js";
import brandRoutes from "./routes/brandRoutes.js";
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
app.get("/api/v1/health", sendHealth);
app.get("/health", sendHealth);

app.use("/api/v1/auth", express.json(), authRoutes);
app.use("/api/v1/agency", express.json(), agencyRoutes);
app.use("/api/v1/brand", express.json(), brandRoutes);
app.use("/api/v1/influencer", express.json(), influencerRoutes);

app.use("/api/auth", express.json(), authRoutes);
app.use("/api/agency", express.json(), agencyRoutes);
app.use("/api/brand", express.json(), brandRoutes);
app.use("/api/influencer", express.json(), influencerRoutes);

app.get("/", (req, res) => {
  res.send("Viral Flight API running");
});

export default app;
