import { useState, useEffect, useCallback, useRef } from 'react';
import { Platform, Vibration } from 'react-native';
import PushNotification from 'react-native-push-notification';
import axios from 'axios';

// Debug flag for troubleshooting
const DEBUG_NOTIFICATIONS = __DEV__; // True in development

const THRESHOLDS = {
  moisture: { critical: 18, warning: 15, stable: 14 },
  temperature: { criticalMax: 50, criticalMin: 35, warningMax: 47, warningMin: 38 },
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

export interface NotificationItem {
  _id: string;
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
}

export const configurePushNotifications = () => {
  try {
    // Configure push notification handler
    PushNotification.configure({
      onNotification: (notification) => {
        console.log('[PushNotification] Notification received:', notification);
      },
      onRegistrationError: (err) => {
        console.error('[PushNotification] Registration Error:', err);
      },
      // Android & iOS permissions
      permissions: {
        alert: true,
        badge: true,
        sound: true,
      },
      // iOS: Pop the notification when it arrives
      popInitialNotification: true,
      // Request permissions on iOS
      requestPermissions: true,
    });

    console.log('[PushNotification] Configuration successful');

    // Create notification channel for Android (required for Android 8.0+)
    if (Platform.OS === 'android') {
      PushNotification.createChannel(
        {
          channelId: 'iot-alerts',
          channelName: 'IoT Sensor Alerts',
          channelDescription: 'Rice Dryer sensor threshold alerts',
          soundName: 'default',
          importance: 4,
          vibrate: true,
          playSound: true,
        },
        (created) => {
          if (created) {
            console.log('[PushNotification] Channel "iot-alerts" created successfully');
          } else {
            console.log('[PushNotification] Channel "iot-alerts" already exists');
          }
        }
      );
    }
  } catch (error) {
    console.error('[PushNotification] Configuration failed:', error);
  }
};

// Counter for unique notification IDs
let notificationCounter = 0;

const showLocalNotification = (type: AlertType, title: string, message: string) => {
  try {
    const colorMap: Record<AlertType, string> = {
      CRITICAL: '#ef4444',
      WARNING:  '#f59e0b',
      STABLE:   '#10b981',
      INFO:     '#3b82f6',
    };

    // Trigger haptic feedback for critical alerts
    if (type === 'CRITICAL') {
      Vibration.vibrate([0, 500, 200, 500]);
    }

    // Generate unique notification ID using timestamp + counter
    notificationCounter = (notificationCounter + 1) % 10000;
    const notificationId = `${Date.now()}-${notificationCounter}`;

    const notificationConfig: any = {
      id: notificationId,
      title: title,
      message: message,
      channelId: 'iot-alerts',
      color: colorMap[type],
      largeIcon: 'ic_launcher',
      smallIcon: 'ic_notification',
      vibrate: type !== 'STABLE',
      playSound: true,
      soundName: 'default',
      autoCancel: true,
      invokeApp: true,
      actions: ['Open'],
      // Priority: 10 = max, 5 = high, 0 = default, -5 = low
      priority: type === 'CRITICAL' ? 10 : type === 'WARNING' ? 5 : 0,
      visibility: type === 'CRITICAL' ? 'public' : 'private',
    };

    // Add vibration pattern for Android
    if (Platform.OS === 'android') {
      notificationConfig.vibration = type === 'CRITICAL' ? 1000 : 300;
    }

    console.log(`[Notification] Triggering ${type} alert:`, title);
    PushNotification.localNotification(notificationConfig);
  } catch (error) {
    console.error('[showLocalNotification] Error:', error);
  }
};

const useNotificationServiceNative = (
  apiBaseUrl: string,
  sensorData: SensorSnapshot | null = null,
  pollingIntervalMs: number = 15000
): UseNotificationServiceReturn => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState<string | null>(null);

  const prevSensorRef = useRef<SensorSnapshot | null>(null);
  const pollingRef    = useRef<ReturnType<typeof setInterval> | null>(null);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      
      // Validate API URL
      if (!apiBaseUrl || typeof apiBaseUrl !== 'string') {
        throw new Error('Invalid API URL provided');
      }
      
      const res = await axios.get(`${apiBaseUrl}/api/notifications`, {
        timeout: 10000,
      });
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

  const triggerNotification = useCallback(async (
    type: AlertType,
    title: string,
    message: string,
    snapshot: SensorSnapshot
  ) => {
    try {
      // Validate inputs
      if (!title || !message) {
        console.warn('[triggerNotification] Missing title or message');
        return;
      }

      // Show local notification on device
      showLocalNotification(type, title, message);

      // Save notification to backend
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
          // Continue - notification was still shown locally
        }
      }
    } catch (err: any) {
      console.error('[triggerNotification] Failed:', err?.message || err);
    }
  }, [apiBaseUrl, refresh]);

  const evaluateSensor = useCallback((current: SensorSnapshot) => {
    const prev = prevSensorRef.current;

    const moistureAvg     = current.moistureavg     ?? null;
    const temp            = current.temperature      ?? null;
    const humidity        = current.humidity         ?? null;
    const prevMoistureAvg = prev?.moistureavg        ?? null;
    const prevTemp        = prev?.temperature         ?? null;
    const prevHumidity    = prev?.humidity            ?? null;

    if (moistureAvg !== null && moistureAvg >= THRESHOLDS.moisture.stable && moistureAvg <= THRESHOLDS.moisture.stable + 1 && 
        (prevMoistureAvg === null || prevMoistureAvg < THRESHOLDS.moisture.stable || prevMoistureAvg > THRESHOLDS.moisture.stable + 1)) {
      triggerNotification('STABLE', ' Tray Ready for Removal',
        `Average moisture content is optimal (${moistureAvg.toFixed(1)}%). Tray is ready for removal.`, current);
    } else if (moistureAvg !== null && moistureAvg >= THRESHOLDS.moisture.warning && 
               (prevMoistureAvg === null || prevMoistureAvg < THRESHOLDS.moisture.warning)) {
      triggerNotification('WARNING', ' Moisture Warning',
        `Warning: Average moisture level is approaching threshold (${moistureAvg.toFixed(1)}%).`, current);
    } else if (moistureAvg !== null && moistureAvg >= THRESHOLDS.moisture.critical && 
               (prevMoistureAvg === null || prevMoistureAvg < THRESHOLDS.moisture.critical)) {
      triggerNotification('CRITICAL', ' Critical Moisture Alert',
        `Critical: Average moisture level reached ${moistureAvg.toFixed(1)}%. Immediate action required.`, current);
    }

    const weight1 = current.weight1 ?? null;
    const weight2 = current.weight2 ?? null;
    const prevWeight1 = prev?.weight1 ?? null;
    const prevWeight2 = prev?.weight2 ?? null;

    if (weight1 !== null && prevWeight1 !== null && Math.abs(weight1 - prevWeight1) >= THRESHOLDS.weight.minChange) {
      const change = weight1 - prevWeight1;
      const direction = change > 0 ? 'increased' : 'decreased';
      triggerNotification('INFO', ' Weight Change Detected',
        `Scale 1 weight ${direction} by ${Math.abs(change).toFixed(1)}kg (${prevWeight1.toFixed(1)}kg → ${weight1.toFixed(1)}kg).`, current);
    }

    if (weight2 !== null && prevWeight2 !== null && Math.abs(weight2 - prevWeight2) >= THRESHOLDS.weight.minChange) {
      const change = weight2 - prevWeight2;
      const direction = change > 0 ? 'increased' : 'decreased';
      triggerNotification('INFO', ' Weight Change Detected',
        `Scale 2 weight ${direction} by ${Math.abs(change).toFixed(1)}kg (${prevWeight2.toFixed(1)}kg → ${weight2.toFixed(1)}kg).`, current);
    }

    const tempCritical = temp !== null && (temp >= THRESHOLDS.temperature.criticalMax || temp <= THRESHOLDS.temperature.criticalMin);
    const prevTempCrit = prevTemp !== null && (prevTemp >= THRESHOLDS.temperature.criticalMax || prevTemp <= THRESHOLDS.temperature.criticalMin);
    if (tempCritical && !prevTempCrit) {
      triggerNotification('CRITICAL', ' Critical Temperature Alert',
        `Critical: Temperature reached ${temp.toFixed(1)}°C. Immediate action required.`, current);
    } else {
      const tempWarn     = temp !== null && (temp >= THRESHOLDS.temperature.warningMax || temp <= THRESHOLDS.temperature.warningMin);
      const prevTempWarn = prevTemp !== null && (prevTemp >= THRESHOLDS.temperature.warningMax || prevTemp <= THRESHOLDS.temperature.warningMin);
      if (tempWarn && !prevTempWarn && !prevTempCrit) {
        triggerNotification('WARNING', ' Temperature Warning',
          `Warning: Temperature is approaching threshold (${temp.toFixed(1)}°C).`, current);
      }
    }

    if (temp !== null && temp < 36 && (prevTemp === null || prevTemp >= 36)) {
      triggerNotification('WARNING', ' Low Temperature Alert',
        'Please put some rice husk', current);
    }

    if (humidity !== null && humidity >= THRESHOLDS.humidity.criticalMax && 
        (prevHumidity === null || prevHumidity < THRESHOLDS.humidity.criticalMax)) {
      triggerNotification('CRITICAL', ' Critical Humidity Alert',
        `Critical: Humidity reached ${humidity.toFixed(1)}%. Immediate action required.`, current);
    } else if (humidity !== null && humidity >= THRESHOLDS.humidity.warningMax && 
               (prevHumidity === null || prevHumidity < THRESHOLDS.humidity.warningMax)) {
      triggerNotification('WARNING', ' Humidity Warning',
        `Warning: Humidity is approaching threshold (${humidity.toFixed(1)}%).`, current);
    }

    prevSensorRef.current = current;
  }, [triggerNotification]);

  // ── watch sensor data ────────────────────────────────────────────────────
  useEffect(() => {
    if (sensorData) evaluateSensor(sensorData);
  }, [sensorData, evaluateSensor]);

  // ── polling ──────────────────────────────────────────────────────────────
  useEffect(() => {
    refresh();
    pollingRef.current = setInterval(refresh, pollingIntervalMs);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [refresh, pollingIntervalMs]);

  // ── acknowledge ──────────────────────────────────────────────────────────
  const acknowledgeOne = useCallback(async (id: string) => {
    try {
      if (!apiBaseUrl || !id) {
        throw new Error('Invalid parameters');
      }
      
      await axios.patch(
        `${apiBaseUrl}/api/notifications/${id}/read`,
        {},
        { timeout: 10000 }
      );
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
    } catch (err: any) {
      console.error('[acknowledgeOne] failed:', err?.message || err);
    }
  }, [apiBaseUrl]);

  const acknowledgeAll = useCallback(async () => {
    try {
      if (!apiBaseUrl) {
        throw new Error('Invalid API URL');
      }
      
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

  return { notifications, unreadCount, loading, error, refresh, acknowledgeOne, acknowledgeAll };
};

export default useNotificationServiceNative;