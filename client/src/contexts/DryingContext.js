import { createContext, useContext, useState, useEffect, useRef } from 'react';
import dryerService from '../api/dryerService';

const DryingContext = createContext(null);

export function DryingProvider({ children }) {
  const [isProcessing,   setIsProcessing]   = useState(false);
  const [dryingSeconds,  setDryingSeconds]  = useState(0);
  const [selectedTemp,   setSelectedTemp]   = useState(null);
  const [selectedMoisture, setSelectedMoisture] = useState(null);
  const [currentTray,    setCurrentTray]    = useState(1);
  const [socket, setSocket] = useState(null);
  const [lastSyncTime, setLastSyncTime] = useState(Date.now());
  const intervalRef = useRef(null);
  const syncIntervalRef = useRef(null);

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
    }, 5000);

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