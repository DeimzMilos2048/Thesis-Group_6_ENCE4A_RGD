import express from 'express';
import SensorData from '../models/sensorDataModel.js';

const router = express.Router();

// POST /api/sensor/insert
router.post('/insert', async (req, res) => {
  try {
    const sensorData = new SensorData(req.body);
    const saved = await sensorData.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
