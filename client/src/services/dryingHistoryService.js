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
  selectedTray: null, // Add selected tray to monitoring state
  onMoistureUpdate: null,
  onTargetReached: null,
};

/**
 * Start monitoring moisture levels during drying
 * @param {Function} onMoistureUpdate - Callback with (moistureLevel, isTargetReached)
 * @param {number} selectedTray - The tray being monitored (1-6)
 * @returns {void}
 */
export const startMoistureMonitoringService = (onMoistureUpdate, selectedTray = null) => {
  if (monitoringState.isActive) {
    console.warn('Moisture monitoring already active');
    return;
  }

  monitoringState.isActive = true;
  monitoringState.selectedTray = selectedTray;
  monitoringState.onMoistureUpdate = onMoistureUpdate;

  console.log(`Started moisture monitoring service for ${selectedTray ? `Tray ${selectedTray}` : 'average moisture'}`);

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

      let moistureLevel;
      if (sensorData) {
        if (monitoringState.selectedTray && sensorData[`moisture${monitoringState.selectedTray}`] !== undefined) {
          // Use selected tray's moisture
          moistureLevel = parseFloat(sensorData[`moisture${monitoringState.selectedTray}`]);
          console.log(`Monitoring Tray ${monitoringState.selectedTray} moisture: ${moistureLevel.toFixed(1)}%`);
        } else if (sensorData.moistureavg !== undefined) {
          // Fallback to average moisture
          moistureLevel = parseFloat(sensorData.moistureavg);
          console.log(`Monitoring average moisture: ${moistureLevel.toFixed(1)}%`);
        } else {
          console.warn('No moisture data available');
          return;
        }

        // Notify caller of current moisture
        if (monitoringState.onMoistureUpdate) {
          monitoringState.onMoistureUpdate(moistureLevel);
        }

        // Check if target reached
        if (moistureLevel <= monitoringState.targetMoisture) {
          console.log(`Target moisture (${monitoringState.targetMoisture}%) reached! Final: ${moistureLevel.toFixed(1)}%`);
          stopMoistureMonitoringService();

          // Auto-stop drying
          try {
            const stopResponse = await dryerService.stopDrying();
            if (stopResponse.success) {
              console.log('✓ Drying automatically stopped');
              if (monitoringState.onTargetReached) {
                monitoringState.onTargetReached({
                  finalMoisture: moistureLevel,
                  tray: monitoringState.selectedTray,
                  timestamp: new Date().toISOString()
                });
              }
            }
          } catch (stopError) {
            console.error('Error auto-stopping drying:', stopError);
          }
        }
      }
    } catch (error) {
      console.error('Error checking moisture:', error);
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
