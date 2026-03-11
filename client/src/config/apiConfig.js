// API Configuration for different environments
const API_CONFIG = {
  // Localhost development (your computer)
  localhost: {
    baseUrl: "http://localhost:5001/api/system",
    esp32Url: "http://localhost:5001/api/system",
    socketUrl: "http://localhost:5001"
  },
  
  // Development environment (Raspberry Pi on local network)
  development: {
    baseUrl: "http://192.168.86.181:5001/api/system",
    esp32Url: "http://192.168.86.181:5001/api/system",
    socketUrl: "http://192.168.86.181:5001"
  },
  
  // Raspberry Pi production (direct Pi access)
  raspberryPi: {
    baseUrl: "http://10.42.0.1:5001/api/system",
    esp32Url: "http://10.42.0.1:5001/api/system",
    socketUrl: "http://10.42.0.1:5001"
  },
  
  // Production environment (Render/ngrok deployment)
  production: {
    baseUrl: "https://objurgatory-darrell-nonconversantly.ngrok-free.dev/api/system",
    esp32Url: "https://objurgatory-darrell-nonconversantly.ngrok-free.dev/api/system",
    socketUrl: "https://objurgatory-darrell-nonconversantly.ngrok-free.dev"
  },
  
  // Mobile app environment
  mobile: {
    baseUrl: "https://objurgatory-darrell-nonconversantly.ngrok-free.dev/api/system",
    esp32Url: "https://objurgatory-darrell-nonconversantly.ngrok-free.dev/api/system",
    socketUrl: "https://objurgatory-darrell-nonconversantly.ngrok-free.dev"
  }
};

// Get current environment
const getEnvironment = () => {
  // Check for environment variable override
  const envOverride = process.env.REACT_APP_ENVIRONMENT;
  if (envOverride) {
    return envOverride;
  }
  
  // Check for localStorage override (for manual switching)
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    const preferredEnv = localStorage.getItem('preferred_environment');
    if (preferredEnv && API_CONFIG[preferredEnv]) {
      return preferredEnv;
    }
  }
  
  // Check if we're in localhost development
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return 'localhost';
  }
  
  // Check if we're accessing via Raspberry Pi IP
  if (typeof window !== 'undefined' && window.location.hostname === '10.42.0.1') {
    return 'raspberryPi';
  }
  
  // Check if we're in development on local network
  if (typeof window !== 'undefined' && 
      (window.location.hostname === '192.168.86.181' || 
       window.location.hostname.startsWith('192.168.'))) {
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
export const SOCKET_URL = API_CONFIG[currentEnv].socketUrl;

// Export current environment name for debugging
export const CURRENT_ENVIRONMENT = currentEnv;

export default API_CONFIG;
