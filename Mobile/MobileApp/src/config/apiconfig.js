// API Configuration for React Native Mobile App

// IMPORTANT: Replace this with your actual backend URL
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

// For development
// export const API_BASE_URL = 'http://192.168.1.100:5001/api'; // Replace with your computer's IP

// For production
// export const API_BASE_URL = 'https://mala-backend-5hyt.onrender.com/api';

export default {
  API_BASE_URL,
  TIMEOUT: 10000, 
};