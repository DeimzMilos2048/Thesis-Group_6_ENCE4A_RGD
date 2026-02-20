import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

export const authDB = mongoose.createConnection(process.env.AUTH_URI);

export const sensorDB = mongoose.createConnection(process.env.SENSOR_URI);

export const notifiDB = mongoose.createConnection(process.env.NOTIFI_URI);

export const HistoryDB = mongoose.createConnection(process.env.HISTORY_URI);

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
    const mongoUri = process.env.MONGODB_URI;

    // Connect to MongoDB
    const conn = await mongoose.connect(mongoUri, options);

    console.log(`MongoDB Connected: ${conn.connection.host}`);
    
    // Initialize database with default data
    // await initializeDatabase();
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

authDB.on('connected', () => console.log('Auth DB connected'));
authDB.on('error', (err) => console.error('Auth DB error:', err));


sensorDB.on('connected', () => console.log('Sensor DB connected'));
sensorDB.on('error', (err) => console.error('Sensor DB error:', err));

notifiDB.on('connected', () => console.log('Notification DB connected'));
notifiDB.on('error', (err) => console.error('Notification DB error:', err));

HistoryDB.on('connected', () => console.log('History DB connected'));
HistoryDB.on('error', (err) => console.error('History DB error:', err));

export default connectDB;