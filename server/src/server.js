import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import http from "http";
import { Server as SocketIOServer } from "socket.io";

import authRoutes from "./routes/authRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import sensorRoutes from "./routes/sensorRoutes.js";
import connectDB from "./config/db.js";
import { initializeSocket, startSensorPolling } from "./socketHandler.js";
import SensorData from "./models/sensorDataModel.js";
import { checkSensorThresholds } from "./utils/thresholdChecker.js"; // Add this utility
import createDefaultAdmin from "./scripts/createDefaultAdmin.js";
import systemRoutes from "./routes/systemRoutes.js";

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: "*",
    methods: ['GET', 'POST'],
    credentials: true
  },
    transports: ['websocket', 'polling'],
    allowEIO3: true 
});

const PORT = process.env.PORT || 5001;

connectDB();
createDefaultAdmin();

// Middleware
const allowedOrigins = [
  'https://mala-luin.onrender.com',
  'http://localhost:3000',
  'http://192.168.86.181:3000',
  'http://10.42.0.1:3000',
  'http://localhost:3001', // Added new URL
  'http://192.168.86.181:3001', // Added new URL
  'http://10.42.0.1:3001', // Added new URL
];
  
if (process.env.CLIENT_ORIGIN) {
  allowedOrigins.push(process.env.CLIENT_ORIGIN);
}

app.use(
  cors({
    origin: function(origin, callback) {
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.indexOf(origin) === -1) {
        const originHostname = new URL(origin).hostname;
        if (/^(\d{1,3}\.){3}\d{1,3}$/.test(originHostname)) {
          allowedOrigins.push(origin);
        }
      }
      
      if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
        callback(null, true);
      } else {
        callback(new Error('CORS not allowed'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'], 
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
    ],
  })
);

app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/sensor", sensorRoutes);
app.use("/api/system", systemRoutes);


// ESP32 sensor data endpoint with notification checking
app.post('/api/sensor/data', async (req, res) => {
  try {
    // 1. Save sensor reading to database
    const reading = await SensorData.create(req.body);

    // 2. Calculate averages for emission
    const avgMoisture =
      typeof reading.moistureavg === 'number'
        ? reading.moistureavg
        : (reading.moisture1 + reading.moisture2) / 2;

    // 3. Emit real-time update via Socket.io including average moisture
    io.emit('sensor_readings_table', {
      temperature: reading.temperature,
      humidity: reading.humidity,
      moisture1: reading.moisture1,
      moisture2: reading.moisture2,
      moisture3: reading.moisture3,
      moisture4: reading.moisture4,
      moisture5: reading.moisture5,
      moisture6: reading.moisture6,
      moistureavg: avgMoisture,
      weight1: reading.weight1,
      weight2: reading.weight2,
      status: reading.status || 'Idle',
      timestamp: reading.timestamp,
    });

    // 4. Check thresholds and send notifications if needed
    await checkSensorThresholds(reading, io);

    res.json({ 
      success: true,
      message: "Sensor data received",
      data: reading
    });
  } catch (error) {
    console.error("Error processing sensor data:", error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }

  const history = new History({

   temperature:req.body.temperature,
   humidity:req.body.humidity,
   moisture:req.body.moisture,
   weight:req.body.weight,
   status:req.body.status
  });

  await history.save();

  res.json("Saved");
});

app.get('/api/sensor/latest', async (req, res) => {
  try {
    const latestReading = await SensorData.findOne()
      .sort({ timestamp: -1 })
      .limit(1);
    
    res.json({ 
      success: true,
      data: latestReading,
      count: await SensorData.countDocuments()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check endpoints
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'rgd-backend',
    timestamp: new Date().toISOString()
  });
});

app.get('/healthz', (req, res) => {
  res.json({ 
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

app.get('/history', async (req, res) => {
  const data = await History
 .find()
 .sort({timestamp:-1});
 res.json(data);
});

// Make io accessible to other modules if needed
app.set('io', io);

// Initialize Socket.io connection handlers
initializeSocket(io);

// ── Real-time online user tracking ──
const onlineUsers = new Set();

io.on('connection', (socket) => {

  socket.on('user_online', (userId) => {
    socket.userId = String(userId);
    onlineUsers.add(socket.userId);
    io.emit('online_users', Array.from(onlineUsers));
    console.log(`[Online] User ${socket.userId} connected. Total: ${onlineUsers.size}`);
  });

  socket.on('user_offline', (userId) => {
    const id = String(userId);
    onlineUsers.delete(id);
    io.emit('online_users', Array.from(onlineUsers));
    console.log(`[Offline] User ${id} manually signed out. Total: ${onlineUsers.size}`);
  });

  socket.on('disconnect', () => {
    if (socket.userId) {
      onlineUsers.delete(socket.userId);
      io.emit('online_users', Array.from(onlineUsers));
      console.log(`[Offline] User ${socket.userId} disconnected. Total: ${onlineUsers.size}`);
    }
  });

});

// Start real-time sensor data polling (every 5 seconds)
startSensorPolling(io, 5000);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Socket.io is ready for real-time connections`);
  //console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

export { io }; 