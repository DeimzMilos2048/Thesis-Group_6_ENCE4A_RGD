import Sensor from '../models/sensorModel.js';
import sendNotification from './notificationController.js';

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

        const sensorData = await Sensor.create({
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
            io.emit('sensor_readings_table', {
                temperature: sensorData.temperature,
                humidity: sensorData.humidity,
                moisture1: sensorData.moisture1,
                moisture2: sensorData.moisture2,
                moisture3: sensorData.moisture3,
                moisture4: sensorData.moisture4,
                moisture5: sensorData.moisture5,
                moisture6: sensorData.moisture6,
                moistureavg: sensorData.moistureavg,
                weight1: sensorData.weight1,
                weight2: sensorData.weight2,
                status: sensorData.status,
                timestamp: sensorData.timestamp
            });
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