import express from 'express';
import SensorData from '../models/sensorDataModel.js';

const router = express.Router();

// POST /api/sensor/insert
router.post('/insert', async (req, res) => {
  try {
    const sensorData = new SensorData(req.body);
    const saved = await sensorData.save();
     res.status(201).json(saved);
     res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/sensor/history
router.get('/history', async (req, res) => {
  try {
    const history = await SensorData.find()
      .sort({ timestamp: -1 })
      .limit(100); // Get last 100 records
    
    res.json({
      success: true,
      data: history
    });
  } catch (err) {
    res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
});

export default router;
