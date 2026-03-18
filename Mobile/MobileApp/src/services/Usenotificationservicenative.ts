import { useState, useEffect, useCallback, useRef } from 'react';
import { Platform, Vibration, Alert, PermissionsAndroid, AppState } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useNavigation } from '@react-navigation/native';

const DEBUG_NOTIFICATIONS = __DEV__;

const THRESHOLDS = {
  moisture: { critical: 18, warning: 15, stable: 14 },
  temperature: { criticalMax: 50, criticalMin: 35, warningMax: 47, warningMin: 38, lowThreshold: 36 },
  humidity: { criticalMax: 95, warningMax: 85 },
  weight: { minChange: 0.5 },
};

export type AlertType = 'CRITICAL' | 'WARNING' | 'STABLE' | 'INFO';

export interface SensorSnapshot {
  temperature?: number;
  humidity?: number;
  moistureavg?: number;
  moisture1?: number;
  moisture2?: number;
  moisture3?: number;
  moisture4?: number;
  moisture5?: number;
  moisture6?: number;
  weight1?: number;
  weight2?: number;
}

export interface NotificationSettings {
  mobileNotifications: boolean;
  systemAlerts: boolean;
  moistureAlerts: boolean;
  humidityAlerts: boolean;
  temperatureAlerts: boolean;
  weightAlerts: boolean;
}

export interface NotificationItem {
  _id: string;
  id: string;
  type: AlertType;
  title: string;
  message: string;
  sensorData?: SensorSnapshot;
  isRead: boolean;
  createdAt: string;
}

interface UseNotificationServiceReturn {
  notifications: NotificationItem[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  acknowledgeOne: (id: string) => Promise<void>;
  acknowledgeAll: () => Promise<void>;
  fcmToken: string | null;
  notificationSettings: NotificationSettings;
  updateNotificationSettings: (settings: Partial<NotificationSettings>) => Promise<void>;
  requestNotificationPermission: () => Promise<boolean>;
}

const defaultSettings: NotificationSettings = {
  mobileNotifications: false,
  systemAlerts: true,
  moistureAlerts: true,
  humidityAlerts: false,
  temperatureAlerts: true,
  weightAlerts: false,
};

export const configurePushNotifications = async (): Promise<void> => {
  try {
    console.log('[FirebaseMessaging] Setting up Firebase messaging...');

    if (Platform.OS === 'ios') {
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (enabled) {
        console.log('[FirebaseMessaging] iOS permission granted');
      } else {
        console.warn('[FirebaseMessaging] iOS permission denied');
      }
    }

    const token = await messaging().getToken();
    if (token) {
      console.log('[FirebaseMessaging] FCM Token obtained:', token.substring(0, 10) + '...');
    }

    messaging().onMessage(async remoteMessage => {
      console.log('[FirebaseMessaging] Foreground message received:', remoteMessage);
    });

    messaging().onNotificationOpenedApp(remoteMessage => {
      console.log('[FirebaseMessaging] Notification opened app:', remoteMessage);
    });

    messaging().getInitialNotification().then(remoteMessage => {
      if (remoteMessage) {
        console.log('[FirebaseMessaging] Initial notification:', remoteMessage);
      }
    });

    console.log('[FirebaseMessaging] Configuration successful');
  } catch (error) {
    console.error('[FirebaseMessaging] Configuration failed:', error);
  }
};


class NotificationServiceManager {
  private static instance: NotificationServiceManager;
  private fcmToken: string | null = null;
  private notificationSettings: NotificationSettings = { ...defaultSettings };
  private onNotificationClickCallbacks: ((notification: any) => void)[] = [];
  private navigation: any = null;

  static getInstance(): NotificationServiceManager {
    if (!NotificationServiceManager.instance) {
      NotificationServiceManager.instance = new NotificationServiceManager();
    }
    return NotificationServiceManager.instance;
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  setNavigation(navigation: any): void {
    this.navigation = navigation;
  }

 

  async requestNotificationPermission(): Promise<boolean> {
    try {
      console.log('[NotificationServiceManager] Requesting notification permission...');

      if (Platform.OS === 'android' && Platform.Version >= 33) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          console.warn('[NotificationServiceManager] Android notification permission denied');
          return false;
        }
      }

      if (Platform.OS === 'ios') {
        const authStatus = await messaging().requestPermission();
        const enabled =
          authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus.PROVISIONAL;

        if (!enabled) {
          console.warn('[NotificationServiceManager] iOS notification permission denied');
          return false;
        }
      }

      console.log('[NotificationServiceManager] Notification permission granted');
      return true;
    } catch (error) {
      console.error('[NotificationServiceManager] Error requesting permission:', error);
      return false;
    }
  }


  async getFCMToken(): Promise<string | null> {
    try {
      if (!this.fcmToken) {
        const token = await messaging().getToken();
        this.fcmToken = token;
        console.log(
          '[NotificationServiceManager] FCM Token obtained:',
          token?.substring(0, 10) + '...'
        );
        await AsyncStorage.setItem('fcmToken', token);
      }
      return this.fcmToken;
    } catch (error) {
      console.error('[NotificationServiceManager] Error getting FCM token:', error);
      return null;
    }
  }

  async sendTokenToBackend(token: string, apiBaseUrl: string): Promise<void> {
    try {
      const userId = await AsyncStorage.getItem('userId');
      if (!userId) {
        console.warn('[NotificationServiceManager] No user ID found, cannot send token to backend');
        return;
      }

      await axios.post(
        `${apiBaseUrl}/api/user/fcm-token`,
        { userId, fcmToken: token, platform: Platform.OS },
        { timeout: 10000 }
      );

      console.log('[NotificationServiceManager] FCM token sent to backend successfully');
    } catch (error) {
      console.error('[NotificationServiceManager] Error sending token to backend:', error);
    }
  }

  // ── Settings ──────────────────────────────────────────────────────────────

  async loadNotificationSettings(): Promise<NotificationSettings> {
    try {
      const saved = await AsyncStorage.getItem('notificationSettings');
      if (saved) {
        this.notificationSettings = { ...defaultSettings, ...JSON.parse(saved) };
      }
      return this.notificationSettings;
    } catch (error) {
      console.error('[NotificationServiceManager] Error loading notification settings:', error);
      return defaultSettings;
    }
  }

  async updateNotificationSettings(settings: Partial<NotificationSettings>): Promise<void> {
    try {
      this.notificationSettings = { ...this.notificationSettings, ...settings };
      await AsyncStorage.setItem(
        'notificationSettings',
        JSON.stringify(this.notificationSettings)
      );
      console.log(
        '[NotificationServiceManager] Notification settings updated:',
        this.notificationSettings
      );
    } catch (error) {
      console.error('[NotificationServiceManager] Error updating notification settings:', error);
    }
  }

  getSettings(): NotificationSettings {
    return this.notificationSettings;
  }

  getToken(): string | null {
    return this.fcmToken;
  }

  // ── Alert type gating (merged from useNotificationService.ts) ─────────────

  private checkAlertTypeEnabled(type: AlertType): boolean {
    switch (type) {
      case 'CRITICAL':
      case 'WARNING':
        return this.notificationSettings.systemAlerts;
      case 'STABLE':
        return this.notificationSettings.moistureAlerts;
      case 'INFO':
        return (
          this.notificationSettings.weightAlerts ||
          this.notificationSettings.temperatureAlerts ||
          this.notificationSettings.humidityAlerts
        );
      default:
        return true;
    }
  }

  // ── Local notification display ────────────────────────────────────────────

  async showLocalNotification(
    type: AlertType,
    title: string,
    message: string,
    data?: any
  ): Promise<void> {
    try {
      if (!this.notificationSettings.mobileNotifications) {
        console.log(
          '[NotificationServiceManager] Mobile notifications disabled, skipping local notification'
        );
        return;
      }

      // Gate by specific alert type setting (from useNotificationService.ts)
      if (!this.checkAlertTypeEnabled(type)) {
        console.log(
          `[NotificationServiceManager] ${type} alerts disabled, skipping notification`
        );
        return;
      }

      if (type === 'CRITICAL') {
        console.log(`[NotificationServiceManager] Showing ${type} notification:`, title);

        // Add safety check to prevent Alert when not attached to Activity
        // Use setTimeout to ensure Alert is called in the next tick
        // Show notification regardless of app state for background compatibility
        setTimeout(() => {
          try {
            Alert.alert(
              title,
              message,
              [
                {
                  text: 'View',
                  onPress: () => {
                    console.log('[NotificationServiceManager] Alert clicked - navigation handled by Firebase handlers');
                  },
                },
                { text: 'Dismiss', style: 'cancel' },
              ],
              { cancelable: true }
            );
          } catch (alertError) {
            console.warn('[NotificationServiceManager] Alert failed, possibly not attached to Activity:', alertError);
          }
        }, 0);
      }
    } catch (error) {
      console.error('[NotificationServiceManager] Error showing local notification:', error);
    }
  }

  // ── Notification click handling ───────────────────────────────────────────


  async initializeFirebaseHandlers(): Promise<void> {
    console.log('[NotificationServiceManager] Initializing Firebase messaging handlers...');

    // Foreground messages
    messaging().onMessage(async remoteMessage => {
      console.log('[FirebaseMessaging] Foreground message received:', remoteMessage);

      if (remoteMessage.notification) {
        await this.showLocalNotification(
          'INFO',
          remoteMessage.notification.title || 'New Notification',
          remoteMessage.notification.body || 'You have a new notification',
          remoteMessage.data
        );
      }
    });

    console.log('[NotificationServiceManager] Firebase handlers initialized');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook — useNotificationServiceNative
// (merged from both useNotificationServiceNative.ts + useNotificationService.ts)
// ─────────────────────────────────────────────────────────────────────────────

export const useNotificationServiceNative = (
  apiBaseUrl: string,
  sensorData: SensorSnapshot | null = null,
  pollingIntervalMs: number = 15000
): UseNotificationServiceReturn => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState<string | null>(null);
  const [fcmToken, setFcmToken]           = useState<string | null>(null);
  const [notificationSettings, setNotificationSettings] =
    useState<NotificationSettings>(defaultSettings);

  const prevSensorRef = useRef<SensorSnapshot | null>(null);
  const pollingRef    = useRef<ReturnType<typeof setInterval> | null>(null);

  const navigation          = useNavigation();
  const notificationService = NotificationServiceManager.getInstance();

  // ── Initialise service ──────────────────────────────────────────────────

  useEffect(() => {
    const initialize = async () => {
      try {
        notificationService.setNavigation(navigation);

        const settings = await notificationService.loadNotificationSettings();
        setNotificationSettings(settings);

        const hasPermission = await notificationService.requestNotificationPermission();
        if (hasPermission) {
          const token = await notificationService.getFCMToken();
          setFcmToken(token);

          if (token && apiBaseUrl) {
            await notificationService.sendTokenToBackend(token, apiBaseUrl);
          }

          await notificationService.initializeFirebaseHandlers();
        }
      } catch (err) {
        console.error('[useNotificationServiceNative] Initialization error:', err);
        setError('Failed to initialize notifications');
      }
    };

    initialize();
  }, [apiBaseUrl, navigation]);

  // ── Fetch notifications ─────────────────────────────────────────────────

  const refresh = useCallback(async () => {
    try {
      setLoading(true);

      if (!apiBaseUrl || typeof apiBaseUrl !== 'string') {
        throw new Error('Invalid API URL provided');
      }

      const res = await axios.get(`${apiBaseUrl}/api/notifications`, { timeout: 10000 });
      const data: NotificationItem[] = Array.isArray(res.data) ? res.data : [];
      setNotifications(data);
      setError(null);
    } catch (err: any) {
      const errorMsg = err.message ?? 'Failed to fetch notifications';
      setError(errorMsg);
      if (DEBUG_NOTIFICATIONS) {
        console.warn('[refresh] Error:', errorMsg);
      }
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl]);

  // ── Trigger & save notification ─────────────────────────────────────────

  const triggerNotification = useCallback(
    async (
      type: AlertType,
      title: string,
      message: string,
      snapshot: SensorSnapshot
    ) => {
      try {
        if (!title || !message) {
          console.warn('[triggerNotification] Missing title or message');
          return;
        }

        // Show on device via service manager (respects all settings/gates)
        await notificationService.showLocalNotification(type, title, message);

        // Persist to backend
        if (apiBaseUrl && typeof apiBaseUrl === 'string') {
          try {
            await axios.post(
              `${apiBaseUrl}/api/notifications`,
              {
                type,
                title,
                message,
                sensorData: snapshot,
                event: 'SENSOR_ALERT',
                source: 'SENSOR',
              },
              { timeout: 10000 }
            );

            if (DEBUG_NOTIFICATIONS) {
              console.log('[triggerNotification] Saved to backend:', { type, title });
            }

            await refresh();
          } catch (apiError: any) {
            console.error('[triggerNotification] Backend save failed:', apiError.message);
            // Notification was still shown locally — continue
          }
        }
      } catch (err: any) {
        console.error('[triggerNotification] Failed:', err?.message || err);
      }
    },
    [apiBaseUrl, refresh, notificationService]
  );

  // ── Sensor evaluation (threshold logic) ────────────────────────────────

  const evaluateSensor = useCallback(
    (current: SensorSnapshot) => {
      const prev = prevSensorRef.current;

      const moistureAvg     = current.moistureavg  ?? null;
      const temp            = current.temperature   ?? null;
      const humidity        = current.humidity      ?? null;
      const prevMoistureAvg = prev?.moistureavg     ?? null;
      const prevTemp        = prev?.temperature      ?? null;
      const prevHumidity    = prev?.humidity         ?? null;
      const weight1         = current.weight1        ?? null;
      const weight2         = current.weight2        ?? null;
      const prevWeight1     = prev?.weight1          ?? null;
      const prevWeight2     = prev?.weight2          ?? null;

      // ── Moisture ────────────────────────────────────────────────────────
      if (
        moistureAvg !== null &&
        moistureAvg >= THRESHOLDS.moisture.stable &&
        moistureAvg <= THRESHOLDS.moisture.stable + 1 &&
        (prevMoistureAvg === null ||
          prevMoistureAvg < THRESHOLDS.moisture.stable ||
          prevMoistureAvg > THRESHOLDS.moisture.stable + 1)
      ) {
        triggerNotification(
          'STABLE',
          'Tray Ready for Removal',
          `Average moisture content is optimal (${moistureAvg.toFixed(1)}%). Tray is ready for removal.`,
          current
        );
      } else if (
        moistureAvg !== null &&
        moistureAvg >= THRESHOLDS.moisture.warning &&
        (prevMoistureAvg === null || prevMoistureAvg < THRESHOLDS.moisture.warning)
      ) {
        triggerNotification(
          'WARNING',
          'Moisture Warning',
          `Warning: Average moisture level is approaching threshold (${moistureAvg.toFixed(1)}%).`,
          current
        );
      } else if (
        moistureAvg !== null &&
        moistureAvg >= THRESHOLDS.moisture.critical &&
        (prevMoistureAvg === null || prevMoistureAvg < THRESHOLDS.moisture.critical)
      ) {
        triggerNotification(
          'CRITICAL',
          'Critical Moisture Alert',
          `Critical: Average moisture level reached ${moistureAvg.toFixed(1)}%. Immediate action required.`,
          current
        );
      }

      // ── Weight ──────────────────────────────────────────────────────────
      if (
        weight1 !== null &&
        prevWeight1 !== null &&
        Math.abs(weight1 - prevWeight1) >= THRESHOLDS.weight.minChange
      ) {
        const change    = weight1 - prevWeight1;
        const direction = change > 0 ? 'increased' : 'decreased';
        triggerNotification(
          'INFO',
          'Weight Change Detected',
          `Scale 1 weight ${direction} by ${Math.abs(change).toFixed(1)}kg (${prevWeight1.toFixed(1)}kg → ${weight1.toFixed(1)}kg).`,
          current
        );
      }

      if (
        weight2 !== null &&
        prevWeight2 !== null &&
        Math.abs(weight2 - prevWeight2) >= THRESHOLDS.weight.minChange
      ) {
        const change    = weight2 - prevWeight2;
        const direction = change > 0 ? 'increased' : 'decreased';
        triggerNotification(
          'INFO',
          'Weight Change Detected',
          `Scale 2 weight ${direction} by ${Math.abs(change).toFixed(1)}kg (${prevWeight2.toFixed(1)}kg → ${weight2.toFixed(1)}kg).`,
          current
        );
      }

      // ── Temperature ─────────────────────────────────────────────────────
      const tempCritical =
        temp !== null &&
        (temp >= THRESHOLDS.temperature.criticalMax ||
          temp <= THRESHOLDS.temperature.criticalMin);
      const prevTempCrit =
        prevTemp !== null &&
        (prevTemp >= THRESHOLDS.temperature.criticalMax ||
          prevTemp <= THRESHOLDS.temperature.criticalMin);

      if (tempCritical && !prevTempCrit) {
        triggerNotification(
          'CRITICAL',
          'Critical Temperature Alert',
          `Critical: Temperature reached ${temp!.toFixed(1)}°C. Immediate action required.`,
          current
        );
      } else {
        const tempWarn =
          temp !== null &&
          (temp >= THRESHOLDS.temperature.warningMax ||
            temp <= THRESHOLDS.temperature.warningMin);
        const prevTempWarn =
          prevTemp !== null &&
          (prevTemp >= THRESHOLDS.temperature.warningMax ||
            prevTemp <= THRESHOLDS.temperature.warningMin);

        if (tempWarn && !prevTempWarn && !prevTempCrit) {
          triggerNotification(
            'WARNING',
            'Temperature Warning',
            `Warning: Temperature is approaching threshold (${temp!.toFixed(1)}°C).`,
            current
          );
        }
      }

      // Low temperature (rice husk alert)
      if (temp !== null && temp < THRESHOLDS.temperature.lowThreshold && (prevTemp === null || prevTemp >= THRESHOLDS.temperature.lowThreshold)) {
        triggerNotification(
          'WARNING',
          'Low Temperature Alert',
          'Temperature dropped below threshold. Please add some rice husk.',
          current
        );
      }

      // ── Humidity ────────────────────────────────────────────────────────
      if (
        humidity !== null &&
        humidity >= THRESHOLDS.humidity.criticalMax &&
        (prevHumidity === null || prevHumidity < THRESHOLDS.humidity.criticalMax)
      ) {
        triggerNotification(
          'CRITICAL',
          'Critical Humidity Alert',
          `Critical: Humidity reached ${humidity.toFixed(1)}%. Immediate action required.`,
          current
        );
      } else if (
        humidity !== null &&
        humidity >= THRESHOLDS.humidity.warningMax &&
        (prevHumidity === null || prevHumidity < THRESHOLDS.humidity.warningMax)
      ) {
        triggerNotification(
          'WARNING',
          ' Humidity Warning',
          `Warning: Humidity is approaching threshold (${humidity.toFixed(1)}%).`,
          current
        );
      }

      prevSensorRef.current = current;
    },
    [triggerNotification]
  );

  // ── Watch sensor data ───────────────────────────────────────────────────

  useEffect(() => {
    if (sensorData) evaluateSensor(sensorData);
  }, [sensorData, evaluateSensor]);

  // ── Polling ─────────────────────────────────────────────────────────────

  useEffect(() => {
    refresh();
    pollingRef.current = setInterval(refresh, pollingIntervalMs);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [refresh, pollingIntervalMs]);

  // ── Acknowledge ─────────────────────────────────────────────────────────

  const acknowledgeOne = useCallback(
    async (id: string) => {
      try {
        if (!apiBaseUrl || !id) throw new Error('Invalid parameters');

        await axios.patch(
          `${apiBaseUrl}/api/notifications/${id}/read`,
          {},
          { timeout: 10000 }
        );
        setNotifications(prev =>
          prev.map(n => (n._id === id || n.id === id) ? { ...n, isRead: true } : n)
        );
      } catch (err: any) {
        console.error('[acknowledgeOne] failed:', err?.message || err);
      }
    },
    [apiBaseUrl]
  );

  const acknowledgeAll = useCallback(async () => {
    try {
      if (!apiBaseUrl) throw new Error('Invalid API URL');

      await axios.patch(
        `${apiBaseUrl}/api/notifications/read-all`,
        {},
        { timeout: 10000 }
      );
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err: any) {
      console.error('[acknowledgeAll] failed:', err?.message || err);
    }
  }, [apiBaseUrl]);

  // ── Settings helpers ────────────────────────────────────────────────────

  const updateNotificationSettings = useCallback(
    async (settings: Partial<NotificationSettings>) => {
      await notificationService.updateNotificationSettings(settings);
      const updated = notificationService.getSettings();
      setNotificationSettings(updated);
    },
    [notificationService]
  );

  const requestNotificationPermission = useCallback(async (): Promise<boolean> => {
    return notificationService.requestNotificationPermission();
  }, [notificationService]);

  // ── Return ──────────────────────────────────────────────────────────────

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return {
    notifications,
    unreadCount,
    loading,
    error,
    refresh,
    acknowledgeOne,
    acknowledgeAll,
    fcmToken,
    notificationSettings,
    updateNotificationSettings,
    requestNotificationPermission,
  };
};

// Keep the named hook alias so existing imports of useNotificationService still work
// during the transition period — just point them at the merged implementation.
export const useNotificationService = useNotificationServiceNative;

export default NotificationServiceManager;