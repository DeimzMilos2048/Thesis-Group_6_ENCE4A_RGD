import mongoose from "mongoose";
import User from "../models/userModel.js";

const initializeDatabase = async () => {
  try {
    // Check if admin user exists
    const adminExists = await User.findOne({ role: "Admin" });
    if (!adminExists) {
      // Create default admin user
      await User.create({
        username: "admin",
        fullname: "System Administrator",
        email: "admin@ricedryer.com",
        password: process.env.DEFAULT_ADMIN_PASSWORD || "admin123",
        role: "Admin"
      });
      console.log("Default admin user created");
    }
  } catch (error) {
    console.error("Database initialization error:", error);
  }
};

const connectDB = async () => {
  try {
    // Configure Mongoose
    mongoose.set('strictQuery', true);
    
    // Connection options
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      autoIndex: true, // Build indexes
      serverSelectionTimeoutMS: 5000, // Timeout after 5s
      socketTimeoutMS: 45000, // Close sockets after 45s
    };

    // Get MongoDB URI from environment or use default
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ricedryer';

    // Connect to MongoDB
    const conn = await mongoose.connect(mongoUri, options);

    console.log(`MongoDB Connected: ${conn.connection.host}`);
    
    // Initialize database with default data
    await initializeDatabase();
  } catch (error) {
    console.error("MongoDB connection error:", error);
    
    // Handle specific MongoDB errors
    if (error.name === 'MongoServerSelectionError') {
      console.error("Could not connect to MongoDB server. Please check if MongoDB is running.");
    } else if (error.name === 'MongoParseError') {
      console.error("Invalid MongoDB connection string.");
    }
    
    // Exit process with failure
    process.exit(1);
  }
};

// Handle connection events
mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB error:', err);
});

export default connectDB;