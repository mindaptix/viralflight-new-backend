import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

import authRoutes from "./interfaces/http/routes/authRoutes.js";
import agencyRoutes from "./interfaces/http/routes/agencyRoutes.js";
import brandRoutes from "./interfaces/http/routes/brandRoutes.js";
import influencerRoutes from "./interfaces/http/routes/influencerRoutes.js";
import campaignApplicationRoutes from "./interfaces/http/routes/campaignApplicationRoutes.js";
import campaignRoutes from "./interfaces/http/routes/campaignRoutes.js";
import discoveryRoutes from "./interfaces/http/routes/discoveryRoutes.js";
import engagementRoutes from "./interfaces/http/routes/engagementRoutes.js";
import profileRoutes from "./interfaces/http/routes/profileRoutes.js";
import uploadRoutes, { uploadsRoot } from "./interfaces/http/routes/uploadRoutes.js";
import { errorMiddleware } from "./shared/http/errorMiddleware.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, "../public");

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

app.get(["/privacy", "/privacy/"], (_req, res) => {
  res.sendFile(path.join(publicDir, "privacy.html"));
});

app.use(express.static(publicDir));
app.use("/uploads", express.static(uploadsRoot));

app.use("/api/auth", express.json(), authRoutes);
app.use("/api/agency", express.json(), agencyRoutes);
app.use("/api/brand", express.json(), brandRoutes);
app.use("/api/influencer", express.json(), influencerRoutes);
app.use("/api/campaign-applications", express.json(), campaignApplicationRoutes);
app.use("/api/campaigns", express.json(), campaignRoutes);
app.use("/api/profiles", express.json(), profileRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/api", express.json(), discoveryRoutes);
app.use("/api", express.json(), engagementRoutes);

app.use(errorMiddleware);

export default app;
