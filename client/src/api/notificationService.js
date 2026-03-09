/**
 * Web Notification Service
 * Handles notification API calls and real-time updates
 */

import axios from '../utils/axios';

/**
 * Get all notifications with pagination and filtering
 * @param {number} page - Page number (1-indexed)
 * @param {number} limit - Number of results per page
 * @param {boolean} unreadOnly - Show only unread notifications
 * @param {string} type - Filter by type (CRITICAL, WARNING, STABLE)
 * @returns {Promise<Object>}
 */
export const getNotifications = async (page = 1, limit = 50, unreadOnly = false, type = null) => {
  try {
    const params = {
      page,
      limit,
      unreadOnly,
    };
    
    if (type) {
      params.type = type;
    }

    const response = await axios.get('/api/notifications', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching notifications:', error);
    throw error;
  }
};

/**
 * Get unread notifications count and latest unread
 * @returns {Promise<Object>}
 */
export const getUnreadCount = async () => {
  try {
    const response = await axios.get('/api/notifications/unread/count');
    return response.data;
  } catch (error) {
    console.error('Error fetching unread count:', error);
    throw error;
  }
};

/**
 * Get notifications by type
 * @param {string} type - CRITICAL, WARNING, or STABLE
 * @param {number} limit - Maximum results to return
 * @returns {Promise<Object>}
 */
export const getNotificationsByType = async (type, limit = 50) => {
  try {
    if (!['CRITICAL', 'WARNING', 'STABLE'].includes(type)) {
      throw new Error('Invalid notification type');
    }

    const response = await axios.get(`/api/notifications/type/${type}`, {
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
 * @param {string} notificationId - MongoDB notification ID
 * @returns {Promise<Object>}
 */
export const markNotificationAsRead = async (notificationId) => {
  try {
    const response = await axios.patch(`/api/notifications/${notificationId}/read`);
    return response.data;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
};

/**
 * Mark all notifications as read
 * @returns {Promise<Object>}
 */
export const markAllNotificationsAsRead = async () => {
  try {
    const response = await axios.patch('/api/notifications/read-all');
    return response.data;
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw error;
  }
};

/**
 * Get notification statistics (counts by type and unread)
 * @returns {Promise<Object>}
 */
export const getNotificationStats = async () => {
  try {
    const response = await axios.get('/api/notifications/stats');
    return response.data;
  } catch (error) {
    console.error('Error fetching notification stats:', error);
    throw error;
  }
};

/**
 * Delete a notification
 * @param {string} notificationId - MongoDB notification ID
 * @returns {Promise<Object>}
 */
export const deleteNotification = async (notificationId) => {
  try {
    const response = await axios.delete(`/api/notifications/${notificationId}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting notification:', error);
    throw error;
  }
};

/**
 * Clean up old notifications (older than X days)
 * @param {number} days - Days to keep (default 30)
 * @returns {Promise<Object>}
 */
export const cleanupOldNotifications = async (days = 30) => {
  try {
    const response = await axios.delete('/api/notifications/cleanup', {
      params: { days }
    });
    return response.data;
  } catch (error) {
    console.error('Error cleaning up notifications:', error);
    throw error;
  }
};

export default {
  getNotifications,
  getUnreadCount,
  getNotificationsByType,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getNotificationStats,
  deleteNotification,
  cleanupOldNotifications,
};
