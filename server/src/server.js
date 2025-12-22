import express from "express";
import dotenv from "dotenv";
import cors from "cors";

import authRoutes from "./routes/authRoutes.js";
import connectDB from "./config/db.js";

dotenv.config();

const app = express();
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

app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'rgd-backend' });
});

app.get('/healthz', (req, res) => res.send('ok'));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
  // console.log(`Access locally via: http://localhost:${PORT}`);
  // console.log(`Access via IP: http://YOUR_IP:${PORT}`);
});