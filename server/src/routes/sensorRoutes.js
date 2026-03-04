import express from 'express';
import SensorData from '../models/sensorDataModel.js';

const router = express.Router();

// POST /api/sensor/insert
router.post('/insert', async (req, res) => {
  try {
    const sensorData = new SensorData(req.body);
    const saved = await sensorData.save();

    // Compute moistureavg from only the non-zero moisture readings
    const allMoistures = [
      parseFloat(saved.moisture1) || 0,
      parseFloat(saved.moisture2) || 0,
      parseFloat(saved.moisture3) || 0,
      parseFloat(saved.moisture4) || 0,
      parseFloat(saved.moisture5) || 0,
      parseFloat(saved.moisture6) || 0,
    ];
    const activeMoistures = allMoistures.filter(v => v > 0);
    const moistureavg = activeMoistures.length > 0
      ? parseFloat((activeMoistures.reduce((sum, v) => sum + v, 0) / activeMoistures.length).toFixed(2))
      : 0;

    // Emit real-time update via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.emit('sensor_readings_table', {
        temperature: saved.temperature,
        humidity: saved.humidity,
        moisture1: saved.moisture1,
        moisture2: saved.moisture2,
        moisture3: saved.moisture3,
        moisture4: saved.moisture4,
        moisture5: saved.moisture5,
        moisture6: saved.moisture6,
        moistureavg,
        weight1: saved.weight1,
        weight2: saved.weight2,
        status: saved.status || 'Idle',
        timestamp: saved.timestamp,
      });
      console.log('Socket emitted sensor_readings_table:', saved.moisture3, saved.moisture4, saved.moisture5, saved.moisture6, moistureavg);
    } else {
      console.warn('Socket.IO instance not found on app');
    }

    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/sensor/history
router.get('/history', async (req, res) => {
  try {
    const history = await SensorData.find()
      .sort({ timestamp: -1 })
      .limit(100); 
    
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