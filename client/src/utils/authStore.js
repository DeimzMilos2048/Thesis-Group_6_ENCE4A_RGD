import { create } from "zustand";
import api from "./axios";
import { io } from "socket.io-client";

const SOCKET_URL = process.env.NODE_ENV === 'development'
  ? 'http://192.168.86.181:5001'
  : 'https://mala-backend-q03k.onrender.com';

// Shared socket instance
let socket = null;

const getSocket = () => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ['polling', 'websocket'],
      reconnection: true,
    });
  }
  return socket;
};

const useAuthStore = create((set) => ({
  user: null,
  token: localStorage.getItem("token") || "",
  loading: false,

  login: async (email, password) => {
    set({ loading: true });
    try {
      const res = await api.post("/api/auth/login", { email, password });
      if (!res || res.status !== 200 || !res.data || !res.data.token) {
        const message = res?.data?.message || 'Invalid email or password';
        throw new Error(message);
      }

      const { token, _id, username, email: userEmail, role, redirectTo } = res.data;
      const user = { _id, username, email: userEmail, role, redirectTo };

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));

      // Emit user_online after login
      const s = getSocket();
      s.on('connect', () => s.emit('user_online', _id));
      if (s.connected) s.emit('user_online', _id);

      set({ token, user, loading: false });
      return user;
    } catch (err) {
      set({ loading: false });
      throw err;
    }
  },

  register: async (userData) => {
    set({ loading: true });
    try {
      const res = await api.post("/api/auth/register", userData);
      if (!res.data) throw new Error('No data received from server');

      const { token, user } = res.data;
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));

      // Emit user_online after register
      const s = getSocket();
      s.on('connect', () => s.emit('user_online', user._id));
      if (s.connected) s.emit('user_online', user._id);

      set({ token, user, loading: false });
      return user;
    } catch (err) {
      set({ loading: false });
      throw err;
    }
  },

  logout: () => {
    const user = JSON.parse(localStorage.getItem('user'));
    // Emit user_offline before disconnecting
    if (socket && user?._id) {
      socket.emit('user_offline', user._id);
      socket.disconnect();
      socket = null;
    }
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    set({ user: null, token: "" });
  },

  update: (updatedUser) =>
    set((state) => ({ user: { ...state.user, ...updatedUser } })),

  initializeAuth: async () => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const res = await api.get("/api/auth/me");
        const user = res.data;

        // Re-emit user_online on page refresh
        const s = getSocket();
        s.on('connect', () => s.emit('user_online', user._id));
        if (s.connected) s.emit('user_online', user._id);

        set({ user });
      } catch (err) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        set({ user: null, token: "" });
      }
    }
  }
}));

export default useAuthStore;