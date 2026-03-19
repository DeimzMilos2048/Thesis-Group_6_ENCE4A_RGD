import express from 'express';
import SensorData from '../models/sensorDataModel.js';
import DryingSession from '../models/dryingSessionModel.js';
import { evaluateSensorData, saveNotificationIfNew } from '../utils/notificationGenerator.js';
import { broadcastNotification } from '../utils/firebaseNotificationService.js';

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

    // Build complete payload
    const payload = buildSensorDataPayload(saved);
    
    // Broadcast via Socket.io to web dashboard
    const io = req.app.get('io');
    if (io) {
      io.emit('sensor_readings_table', payload);
    } else {
      console.warn('Socket.IO instance not found on app');
    }

    // EVALUATE THRESHOLDS AND GENERATE NOTIFICATIONS
    try {
      const sensorPayload = {
        temperature: parseFloat(saved.temperature) || 0,
        humidity: parseFloat(saved.humidity) || 0,
        moisture1: parseFloat(saved.moisture1) || 0,
        moisture2: parseFloat(saved.moisture2) || 0,
        moisture3: parseFloat(saved.moisture3) || 0,
        moisture4: parseFloat(saved.moisture4) || 0,
        moisture5: parseFloat(saved.moisture5) || 0,
        moisture6: parseFloat(saved.moisture6) || 0,
        moistureavg,
      };

      // Evaluate thresholds and generate notifications
      const generatedNotifications = await evaluateSensorData(sensorPayload);

      // Save and broadcast each notification
      for (const notifData of generatedNotifications) {
        try {
          // Add sensor context to notification
          notifData.sensorData = sensorPayload;
          notifData.thresholds = {
            temperature: { critical: 50, warning: 45, stable: 40 },
            humidity: { warning: 75, stable: 60 },
            moisture: { target: 14, safe: 13 }
          };

          // Save notification to database (avoids duplicates)
          const savedNotif = await saveNotificationIfNew(notifData);

          if (savedNotif) {
            // Broadcast notification to web dashboard via Socket.io
            if (io) {
              io.emit('notification:new', savedNotif);
            }

            // Send push notification to mobile devices
            try {
              await broadcastNotification(savedNotif);
            } catch (fcmError) {
              console.error('FCM broadcast failed (non-critical):', fcmError.message);
              // Don't block sensor insert if FCM fails
            }
          }
        } catch (notifError) {
          console.error('Error processing individual notification:', notifError);
          // Continue processing other notifications if one fails
        }
      }
    } catch (thresholdError) {
      console.error('Error evaluating thresholds:', thresholdError);
      // Don't block sensor insert if threshold evaluation fails
    }

    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/sensor/history
router.get('/history', async (req, res) => {
  try {
    // Fetch both sensor data and drying sessions
    const [sensorHistory, dryingHistory] = await Promise.all([
      SensorData.find().sort({ timestamp: -1 }).limit(100),
      DryingSession.find().sort({ endTime: -1 }).limit(100)
    ]);

    // Helper function to safely format date
    const safeFormatDate = (timestamp) => {
      if (!timestamp) return 'N/A';
      try {
        const date = new Date(timestamp);
        if (isNaN(date.getTime())) return 'N/A';
        // Force Philippines timezone to be consistent across all environments
        return date.toLocaleDateString('en-PH', { 
          month: '2-digit', 
          day: '2-digit', 
          year: 'numeric',
          timeZone: 'Asia/Manila'
        });
      } catch (error) {
        return 'N/A';
      }
    };

    // Helper function to safely format time
    const safeFormatTime = (timestamp) => {
      if (!timestamp) return 'N/A';
      try {
        const date = new Date(timestamp);
        if (isNaN(date.getTime())) return 'N/A';
        // Force Philippines timezone to be consistent across all environments
        return date.toLocaleTimeString('en-PH', { 
          hour: '2-digit', 
          minute: '2-digit', 
          hour12: true,
          timeZone: 'Asia/Manila'
        });
      } catch (error) {
        return 'N/A';
      }
    };

    // Helper function to safely get timestamp for sorting
    const safeTimestamp = (timestamp) => {
      if (!timestamp) return 0;
      try {
        const date = new Date(timestamp);
        return isNaN(date.getTime()) ? 0 : date.getTime();
      } catch (error) {
        return 0;
      }
    };

    // Process sensor data to match frontend expectations
    const processedSensorData = sensorHistory.map(item => ({
      ...item.toObject(),
      _type: 'sensor',
      id: item._id,
      timestamp: item.timestamp,
      date: safeFormatDate(item.timestamp),
      startTime: safeFormatTime(item.timestamp),
      endTime: safeFormatTime(item.timestamp),
      startTimeISO: item.timestamp || null,
      endTimeISO: item.timestamp || null,
      // Frontend expects these exact field names
      initialMoistureT1: item.moisture1 || 0,
      initialMoistureT2: item.moisture2 || 0,
      initialMoistureT3: item.moisture3 || 0,
      initialMoistureT4: item.moisture4 || 0,
      initialMoistureT5: item.moisture5 || 0,
      initialMoistureT6: item.moisture6 || 0,
      finalMoistureT1: item.moisture1 || 0,
      finalMoistureT2: item.moisture2 || 0,
      finalMoistureT3: item.moisture3 || 0,
      finalMoistureT4: item.moisture4 || 0,
      finalMoistureT5: item.moisture5 || 0,
      finalMoistureT6: item.moisture6 || 0,
      moistureavg: item.moistureavg || 0,
      temperature: item.temperature !== undefined ? `${parseFloat(item.temperature).toFixed(2)}°` : 'N/A',
      humidity: item.humidity !== undefined ? parseFloat(item.humidity).toFixed(2) : 'N/A',
      beforeWeight: calculateBeforeWeight(item),
      afterWeight: calculateAfterWeight(item),
      status: 'Idle',
      completionStatus: getCompletionStatus(item.moistureavg, 'Idle')
    }));

    // Process drying session data to match frontend expectations
    const processedDryingData = dryingHistory.map(item => {
      // Get initial sensor data from start time
      const initialSensorData = sensorHistory.find(sensor => 
        new Date(sensor.timestamp) <= new Date(item.startTime)
      );
      
      return {
        ...item.toObject(),
        _type: 'drying',
        id: item._id,
        timestamp: item.endTime, // Use endTime as timestamp for sorting
        date: safeFormatDate(item.endTime),
        startTime: safeFormatTime(item.startTime),
        endTime: safeFormatTime(item.endTime),
        startTimeISO: item.startTime || null,
        endTimeISO: item.endTime || null,
        // Frontend expects these exact field names
        initialMoistureT1: initialSensorData?.moisture1 || item.selectedMoisture || 0,
        initialMoistureT2: initialSensorData?.moisture2 || 0,
        initialMoistureT3: initialSensorData?.moisture3 || 0,
        initialMoistureT4: initialSensorData?.moisture4 || 0,
        initialMoistureT5: initialSensorData?.moisture5 || 0,
        initialMoistureT6: initialSensorData?.moisture6 || 0,
        finalMoistureT1: item.moisture1 || 0,
        finalMoistureT2: item.moisture2 || 0,
        finalMoistureT3: item.moisture3 || 0,
        finalMoistureT4: item.moisture4 || 0,
        finalMoistureT5: item.moisture5 || 0,
        finalMoistureT6: item.moisture6 || 0,
        moistureavg: item.moistureavg || 0,
        temperature: item.temperature !== undefined ? `${parseFloat(item.temperature).toFixed(2)}°` : 'N/A',
        humidity: item.humidity !== undefined ? parseFloat(item.humidity).toFixed(2) : 'N/A',
        // Individual tray weights - before and after
        beforeWeightT1: item.weight1_t1 || item.weight1 || 0,
        beforeWeightT2: item.weight1_t2 || item.weight1 || 0,
        beforeWeightT3: item.weight1_t3 || item.weight1 || 0,
        beforeWeightT4: item.weight1_t4 || item.weight1 || 0,
        beforeWeightT5: item.weight1_t5 || item.weight1 || 0,
        beforeWeightT6: item.weight1_t6 || item.weight1 || 0,
        afterWeightT1: item.weight2_t1 || item.weight2 || 0,
        afterWeightT2: item.weight2_t2 || item.weight2 || 0,
        afterWeightT3: item.weight2_t3 || item.weight2 || 0,
        afterWeightT4: item.weight2_t4 || item.weight2 || 0,
        afterWeightT5: item.weight2_t5 || item.weight2 || 0,
        afterWeightT6: item.weight2_t6 || item.weight2 || 0,
        beforeWeight: calculateAverageBeforeWeight(item),
        afterWeight: calculateAverageAfterWeight(item),
        status: item.status || 'Stopped',
        completionStatus: getCompletionStatus(item.moistureavg, item.status)
      };
    });

    // Combine and sort by timestamp
    const combinedHistory = [...processedSensorData, ...processedDryingData].sort((a, b) => {
      const timeA = safeTimestamp(a.timestamp || a.endTime);
      const timeB = safeTimestamp(b.timestamp || b.endTime);
      return timeB - timeA;
    });

    res.json({
      success: true,
      data: combinedHistory
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// Helper function to determine completion status
function getCompletionStatus(moistureavg, status) {
  if (status === 'Error') return 'Error';
  if (status === 'Completed') return 'Completed';
  if (moistureavg <= 13) return 'Target Reached';
  if (moistureavg <= 14) return 'Near Target';
  return 'In Progress';
}

// Helper function to calculate before weight for sensor data
function calculateBeforeWeight(item) {
  const weights = [
    item.weight1_t1, item.weight1_t2, item.weight1_t3,
    item.weight1_t4, item.weight1_t5, item.weight1_t6
  ].filter(w => w !== null && w !== undefined && w > 0);
  
  if (weights.length === 0) return 0;
  return (weights.reduce((sum, w) => sum + w, 0) / weights.length).toFixed(2);
}

// Helper function to calculate after weight for sensor data
function calculateAfterWeight(item) {
  const weights = [
    item.weight2_t1, item.weight2_t2, item.weight2_t3,
    item.weight2_t4, item.weight2_t5, item.weight2_t6
  ].filter(w => w !== null && w !== undefined && w > 0);
  
  if (weights.length === 0) return 0;
  return (weights.reduce((sum, w) => sum + w, 0) / weights.length).toFixed(2);
}

// Helper function to calculate average before weight for drying sessions
function calculateAverageBeforeWeight(item) {
  const weights = [
    item.weight1_t1, item.weight1_t2, item.weight1_t3,
    item.weight1_t4, item.weight1_t5, item.weight1_t6
  ].filter(w => w !== null && w !== undefined && w > 0);
  
  if (weights.length === 0) return 0;
  return (weights.reduce((sum, w) => sum + w, 0) / weights.length).toFixed(2);
}

// Helper function to calculate average after weight for drying sessions
function calculateAverageAfterWeight(item) {
  const weights = [
    item.weight2_t1, item.weight2_t2, item.weight2_t3,
    item.weight2_t4, item.weight2_t5, item.weight2_t6
  ].filter(w => w !== null && w !== undefined && w > 0);
  
  if (weights.length === 0) return 0;
  return (weights.reduce((sum, w) => sum + w, 0) / weights.length).toFixed(2);
}

// GET /api/sensor/latest/weights — get per-tray before/after weights from latest record
router.get('/latest/weights', async (req, res) => {
  try {
    const latest = await SensorData.findOne().sort({ timestamp: -1 });
    if (!latest) {
      return res.status(404).json({ success: false, message: 'No sensor record found.' });
    }

    // Build weights object in the format expected by mobile app
    const weights = {};
    const afterWeights = {};
    
    for (let i = 1; i <= 6; i++) {
      const beforeWeight = latest[`weight1_t${i}`];
      const afterWeight = latest[`weight2_t${i}`];
      
      if (beforeWeight !== null && beforeWeight !== undefined && beforeWeight > 0) {
        weights[i] = {
          before: beforeWeight,
          unit: 'kg',
          frozen: true,
          timestamp: latest.timestamp
        };
      }
      
      if (afterWeight !== null && afterWeight !== undefined && afterWeight > 0) {
        afterWeights[i] = {
          after: afterWeight,
          unit: 'kg',
          frozen: true,
          timestamp: latest.timestamp
        };
      }
    }

    res.json({ 
      success: true, 
      weights,
      afterWeights
    });
  } catch (error) {
    console.error('Error fetching weights:', error);
    res.status(500).json({ success: false, error: error.message });
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
      
      // Emit weight-specific events for mobile app
      if (beforeWeight !== undefined && beforeWeight !== null) {
        io.emit('weight:saved_before', {
          tray,
          weight: beforeWeight,
          timestamp: latest.timestamp
        });
        console.log(`Emitted weight:saved_before for tray ${tray}`);
      }
      
      if (afterWeight !== undefined && afterWeight !== null) {
        io.emit('weight:saved_after', {
          tray,
          weight: afterWeight,
          timestamp: latest.timestamp
        });
        console.log(`Emitted weight:saved_after for tray ${tray}`);
      }
    }

    res.json({ success: true, data: latest });
  } catch (error) {
    console.error('Error updating weights:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/sensors/current
router.get('/current', async (req, res) => {
  try {
    // Get latest sensor data from your database or IoT device
    const latestSensorData = await SensorData.findOne()
      .sort({ timestamp: -1 })
      .limit(1);
    
    if (!latestSensorData) {
      return res.status(404).json({
        success: false,
        message: 'No sensor data found'
      });
    }

    res.json({
      success: true,
      data: latestSensorData
    });
  } catch (error) {
    console.error('Error fetching sensor data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sensor data'
    });
  }
});

// DELETE /api/sensor/history/:id - Delete single sensor record
router.delete('/history/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide a valid record ID' 
      });
    }

    // Delete both sensor data and drying session by ID
    const [sensorResult, sessionResult] = await Promise.all([
      SensorData.deleteOne({ _id: id }),
      DryingSession.deleteOne({ _id: id })
    ]);

    const totalDeleted = (sensorResult.deletedCount || 0) + (sessionResult.deletedCount || 0);

    // Broadcast deletion event to all clients
    const io = req.app.get('io');
    if (io) {
      io.emit('history:record_deleted', { deletedId: id });
      console.log('History: Broadcasted single deletion event to all clients:', { deletedId: id });
    }

    res.json({ 
      success: true, 
      message: `Successfully deleted 1 record`,
      deletedCount: totalDeleted
    });
  } catch (error) {
    console.error('Error deleting history record:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// DELETE /api/sensor/history/delete - Delete multiple sensor records
router.delete('/history/delete', async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide an array of IDs to delete' 
      });
    }

    // Delete both sensor data and drying sessions by IDs
    const [sensorResult, sessionResult] = await Promise.all([
      SensorData.deleteMany({ _id: { $in: ids } }),
      DryingSession.deleteMany({ _id: { $in: ids } })
    ]);

    const totalDeleted = (sensorResult.deletedCount || 0) + (sessionResult.deletedCount || 0);

    // Broadcast deletion event to all clients
    const io = req.app.get('io');
    if (io) {
      io.emit('history:records_deleted', { deletedIds: ids });
      console.log('History: Broadcasted deletion event to all clients:', { deletedIds: ids });
    }

    res.json({ 
      success: true, 
      message: `Successfully deleted ${totalDeleted} record(s)`,
      deletedCount: totalDeleted
    });
  } catch (error) {
    console.error('Error deleting history records:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

export default router;