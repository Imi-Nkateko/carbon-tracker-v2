// backend/test-connection.js
const mongoose = require("mongoose");
require("dotenv").config();

async function testConnection() {
  console.log("Testing MongoDB connection...");
  console.log(
    "Connection string:",
    process.env.MONGODB_URI.replace(/\/\/(.*):(.*)@/, "//***:***@"),
  ); // Hide password

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected successfully!");
    console.log(`📊 Database: ${mongoose.connection.db.databaseName}`);

    // List existing databases
    const admin = mongoose.connection.db.admin();
    const dbs = await admin.listDatabases();
    console.log(
      "📁 Available databases:",
      dbs.databases.map((db) => db.name).join(", "),
    );

    await mongoose.disconnect();
    console.log("✅ Disconnected");
  } catch (error) {
    console.error("❌ Connection failed:", error.message);

    if (error.message.includes("Authentication failed")) {
      console.log("\n🔧 Fix: Check your username and password in MONGODB_URI");
    } else if (error.message.includes("getaddrinfo ENOTFOUND")) {
      console.log("\n🔧 Fix: Check your cluster address in MONGODB_URI");
    } else if (error.message.includes("IP address")) {
      console.log("\n🔧 Fix: Add your IP to Network Access in MongoDB Atlas");
    }
  }
}

testConnection();
