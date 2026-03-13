import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

/**
 * Dryer Service - All API calls to backend for drying status
 * Backend is the single source of truth for drying state
 */

export const dryerService = {
  /**
   * Start drying process
   * @param {number} temperature - Target temperature (40-45°C)
   * @param {number} moisture - Target moisture (13-14%)
   * @param {number} tray - Selected tray number (1-6)
   * @param {number} currentMoisture - Current moisture of selected tray
   * @returns {Promise} Response with startTime and status
   */
  startDrying: async (temperature, moisture, tray = null, currentMoisture = null) => {
    try {
      const payload = {
        temperature,
        moisture,
      };
      
      // Add tray-specific data if provided
      if (tray && currentMoisture !== null) {
        payload.tray = tray;
        payload.currentMoisture = currentMoisture;
      }
      
      const response = await axios.post(`${API_URL}/api/system/dryer/start`, payload);
      return response.data;
    } catch (error) {
      console.error('Error starting drying:', error);
      throw error;
    }
  },

  /**
   * Stop drying process
   * @returns {Promise} Response with elapsed time
   */
  stopDrying: async () => {
    try {
      const response = await axios.post(`${API_URL}/api/system/dryer/stop`);
      return response.data;
    } catch (error) {
      console.error('Error stopping drying:', error);
      throw error;
    }
  },

  /**
   * Get current dryer status from backend
   * Backend calculates elapsed time, not frontend
   * @returns {Promise} Response with status, startTime, elapsedSeconds
   */
  getStatus: async () => {
    try {
      const response = await axios.get(`${API_URL}/api/system/dryer/status`);
      return response.data;
    } catch (error) {
      console.error('Error fetching dryer status:', error);
      throw error;
    }
  },
};

export default dryerService;
