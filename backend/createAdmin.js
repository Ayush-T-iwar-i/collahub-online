require("dotenv").config();

const dns      = require("dns");
const mongoose = require("mongoose");
const bcrypt   = require("bcryptjs");

// Windows + MongoDB Atlas DNS fix
dns.setDefaultResultOrder("ipv4first");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const User = require("./models/User");

async function createSuperAdmin() {
  console.log("Connecting to MongoDB...");

  await mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 15000,
    family: 4,
  });

  console.log("Connected!");

  const existing = await User.findOne({ role: "super-admin" });
  if (existing) {
    console.log("Super Admin already exists:", existing.email);
    process.exit(0);
  }

  const hashedPassword = await bcrypt.hash("147258369", 10);

  await User.create({
    name:            "Super Admin",
    email:           "ayusht1i2w3@gmail.com",
    password:        hashedPassword,
    role:            "super-admin",
    isEmailVerified: true,
  });

  console.log("✅ Super Admin Created!");
  console.log("   Email   : ayusht1i2w3@gmail.com");
  console.log("   Password: 147258369");
  process.exit(0);
}

createSuperAdmin().catch(err => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});