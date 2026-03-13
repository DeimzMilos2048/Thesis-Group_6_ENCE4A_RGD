import { Platform, PermissionsAndroid, Linking, Alert } from 'react-native';

/**
 * Notification Permission Manager
 * Handles requesting and checking notification permissions for Android 13+
 */

export const NotificationPermissionManager = {
  /**
   * Request notification permission (Android 13+)
   * Returns true if permission granted
   */
  async requestNotificationPermission(): Promise<boolean> {
    try {
      // Only needed for Android 13 (API level 33) and above
      if (Platform.OS !== 'android' || Platform.Version < 33) {
        console.log('[NotificationPermissions] Android < 13, permission not required');
        return true;
      }

      const permission = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        {
          title: 'Dryer System Notifications',
          message: 'Allow notifications for dryer alerts and status updates?',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'Allow',
        }
      );

      const granted = permission === PermissionsAndroid.RESULTS.GRANTED;
      console.log(
        `[NotificationPermissions] Permission ${granted ? 'granted' : 'denied'}`
      );
      return granted;
    } catch (err) {
      console.error('[NotificationPermissions] Error requesting permission:', err);
      return false;
    }
  },

  /**
   * Check if notification permission is already granted
   */
  async isNotificationPermissionGranted(): Promise<boolean> {
    try {
      if (Platform.OS !== 'android' || Platform.Version < 33) {
        return true;
      }

      const hasPermission = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
      );
      console.log(
        `[NotificationPermissions] Has permission: ${hasPermission}`
      );
      return hasPermission;
    } catch (err) {
      console.error('[NotificationPermissions] Error checking permission:', err);
      return false;
    }
  },

  /**
   * Open app notification settings
   * Allows user to manually enable notifications
   */
  openNotificationSettings(): void {
    if (Platform.OS === 'android') {
      // Open Android app notification settings
      Linking.openSettings();
    }
  },

  /**
   * Initialize notifications on app start
   * Call this once in your App.tsx useEffect
   */
  async initialize(): Promise<boolean> {
    try {
      console.log('[NotificationPermissions] Initializing notification system');

      // Check if already granted
      const hasPermission = await this.isNotificationPermissionGranted();

      if (!hasPermission && Platform.OS === 'android' && Platform.Version >= 33) {
        // Request permission
        const granted = await this.requestNotificationPermission();
        if (!granted) {
          console.warn('[NotificationPermissions] User denied notification permission');
          return false;
        }
      }

      console.log('[NotificationPermissions] Notification system ready');
      return true;
    } catch (err) {
      console.error('[NotificationPermissions] Initialization failed:', err);
      return false;
    }
  },
};

/**
 * Test notification - useful for debugging
 */
export const sendTestNotification = () => {
  console.log('[TestNotification] Sending test notification');
  
  // Use Alert as fallback since we're removing react-native-push-notification
  Alert.alert(
    'Test Notification',
    'This is a test notification from the Dryer System',
    [
      { text: 'OK', style: 'default' }
    ],
    { cancelable: true }
  );
};
