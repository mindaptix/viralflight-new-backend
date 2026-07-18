import express from "express";
import cors from "cors";

import authRoutes from "./interfaces/http/routes/authRoutes.js";
import agencyRoutes from "./interfaces/http/routes/agencyRoutes.js";
import brandRoutes from "./interfaces/http/routes/brandRoutes.js";
import influencerRoutes from "./interfaces/http/routes/influencerRoutes.js";
import campaignApplicationRoutes from "./interfaces/http/routes/campaignApplicationRoutes.js";
import profileRoutes from "./interfaces/http/routes/profileRoutes.js";
import { errorMiddleware } from "./shared/http/errorMiddleware.js";

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
app.use("/api/agency", express.json(), agencyRoutes);
app.use("/api/brand", express.json(), brandRoutes);
app.use("/api/influencer", express.json(), influencerRoutes);
app.use(
  "/api/campaign-applications",
  express.json(),
  campaignApplicationRoutes
);
app.use("/api/profiles", express.json(), profileRoutes);

app.get("/", (req, res) => {
  res.send("Viral Flight API running");
});

app.use(errorMiddleware);

export default app;
