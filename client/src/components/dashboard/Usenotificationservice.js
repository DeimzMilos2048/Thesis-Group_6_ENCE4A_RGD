import { useState, useEffect, useCallback, useRef } from 'react';
import axios from '../../utils/axios';

// Thresholds for triggering notifications
const THRESHOLDS = {
  moisture: { critical: 18, warning: 15, stable: 13 },
  temperature: { criticalMax: 50, criticalMin: 48, warningMax: 47, warningMin: 46 },
  humidity: { criticalMax: 95, warningMax: 85 },
};

let toastIdCounter = 0;

/**
 * Custom hook that:
 *  - Polls the backend for new notifications
 *  - Evaluates incoming sensor data against thresholds
 *  - Returns toast state + helpers consumed by Notification.jsx / Dashboard.jsx
 */
const useNotificationService = (sensorData = null, pollingIntervalMs = 15000) => {
  const [toasts, setToasts] = useState([]);          // active popup toasts
  const [alerts, setAlerts] = useState([]);          // full alert list from DB
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const prevSensorRef = useRef(null);
  const pollingRef = useRef(null);

  // ── helpers ────────────────────────────────────────────────────────────────

  const addToast = useCallback((type, message, title) => {
    const id = ++toastIdCounter;
    const toast = { id, type, message, title, timestamp: new Date() };
    setToasts(prev => [toast, ...prev].slice(0, 6)); // max 6 visible

    // auto-dismiss after 5 s
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);

    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // ── fetch notifications from DB ────────────────────────────────────────────

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get('/notifications');
      const data = Array.isArray(res.data) ? res.data : [];
      setAlerts(data);
      setUnreadCount(data.filter(a => !a.isRead).length);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to fetch notifications');
    } finally {
      setLoading(false);
    }
  }, []);

  // ── save notification to DB and show toast ─────────────────────────────────

  const triggerNotification = useCallback(async (type, title, message, sensorSnapshot) => {
    addToast(type.toLowerCase(), message, title);

    try {
      await axios.post('/notifications', {
        type,           // 'CRITICAL' | 'WARNING' | 'STABLE'
        title,
        message,
        sensorData: sensorSnapshot,
        event: 'SENSOR_ALERT',
        source: 'SENSOR',
      });
      await fetchNotifications();
    } catch (err) {
      console.error('Failed to save notification:', err);
    }
  }, [addToast, fetchNotifications]);

  // ── evaluate sensor data against thresholds ────────────────────────────────

  const evaluateSensor = useCallback((current) => {
    if (!current) return;
    const prev = prevSensorRef.current;

    const moistureAvg = current.moistureavg ?? 0;
    const temp        = current.temperature  ?? 0;
    const humidity    = current.humidity     ?? 0;

    // Only fire once per threshold crossing (compare with previous value)
    const prevMoistureAvg = prev?.moistureavg ?? 0;
    const prevTemp        = prev?.temperature  ?? 0;
    const prevHumidity    = prev?.humidity     ?? 0;

    // ── MOISTURE ──
    if (moistureAvg >= THRESHOLDS.moisture.critical && prevMoistureAvg < THRESHOLDS.moisture.critical) {
      triggerNotification(
        'CRITICAL',
        'Critical Moisture Alert',
        `Critical: Moisture level reached ${moistureAvg.toFixed(1)}%. Immediate action required.`,
        current
      );
    } else if (moistureAvg >= THRESHOLDS.moisture.warning && prevMoistureAvg < THRESHOLDS.moisture.warning) {
      triggerNotification(
        'WARNING',
        'Moisture Warning',
        `Warning: Moisture level is approaching the threshold (${moistureAvg.toFixed(1)}%).`,
        current
      );
    } else if (moistureAvg <= THRESHOLDS.moisture.stable && prevMoistureAvg > THRESHOLDS.moisture.stable) {
      triggerNotification(
        'STABLE',
        'Moisture Stable',
        `Stable: Moisture level is within the safe range (${moistureAvg.toFixed(1)}%).`,
        current
      );
    }

    // ── TEMPERATURE ──
    if ((temp >= THRESHOLDS.temperature.criticalMax || temp <= THRESHOLDS.temperature.criticalMin) &&
        !(prevTemp >= THRESHOLDS.temperature.criticalMax || prevTemp <= THRESHOLDS.temperature.criticalMin)) {
      triggerNotification(
        'CRITICAL',
        'Critical Temperature Alert',
        `Critical: Temperature reached ${temp.toFixed(1)}°C. Immediate action required.`,
        current
      );
    } else if ((temp >= THRESHOLDS.temperature.warningMax || temp <= THRESHOLDS.temperature.warningMin) &&
               !(prevTemp >= THRESHOLDS.temperature.warningMax || prevTemp <= THRESHOLDS.temperature.warningMin)) {
      triggerNotification(
        'WARNING',
        'Temperature Warning',
        `Warning: Temperature is approaching threshold (${temp.toFixed(1)}°C).`,
        current
      );
    }

    // ── HUMIDITY ──
    if (humidity >= THRESHOLDS.humidity.criticalMax && prevHumidity < THRESHOLDS.humidity.criticalMax) {
      triggerNotification(
        'CRITICAL',
        'Critical Humidity Alert',
        `Critical: Humidity reached ${humidity.toFixed(1)}%. Immediate action required.`,
        current
      );
    } else if (humidity >= THRESHOLDS.humidity.warningMax && prevHumidity < THRESHOLDS.humidity.warningMax) {
      triggerNotification(
        'WARNING',
        'Humidity Warning',
        `Warning: Humidity is approaching threshold (${humidity.toFixed(1)}%).`,
        current
      );
    }

    prevSensorRef.current = current;
  }, [triggerNotification]);

  // ── watch sensor data changes ──────────────────────────────────────────────

  useEffect(() => {
    if (sensorData) evaluateSensor(sensorData);
  }, [sensorData, evaluateSensor]);

  // ── poll backend for new notifications ────────────────────────────────────

  useEffect(() => {
    fetchNotifications();
    pollingRef.current = setInterval(fetchNotifications, pollingIntervalMs);
    return () => clearInterval(pollingRef.current);
  }, [fetchNotifications, pollingIntervalMs]);

  // ── acknowledge helpers ───────────────────────────────────────────────────

  const acknowledgeOne = useCallback(async (id) => {
    try {
      await axios.patch(`/notifications/${id}/read`);
      setAlerts(prev => prev.map(a => a._id === id ? { ...a, isRead: true } : a));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Acknowledge failed:', err);
    }
  }, []);

  const acknowledgeAll = useCallback(async () => {
    try {
      await axios.patch('/notifications/read-all');
      setAlerts(prev => prev.map(a => ({ ...a, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Mark all read failed:', err);
    }
  }, []);

  return {
    toasts,
    removeToast,
    alerts,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    acknowledgeOne,
    acknowledgeAll,
  };
};

export default useNotificationService;