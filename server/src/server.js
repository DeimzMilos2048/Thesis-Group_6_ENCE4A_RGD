import express from "express";
import dotenv from "dotenv";
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

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'https://thesis-rice-grain-dryer.onrender.com'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

const PORT = process.env.PORT || 5001;

connectDB();

//Middleware
const allowedOrigins = [
  'https://thesis-rice-grain-dryer.onrender.com',
  'http://localhost:3000',
  'http://127.0.0.1:3000'
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
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
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

//Routes
app.use("/api/auth", authRoutes);
app.use("/api", profileRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/sensor", sensorRoutes);

app.post('/api/sensor/data', async (req, res) => {
  try {
    const reading = await SensorData.create(req.body);

    io.emit("sensorUpdate", reading);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json(error);
  }
});


app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'rgd-backend' });
});

app.get('/healthz', (req, res) => res.send('ok'));

// Initialize Socket.io connection handlers
initializeSocket(io);

// Start real-time sensor data polling (every 5 seconds)
startSensorPolling(io, 5000);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Socket.io is ready for real-time connections`);
});