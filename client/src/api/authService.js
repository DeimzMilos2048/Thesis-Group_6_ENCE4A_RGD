import api from '../utils/axios';

const handleApiError = (error) => {
  if (error.code === 'ERR_NETWORK') {
    throw new Error('Unable to connect to server. Please check your connection and try again.');
  }
  
  const message = error.response?.data?.message || error.message || 'An error occurred';
  const err = new Error(message);
  err.status = error.response?.status;
  err.data = error.response?.data;
  throw err;
};

const authService = {
  async getDashboardData() {
    try {
      const response = await api.get('/api/auth/dashboard');
      return response.data;
    } catch (error) {
      handleApiError(error);
    }
  },

  async getAdminDashboardData() {
    try {
      const response = await api.get('/api/auth/admin/dashboard');
      return response.data;
    } catch (error) {
      handleApiError(error);
    }
  },

  async login(email, password) {
    try {
      const response = await api.post('/api/auth/login', { email, password });
      const { token, user } = response.data;
      
      if (token && user) {
        // Clean the token before storing
        const cleanToken = token.replace(/^["']|["']$/g, '').trim();
        localStorage.setItem('token', cleanToken);
        localStorage.setItem('user', JSON.stringify(user));
        return { token: cleanToken, user };
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      // Clear any invalid tokens
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      handleApiError(error);
    }
  },

  async registerUser(userData) {
    try {
      const response = await api.post('/api/auth/register', userData);
      return response.data;
    } catch (error) {
      handleApiError(error);
    }
  },

  async register(userData) {
    try {
      const response = await api.post('/api/auth/register', userData);
      const { token, user } = response.data;
      
      if (token && user) {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        return { token, user };
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      handleApiError(error);
    }
  },

  async logout() {
    try {
      await api.post('/api/auth/logout').catch(() => {
        // Ignore server errors during logout
      });
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  },

  isAuthenticated() {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    if (!token || !user) return false;
    
    try {
      // Check if token is properly formatted
      const cleanToken = token.replace(/^["']|["']$/g, '').trim();
      if (!cleanToken || cleanToken !== token) {
        // If token was malformed, clean it up
        localStorage.setItem('token', cleanToken);
      }
      return true;
    } catch {
      // If there's any error, clear the invalid tokens
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      return false;
    }
  },

  getUser() {
    const userStr = localStorage.getItem('user');
    try {
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  },

  getToken() {
    return localStorage.getItem('token');
  },

  async updateUser(userId, userData) {
    try {
      const response = await api.put(`/api/auth/users/${userId}`, userData);
      return response.data;
    } catch (error) {
      handleApiError(error);
    }
  },

  async deleteUser(userId) {
    try {
      const response = await api.delete(`/api/auth/users/${userId}`);
      return response.data;
    } catch (error) {
      handleApiError(error);
    }
  }
}

export default authService;
