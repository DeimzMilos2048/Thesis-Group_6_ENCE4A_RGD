import axios from "axios";
import API_CONFIG from "../config/api.config";

const createAxiosInstance = () => {
  const currentURL = API_CONFIG.baseURLs[API_CONFIG.currentURLIndex];
  console.log('Using base URL:', currentURL); // Debug which URL is being used
  
  const instance = axios.create({
    baseURL: currentURL,
    timeout: API_CONFIG.timeout,
    headers: API_CONFIG.headers,
    withCredentials: API_CONFIG.withCredentials,
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
    const originalRequest = error.config;

    // If the error is a connection error and we haven't tried all URLs
    if (error.code === 'ERR_NETWORK' && !originalRequest._retry) {
      originalRequest._retry = true;
      
      // Try next URL in the list
      API_CONFIG.currentURLIndex = (API_CONFIG.currentURLIndex + 1) % API_CONFIG.baseURLs.length;
      const newBaseURL = API_CONFIG.baseURLs[API_CONFIG.currentURLIndex];
      
      // Create new instance with next URL
      const newInstance = createAxiosInstance();
      originalRequest.baseURL = newBaseURL;

      try {
        return await newInstance(originalRequest);
      } catch (retryError) {
        // If we've tried all URLs, show error
        if (API_CONFIG.currentURLIndex === 0) {
          console.error('All connection attempts failed');
          return Promise.reject(new Error('Server is unavailable. Please try again later.'));
        }
        return Promise.reject(retryError);
      }
    }

    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      const originalRequest = error.config;
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
      // Try alternative URL in development only if it's a network error
      if (error.code === 'ERR_NETWORK' && process.env.NODE_ENV !== 'production') {
        const alternateURL = 'http://localhost:5001';
        try {
          const originalRequest = error.config;
          originalRequest.baseURL = alternateURL;
          return await axios(originalRequest);
        } catch (retryError) {
          return Promise.reject(retryError);
        }
      }
      return Promise.reject(error);
    } else {
      // Something happened in setting up the request that triggered an Error
      return Promise.reject(error);
    }
  }
);

export default api;