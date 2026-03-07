const mongoose = require("mongoose");
const dns      = require("dns");

// Force IPv4 (Windows/Atlas connectivity fix)
dns.setDefaultResultOrder("ipv4first");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const connectDB = async () => {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;

  if (!uri) {
    console.error("❌ MONGO_URI not found in .env file!");
    process.exit(1); // Server band kar do agar DB URI hi nahi hai
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000, // 10 sec mein connect na ho to fail
      socketTimeoutMS:          45000, // idle connection timeout
      family:                   4,     // Force IPv4
    });

    console.log("🗄️  Database Connected");
    console.log(`📡 Host: ${conn.connection.host}`);
    console.log(`📂 DB:   ${conn.connection.name}`);

  } catch (error) {
    console.error("❌ Database Connection Failed:", error.message);
    process.exit(1); // App start hi mat karo agar DB connect nahi hua
  }
};

// Connection events (optional but useful for debugging)
mongoose.connection.on("disconnected", () => {
  console.warn("⚠️  MongoDB disconnected");
});
mongoose.connection.on("reconnected", () => {
  console.log("✅ MongoDB reconnected");
});

module.exports = connectDB;