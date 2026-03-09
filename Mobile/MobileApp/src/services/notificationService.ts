/**
 * Mobile Notification Service
 * Handles notification API calls and local storage management
 */

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = __DEV__ 
  ? 'http://192.168.86.181:5001'
  : 'https://mala-backend-q03k.onrender.com';

const NOTIFICATIONS_STORAGE_KEY = 'rice_dryer_notifications';
const FCM_TOKEN_STORAGE_KEY = 'rice_dryer_fcm_token';

/**
 * Get all notifications from backend with pagination
 * Falls back to local storage if offline
 */
export const getNotifications = async (
  page: number = 1,
  limit: number = 50,
  unreadOnly: boolean = false,
  type: string | null = null
) => {
  try {
    const params: any = {
      page,
      limit,
      unreadOnly,
    };

    if (type) {
      params.type = type;
    }

    const response = await axios.get(`${API_URL}/api/notifications`, { params });
    
    // Cache notifications in local storage
    if (response.data && response.data.data) {
      await AsyncStorage.setItem(
        NOTIFICATIONS_STORAGE_KEY,
        JSON.stringify(response.data.data)
      );
    }

    return response.data;
  } catch (error) {
    console.error('Error fetching notifications:', error);
    
    // Fallback to cached notifications if offline
    try {
      const cached = await AsyncStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
      if (cached) {
        return {
          success: true,
          data: JSON.parse(cached),
          fromCache: true,
        };
      }
    } catch (cacheError) {
      console.error('Error reading notifications cache:', cacheError);
    }
    
    throw error;
  }
};

/**
 * Get unread notifications count
 */
export const getUnreadCount = async () => {
  try {
    const response = await axios.get(`${API_URL}/api/notifications/unread/count`);
    return response.data;
  } catch (error) {
    console.error('Error fetching unread count:', error);
    throw error;
  }
};

/**
 * Get notifications by type
 */
export const getNotificationsByType = async (type: string, limit: number = 50) => {
  try {
    if (!['CRITICAL', 'WARNING', 'STABLE'].includes(type)) {
      throw new Error('Invalid notification type');
    }

    const response = await axios.get(`${API_URL}/api/notifications/type/${type}`, {
      params: { limit }
    });
    return response.data;
  } catch (error) {
    console.error(`Error fetching ${type} notifications:`, error);
    throw error;
  }
};

/**
 * Mark a single notification as read
 */
export const markNotificationAsRead = async (notificationId: string) => {
  try {
    const response = await axios.patch(`${API_URL}/api/notifications/${notificationId}/read`);
    return response.data;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
};

/**
 * Mark all notifications as read
 */
export const markAllNotificationsAsRead = async () => {
  try {
    const response = await axios.patch(`${API_URL}/api/notifications/read-all`);
    return response.data;
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw error;
  }
};

/**
 * Get local cached notifications (for offline viewing)
 */
export const getCachedNotifications = async () => {
  try {
    const cached = await AsyncStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    return cached ? JSON.parse(cached) : [];
  } catch (error) {
    console.error('Error reading notifications cache:', error);
    return [];
  }
};

/**
 * Clear local notifications cache
 */
export const clearNotificationsCache = async () => {
  try {
    await AsyncStorage.removeItem(NOTIFICATIONS_STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing notifications cache:', error);
  }
};

/**
 * Register FCM token with backend
 * Called when app receives FCM token from Firebase
 */
export const registerFCMToken = async (
  userId: string,
  fcmToken: string,
  deviceName: string = 'Mobile Device'
) => {
  try {
    // Store token locally first
    await AsyncStorage.setItem(FCM_TOKEN_STORAGE_KEY, fcmToken);

    // Register with backend
    const response = await axios.post(`${API_URL}/api/notifications/register-token`, {
      userId,
      fcmToken,
      deviceName,
    });

    console.log('✓ FCM token registered with backend');
    return response.data;
  } catch (error) {
    console.error('Error registering FCM token:', error);
    // Still store locally even if backend call fails
    await AsyncStorage.setItem(FCM_TOKEN_STORAGE_KEY, fcmToken);
    throw error;
  }
};

/**
 * Get stored FCM token
 */
export const getFCMToken = async () => {
  try {
    const token = await AsyncStorage.getItem(FCM_TOKEN_STORAGE_KEY);
    return token;
  } catch (error) {
    console.error('Error retrieving FCM token:', error);
    return null;
  }
};

/**
 * Get notification statistics
 */
export const getNotificationStats = async () => {
  try {
    const response = await axios.get(`${API_URL}/api/notifications/stats`);
    return response.data;
  } catch (error) {
    console.error('Error fetching notification stats:', error);
    throw error;
  }
};

export default {
  getNotifications,
  getUnreadCount,
  getNotificationsByType,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getCachedNotifications,
  clearNotificationsCache,
  registerFCMToken,
  getFCMToken,
  getNotificationStats,
};
