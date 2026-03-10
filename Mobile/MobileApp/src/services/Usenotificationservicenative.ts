import { useState, useEffect, useCallback, useRef } from 'react';
import { Platform, Vibration } from 'react-native';
import PushNotification from 'react-native-push-notification';
import axios from 'axios';

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
  PushNotification.configure({
    onNotification: (notification) => {
      console.log('[PushNotification] received:', notification);
    },
    permissions: { alert: true, badge: true, sound: true },
    popInitialNotification: true,
    requestPermissions: Platform.OS === 'ios',
  });

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

const showLocalNotification = (type: AlertType, title: string, message: string) => {
  const colorMap: Record<AlertType, string> = {
    CRITICAL: '#ef4444',
    WARNING:  '#f59e0b',
    STABLE:   '#10b981',
    INFO:     '#3b82f6',
  };

  if (type === 'CRITICAL') {
    Vibration.vibrate([0, 500, 200, 500]); 
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

  const triggerNotification = useCallback(async (
    type: AlertType,
    title: string,
    message: string,
    snapshot: SensorSnapshot
  ) => {

    showLocalNotification(type, title, message);

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