import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const getBaseURL = () => {
  if (__DEV__) {
    // For development on physical device or emulator
    // Use the same URL as socket.io to maintain consistency
    return [
      'http://192.168.0.109:5001',      
      'http://192/168/86/181:5001',
      'http://10.0.2.2:5001',           
      'http://localhost:5001',          
      'http://127.0.0.1:5001',          
    ];
  } else {
    return ['https://mala-backend-q03k.onrender.com'];
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

// Add a request interceptor to add the token to requests
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
    // Reset index on success so future requests start from the working URL
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

      const errorMsg = `Unable to reach backend. Tried: ${BASE_URLS.join(', ')}. Make sure your backend server is running and check your network connection.`;
      console.error(errorMsg);
      return Promise.reject(new Error(errorMsg));

    } else {
      console.error('Error:', error.message);
      return Promise.reject(error);
    }
  }
);

export default api;