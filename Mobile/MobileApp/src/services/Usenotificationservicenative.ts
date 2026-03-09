import { useState, useEffect, useCallback, useRef } from 'react';
import { Platform, Vibration } from 'react-native';
import PushNotification from 'react-native-push-notification';
import axios from 'axios';

// ── Threshold constants ─────────────────────────────────────────────────────
const THRESHOLDS = {
  moisture: { critical: 18, warning: 15, stable: 14 },
  temperature: { criticalMax: 50, criticalMin: 35, warningMax: 47, warningMin: 38 },
  humidity: { criticalMax: 95, warningMax: 85 },
};

// ── Types ───────────────────────────────────────────────────────────────────
export type AlertType = 'CRITICAL' | 'WARNING' | 'STABLE';

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

// ── Configure PushNotification channels (call once at app startup) ──────────
export const configurePushNotifications = () => {
  PushNotification.configure({
    onNotification: (notification) => {
      console.log('[PushNotification] received:', notification);
    },
    permissions: { alert: true, badge: true, sound: true },
    popInitialNotification: true,
    requestPermissions: Platform.OS === 'ios',
  });

  // Android channel
  PushNotification.createChannel(
    {
      channelId: 'iot-alerts',
      channelName: 'IoT Sensor Alerts',
      channelDescription: 'Rice Dryer sensor threshold alerts',
      soundName: 'default',
      importance: 4,
      vibrate: true,
    },
    (created) => console.log('[PushNotification] channel created:', created)
  );
};

// ── Local notification helpers ──────────────────────────────────────────────
const showLocalNotification = (type: AlertType, title: string, message: string) => {
  const colorMap: Record<AlertType, string> = {
    CRITICAL: '#ef4444',
    WARNING:  '#f59e0b',
    STABLE:   '#10b981',
  };

  if (type === 'CRITICAL') {
    Vibration.vibrate([0, 500, 200, 500]); // pattern: wait, on, off, on
  }

  PushNotification.localNotification({
    channelId: 'iot-alerts',
    title,
    message,
    color: colorMap[type],
    priority: type === 'CRITICAL' ? 'max' : type === 'WARNING' ? 'high' : 'default',
    importance: type === 'CRITICAL' ? 'max' : type === 'WARNING' ? 'high' : 'default',
    playSound: true,
    soundName: 'default',
    vibrate: type !== 'STABLE',
    vibration: type === 'CRITICAL' ? 1000 : 300,
    smallIcon: 'ic_notification',
    largeIcon: '',
  });
};

// ── Main hook ───────────────────────────────────────────────────────────────
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

  // ── fetch from backend ───────────────────────────────────────────────────
  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${apiBaseUrl}/api/notifications`);
      const data: NotificationItem[] = Array.isArray(res.data) ? res.data : [];
      setNotifications(data);
      setError(null);
    } catch (err: any) {
      setError(err.message ?? 'Failed to fetch notifications');
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl]);

  // ── save + push ──────────────────────────────────────────────────────────
  const triggerNotification = useCallback(async (
    type: AlertType,
    title: string,
    message: string,
    snapshot: SensorSnapshot
  ) => {
    // 1. Local push notification (triggers OS notification + vibration if critical)
    showLocalNotification(type, title, message);

    // 2. Persist to backend
    try {
      await axios.post(`${apiBaseUrl}/api/notifications`, {
        type,
        title,
        message,
        sensorData: snapshot,
        event: 'SENSOR_ALERT',
        source: 'SENSOR',
      });
      await refresh();
    } catch (err) {
      console.error('[useNotificationService] save failed:', err);
    }
  }, [apiBaseUrl, refresh]);

  // ── threshold evaluation ─────────────────────────────────────────────────
  const evaluateSensor = useCallback((current: SensorSnapshot) => {
    const prev = prevSensorRef.current;

    const moistureAvg     = current.moistureavg     ?? 0;
    const temp            = current.temperature      ?? 0;
    const humidity        = current.humidity         ?? 0;
    const prevMoistureAvg = prev?.moistureavg        ?? 0;
    const prevTemp        = prev?.temperature         ?? 0;
    const prevHumidity    = prev?.humidity            ?? 0;

    // MOISTURE
    if (moistureAvg >= THRESHOLDS.moisture.critical && prevMoistureAvg < THRESHOLDS.moisture.critical) {
      triggerNotification('CRITICAL', '🚨 Critical Moisture Alert',
        `Critical: Moisture level reached ${moistureAvg.toFixed(1)}%. Immediate action required.`, current);
    } else if (moistureAvg >= THRESHOLDS.moisture.warning && prevMoistureAvg < THRESHOLDS.moisture.warning) {
      triggerNotification('WARNING', '⚠️ Moisture Warning',
        `Warning: Moisture level is approaching the threshold (${moistureAvg.toFixed(1)}%).`, current);
    } else if (moistureAvg <= THRESHOLDS.moisture.stable && prevMoistureAvg > THRESHOLDS.moisture.stable) {
      triggerNotification('STABLE', '✅ Moisture Stable',
        `Stable: Moisture level is within the safe range (${moistureAvg.toFixed(1)}%).`, current);
    }

    // TEMPERATURE
    const tempCritical = temp >= THRESHOLDS.temperature.criticalMax || temp <= THRESHOLDS.temperature.criticalMin;
    const prevTempCrit = prevTemp >= THRESHOLDS.temperature.criticalMax || prevTemp <= THRESHOLDS.temperature.criticalMin;
    if (tempCritical && !prevTempCrit) {
      triggerNotification('CRITICAL', '🚨 Critical Temperature Alert',
        `Critical: Temperature reached ${temp.toFixed(1)}°C. Immediate action required.`, current);
    } else {
      const tempWarn     = temp >= THRESHOLDS.temperature.warningMax || temp <= THRESHOLDS.temperature.warningMin;
      const prevTempWarn = prevTemp >= THRESHOLDS.temperature.warningMax || prevTemp <= THRESHOLDS.temperature.warningMin;
      if (tempWarn && !prevTempWarn && !prevTempCrit) {
        triggerNotification('WARNING', '⚠️ Temperature Warning',
          `Warning: Temperature is approaching threshold (${temp.toFixed(1)}°C).`, current);
      }
    }
    // Check for low temperature - below 36°C
    if (temp < 36 && prevTemp >= 36) {
      triggerNotification('WARNING', '⚠️ Low Temperature Alert',
        'Please put some rice husk', current);
    }

    // HUMIDITY
    if (humidity >= THRESHOLDS.humidity.criticalMax && prevHumidity < THRESHOLDS.humidity.criticalMax) {
      triggerNotification('CRITICAL', '🚨 Critical Humidity Alert',
        `Critical: Humidity reached ${humidity.toFixed(1)}%. Immediate action required.`, current);
    } else if (humidity >= THRESHOLDS.humidity.warningMax && prevHumidity < THRESHOLDS.humidity.warningMax) {
      triggerNotification('WARNING', '⚠️ Humidity Warning',
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
      await axios.patch(`${apiBaseUrl}/api/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
    } catch (err) {
      console.error('[acknowledgeOne] failed:', err);
    }
  }, [apiBaseUrl]);

  const acknowledgeAll = useCallback(async () => {
    try {
      await axios.patch(`${apiBaseUrl}/api/notifications/read-all`);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('[acknowledgeAll] failed:', err);
    }
  }, [apiBaseUrl]);

  return { notifications, unreadCount, loading, error, refresh, acknowledgeOne, acknowledgeAll };
};

export default useNotificationServiceNative;