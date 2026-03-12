const getBaseURL = () => {
  const envUrl = process.env.REACT_APP_API_URL;
  const isProd = process.env.NODE_ENV === 'production';

  if (envUrl && envUrl.trim()) {
    if (!envUrl.trim().startsWith('http') && !envUrl.trim().startsWith('https')) {
      return [`https://${envUrl.trim()}`];
    }
    return [envUrl.trim()];
  }

  const isReactNative = typeof navigator !== 'undefined' && navigator.product === 'ReactNative';
  const isWebEnvironment = typeof window !== 'undefined' && window.location;
  const isMobileApp = isReactNative || (!isWebEnvironment && typeof navigator !== 'undefined');
  
  if (isWebEnvironment && isMobileApp) {

    if (isProd) {
      return ['https://objurgatory-darrell-nonconversantly.ngrok-free.dev'];
    }
    // For development, use same Raspberry Pi URL as mobile to ensure socket communication works
    return ['http://192.168.0.109:5001', 'http://192.168.86.193:5001','https://objurgatory-darrell-nonconversantly.ngrok-free.dev', 'http://localhost:5001', 'http://localhost:5000', 'http://127.0.0.1:5001', 'http://127.0.0.1:5000'];
  } else if (isWebEnvironment && !isMobileApp) {
    // Web browser environment (localhost development)
    if (isProd) {
      return ['https://objurgatory-darrell-nonconversantly.ngrok-free.dev'];
    }
    // For localhost development, prioritize localhost URLs first
    return ['http://localhost:5001', 'http://localhost:5000', 'http://127.0.0.1:5001', 'http://127.0.0.1:5000', 'http://192.168.0.109:5001', 'http://192.168.86.193:5001','https://objurgatory-darrell-nonconversantly.ngrok-free.dev'];
  } else {

    console.log('Mobile environment detected, using Raspberry Pi URL');
    return ['http://192.168.0.109:5001', 'http://192.168.86.193:5001','https://objurgatory-darrell-nonconversantly.ngrok-free.dev'];
  }
};

const API_CONFIG = {
  baseURLs: getBaseURL(),
  currentURLIndex: 0,
  timeout: 3000, // Reduced from 5000ms to 3000ms for faster response
  headers: {
    'Content-Type': 'application/json'
  }
};

export default API_CONFIG;