import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const USE_LOCAL = false;
const BASE_URL = USE_LOCAL
  ? 'http://192.168.1.5:5001'
  : 'https://mala-backend-5hyt.onrender.com';

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