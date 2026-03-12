import api from '../utils/axios';
import { toast } from 'react-toastify';

/* ---------------- ERROR HANDLER ---------------- */
const handleApiError = (error) => {
  if (error.code === 'ERR_NETWORK') {
    throw new Error('Unable to connect to server.');
  }

  const message = error.response?.data?.message || error.message || 'An error occurred';
  const err = new Error(message);
  err.status = error.response?.status;
  err.data = error.response?.data;
  throw err;
};

/* ---------------- AUTH SERVICE ---------------- */
const authService = {
  /* ---------- DASHBOARD ---------- */
  async getDashboardData() {
    try {
      const res = await api.get('/api/auth/dashboard');
      return res.data;
    } catch (error) {
      handleApiError(error);
    }
  },

  async getAdminDashboardData() {
    try {
      const res = await api.get('/api/auth/admin/dashboard');
      return res.data;
    } catch (error) {
      handleApiError(error);
    }
  },

  /* ---------- AUTH ---------- */
  async login(email, password) {
    try {
      const res = await api.post('/api/auth/login', { email, password });
      const { token, user } = res.data;

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      toast.success('Login successful!');
      return { token, user };
    } catch (error) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      handleApiError(error);
    }
  },

  async register(userData) {
    try {
      const res = await api.post('/api/auth/register', userData);
      toast.success('Registration successful!');
      return res.data;
    } catch (error) {
      handleApiError(error);
    }
  },

  async logout() {
    try {
      // Clear local data immediately for faster UX
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Show success toast immediately
      toast.success('Logged out successfully!');
      
      // Try to notify server, but don't wait for it
      api.post('/api/auth/logout').catch(() => {}).catch(() => {});
      
      // Return immediately after clearing local data
      return;
    } catch (error) {
      // Ensure local data is cleared even on error
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      toast.success('Logged out successfully!'); // Still show success since local logout worked
    }
  },

  /* ---------- USER PROFILE (LOGGED-IN USER) ---------- */
  async getProfile() {
    try {
      const res = await api.get('/api/profile');
      return res.data;
    } catch (error) {
      handleApiError(error);
    }
  },

  async updateProfile(profileData) {
    try {
      const res = await api.put('/api/profile/update', profileData);
      return res.data;
    } catch (error) {
      handleApiError(error);
    }
  },

  /* ---------- ADMIN USER MANAGEMENT ---------- */
  async updateUser(userId, userData) {
    try {
      const res = await api.put(`/api/auth/users/${userId}`, userData);
      return res.data;
    } catch (error) {
      handleApiError(error);
    }
  },

  async deleteUser(userId) {
    try {
      const res = await api.delete(`/api/auth/users/${userId}`);
      return res.data;
    } catch (error) {
      handleApiError(error);
    }
  },

  /* ---------- UTILITIES ---------- */
  isAuthenticated() {
    return !!localStorage.getItem('token');
  },

  getUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  getToken() {
    return localStorage.getItem('token');
  }
};

export default authService;
