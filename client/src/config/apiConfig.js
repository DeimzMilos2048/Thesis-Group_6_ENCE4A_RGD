// API Configuration for different environments
const API_CONFIG = {
  // Development environment (local)
  development: {
    baseUrl: "http://localhost:5001/api/system",
    esp32Url: "http://10.42.0.1:5001/api/system"
  },
  
  // Production environment (Render deployment)
  production: {
    baseUrl: "https://objurgatory-darrell-nonconversantly.ngrok-free.dev/api/system",
    esp32Url: "http://10.42.0.1:5001/api/system"
  },
  
  // Mobile app environment
  mobile: {
    baseUrl: "https://objurgatory-darrell-nonconversantly.ngrok-free.dev/api/system",
    esp32Url: "http://10.42.0.1:5001/api/system"
  }
};

// Get current environment
const getEnvironment = () => {
  // Check if we're in development
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return 'development';
  }
  
  // Check if we're in mobile app (React Native)
  if (typeof window === 'undefined') {
    return 'mobile';
  }
  
  // Default to production
  return 'production';
};

// Export current environment config
const currentEnv = getEnvironment();
export const API = API_CONFIG[currentEnv].baseUrl;
export const ESP32_API = API_CONFIG[currentEnv].esp32Url;

export default API_CONFIG;
