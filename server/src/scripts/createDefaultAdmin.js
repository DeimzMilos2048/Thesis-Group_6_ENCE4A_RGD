import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { authDB } from "../config/db.js";
import User from "../models/userModel.js";

const createDefaultAdmin = async () => {
  try {
    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: "adminMALA@gmail.com" });
    if (existingAdmin) {
      console.log("Default admin account already exists");
      return;
    }

    // Create default admin account
    const hashedPassword = await bcrypt.hash("admin123", 10);
    
    const defaultAdmin = new User({
      username: "admin",
      fullname: "System Administrator",
      email: "adminMALA@gmail.com",
      password: hashedPassword,
      role: "Admin"
    });

    await defaultAdmin.save();
    console.log("Default admin account created successfully");
    console.log("Email: adminMALA@gmail.com");
    console.log("Password: admin123");
    
  } catch (error) {
    console.error("Error creating default admin:", error);
  }
};

// Run the function
createDefaultAdmin();

export default createDefaultAdmin;
