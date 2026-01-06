import { create } from "zustand";
import api from "./axios";

const useAuthStore = create((set) => ({
  user: null,
  token: localStorage.getItem("token") || "",
  loading: false,

  login: async (email, password) => {
    set({ loading: true });
    try {
      const res = await api.post("/api/auth/login", { email, password });
      // Ensure success only on valid credentials
      if (!res || res.status !== 200 || !res.data || !res.data.token) {
        const message = res?.data?.message || 'Invalid email or password';
        throw new Error(message);
      }

      const { token, _id, username, email: userEmail, role, redirectTo } = res.data;
      const user = {
        _id,
        username,
        email: userEmail,
        role, // do not default to 'User' to avoid bypassing guards
        redirectTo
      };

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));

      set({
        token,
        user,
        loading: false
      });

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
      
      if (!res.data) {
        throw new Error('No data received from server');
      }

      const { token, user } = res.data;
      
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      
      set({
        token,
        user,
        loading: false,
      });
      
      return user;
    } catch (err) {
      set({ loading: false });
      throw err;
    }
  },

  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    set({
      user: null,
      token: ""
    });
  },

  update:(updatedUser) => 
    set((state) => ({
      user: { ...state.user, ...updatedUser }
    })),

  // Initialize user from token
  initializeAuth: async () => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const res = await api.get("/api/auth/me");
        const user = res.data;
        set({ user });
      } catch (err) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        set({
          user: null,
          token: ""
        });
      }
    }
  }
  
}));

export default useAuthStore;