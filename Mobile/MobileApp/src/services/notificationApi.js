import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Get the correct base URL based on environment
const getBaseUrl = () => {
  if (__DEV__) {
    return 'http://192.168.0.109:5001';  // Development: same IP as other services
  } else {
    return 'https://mala-backend-q03k.onrender.com';  // Production
  }
};

const BASE_URL = getBaseUrl();

const notificationApi = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 second timeout
});

// Add a request interceptor to add the token to requests
notificationApi.interceptors.request.use(
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

// Add a response interceptor to handle errors
notificationApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      console.error('Notification API - Response error:', error.response.data);
      return Promise.reject(error);
    } else if (error.request) {
      console.error('Notification API - Request error:', error.request);
      return Promise.reject(new Error('No response from server'));
    } else {
      console.error('Notification API - Error:', error.message);
      return Promise.reject(error);
    }
  }
);

export default notificationApi;