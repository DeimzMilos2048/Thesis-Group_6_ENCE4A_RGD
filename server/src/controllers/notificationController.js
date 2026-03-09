import admin from "../config/firebase.js";
import User from "../models/userModel.js";
import Notification from "../models/notificationModel.js";

/**
 * Send push notification via FCM and save to database
 * @param {String} userId - User ID to send notification to
 * @param {Object} notificationData - Notification details
 */
const sendNotification = async (userId, notificationData) => {
  try {
    const { type, title, message, sensorData, thresholds } = notificationData;

    // 1. Find user and get FCM token
    const user = await User.findById(userId);
    
    if (!user) {
      throw new Error("User not found");
    }

    if (!user.fcmToken) {
      console.warn(`User ${userId} has no FCM token registered`);
      // Still save notification to DB even if no token
    }

    // 2. Save notification to database
    const dbNotification = new Notification({
      type,
      title,
      message,
      sensorData,
      thresholds,
      system: "Rice Grain Dryer",
      isRead: false
    });

    await dbNotification.save();

    // 3. Send push notification if token exists
    if (user.fcmToken) {
      const fcmMessage = {
        notification: {
          title,
          body: message
        },
        data: {
          type,
          notificationId: dbNotification._id.toString(),
          timestamp: new Date().toISOString()
        },
        token: user.fcmToken
      };

      const response = await admin.messaging().send(fcmMessage);
      console.log("FCM notification sent successfully:", response);
    }

    return {
      success: true,
      notification: dbNotification
    };

  } catch (error) {
    console.error("Error sending notification:", error);
    throw error;
  }
};

/**
 * Send notification to multiple users
 * @param {Array} userIds - Array of user IDs
 * @param {Object} notificationData - Notification details
 */
const sendNotificationToMultiple = async (userIds, notificationData) => {
  try {
    const { type, title, message, sensorData, thresholds } = notificationData;

    // 1. Find all users and collect valid FCM tokens
    const users = await User.find({ _id: { $in: userIds } });
    const tokens = users
      .map(user => user.fcmToken)
      .filter(token => token); // Remove null/undefined tokens

    if (tokens.length === 0) {
      console.warn("No valid FCM tokens found for users");
    }

    // 2. Save notification to database for each user
    // (You might want to associate notifications with users)
    const dbNotification = new Notification({
      type,
      title,
      message,
      sensorData,
      thresholds,
      system: "Rice Grain Dryer",
      isRead: false
    });

    await dbNotification.save();

    // 3. Send multicast notification
    if (tokens.length > 0) {
      const fcmMessage = {
        notification: {
          title,
          body: message
        },
        data: {
          type,
          notificationId: dbNotification._id.toString(),
          timestamp: new Date().toISOString()
        },
        tokens
      };

      const response = await admin.messaging().sendEachForMulticast(fcmMessage);
      
      console.log(`Successfully sent: ${response.successCount}`);
      console.log(`Failed: ${response.failureCount}`);

      // Handle failed tokens (optional cleanup)
      if (response.failureCount > 0) {
        const failedTokens = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            failedTokens.push(tokens[idx]);
          }
        });
        console.warn("Failed tokens:", failedTokens);
        // Optionally remove invalid tokens from users
      }
    }

    return {
      success: true,
      notification: dbNotification,
      sentCount: tokens.length
    };

  } catch (error) {
    console.error("Error sending notifications:", error);
    throw error;
  }
};

/**
 * Send drying event notification to all users
 * @param {Object} dryingData - Drying event details
 * @param {String} dryingData.eventType - 'started' or 'stopped'
 * @param {Number} dryingData.temperature - Target temperature
 * @param {Number} dryingData.moisture - Target moisture
 * @param {Number} dryingData.dryingSeconds - Duration in seconds
 */
const sendDryingNotification = async (dryingData) => {
  try {
    const { eventType, temperature, moisture, dryingSeconds } = dryingData;

    let title, message;
    if (eventType === 'started') {
      title = '🌾 Drying Process Started';
      message = `Target: ${temperature}°C, Moisture: ${moisture}%`;
    } else {
      const hours = Math.floor(dryingSeconds / 3600);
      const minutes = Math.floor((dryingSeconds % 3600) / 60);
      title = '✅ Drying Process Completed';
      message = `Duration: ${hours}h ${minutes}m`;
    }

    // Get all users and collect valid FCM tokens
    const users = await User.find({});
    const tokens = users
      .map(user => user.fcmToken)
      .filter(token => token);

    if (tokens.length === 0) {
      console.warn("No valid FCM tokens found for drying notification");
    }

    // Save notification to database
    const dbNotification = new Notification({
      type: `drying_${eventType}`,
      title,
      message,
      sensorData: {
        temperature,
        moisture,
        dryingSeconds
      },
      system: "Rice Grain Dryer",
      isRead: false
    });

    await dbNotification.save();

    // Send multicast notification
    if (tokens.length > 0) {
      const fcmMessage = {
        notification: {
          title,
          body: message
        },
        data: {
          type: `drying_${eventType}`,
          notificationId: dbNotification._id.toString(),
          timestamp: new Date().toISOString()
        },
        tokens
      };

      const response = await admin.messaging().sendEachForMulticast(fcmMessage);
      console.log(`Drying ${eventType} notification - Successfully sent: ${response.successCount}, Failed: ${response.failureCount}`);
    }

    return {
      success: true,
      notification: dbNotification,
      sentCount: tokens.length
    };

  } catch (error) {
    console.error("Error sending drying notification:", error);
    throw error;
  }
};

/**
 * Get all notifications (with pagination and filtering)
 */
const getNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 50, unreadOnly = false, type } = req.query;

    let query = {};
    if (unreadOnly === 'true') {
      query.isRead = false;
    }
    if (type && ['CRITICAL', 'WARNING', 'STABLE'].includes(type)) {
      query.type = type;
    }

    const skip = (page - 1) * limit;

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Notification.countDocuments(query);

    res.json({
      success: true,
      data: notifications,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get unread notifications count
 */
const getUnreadCount = async (req, res) => {
  try {
    const unreadCount = await Notification.countDocuments({ isRead: false });

    const unreadNotifications = await Notification.find({ isRead: false })
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      success: true,
      unreadCount,
      latest: unreadNotifications
    });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get notifications by type
 */
const getNotificationsByType = async (req, res) => {
  try {
    const { type } = req.params;
    const { limit = 50 } = req.query;

    if (!['CRITICAL', 'WARNING', 'STABLE'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid notification type'
      });
    }

    const notifications = await Notification.find({ type })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: notifications
    });
  } catch (error) {
    console.error('Error fetching notifications by type:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Mark single notification as read
 */
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findByIdAndUpdate(
      id,
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }

    res.json({
      success: true,
      message: 'Notification marked as read',
      data: notification
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Mark all notifications as read
 */
const markAllAsRead = async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { isRead: false },
      { isRead: true }
    );

    res.json({
      success: true,
      message: 'All notifications marked as read',
      updatedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Error marking all as read:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get notification statistics
 */
const getNotificationStats = async (req, res) => {
  try {
    const criticalCount = await Notification.countDocuments({ type: 'CRITICAL' });
    const warningCount = await Notification.countDocuments({ type: 'WARNING' });
    const stableCount = await Notification.countDocuments({ type: 'STABLE' });
    const unreadCount = await Notification.countDocuments({ isRead: false });

    const latestNotifications = await Notification.find()
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      success: true,
      stats: {
        criticalCount,
        warningCount,
        stableCount,
        unreadCount,
        totalCount: criticalCount + warningCount + stableCount
      },
      latest: latestNotifications
    });
  } catch (error) {
    console.error('Error fetching notification stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

export { 
  sendNotification, 
  sendNotificationToMultiple, 
  sendDryingNotification,
  getNotifications,
  getUnreadCount,
  getNotificationsByType,
  markAsRead,
  markAllAsRead,
  getNotificationStats
};