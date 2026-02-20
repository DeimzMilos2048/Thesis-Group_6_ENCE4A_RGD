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

  // In production without env var, use a secure default backend URL
  if (isProd) {
    return ['https://mala-luin.onrender.com'];
  }

  // In development, try localhost first
  return ['http://localhost:5001', 'http://localhost:5000', 'http://127.0.0.1:5001', 'http://127.0.0.1:5000'];
};

const API_CONFIG = {
  baseURLs: getBaseURL(),
  currentURLIndex: 0,
  timeout: 5000, // Reduced timeout for faster fallback
  headers: {
    'Content-Type': 'application/json'
  }
};

export default API_CONFIG;