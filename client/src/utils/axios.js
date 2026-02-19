import axios from "axios";
import API_CONFIG from "../config/api.config";

const createAxiosInstance = () => {
  const currentURL = API_CONFIG.baseURLs[API_CONFIG.currentURLIndex];
  console.log('Using base URL:', currentURL); // Debug which URL is being used
  console.log('Available URLs:', API_CONFIG.baseURLs); // Show all available URLs
  console.log('Current URL Index:', API_CONFIG.currentURLIndex); // Show current index
  
  const instance = axios.create({
    baseURL: currentURL,
    timeout: API_CONFIG.timeout,
    headers: API_CONFIG.headers,
    withCredentials: false, // Disable CORS credentials for login/register
    validateStatus: function (status) {
      return status >= 200 && status < 500;
    }
  });
  return instance;
};

const api = createAxiosInstance();

// Add request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token && token.trim()) {
      // Clean the token and ensure proper formatting
      const cleanToken = token.replace(/^["']|["']$/g, '').trim();
      config.headers.Authorization = `Bearer ${cleanToken}`;
    } else {
      // Remove Authorization header if no valid token
      delete config.headers.Authorization;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      const status = error.response.status;

      // Handle 401 Unauthorized
      if (status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(error);
      }

      return Promise.reject(error);
    } else if (error.request) {
      // The request was made but no response was received
      return Promise.reject(new Error('Network error. Please check your connection.'));
    } else {
      // Something happened in setting up the request that triggered an Error
      return Promise.reject(error);
    }
  }
);

export default api;