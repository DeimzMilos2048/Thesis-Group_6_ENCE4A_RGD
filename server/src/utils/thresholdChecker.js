import Notification from "../models/notificationModel.js";
import { sendNotification } from "../controllers/notificationController.js";

// Define your thresholds
const THRESHOLDS = {
  temperatureMax: 60,
  temperatureMin: 50,
  humidityMax: 65,
  humidityMin: 0,
  moisture1Target: 14,
  moisture1Min: 10,
  moisture2Target: 14,
  moisture2Min: 10,
  weight1Max: 25,
  weight2Max: 25
};

/**
 * Check sensor readings against thresholds and create notifications
 * @param {Object} reading - Sensor data reading
 * @param {Object} io - Socket.io instance for real-time notifications
 */
export const checkSensorThresholds = async (reading, io) => {
  try {
    const alerts = [];

    // Temperature checks
    if (reading.temperature > THRESHOLDS.temperatureMax) {
      alerts.push({
        type: "CRITICAL",
        title: "High Temperature Alert",
        message: `Temperature (${reading.temperature}°C) exceeded maximum (${THRESHOLDS.temperatureMax}°C)`
      });
    } else if (reading.temperature < THRESHOLDS.temperatureMin) {
      alerts.push({
        type: "WARNING",
        title: "Low Temperature Warning",
        message: `Temperature (${reading.temperature}°C) below minimum (${THRESHOLDS.temperatureMin}°C)`
      });
    }

    // Humidity checks
    if (reading.humidity > THRESHOLDS.humidityMax) {
      alerts.push({
        type: "CRITICAL",
        title: "High Humidity Alert",
        message: `Humidity (${reading.humidity}%) exceeded maximum (${THRESHOLDS.humidityMax}%)`
      });
    }

    // Moisture checks
    if (reading.moisture1 > THRESHOLDS.moisture1Target) {
      alerts.push({
        type: "WARNING",
        title: "High Moisture Content - Sensor 1",
        message: `Moisture 1 (${reading.moisture1}%) above target (${THRESHOLDS.moisture1Target}%)`
      });
    }

    if (reading.moisture2 > THRESHOLDS.moisture2Target) {
      alerts.push({
        type: "WARNING",
        title: "High Moisture Content - Sensor 2",
        message: `Moisture 2 (${reading.moisture2}%) above target (${THRESHOLDS.moisture2Target}%)`
      });
    }

    // Weight checks
    if (reading.weight1 > THRESHOLDS.weight1Max) {
      alerts.push({
        type: "CRITICAL",
        title: "Weight Overload - Chamber 1",
        message: `Weight 1 (${reading.weight1}kg) exceeded maximum (${THRESHOLDS.weight1Max}kg)`
      });
    }

    if (reading.weight2 > THRESHOLDS.weight2Max) {
      alerts.push({
        type: "CRITICAL",
        title: "Weight Overload - Chamber 2",
        message: `Weight 2 (${reading.weight2}kg) exceeded maximum (${THRESHOLDS.weight2Max}kg)`
      });
    }

    // Create notifications for each alert
    for (const alert of alerts) {
      const notification = new Notification({
        type: alert.type,
        title: alert.title,
        message: alert.message,
        sensorData: {
          temperature: reading.temperature,
          humidity: reading.humidity,
          moisture1: reading.moisture1,
          moisture2: reading.moisture2,
          weight1: reading.weight1,
          weight2: reading.weight2
        },
        thresholds: THRESHOLDS,
        system: "Rice Grain Dryer"
      });

      await notification.save();

      // Emit real-time notification via Socket.io
      io.emit("newNotification", notification);

      // Send FCM push notification to user (if userId is available)
      if (reading.userId) {
        await sendNotification(reading.userId, {
          type: alert.type,
          title: alert.title,
          message: alert.message,
          sensorData: notification.sensorData,
          thresholds: notification.thresholds
        });
      }
    }

    // If everything is stable, optionally create a STABLE notification (once per session)
    if (alerts.length === 0 && shouldCreateStableNotification(reading)) {
      const stableNotification = new Notification({
        type: "STABLE",
        title: "System Operating Normally",
        message: "All parameters within acceptable range",
        sensorData: {
          temperature: reading.temperature,
          humidity: reading.humidity,
          moisture1: reading.moisture1,
          moisture2: reading.moisture2,
          weight1: reading.weight1,
          weight2: reading.weight2
        },
        thresholds: THRESHOLDS
      });

      await stableNotification.save();
      io.emit("newNotification", stableNotification);
    }

  } catch (error) {
    console.error("Error checking thresholds:", error);
  }
};

// Helper function to avoid spamming STABLE notifications
let lastStableNotification = null;
const STABLE_NOTIFICATION_INTERVAL = 3600000; // 1 hour in milliseconds

function shouldCreateStableNotification(reading) {
  const now = Date.now();
  if (!lastStableNotification || (now - lastStableNotification) > STABLE_NOTIFICATION_INTERVAL) {
    lastStableNotification = now;
    return true;
  }
  return false;
}