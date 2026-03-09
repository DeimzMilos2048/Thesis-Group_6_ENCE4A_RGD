// server/src/utils/firebaseNotificationService.js

/**
 * Firebase Cloud Messaging Service
 * Sends push notifications to mobile devices registered with FCM tokens
 */

import admin from 'firebase-admin';

/**
 * Initialize Firebase Admin SDK (called in firebase.js config)
 * Make sure firebase-admin is initialized before using this service
 */

/**
 * Send FCM push notification to a specific device
 * @param {string} fcmToken - FCM token of the device
 * @param {Object} notification - Notification data
 * @returns {Promise<string>} - Message ID if successful
 */
export const sendFCMNotification = async (fcmToken, notification) => {
  try {
    if (!fcmToken) {
      console.warn('No FCM token provided');
      return null;
    }

    const message = {
      token: fcmToken,
      notification: {
        title: notification.title,
        body: notification.message,
      },
      data: {
        type: notification.type,
        event: notification.event,
        timestamp: new Date().toISOString(),
        tray_number: notification.tray_number ? String(notification.tray_number) : '',
        deviceId: notification.deviceId || 'ESP32_001',
      },
      // Android specific options
      android: {
        priority: notification.type === 'CRITICAL' ? 'high' : 'normal',
        notification: {
          sound: 'default',
          title: notification.title,
          body: notification.message,
          color: notification.type === 'CRITICAL' ? '#ef4444' :
                 notification.type === 'WARNING' ? '#f59e0b' : '#10b981',
          clickAction: 'FLUTTER_NOTIFICATION_CLICK',
        },
      },
      // iOS specific options
      apns: {
        payload: {
          aps: {
            alert: {
              title: notification.title,
              body: notification.message,
            },
            badge: 1,
            sound: 'default',
          },
        },
      },
    };

    // Send message
    const messageId = await admin.messaging().send(message);
    console.log(`✓ FCM notification sent: ${messageId}`);
    return messageId;
  } catch (error) {
    console.error('Error sending FCM notification:', error);
    return null;
  }
};

/**
 * Send notification to multiple devices (topic-based)
 * @param {string} topic - FCM topic name
 * @param {Object} notification - Notification data
 * @returns {Promise<string>} - Message ID if successful
 */
export const sendFCMToTopic = async (topic, notification) => {
  try {
    const message = {
      topic: topic,
      notification: {
        title: notification.title,
        body: notification.message,
      },
      data: {
        type: notification.type,
        event: notification.event,
        timestamp: new Date().toISOString(),
      },
    };

    const messageId = await admin.messaging().send(message);
    console.log(`✓ FCM topic notification sent to ${topic}: ${messageId}`);
    return messageId;
  } catch (error) {
    console.error('Error sending FCM topic notification:', error);
    return null;
  }
};

/**
 * Subscribe device to topic
 * @param {string} fcmToken - FCM token
 * @param {string} topic - Topic name
 */
export const subscribeToTopic = async (fcmToken, topic) => {
  try {
    await admin.messaging().subscribeToTopic([fcmToken], topic);
    console.log(`✓ Device subscribed to topic: ${topic}`);
  } catch (error) {
    console.error('Error subscribing to topic:', error);
  }
};

/**
 * Unsubscribe device from topic
 * @param {string} fcmToken - FCM token
 * @param {string} topic - Topic name
 */
export const unsubscribeFromTopic = async (fcmToken, topic) => {
  try {
    await admin.messaging().unsubscribeFromTopic([fcmToken], topic);
    console.log(`✓ Device unsubscribed from topic: ${topic}`);
  } catch (error) {
    console.error('Error unsubscribing from topic:', error);
  }
};

/**
 * Send notification to all connected devices via topic
 * Always broadcast to "mala-alerts" topic so all devices receive critical notifications
 */
export const broadcastNotification = async (notification) => {
  try {
    const topic = 'mala-alerts'; // Topic to broadcast all system alerts
    await sendFCMToTopic(topic, notification);
    return true;
  } catch (error) {
    console.error('Error broadcasting notification:', error);
    return false;
  }
};

export default {
  sendFCMNotification,
  sendFCMToTopic,
  subscribeToTopic,
  unsubscribeFromTopic,
  broadcastNotification,
};
