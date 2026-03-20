import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const getBaseURL = () => {
  if (__DEV__) {
    return [
      'http://192.168.86.255:5001',  // Local development (primary)
      'http://192.168.0.109:5001',   // Backup local IP
      'http://10.0.2.2:5001',        // Android emulator
      'http://127.0.0.1:5001',       // Localhost
      'http://10.42.0.1:5001',       // Raspberry Pi
      'https://mala-backend-u0gt.onrender.com',  // Production fallback
    ];
  } else {
    return ['https://mala-backend-u0gt.onrender.com'];
  }
};

const BASE_URLS = getBaseURL();
let currentURLIndex = 0;

const api = axios.create({
  baseURL: BASE_URLS[currentURLIndex],
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

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

api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    if (error.response) {
      console.error('Response error:', error.response.status, error.response.data);
      return Promise.reject(error);
    } else if (error.request) {
      console.warn(`Request failed with URL: ${BASE_URLS[currentURLIndex]}`);

      if (currentURLIndex < BASE_URLS.length - 1) {
        currentURLIndex++;
        api.defaults.baseURL = BASE_URLS[currentURLIndex];
        console.log(`Attempting fallback URL: ${BASE_URLS[currentURLIndex]}`);

        const retryConfig = {
          ...error.config,
          baseURL: BASE_URLS[currentURLIndex],
          url: error.config.url,
        };
        return api.request(retryConfig);
      }

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

export default api;