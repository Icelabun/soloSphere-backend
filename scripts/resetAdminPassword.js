import mongoose from "mongoose";
import dotenv from "dotenv";
import Admin from "../models/Admin.js";

dotenv.config();

const resetAdminPassword = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log("✅ Connected to MongoDB");

    // Get admin credentials from env or use defaults
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@studysphere.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin2025!';
    const adminName = process.env.ADMIN_NAME || 'System Administrator';

    // Find or create admin account
    let admin = await Admin.findOne({ email: adminEmail });

    if (admin) {
      // Update existing admin password
      admin.password = adminPassword;
      admin.name = adminName;
      await admin.save();
      console.log("✅ Admin password updated successfully!");
    } else {
      // Create new admin account
      admin = new Admin({
        email: adminEmail,
        password: adminPassword,
        name: adminName
      });
      await admin.save();
      console.log("✅ Admin account created successfully!");
    }

    console.log("\n📋 Admin Credentials:");
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Password: ${adminPassword}`);
    console.log("\n✅ Done! You can now login with these credentials.");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
};

resetAdminPassword();

