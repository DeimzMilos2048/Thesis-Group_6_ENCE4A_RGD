import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const getAPIBaseUrl = () => {
  // Try local Raspberry Pi first, then fallback to Render backend
  const urls = [
    'http://10.42.0.1:5002',
    'https://mala-backend-u0gt.onrender.com'
  ];
  return urls;
};

const BASE_URLS = getAPIBaseUrl();
let currentURLIndex = 0;

const api = axios.create({
  baseURL: BASE_URLS[currentURLIndex],
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Add a request interceptor to add token to requests
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add a response interceptor to handle errors and URL fallback
api.interceptors.response.use(
  (response) => {
    // Reset index on success so future requests start from working URL
    // but keep currentURLIndex at the working one (don't reset to 0)
    return response;
  },
  async (error) => {
    if (error.response) {
      // Server responded with a non-2xx status — don't fallback, this is a real error
      console.error('Response error:', error.response.status, error.response.data);
      return Promise.reject(error);

    } else if (error.request) {
      // No response received — try next URL
      console.warn(`Request failed with URL: ${BASE_URLS[currentURLIndex]}`);

      if (currentURLIndex < BASE_URLS.length - 1) {
        currentURLIndex++;
        api.defaults.baseURL = BASE_URLS[currentURLIndex];
        console.log(`Attempting fallback URL: ${BASE_URLS[currentURLIndex]}`);

        // Retry the request with the new base URL
        const retryConfig = {
          ...error.config,
          baseURL: BASE_URLS[currentURLIndex],
          url: error.config.url, // keep relative path
        };
        return api.request(retryConfig);
      }

      // All URLs exhausted
      currentURLIndex = 0;
      api.defaults.baseURL = BASE_URLS[0];

      const errorMsg = `Unable to reach backend. Make sure your backend server is running and check your network connection.`;
      console.error(errorMsg);
      return Promise.reject(new Error(errorMsg));

    } else {
      console.error('Error:', error.message);
      return Promise.reject(error);
    }
  }
);

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
      const response = await api.post('/api/system/dryer/start', {
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
      const response = await api.post('/api/system/dryer/stop');
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
      const response = await api.get('/api/system/dryer/status');
      return response.data;
    } catch (error) {
      console.error('Error fetching dryer status:', error);
      throw error;
    }
  },
};

export default dryerService;
