import express from 'express';
import SensorData from '../models/sensorDataModel.js';

const router = express.Router();

// Helper function to build complete sensor data payload
const buildSensorDataPayload = (reading) => {
  return {
    temperature: reading.temperature || 0,
    humidity: reading.humidity || 0,
    moisture1: reading.moisture1 || 0,
    moisture2: reading.moisture2 || 0,
    moisture3: reading.moisture3 || 0,
    moisture4: reading.moisture4 || 0,
    moisture5: reading.moisture5 || 0,
    moisture6: reading.moisture6 || 0,
    moistureavg: reading.moistureavg || 0,
    weight1: reading.weight1 || 0,
    weight2: reading.weight2 || 0,
    status: reading.status || 'Idle',
    timestamp: reading.timestamp,
    // Per-tray weight data (before/after)
    weightbefore1: reading.weight1_t1 || 0,
    weightbefore2: reading.weight1_t2 || 0,
    weightbefore3: reading.weight1_t3 || 0,
    weightbefore4: reading.weight1_t4 || 0,
    weightbefore5: reading.weight1_t5 || 0,
    weightbefore6: reading.weight1_t6 || 0,
    weightafter1: reading.weight2_t1 || 0,
    weightafter2: reading.weight2_t2 || 0,
    weightafter3: reading.weight2_t3 || 0,
    weightafter4: reading.weight2_t4 || 0,
    weightafter5: reading.weight2_t5 || 0,
    weightafter6: reading.weight2_t6 || 0,
  };
};

// POST /api/sensor/insert
router.post('/insert', async (req, res) => {
  try {
    const sensorData = new SensorData(req.body);
    const saved = await sensorData.save();

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

    const io = req.app.get('io');
    if (io) {
      const payload = buildSensorDataPayload(saved);
      io.emit('sensor_readings_table', payload);
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

// PATCH /api/sensor/latest/weights — save per-tray before/after weight onto latest record
router.patch('/latest/weights', async (req, res) => {
  try {
    const { tray, beforeWeight, afterWeight } = req.body;

    if (!tray || tray < 1 || tray > 6) {
      return res.status(400).json({ success: false, message: 'Tray must be 1–6.' });
    }

    const latest = await SensorData.findOne().sort({ timestamp: -1 });
    if (!latest) {
      return res.status(404).json({ success: false, message: 'No sensor record found to update.' });
    }

    if (beforeWeight !== undefined && beforeWeight !== null) {
      latest[`weight1_t${tray}`] = beforeWeight;
    }
    if (afterWeight !== undefined && afterWeight !== null) {
      latest[`weight2_t${tray}`] = afterWeight;
    }

    await latest.save();
    console.log(`Weight updated — Tray ${tray}: before=${beforeWeight ?? 'unchanged'}, after=${afterWeight ?? 'unchanged'}`);

    // Broadcast updated data to all clients
    const io = req.app.get('io');
    if (io) {
      const payload = buildSensorDataPayload(latest);
      io.emit('sensor_readings_table', payload);
    }

    res.json({ success: true, data: latest });
  } catch (error) {
    console.error('Error updating weights:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;