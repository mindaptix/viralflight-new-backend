import express from "express";
import cors from "cors";
import authRoutes from "./routes/authRoutes.js";
import influencerRoutes from "./routes/influencerRoutes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/influencer", influencerRoutes);

app.get("/", (req, res) => {
  res.send("Viral Flight API running");
});

export default app;
