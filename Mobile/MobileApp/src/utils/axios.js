import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Use the same AUTH_URL as web app
const getBaseURL = () => {
  // For React Native, we need to use different localhost for emulator
  const isDev = __DEV__;
  
  if (isDev) {
    // Try multiple URLs in order for development
    return ['http://10.0.2.2:5001', 'http://localhost:5001', 'http://192.168.0.109:5001', 'http://127.0.0.1:5001'];
  } else {
    // Production URL - same as web
    return ['https://mala-luin.onrender.com'];
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
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle errors and URL fallback
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('Response error:', error.response.data);
      
      // If we get a connection error and have more URLs to try, fallback to next URL
      if (error.code === 'ECONNREFUSED' || error.code === 'NETWORK_ERROR' && currentURLIndex < BASE_URLS.length - 1) {
        currentURLIndex++;
        api.defaults.baseURL = BASE_URLS[currentURLIndex];
        console.log('Trying next URL:', BASE_URLS[currentURLIndex]);
        
        // Retry the request with the new URL
        return api.request(error.config);
      }
      
      return Promise.reject(error);
    } else if (error.request) {
      // The request was made but no response was received
      console.error('Request error:', error.request);
      
      // Try next URL if available
      if (currentURLIndex < BASE_URLS.length - 1) {
        currentURLIndex++;
        api.defaults.baseURL = BASE_URLS[currentURLIndex];
        console.log('Trying next URL:', BASE_URLS[currentURLIndex]);
        
        // Retry the request with the new URL
        return api.request(error.config);
      }
      
      return Promise.reject(new Error('No response from server'));
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Error:', error.message);
      return Promise.reject(error);
    }
  }
);

export default api;