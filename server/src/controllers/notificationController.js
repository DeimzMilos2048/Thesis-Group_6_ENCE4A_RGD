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

export { sendNotification, sendNotificationToMultiple };