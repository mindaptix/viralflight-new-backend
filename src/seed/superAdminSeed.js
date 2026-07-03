const bcrypt = require("bcryptjs");
const Admin = require("../models/Admin");

const seedSuperAdmin = async () => {
  const email = process.env.SUPER_ADMIN_EMAIL;
  const password = process.env.SUPER_ADMIN_PASSWORD;

  if (!email || !password) {
    console.warn("SUPER_ADMIN_EMAIL or SUPER_ADMIN_PASSWORD is missing");
    return;
  }

  const existingAdmin = await Admin.findOne({
    email: email.trim().toLowerCase(),
  });

  if (existingAdmin) return;

  const passwordHash = await bcrypt.hash(password, 12);

  await Admin.create({
    name: process.env.SUPER_ADMIN_NAME || "Super Admin",
    email,
    passwordHash,
    role: "super_admin",
    isActive: true,
  });

  console.log("Super admin created");
};

module.exports = seedSuperAdmin;
