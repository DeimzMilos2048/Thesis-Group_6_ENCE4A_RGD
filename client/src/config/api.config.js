const getBaseURL = () => {
  const envUrl = process.env.REACT_APP_API_URL;
  const isProd = process.env.NODE_ENV === 'production';

  // If explicitly provided, always use the env URL
  if (envUrl && envUrl.trim()) {
    if (!envUrl.trim().startsWith('http') && !envUrl.trim().startsWith('https')) {
      return [`https://${envUrl.trim()}`];
    }
    return [envUrl.trim()];
  }

  // In production without env var, use the ngrok URL for testing
  if (isProd) {
    return ['https://objurgatory-darrell-nonconversantly.ngrok-free.dev'];
  }

  // In development, try localhost first, then fallback to ngrok for testing
  return ['http://localhost:5001', 'https://objurgatory-darrell-nonconversantly.ngrok-free.dev', 'http://localhost:5000', 'http://127.0.0.1:5001', 'http://127.0.0.1:5000'];
};

const API_CONFIG = {
  baseURLs: getBaseURL(),
  currentURLIndex: 0,
  timeout: 5000, 
  headers: {
    'Content-Type': 'application/json'
  }
};

export default API_CONFIG;