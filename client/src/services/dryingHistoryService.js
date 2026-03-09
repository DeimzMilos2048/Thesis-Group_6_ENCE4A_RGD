// client/src/services/dryingHistoryService.js

/**
 * Service for handling drying session history and auto-stop on moisture target
 * Monitors moisture levels and automatically stops drying when target (14%) is reached
 */

import dryerService from '../api/dryerService';

// Store global monitoring state
let monitoringState = {
  isActive: false,
  monitoringInterval: null,
  targetMoisture: 14,
  onMoistureUpdate: null,
  onTargetReached: null,
};

/**
 * Start monitoring moisture levels during drying
 * @param {Function} onMoistureUpdate - Callback with (moistureLevel, isTargetReached)
 * @returns {void}
 */
export const startMoistureMonitoringService = (onMoistureUpdate) => {
  if (monitoringState.isActive) {
    console.warn('Moisture monitoring already active');
    return;
  }

  monitoringState.isActive = true;
  monitoringState.onMoistureUpdate = onMoistureUpdate;

  console.log('Started moisture monitoring service');

  const checkMoisture = async () => {
    try {
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';
      const token = localStorage.getItem('token');

      const response = await fetch(`${API_URL}/api/sensor/latest`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        console.warn('Failed to fetch sensor data:', response.status);
        return;
      }

      const result = await response.json();
      const sensorData = Array.isArray(result.data) ? result.data[0] : result.data;

      if (sensorData && sensorData.moistureavg !== undefined) {
        const avgMoisture = parseFloat(sensorData.moistureavg);

        // Notify caller of current moisture
        if (monitoringState.onMoistureUpdate) {
          monitoringState.onMoistureUpdate(avgMoisture);
        }

        // Check if target reached
        if (avgMoisture <= monitoringState.targetMoisture) {
          console.log(`Target moisture (${monitoringState.targetMoisture}%) reached!`);
          stopMoistureMonitoringService();

          // Auto-stop drying
          try {
            const stopResponse = await dryerService.stopDrying();
            if (stopResponse.success) {
              console.log('✓ Drying automatically stopped');
              if (monitoringState.onTargetReached) {
                monitoringState.onTargetReached({
                  finalMoisture: avgMoisture,
                  timestamp: new Date().toISOString()
                });
              }
            }
          } catch (err) {
            console.error('Error auto-stopping drying:', err);
          }
        }
      }
    } catch (error) {
      console.error('Moisture monitoring error:', error);
    }
  };

  // Check moisture every 10 seconds
  monitoringState.monitoringInterval = setInterval(checkMoisture, 10000);

  // Initial check
  checkMoisture();
};

/**
 * Stop monitoring moisture levels
 * @returns {void}
 */
export const stopMoistureMonitoringService = () => {
  if (monitoringState.monitoringInterval) {
    clearInterval(monitoringState.monitoringInterval);
  }
  monitoringState.isActive = false;
  monitoringState.onMoistureUpdate = null;
  monitoringState.onTargetReached = null;
  console.log('Stopped moisture monitoring service');
};

/**
 * Get current monitoring status
 * @returns {boolean} - Whether monitoring is currently active
 */
export const isMonitoringActive = () => {
  return monitoringState.isActive;
};

/**
 * Set target moisture percentage
 * @param {number} percentage - Target moisture (default: 14%)
 */
export const setTargetMoisture = (percentage) => {
  monitoringState.targetMoisture = percentage;
};

/**
 * Get target moisture percentage
 * @returns {number} - Target moisture percentage
 */
export const getTargetMoisture = () => {
  return monitoringState.targetMoisture;
};

export default {
  startMoistureMonitoringService,
  stopMoistureMonitoringService,
  isMonitoringActive,
  setTargetMoisture,
  getTargetMoisture
};
