import "dotenv/config";
import next from "next";

import app from "./src/app.js";
import connectDB from "./src/config/db.js";

const PORT = process.env.PORT || 5000;
const isDev = process.env.NODE_ENV !== "production";
const nextApp = next({ dev: isDev, dir: process.cwd() });
const nextHandler = nextApp.getRequestHandler();

const startServer = async () => {
  await nextApp.prepare();
  await connectDB();

  app.all("*", (req, res) => nextHandler(req, res));

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer();
