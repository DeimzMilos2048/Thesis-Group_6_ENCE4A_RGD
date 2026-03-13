
const getServerConfig = () => {
  const envUrl = process.env.REACT_APP_API_URL;
  const isProd = process.env.NODE_ENV === 'production';

  // If explicitly provided, always use the env URL
  if (envUrl && envUrl.trim()) {
    if (!envUrl.trim().startsWith('http') && !envUrl.trim().startsWith('https')) {
      return {
        serverA: `https://${envUrl.trim()}`,
        serverB: `https://${envUrl.trim()}/server-b`
      };
    }
    return {
      serverA: envUrl.trim(),
      serverB: `${envUrl.trim()}/server-b`
    };
  }

  // Environment detection for mobile vs web
  const isReactNative = typeof navigator !== 'undefined' && navigator.product === 'ReactNative';
  const isWebEnvironment = typeof window !== 'undefined' && window.location;
  const isMobileApp = isReactNative || (!isWebEnvironment && typeof navigator !== 'undefined');
  
  console.log('=== Server Config Debug ===');
  console.log('isReactNative:', isReactNative);
  console.log('isWebEnvironment:', isWebEnvironment);
  console.log('isMobileApp:', isMobileApp);
  console.log('========================');

  if (isWebEnvironment) {
    // Web environment - use localhost first, then ngrok for testing
    if (isProd) {
      return {
        serverA: 'https://objurgatory-darrell-nonconversantly.ngrok-free.dev',
        serverB: 'https://objurgatory-darrell-nonconversantly.ngrok-free.dev/server-b'
      };
    }
    return {
      serverA: 'http://localhost:5001',
      serverB: 'http://localhost:5001/server-b',
      fallbackA: 'https://objurgatory-darrell-nonconversantly.ngrok-free.dev',
      fallbackB: 'https://objurgatory-darrell-nonconversantly.ngrok-free.dev/server-b'
    };
  } else {
    // Mobile/React Native environment - connect to Raspberry Pi web server
    console.log('Mobile environment detected, using Raspberry Pi URLs');
    return {
      serverA: 'http://192.168.0.109:5001',
      serverB: 'http://192.168.0.109:5001/server-b',
      fallbackA: 'https://objurgatory-darrell-nonconversantly.ngrok-free.dev',
      fallbackB: 'https://objurgatory-darrell-nonconversantly.ngrok-free.dev/server-b'
    };
  }
};

const SERVER_CONFIG = getServerConfig();

export default SERVER_CONFIG;
