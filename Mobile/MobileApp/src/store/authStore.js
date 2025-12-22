import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../utils/axios';

const useAuthStore = create((set, get) => ({
  // State
  user: null,
  token: null,
  loading: false,
  isInitialized: false,

  // Actions
  login: async (email, password) => {
    set({ loading: true });
    try {
      const res = await api.post('/login', { email, password });
      const { token, _id, username, role } = res.data;
      const userData = { _id, username, email, role };

      // Store auth data
      await AsyncStorage.setItem('token', token);
      await AsyncStorage.setItem('user', JSON.stringify(userData));

      set({
        token,
        user: userData,
        loading: false,
      });
      
      // Return user data for potential use
      return userData;
    } catch (err) {
      console.error('Login error:', err);
      set({ loading: false });
      
      // Format error message
      if (err.response?.data?.message) {
        throw new Error(err.response.data.message);
      }
      throw err;
    }
  },

  register: async (username, fullname, email, password, role = 'User') => {
    set({ loading: true });
    try {
      const res = await api.post('/register', {
        username,
        fullname,
        email,
        password,
        role
      });
      
      if (!res.data || !res.data.token) {
        throw new Error('Invalid response from server');
      }
      
      const { token, _id } = res.data;

      const userData = { _id, username, fullname, email, role };
      
      // Store auth data
      await AsyncStorage.setItem('token', token);
      await AsyncStorage.setItem('user', JSON.stringify(userData));
      
      set({
        token,
        user: userData,
        loading: false,
      });
      return true;
    } catch (err) {
      console.error('Register error:', err);
      set({ loading: false });
      if (err.response?.data?.message) {
        throw new Error(err.response.data.message);
      }
      throw err;
    }
  },

  logout: async () => {
    await AsyncStorage.removeItem('token');
    set({
      token: null,
      user: null,
    });
  },

  // Initialize user from stored token
  initializeAuth: async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        const res = await api.get('/me');
        const me = res.data;
        const userData = { _id: me.id || me._id, username: me.username, email: me.email, role: me.role };
        set({
          user: userData,
          token,
          isInitialized: true,
        });
      } else {
        set({ isInitialized: true });
      }
    } catch (err) {
      console.error('Initialize auth error:', err);
      await AsyncStorage.removeItem('token');
      set({
        user: null,
        token: null,
        isInitialized: true,
      });
    }
  },
}));

export default useAuthStore;