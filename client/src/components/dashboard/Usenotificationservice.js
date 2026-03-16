import { useState, useEffect, useCallback, useRef } from 'react';
import axios from '../../utils/axios';
import { useSocket } from '../../contexts/SocketContext';

const THRESHOLDS = {
  moisture: { critical: 18, warning: 15, stable: 14 },
  temperature: { criticalMax: 50, warningMax: 45, lowThreshold: 36 },
  humidity: { criticalMax: 95, warningMax: 85 },
  weight: { minChange: 0.5 }, // Minimum weight change in kg to trigger notification
};

let toastIdCounter = 0;

const useNotificationService = (sensorData, pollingIntervalMs = 5001, isMonitoring = false, isDryingActive = false) => {
  const [toasts, setToasts] = useState([]);          
  const [alerts, setAlerts] = useState([]);      
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [apiSensorData, setApiSensorData] = useState(null);
  const [hasReachedTarget, setHasReachedTarget] = useState(false);

  const prevSensorRef = useRef(null);
  const pollingRef = useRef(null);
  const sensorPollingRef = useRef(null);
  
  // Get Socket.io instance from hook
  const { socket } = useSocket();

  // Fetch current sensor data from API
  const fetchSensorData = useCallback(async () => {
    try {
      const response = await axios.get('/api/sensor/latest');
      if (response.data) {
        const sensorData = response.data;
        setApiSensorData(sensorData);
        
        // Evaluate thresholds for API data
        evaluateSensor(sensorData);
        
        // Emit sensor data via socket for real-time updates
        if (socket && socket.connected) {
          socket.emit('sensor:update', sensorData);
        }
      }
    } catch (err) {
      console.error('Failed to fetch sensor data:', err);
      
      // Don't show network errors to user repeatedly
      if (err.message && err.message.includes('Network error')) {
        // Network errors are expected when server is down - don't spam console
        return;
      }
      
      // For other errors, show them
      if (err.response) {
        console.error('Server responded with error:', err.response.status, err.response.data);
      } else if (err.request) {
        console.error('No response received from server - check if server is running');
      }
    }
  }, [socket]);

  const addToast = useCallback((type, message, title) => {
    const id = ++toastIdCounter;
    const toast = { id, type, message, title, timestamp: new Date() };
    setToasts(prev => [toast, ...prev].slice(0, 6)); 

    // auto-dismiss after 5 s
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5001);

    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/notifications');
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

  const triggerNotification = useCallback(async (type, title, message, sensorSnapshot, eventData = 'SENSOR_ALERT', trayNumber = null, isForeground = true) => {
    // Show toast immediately for foreground notifications
    if (isForeground) {
      addToast(type.toLowerCase(), message, title);
    }

    try {
      // Save notification to database
      const notificationPayload = {
        type,           
        title,
        message,
        sensorData: sensorSnapshot,
        event: eventData,
        source: 'SENSOR',
        deviceId: sensorSnapshot.deviceId || 'ESP32_001',
        timestamp: new Date().toISOString(),
        platform: 'web',
        isForeground: isForeground,
        // Add formatted sensor data for display
        formattedSensorData: {
          temperature: sensorSnapshot.temperature != null ? `${sensorSnapshot.temperature}°C` : 'N/A°C',
          moistureavg: sensorSnapshot.moistureavg != null ? `${sensorSnapshot.moistureavg.toFixed(1)}%` : 'N/A%',
          moisture1: sensorSnapshot.moisture1 != null ? `${sensorSnapshot.moisture1}%` : 'N/A%',
          moisture2: sensorSnapshot.moisture2 != null ? `${sensorSnapshot.moisture2}%` : 'N/A%',
          humidity: sensorSnapshot.humidity != null ? `${sensorSnapshot.humidity}%` : 'N/A%',
          weight1: sensorSnapshot.weight1 != null ? `${sensorSnapshot.weight1}kg` : 'N/Akg',
          weight2: sensorSnapshot.weight2 != null ? `${sensorSnapshot.weight2}kg` : 'N/Akg'
        }
      };

      // Add tray_number if provided
      if (trayNumber && eventData === 'TRAY_READY') {
        notificationPayload.tray_number = trayNumber;
      }

      await axios.post('/api/notifications', notificationPayload);
      await fetchNotifications();

      // Emit real-time notification via socket
      if (socket && socket.connected) {
        socket.emit('notification:trigger', notificationPayload);
        
        // Emit platform-specific events
        if (isForeground) {
          socket.emit('notification:web:foreground', notificationPayload);
        } else {
          socket.emit('notification:web:background', notificationPayload);
        }
      }

      console.log(`✓ ${eventData} notification triggered (${isForeground ? 'foreground' : 'background'}):`, title);
    } catch (err) {
      console.error('Failed to save notification:', err);
    }
  }, [addToast, fetchNotifications, socket]);

  const evaluateSensor = useCallback((current) => {
    if (!current) return;
    
    // Only evaluate and trigger notifications if drying is active AND monitoring is enabled
    if (!isMonitoring || !isDryingActive) return;
    
    const prev = prevSensorRef.current;

    // Helper function to format sensor values with N/A fallback
    const formatValue = (value, unit = '', decimals = 1) => {
      if (value === null || value === undefined || isNaN(value)) {
        return `N/A${unit}`;
      }
      return `${parseFloat(value).toFixed(decimals)}${unit}`;
    };

    const moistureAvg = current.moistureavg ?? null;
    const temp        = current.temperature  ?? null;
    const humidity    = current.humidity     ?? null;

    // Only fire once per threshold crossing (compare with previous value)
    const prevMoistureAvg = prev?.moistureavg ?? null;
    const prevTemp        = prev?.temperature  ?? null;
    const prevHumidity    = prev?.humidity     ?? null;

    // Check if any tray has reached 14% - if so, stop further notifications
    const anyTrayReachedTarget = [1, 2, 3, 4, 5, 6].some(trayNum => {
      const trayMoisture = current[`moisture${trayNum}`] ?? null;
      return trayMoisture !== null && trayMoisture <= 14 && trayMoisture > 0;
    });

    // Update hasReachedTarget state
    if (anyTrayReachedTarget && !hasReachedTarget) {
      setHasReachedTarget(true);
    }

    // Stop notifications if target has been reached
    if (hasReachedTarget) return;

    // ── INDIVIDUAL TRAY MOISTURE THRESHOLDS (14% threshold) ──
    [1, 2, 3, 4, 5, 6].forEach(trayNum => {
      const trayMoisture = current[`moisture${trayNum}`] ?? null;
      const prevTrayMoisture = prev?.[`moisture${trayNum}`] ?? null;
      
      // Check if individual tray reached 14% threshold
      if (trayMoisture !== null && trayMoisture <= 14 && trayMoisture > 0 && 
          (prevTrayMoisture === null || prevTrayMoisture > 14)) {
        triggerNotification(
          'SUCCESS',
          `Tray ${trayNum} Ready for Removal`,
          `Tray ${trayNum} moisture content reached 14% (${formatValue(trayMoisture, '%')}). Please take out the tray.`,
          current,
          'TRAY_READY',
          trayNum
        );
      }
    });

    // ── AVERAGE MOISTURE THRESHOLDS (13-14% stable) ──
    if (moistureAvg !== null && moistureAvg >= THRESHOLDS.moisture.stable && moistureAvg <= THRESHOLDS.moisture.stable + 1 && 
        (prevMoistureAvg === null || prevMoistureAvg < THRESHOLDS.moisture.stable || prevMoistureAvg > THRESHOLDS.moisture.stable + 1)) {
      triggerNotification(
        'STABLE',
        'Tray Ready for Removal',
        `Average moisture content is optimal (${formatValue(moistureAvg, '%')}). Tray is ready for removal.`,
        current,
        'TRAY_READY'
      );
    } else if (moistureAvg !== null && moistureAvg >= THRESHOLDS.moisture.warning && 
               (prevMoistureAvg === null || prevMoistureAvg < THRESHOLDS.moisture.warning)) {
      triggerNotification(
        'WARNING',
        'Moisture Warning',
        `Warning: Average moisture level is approaching threshold (${formatValue(moistureAvg, '%')}). Monitor closely.`,
        current,
        'MOISTURE_WARNING'
      );
    } else if (moistureAvg !== null && moistureAvg >= THRESHOLDS.moisture.critical && 
               (prevMoistureAvg === null || prevMoistureAvg < THRESHOLDS.moisture.critical)) {
      triggerNotification(
        'CRITICAL',
        'Critical Moisture Alert',
        `Critical: Average moisture level reached ${formatValue(moistureAvg, '%')}. Immediate action required.`,
        current,
        'MOISTURE_CRITICAL'
      );
    }

    // ── WEIGHT CHANGE NOTIFICATIONS ──
    const weight1 = current.weight1 ?? null;
    const weight2 = current.weight2 ?? null;
    const prevWeight1 = prev?.weight1 ?? null;
    const prevWeight2 = prev?.weight2 ?? null;

    // Check for significant weight change on scale 1
    if (weight1 !== null && prevWeight1 !== null && Math.abs(weight1 - prevWeight1) >= THRESHOLDS.weight.minChange) {
      const change = weight1 - prevWeight1;
      const direction = change > 0 ? 'increased' : 'decreased';
      triggerNotification(
        'INFO',
        'Weight Change Detected',
        `Scale 1 weight ${direction} by ${Math.abs(change).toFixed(1)}kg (${formatValue(prevWeight1, 'kg')} → ${formatValue(weight1, 'kg')}).`,
        current,
        'WEIGHT_CHANGE'
      );
    }

    // Check for significant weight change on scale 2
    if (weight2 !== null && prevWeight2 !== null && Math.abs(weight2 - prevWeight2) >= THRESHOLDS.weight.minChange) {
      const change = weight2 - prevWeight2;
      const direction = change > 0 ? 'increased' : 'decreased';
      triggerNotification(
        'INFO',
        'Weight Change Detected',
        `Scale 2 weight ${direction} by ${Math.abs(change).toFixed(1)}kg (${formatValue(prevWeight2, 'kg')} → ${formatValue(weight2, 'kg')}).`,
        current,
        'WEIGHT_CHANGE'
      );
    }

    // ── TEMPERATURE THRESHOLDS ──
    if (temp !== null && temp >= THRESHOLDS.temperature.criticalMax && 
        (prevTemp === null || prevTemp < THRESHOLDS.temperature.criticalMax)) {
      triggerNotification(
        'CRITICAL',
        'Critical Temperature Alert',
        `Critical: Temperature reached ${formatValue(temp, '°C')}. Immediate action required.`,
        current,
        'TEMPERATURE_CRITICAL'
      );
    } else if (temp !== null && temp >= THRESHOLDS.temperature.warningMax && 
               (prevTemp === null || prevTemp < THRESHOLDS.temperature.warningMax)) {
      triggerNotification(
        'WARNING',
        'Temperature Warning',
        `Warning: Temperature exceeded ${THRESHOLDS.temperature.warningMax}°C (${formatValue(temp, '°C')}). Monitor closely.`,
        current,
        'TEMPERATURE_WARNING'
      );
    } else if (temp !== null && temp < THRESHOLDS.temperature.lowThreshold && 
               (prevTemp === null || prevTemp >= THRESHOLDS.temperature.lowThreshold)) {
      triggerNotification(
        'WARNING',
        'Low Temperature Alert',
        `Please put some rice husk to maintain heat. Current temperature: ${formatValue(temp, '°C')}.`,
        current,
        'TEMPERATURE_WARNING'
      );
    }

    // ── HUMIDITY THRESHOLDS ──
    if (humidity !== null && humidity >= THRESHOLDS.humidity.criticalMax && 
        (prevHumidity === null || prevHumidity < THRESHOLDS.humidity.criticalMax)) {
      triggerNotification(
        'CRITICAL',
        'Critical Humidity Alert',
        `Critical: Humidity reached ${formatValue(humidity, '%')}. Immediate action required.`,
        current,
        'HUMIDITY_CRITICAL'
      );
    } else if (humidity !== null && humidity >= THRESHOLDS.humidity.warningMax && 
               (prevHumidity === null || prevHumidity < THRESHOLDS.humidity.warningMax)) {
      triggerNotification(
        'WARNING',
        'Humidity Warning',
        `Warning: Humidity is approaching threshold (${formatValue(humidity, '%')}). Increase ventilation.`,
        current,
        'HUMIDITY_WARNING'
      );
    }

    // Store current sensor data for next comparison
    prevSensorRef.current = current;
  }, [triggerNotification, isMonitoring]);

  // ── API SENSOR DATA POLLING ──────────────────────────────────────────────
  
  useEffect(() => {
    // Fetch sensor data immediately
    fetchSensorData();
    
    // Set up polling for sensor data
    sensorPollingRef.current = setInterval(fetchSensorData, 5001); // Poll every 5 seconds
    
    return () => {
      if (sensorPollingRef.current) {
        clearInterval(sensorPollingRef.current);
      }
    };
  }, [fetchSensorData]);

  // Reset target state when drying stops
  useEffect(() => {
    if (!isDryingActive) {
      setHasReachedTarget(false);
    }
  }, [isDryingActive]);

  // ── watch sensor data changes (both prop and API) ──────────────────────────
  
  useEffect(() => {
    // Use API sensor data if available, otherwise use prop sensor data
    const currentSensorData = apiSensorData || sensorData;
    if (currentSensorData) {
      evaluateSensor(currentSensorData);
    }
  }, [sensorData, apiSensorData, evaluateSensor, isDryingActive]);

  // ── poll backend for new notifications ────────────────────────────────────

  useEffect(() => {
    fetchNotifications();
    pollingRef.current = setInterval(fetchNotifications, pollingIntervalMs);
    return () => clearInterval(pollingRef.current);
  }, [fetchNotifications, pollingIntervalMs]);

  // ── listen to real-time notifications via Socket.io ───────────────────────

  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = (notification) => {
      console.log('✓ Real-time notification received:', notification);
      
      // Add to alerts list
      setAlerts(prev => [notification, ...prev]);
      
      // Update unread count
      if (!notification.isRead) {
        setUnreadCount(prev => prev + 1);
      }
      
      // Show toast
      const mapType = (type) => {
        if (type === 'CRITICAL') return 'critical';
        if (type === 'WARNING') return 'warning';
        return 'info';
      };
      
      addToast(mapType(notification.type), notification.message, notification.title);
    };

    // Listen for sensor threshold alerts from backend
    const handleSensorAlert = (alertData) => {
      console.log('✓ Sensor alert received:', alertData);
      evaluateSensor(alertData.sensorData);
    };

    socket.on('notification:new', handleNewNotification);
    socket.on('sensor:alert', handleSensorAlert);

    return () => {
      socket.off('notification:new', handleNewNotification);
      socket.off('sensor:alert', handleSensorAlert);
    };
  }, [socket, addToast, evaluateSensor]);

  // ── acknowledge helpers ───────────────────────────────────────────────────

  const acknowledgeOne = useCallback(async (id) => {
    try {
      await axios.patch(`/api/notifications/${id}/read`);
      setAlerts(prev => prev.map(a => a._id === id ? { ...a, isRead: true } : a));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Acknowledge failed:', err);
    }
  }, []);

  const acknowledgeAll = useCallback(async () => {
    try {
      await axios.patch('/api/notifications/read-all');
      setAlerts(prev => prev.map(a => ({ ...a, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Mark all read failed:', err);
    }
  }, []);

  const markAllAsUnread = useCallback(async () => {
    try {
      const result = await axios.patch('/api/notifications/unread-all');
      setAlerts(prev => prev.map(a => ({ ...a, isRead: false })));
      setUnreadCount(alerts.length);
    } catch (err) {
      console.error('Mark all unread failed:', err);
    }
  }, [alerts.length]);

  const deleteOne = useCallback(async (id) => {
    try {
      await axios.delete(`/api/notifications/${id}`);
      const deletedAlert = alerts.find(a => a._id === id);
      setAlerts(prev => prev.filter(a => a._id !== id));
      if (deletedAlert && !deletedAlert.isRead) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Delete failed:', err);
    }
  }, [alerts]);

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
    markAllAsUnread,
    deleteOne,
    apiSensorData, // Expose API sensor data for debugging
  };
}

export default useNotificationService;