const API_BASE_URL = 'https://mala-backend-q03k.onrender.com';

export const API_ENDPOINTS = {
  AUTH: {
    REGISTER: `${API_BASE_URL}/auth/register`,
    LOGIN: `${API_BASE_URL}/auth/login`,
    PROFILE: `${API_BASE_URL}/auth/me`,
    ADMIN_DASHBOARD: `${API_BASE_URL}/auth/admin/dashboard`,
    USER_DASHBOARD: `${API_BASE_URL}/auth/dashboard`
  }
};
