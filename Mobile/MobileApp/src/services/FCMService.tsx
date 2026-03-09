import messaging from '@react-native-firebase/messaging';
import { Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Get the correct API base URL based on environment
const getAPIBaseUrl = () => {
  if (__DEV__) {
    return 'http://192.168.0.109:5001';  // Development: same IP as socket.io
  } else {
    return 'https://mala-backend-q03k.onrender.com';  // Production
  }
};

class FCMService {
  private static instance: FCMService;
  private fcmToken: string | null = null;
  private retryCount: number = 0;
  private maxRetries: number = 3;
  private retryDelay: number = 2000; // Start with 2 seconds

  static getInstance(): FCMService {
    if (!FCMService.instance) {
      FCMService.instance = new FCMService();
    }
    return FCMService.instance;
  }

  // Initialize FCM and get token with retry logic
  async initializeFCM(): Promise<string | null> {
    try {
      // On Android, request permission only if API level >= 33
      if (Platform.OS === 'ios') {
        try {
          const authStatus = await messaging().requestPermission();
          const enabled =
            authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
            authStatus === messaging.AuthorizationStatus.PROVISIONAL;

          if (!enabled) {
            console.log('FCM permission not granted on iOS');
            return null;
          }
        } catch (permissionError) {
          console.warn('FCM permission request failed on iOS:', permissionError);
        }
      }

      // Get FCM token with retry logic
      const token = await this.getTokenWithRetry();
      
      if (token) {
        this.fcmToken = token;
        await AsyncStorage.setItem('fcmToken', token);
        console.log('FCM Token initialized successfully');
        this.retryCount = 0; // Reset retry count on success
        return token;
      }

      return null;
    } catch (error) {
      console.error('FCM initialization error:', error);
      return null;
    }
  }

  // Get token with exponential backoff retry
  private async getTokenWithRetry(): Promise<string | null> {
    try {
      const token = await messaging().getToken();
      return token;
    } catch (error: any) {
      const errorCode = error.code || '';
      const errorMessage = error.message || '';
      
      console.warn(`FCM token retrieval failed (attempt ${this.retryCount + 1}/${this.maxRetries}):`, errorCode, errorMessage);

      // Check if error is retryable
      if (
        errorCode.includes('SERVICE_NOT_AVAILABLE') ||
        errorCode.includes('INTERNAL_ERROR') ||
        errorMessage.includes('java.io.IOException') ||
        errorMessage.includes('ExecutionException')
      ) {
        if (this.retryCount < this.maxRetries) {
          this.retryCount++;
          const delay = this.retryDelay * Math.pow(2, this.retryCount - 1); // Exponential backoff
          console.log(`Retrying FCM token retrieval in ${delay}ms...`);
          
          await new Promise(resolve => setTimeout(resolve, delay));
          return this.getTokenWithRetry();
        }
      }

      return null;
    }
  }

  // Get saved FCM token
  async getFCMToken(): Promise<string | null> {
    if (this.fcmToken) {
      return this.fcmToken;
    }

    try {
      const savedToken = await AsyncStorage.getItem('fcmToken');
      if (savedToken) {
        this.fcmToken = savedToken;
        return savedToken;
      }

      // If no saved token, try to get a new one
      return await this.initializeFCM();
    } catch (error) {
      console.error('Error getting FCM token:', error);
      return null;
    }
  }

  // Check if Firebase messaging is available
  async isMessagingAvailable(): Promise<boolean> {
    try {
      // Try a lightweight check
      const isAvailable = messaging().isMessagingEnabled !== undefined;
      return isAvailable;
    } catch {
      return false;
    }
  }

  // Setup message handlers with error protection
  setupMessageHandlers(): void {
    try {
      // Handle foreground messages
      const unsubscribeForeground = messaging().onMessage(async remoteMessage => {
        try {
          console.log('FCM message received in foreground:', remoteMessage);
          
          const { notification, data } = remoteMessage;
          
          // Show alert for system control notifications
          if (data?.type === 'SYSTEM_CONTROL') {
            const title = notification?.title || 'System Update';
            const body = notification?.body || 'System parameters updated';
            
            Alert.alert(
              title,
              body,
              [
                { text: 'OK', style: 'default' }
              ],
              { cancelable: true }
            );
          }
        } catch (error) {
          console.error('Error handling foreground message:', error);
        }
      });

      // Handle background/quit state messages
      const unsubscribeBackground = messaging().setBackgroundMessageHandler(async remoteMessage => {
        try {
          console.log('FCM message received in background:', remoteMessage);
        } catch (error) {
          console.error('Error handling background message:', error);
        }
      });

      // Handle notification press when app is in background
      const unsubscribeNotificationOpened = messaging().onNotificationOpenedApp(remoteMessage => {
        try {
          console.log('Notification opened app:', remoteMessage);
          
          if (remoteMessage.data?.type === 'SYSTEM_CONTROL') {
            // Navigate to dashboard if notification is pressed
            // You can add navigation logic here if needed
          }
        } catch (error) {
          console.error('Error handling notification opened:', error);
        }
      });

      // Handle initial notification (app opened from quit state)
      messaging().getInitialNotification().then(remoteMessage => {
        try {
          console.log('Initial notification:', remoteMessage);
        } catch (error) {
          console.error('Error getting initial notification:', error);
        }
      }).catch(error => {
        console.error('Error in getInitialNotification:', error);
      });

      // Store unsubscribe functions for cleanup if needed
      this.unsubscribeFunctions = [
        unsubscribeForeground,
        unsubscribeNotificationOpened
      ];
    } catch (error) {
      console.error('Error setting up message handlers:', error);
    }
  }

  private unsubscribeFunctions: Array<() => void> = [];

  // Send FCM token to backend with error handling
  async registerTokenWithBackend(userId: string): Promise<void> {
    try {
      const token = await this.getFCMToken();
      if (!token) {
        console.log('No FCM token available for backend registration');
        return;
      }

      try {
        const authToken = await AsyncStorage.getItem('token');
        if (!authToken) {
          console.log('No auth token available for FCM registration');
          return;
        }

        const response = await fetch(`${getAPIBaseUrl()}/api/fcm/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            userId,
            fcmToken: token,
            platform: Platform.OS,
          }),
        });

        if (!response.ok) {
          console.error(`FCM backend registration failed with status: ${response.status}`);
          return;
        }

        console.log('FCM token registered with backend successfully');
      } catch (error) {
        console.error('Error sending FCM token to backend:', error);
      }
    } catch (error) {
      console.error('Error in registerTokenWithBackend:', error);
    }
  }

  // Unregister FCM token with error handling
  async unregisterToken(): Promise<void> {
    try {
      const token = await this.getFCMToken();
      if (!token) {
        console.log('No FCM token to unregister');
        return;
      }

      try {
        const authToken = await AsyncStorage.getItem('token');
        if (!authToken) {
          console.log('No auth token for FCM unregistration');
          return;
        }

        await fetch(`${getAPIBaseUrl()}/api/fcm/unregister`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
          },
          body: JSON.stringify({ fcmToken: token }),
        });

        // Clear local token
        await AsyncStorage.removeItem('fcmToken');
        this.fcmToken = null;
        
        console.log('FCM token unregistered successfully');
      } catch (error) {
        console.error('Error unregistering FCM token from backend:', error);
        // Still clear local token even if backend call fails
        await AsyncStorage.removeItem('fcmToken');
        this.fcmToken = null;
      }
    } catch (error) {
      console.error('Error in unregisterToken:', error);
    }
  }

  // Cleanup message handlers
  cleanup(): void {
    try {
      this.unsubscribeFunctions.forEach(unsubscribe => {
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
      });
      this.unsubscribeFunctions = [];
      console.log('FCM message handlers cleaned up');
    } catch (error) {
      console.error('Error cleaning up message handlers:', error);
    }
  }
}

export default FCMService.getInstance();
