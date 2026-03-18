// server/src/utils/notificationGenerator.js

/**
 * Notification Generator - Evaluates sensor data and generates notifications
 * Backend is the single source of truth for all system notifications
 */

import Notification from '../models/notificationModel.js';

const THRESHOLDS = {
  TEMPERATURE_CRITICAL: 50,
  TEMPERATURE_WARNING: 45,
  TEMPERATURE_STABLE: 40,
  HUMIDITY_WARNING: 75,
  HUMIDITY_STABLE: 60,
  MOISTURE_TARGET: 14,
  MOISTURE_SAFE: 13,
};

/**
 * Evaluate sensor data and generate notifications
 * @param {Object} sensorData - Current sensor readings from ESP32
 * @returns {Promise<Array>} - Array of generated notifications
 */
export const evaluateSensorData = async (sensorData) => {
  const generatedNotifications = [];

  try {
    // 1. Check Temperature Thresholds
    if (sensorData.temperature !== undefined) {
      const tempNotif = evaluateTemperature(sensorData.temperature);
      if (tempNotif) {
        generatedNotifications.push(tempNotif);
      }
    }

    // 2. Check Humidity Thresholds
    if (sensorData.humidity !== undefined) {
      const humidNotif = evaluateHumidity(sensorData.humidity);
      if (humidNotif) {
        generatedNotifications.push(humidNotif);
      }
    }

    // 3. Check Moisture for Each Tray
    for (let i = 1; i <= 6; i++) {
      const moistureKey = `moisture${i}`;
      if (sensorData[moistureKey] !== undefined) {
        const trayNotif = evaluateMoisture(sensorData[moistureKey], i, sensorData);
        if (trayNotif) {
          generatedNotifications.push(trayNotif);
        }
      }
    }

    // 4. Check Power Status (if available)
    if (sensorData.powerStatus !== undefined) {
      const powerNotif = evaluatePowerStatus(sensorData.powerStatus);
      if (powerNotif) {
        generatedNotifications.push(powerNotif);
      }
    }

    // 5. Drying Lifecycle Notifications
    if (sensorData.dryingStatus) {
      const dryingNotif = evaluateDryingStatus(sensorData.dryingStatus);
      if (dryingNotif) {
        generatedNotifications.push(dryingNotif);
      }
    }

    return generatedNotifications;
  } catch (error) {
    console.error('Error evaluating sensor data:', error);
    return [];
  }
};

/**
 * Evaluate temperature and generate notification
 */
const evaluateTemperature = (temp) => {
  if (temp >= THRESHOLDS.TEMPERATURE_CRITICAL) {
    return {
      type: 'CRITICAL',
      event: 'TEMPERATURE_CRITICAL',
      title: '⚠️ Critical Temperature',
      message: `Temperature exceeded ${THRESHOLDS.TEMPERATURE_CRITICAL}°C. Immediate attention required.`,
      source: 'SENSOR',
      deviceId: 'ESP32_001',
    };
  } else if (temp >= THRESHOLDS.TEMPERATURE_WARNING) {
    return {
      type: 'WARNING',
      event: 'TEMPERATURE_WARNING',
      title: '⚠️ High Temperature',
      message: `Temperature is ${temp}°C. Above recommended range.`,
      source: 'SENSOR',
      deviceId: 'ESP32_001',
    };
  } else if (temp >= THRESHOLDS.TEMPERATURE_STABLE) {
    return {
      type: 'STABLE',
      event: 'TEMPERATURE_STABLE',
      title: '✓ Temperature Stable',
      message: `Temperature is optimal at ${temp}°C.`,
      source: 'SENSOR',
      deviceId: 'ESP32_001',
    };
  }
  return null;
};

/**
 * Evaluate humidity and generate notification
 */
const evaluateHumidity = (humidity) => {
  if (humidity >= THRESHOLDS.HUMIDITY_WARNING) {
    return {
      type: 'WARNING',
      event: 'HUMIDITY_WARNING',
      title: '⚠️ High Humidity',
      message: `Humidity is ${humidity}%. Consider increasing ventilation.`,
      source: 'SENSOR',
      deviceId: 'ESP32_001',
    };
  } else if (humidity <= THRESHOLDS.HUMIDITY_STABLE) {
    return {
      type: 'STABLE',
      event: 'HUMIDITY_STABLE',
      title: '✓ Humidity Optimal',
      message: `Humidity is stable at ${humidity}%.`,
      source: 'SENSOR',
      deviceId: 'ESP32_001',
    };
  }
  return null;
};

/**
 * Format sensor data for notification message
 */
const formatSensorData = (sensorData) => {
  const temp = sensorData.temperature ?? null;
  const humidity = sensorData.humidity ?? null;
  const moisture1 = sensorData.moisture1 ?? null;
  const moisture2 = sensorData.moisture2 ?? null;
  const weight1 = sensorData.weight1 ?? null;
  const weight2 = sensorData.weight2 ?? null;

  // Format sensor values with proper fallbacks
  const tempStr = temp !== null && temp !== 0 ? `${temp.toFixed(1)}°C` : 'N/A°C';
  const humidityStr = humidity !== null && humidity !== 0 ? `${humidity.toFixed(1)}%` : 'N/A%';
  const moisture1Str = moisture1 !== null && moisture1 !== 0 ? `${moisture1.toFixed(1)}%` : 'N/A%';
  const moisture2Str = moisture2 !== null && moisture2 !== 0 ? `${moisture2.toFixed(1)}%` : 'N/A%';
  const weight1Str = weight1 !== null && weight1 !== 0 ? `${weight1.toFixed(2)}kg` : 'N/Akg';
  const weight2Str = weight2 !== null && weight2 !== 0 ? `${weight2.toFixed(2)}kg` : 'N/Akg';

  // Build sensor data summary
  return [
    tempStr,
    `M1: ${moisture1Str}`,
    `M2: ${moisture2Str}`,
    humidityStr,
    `W1: ${weight1Str}`,
    `W2: ${weight2Str}`
  ].join('\n');
};

/**
 * Evaluate moisture per tray and generate notification
 */
const evaluateMoisture = (moisture, trayNumber, sensorData) => {
  if (moisture <= THRESHOLDS.MOISTURE_TARGET) {
    const baseMessage = `Tray ${trayNumber} has reached drying threshold (${moisture}%). Please remove the tray.`;
    const sensorSummary = formatSensorData(sensorData);
    
    return {
      type: 'CRITICAL',
      event: 'MOISTURE_TARGET_REACHED',
      title: `✓ Tray ${trayNumber} Ready`,
      message: `${baseMessage}\n\n${sensorSummary}`,
      source: 'SENSOR',
      deviceId: 'ESP32_001',
      tray_number: trayNumber,
      sensorData: sensorData
    };
  }
  return null;
};

/**
 * Evaluate power status
 */
const evaluatePowerStatus = (powerStatus) => {
  if (powerStatus === 'OFF') {
    return {
      type: 'CRITICAL',
      event: 'POWER_OFF',
      title: 'Power Failure',
      message: 'System power is OFF. Please restore power immediately.',
      source: 'SYSTEM',
      deviceId: 'ESP32_001',
    };
  } else if (powerStatus === 'ON') {
    return {
      type: 'STABLE',
      event: 'POWER_ON',
      title: 'Power Restored',
      message: 'System power is restored and operating normally.',
      source: 'SYSTEM',
      deviceId: 'ESP32_001',
    };
  }
  return null;
};

/**
 * Evaluate drying lifecycle status
 */
const evaluateDryingStatus = (status) => {
  if (status === 'started' || status === 'STARTED') {
    return {
      type: 'STABLE',
      event: 'DRYING_STARTED',
      title: 'Drying Started',
      message: 'Drying process has begun. Monitor progress regularly.',
      source: 'SYSTEM',
      deviceId: 'ESP32_001',
    };
  } else if (status === 'completed' || status === 'COMPLETED') {
    return {
      type: 'STABLE',
      event: 'DRYING_COMPLETED',
      title: 'Drying Complete',
      message: 'Drying session has finished. Check final moisture levels.',
      source: 'SYSTEM',
      deviceId: 'ESP32_001',
    };
  }
  return null;
};

/**
 * Generate notification for stop button pressed
 */
export const generateStopNotification = (sensorData) => {
  try {
    const baseMessage = 'Drying process stopped by user. Current sensor readings:';
    const sensorSummary = formatSensorData(sensorData);
    
    return {
      type: 'INFO',
      event: 'DRYING_STOPPED',
      title: 'Drying Stopped',
      message: `${baseMessage}\n\n${sensorSummary}`,
      source: 'USER',
      deviceId: 'ESP32_001',
      sensorData: sensorData
    };
  } catch (error) {
    console.error('Error generating stop notification:', error);
    return null;
  }
};

/**
 * Save notification to database and avoid duplicates
 * Only create new notification if same type hasn't been created in last 5 minutes
 */
export const saveNotificationIfNew = async (notificationData) => {
  try {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    // Check for recent notification of same type
    const recentNotif = await Notification.findOne({
      event: notificationData.event,
      deviceId: notificationData.deviceId,
      createdAt: { $gte: fiveMinutesAgo }
    });

    if (recentNotif) {
      console.log(`Skipping duplicate notification: ${notificationData.event}`);
      return null; // Don't create duplicate
    }

    // Create new notification
    const notification = await Notification.create(notificationData);
    console.log(`Notification saved: ${notificationData.title}`);
    return notification;
  } catch (error) {
    console.error('Error saving notification:', error);
    throw error;
  }
};

/**
 * Get unread notifications
 */
export const getUnreadNotifications = async (limit = 50) => {
  try {
    const notifications = await Notification.find({ isRead: false })
      .sort({ createdAt: -1 })
      .limit(limit);
    return notifications;
  } catch (error) {
    console.error('Error fetching unread notifications:', error);
    throw error;
  }
};

/**
 * Mark notification as read
 */
export const markAsRead = async (notificationId) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      notificationId,
      { isRead: true, readAt: new Date() },
      { new: true }
    );
    return notification;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
};

/**
 * Mark all notifications as read
 */
export const markAllAsRead = async () => {
  try {
    const result = await Notification.updateMany(
      { isRead: false },
      { isRead: true, readAt: new Date() }
    );
    return result;
  } catch (error) {
    console.error('Error marking all as read:', error);
    throw error;
  }
};

export default {
  evaluateSensorData,
  saveNotificationIfNew,
  getUnreadNotifications,
  markAsRead,
  markAllAsRead,
  THRESHOLDS,
};
