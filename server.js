require("dotenv").config();

const app = require("./src/app");
const connectDB = require("./src/config/db");
const seedSuperAdmin = require("./src/seed/superAdminSeed");

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();
  await seedSuperAdmin();

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer();
