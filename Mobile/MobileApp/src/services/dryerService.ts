import axios from 'axios';

const API_URL = __DEV__ 
  ? 'http://192.168.0.109:5001'
  : 'https://objurgatory-darrell-nonconversantly.ngrok-free.dev';

/**
 * Mobile Dryer Service - All API calls to backend for drying status
 * Backend is the single source of truth for drying state
 */

export const dryerService = {
  /**
   * Start drying process
   * @param {number} temperature - Target temperature (40-45°C)
   * @param {number} moisture - Target moisture (13-14%)
   * @returns {Promise} Response with startTime and status
   */
  startDrying: async (temperature: number, moisture: number) => {
    try {
      const response = await axios.post(`${API_URL}/api/system/dryer/start`, {
        temperature,
        moisture,
      });
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
