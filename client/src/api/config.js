const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://mala-luin.onrender.com';

export const API_ENDPOINTS = {
  AUTH: {
    REGISTER: `${API_BASE_URL}/api/auth/register`,
    LOGIN: `${API_BASE_URL}/api/auth/login`,
    PROFILE: `${API_BASE_URL}/api/auth/me`,
    ADMIN_DASHBOARD: `${API_BASE_URL}/api/auth/admin/dashboard`,
    USER_DASHBOARD: `${API_BASE_URL}/api/auth/dashboard`
  }
};
