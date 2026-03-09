// API Configuration for React Native Mobile App

// Development URL: Use the same IP as socket.io connections
const DEV_API_URL = 'http://192.168.86.181:5001/api'; // <- change this ip

// Production URL
const PROD_API_URL = 'https://mala-backend-q03k.onrender.com/api';

// Select based on environment
export const API_BASE_URL = __DEV__ ? DEV_API_URL : PROD_API_URL;

export default {
  API_BASE_URL,
  TIMEOUT: 10000, 
};