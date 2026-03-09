import { createContext, useContext, useState, useEffect, useRef } from 'react';

const DryingContext = createContext(null);

export function DryingProvider({ children }) {
  const [isProcessing,   setIsProcessing]   = useState(false);
  const [dryingSeconds,  setDryingSeconds]  = useState(0);
  const [selectedTemp,   setSelectedTemp]   = useState(null);
  const [selectedMoisture, setSelectedMoisture] = useState(null);
  const [currentTray,    setCurrentTray]    = useState(1);
  const [socket, setSocket] = useState(null);
  const intervalRef = useRef(null);

  // Timer keeps running regardless of which tab is active
  useEffect(() => {
    if (isProcessing) {
      intervalRef.current = setInterval(() => {
        setDryingSeconds(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
      setDryingSeconds(0);
    }
    return () => clearInterval(intervalRef.current);
  }, [isProcessing]);

  const startDrying = (temp, moisture) => {
    setSelectedTemp(temp);
    setSelectedMoisture(moisture);
    setIsProcessing(true);
    
    // Emit socket event to synchronize with mobile and broadcast notifications
    if (socket && socket.connected) {
      socket.emit('drying_started', {
        temperature: temp,
        moisture: moisture,
        timestamp: new Date().toISOString(),
      });
    }
  };

  const stopDrying = () => {
    setIsProcessing(false);
    
    // Emit socket event to synchronize with mobile and broadcast notifications
    if (socket && socket.connected) {
      socket.emit('drying_stopped', {
        dryingSeconds: dryingSeconds,
        timestamp: new Date().toISOString(),
      });
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