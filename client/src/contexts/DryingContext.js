import { createContext, useContext, useState, useEffect, useRef } from 'react';
import dryerService from '../api/dryerService';

const DryingContext = createContext(null);

// Helper functions for localStorage
const saveToLocalStorage = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.warn(`Failed to save ${key} to localStorage:`, error);
  }
};

const loadFromLocalStorage = (key, defaultValue = null) => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch (error) {
    console.warn(`Failed to load ${key} from localStorage:`, error);
    return defaultValue;
  }
};

export function DryingProvider({ children }) {
  const [isProcessing, setIsProcessing] = useState(loadFromLocalStorage('isProcessing', false));
  const [dryingSeconds, setDryingSeconds] = useState(loadFromLocalStorage('dryingSeconds', 0));
  const [selectedTemp, setSelectedTemp] = useState(loadFromLocalStorage('selectedTemp', null));
  const [selectedMoisture, setSelectedMoisture] = useState(loadFromLocalStorage('selectedMoisture', null));
  const [currentTray, setCurrentTray] = useState(loadFromLocalStorage('currentTray', 1));
  const [socket, setSocket] = useState(null);
  const [lastSyncTime, setLastSyncTime] = useState(Date.now());
  const intervalRef = useRef(null);
  const syncIntervalRef = useRef(null);

  // Save to localStorage whenever state changes
  useEffect(() => {
    saveToLocalStorage('isProcessing', isProcessing);
  }, [isProcessing]);

  useEffect(() => {
    saveToLocalStorage('dryingSeconds', dryingSeconds);
  }, [dryingSeconds]);

  useEffect(() => {
    saveToLocalStorage('selectedTemp', selectedTemp);
  }, [selectedTemp]);

  useEffect(() => {
    saveToLocalStorage('selectedMoisture', selectedMoisture);
  }, [selectedMoisture]);

  useEffect(() => {
    saveToLocalStorage('currentTray', currentTray);
  }, [currentTray]);

  // Fetch dryer status from backend periodically
  const syncWithBackend = async () => {
    try {
      const response = await dryerService.getStatus();
      if (response.success && response.data) {
        const { status, isRunning, elapsedSeconds } = response.data;
        setIsProcessing(isRunning);
        setDryingSeconds(elapsedSeconds);
        setLastSyncTime(Date.now());
      }
    } catch (error) {
      console.error('Failed to sync drying status with backend:', error);
    }
  };

  // Sync with backend every 5 seconds
  useEffect(() => {
    syncIntervalRef.current = setInterval(() => {
      syncWithBackend();
    }, 5001);

    // Initial sync
    syncWithBackend();

    return () => clearInterval(syncIntervalRef.current);
  }, []);

  // Timer keeps running regardless of which tab is active
  useEffect(() => {
    if (isProcessing) {
      intervalRef.current = setInterval(() => {
        setDryingSeconds(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [isProcessing]);

  const startDrying = async (temp, moisture) => {
    try {
      setSelectedTemp(temp);
      setSelectedMoisture(moisture);
      
      // Call backend API - backend is source of truth
      const response = await dryerService.startDrying(temp, moisture);
      if (response.success) {
        setIsProcessing(true);
        setDryingSeconds(0);
        
        // Emit socket event to synchronize with mobile and broadcast notifications
        if (socket && socket.connected) {
          socket.emit('drying_started', {
            temperature: temp,
            moisture: moisture,
            timestamp: new Date().toISOString(),
          });
        }
      }
    } catch (error) {
      console.error('Error starting drying:', error);
      setIsProcessing(false);
      throw error;
    }
  };

  const stopDrying = async () => {
    try {
      // Call backend API
      const response = await dryerService.stopDrying();
      if (response.success) {
        const elapsedSeconds = response.data?.elapsedSeconds || dryingSeconds;
        setIsProcessing(false);
        // Reset to zero after stop
        setDryingSeconds(0);
        
        // Emit socket event to synchronize with mobile and broadcast notifications
        if (socket && socket.connected) {
          socket.emit('drying_stopped', {
            dryingSeconds: elapsedSeconds,
            timestamp: new Date().toISOString(),
          });
        }
      }
    } catch (error) {
      console.error('Error stopping drying:', error);
      throw error;
    }
  };

  const formatDryingTime = (seconds) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  return (
    <DryingContext.Provider value={{
      isProcessing,
      dryingSeconds,
      selectedTemp,   setSelectedTemp,
      selectedMoisture, setSelectedMoisture,
      currentTray,    setCurrentTray,
      startDrying,
      stopDrying,
      formatDryingTime,
      setSocket,
    }}>
      {children}
    </DryingContext.Provider>
  );
}

export function useDrying() {
  const ctx = useContext(DryingContext);
  if (!ctx) throw new Error('useDrying must be used inside <DryingProvider>');
  return ctx;
}