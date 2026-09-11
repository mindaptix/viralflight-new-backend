import "dotenv/config";
import http from "http";
import next from "next";

import app from "./src/app.js";
import connectDB from "./src/config/db.js";
<<<<<<< HEAD
import { initChatSocket } from "./src/infrastructure/socket/chatSocket.js";
import { startSocialStatsSyncJob } from "./src/jobs/socialStatsSyncJob.js";
=======
>>>>>>> 542fda10a598293e5d98e294bf7584fb0afbb8bc

const PORT = process.env.PORT || 5000;
const isDev = process.env.NODE_ENV !== "production";
const nextApp = next({ dev: isDev, dir: process.cwd() });
const nextHandler = nextApp.getRequestHandler();

const startServer = async () => {
  await nextApp.prepare();
  await connectDB();

  // Express APIs first, then Payload/Next for /admin and /api/*
  app.use((req, res) => nextHandler(req, res));

  const httpServer = http.createServer(app);
  initChatSocket(httpServer);

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
