const getBaseURL = () => {
  const envUrl = process.env.REACT_APP_API_URL;
  const isProd = process.env.NODE_ENV === 'production';

  // If explicitly provided, always use the env URL
  if (envUrl && envUrl.trim()) {
    return [envUrl.trim()];
  }

  // In production without env var, use a secure default backend URL
  if (isProd) {
    return ['https://rgd-backend.onrender.com'];
  }

  // In development, try localhost/host+ports
  const hostname = window.location.hostname;
  const ports = ['5001', '5000', '3001'];

  const urls = [
    'http://localhost:5001',
    'http://127.0.0.1:5001',
    ...ports.map(port => `http://${hostname}:${port}`)
  ];

  return urls;
};

const API_CONFIG = {
  baseURLs: getBaseURL(),
  currentURLIndex: 0,
  timeout: 5000, // Reduced timeout for faster fallback
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true
};

export default API_CONFIG;