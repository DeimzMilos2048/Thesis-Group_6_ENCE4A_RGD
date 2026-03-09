import SensorData from '../models/sensorDataModel.js';
import sendNotification from './notificationController.js';

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

export const updateSensor = async (req, res) => {
    try {
        console.log('ESP32 sent:', JSON.stringify(req.body));
        const {
            deviceId,
            powerStatus,
            temperature,
            humidity,
            moisture1,
            moisture2,
            moisture3,
            moisture4,
            moisture5,
            moisture6,
            weight1,
            weight2,
            status
        } = req.body;

        // Safely parse moisture values with fallback to 0
        const m1 = parseFloat(moisture1) || 0;
        const m2 = parseFloat(moisture2) || 0;
        const m3 = parseFloat(moisture3) || 0;
        const m4 = parseFloat(moisture4) || 0;
        const m5 = parseFloat(moisture5) || 0;
        const m6 = parseFloat(moisture6) || 0;

        // Compute moistureavg from available non-zero readings
        const moistureValues = [m1, m2, m3, m4, m5, m6].filter(v => v > 0);
        const moistureavg = moistureValues.length > 0
            ? parseFloat((moistureValues.reduce((sum, v) => sum + v, 0) / moistureValues.length).toFixed(2))
            : 0;

        const sensorData = await SensorData.create({
            deviceId,
            powerStatus,
            temperature,
            humidity,
            moisture1: m1,
            moisture2: m2,
            moisture3: m3,
            moisture4: m4,
            moisture5: m5,
            moisture6: m6,
            moistureavg,
            weight1,
            weight2: weight2 || 0,
            status: status || 'Idle'
        });

        const io = req.app.get('io');
        if (io) {
            const payload = buildSensorDataPayload(sensorData);
            io.emit('sensor_readings_table', payload);
        }

        // Notifications
        if (!powerStatus) {
            await sendNotification("Dryer is turned off", "The dryer has been turned off. Please check the device.");
        }
        if (temperature > 45) {
            await sendNotification("High Temperature Alert", "The temperature has exceeded the safe limit.");
        }
        if (moisture1 >= 13 && moisture1 <= 14) {
            await sendNotification("Tray 1 Ready", "Please take out tray 1 immediately");
        }
        if (moisture2 >= 13 && moisture2 <= 14) {
            await sendNotification("Tray 2 Ready", "Please take out tray 2 immediately");
        }
        if (moisture3 >= 13 && moisture3 <= 14) {
            await sendNotification("Tray 3 Ready", "Please take out tray 3 immediately");
        }
        if (moisture4 >= 13 && moisture4 <= 14) {
            await sendNotification("Tray 4 Ready", "Please take out tray 4 immediately");
        }
        if (moisture5 >= 13 && moisture5 <= 14) {
            await sendNotification("Tray 5 Ready", "Please take out tray 5 immediately");
        }
        if (moisture6 >= 13 && moisture6 <= 14) {
            await sendNotification("Tray 6 Ready", "Please take out tray 6 immediately");
        }

        res.json(sensorData);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};