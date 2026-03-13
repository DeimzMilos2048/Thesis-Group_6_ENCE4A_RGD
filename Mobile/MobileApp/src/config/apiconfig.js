// API Configuration for React Native Mobile App

// Development URL: Use the same IP as socket.io connections
const DEV_API_URL = 'http://192.168.0.109:5001/api'; // Raspberry Pi

// Production URL (Render deployment with ngrok)
const PROD_API_URL = 'https://objurgatory-darrell-nonconversantly.ngrok-free.dev/api';

// ESP32 Server URL (Raspberry Pi communication)
const ESP32_API_URL = 'http://10.42.0.1:5001/api/system';

// Select based on environment
export const API_BASE_URL = __DEV__ ? DEV_API_URL : PROD_API_URL;
export const SYSTEM_API_URL = __DEV__ ? `${DEV_API_URL}/system` : `${PROD_API_URL}/system`;
export const ESP32_API = ESP32_API_URL;

export default {
  API_BASE_URL,
  SYSTEM_API_URL,
  ESP32_API,
  TIMEOUT: 10000, 
};