import React, { createContext, useState, useContext } from 'react';
import { useSocket } from './SocketContext';

const WeightContext = createContext(null);

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

async function patchWeightToBackend(tray, beforeWeight, afterWeight) {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/api/sensor/latest/weights`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ tray, beforeWeight, afterWeight }),
    });
    if (!response.ok) {
      console.error('Failed to patch weight, status:', response.status);
    }
    return response;
  } catch (err) {
    console.error('Failed to patch weight to backend:', err);
  }
}

async function fetchWeightsFromBackend() {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('[Web] No token found, cannot fetch weights from backend');
      return null;
    }

    const response = await fetch(`${API_URL}/api/sensor/latest/weights`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      console.log('[Web] Fetched weights from backend:', data);
      return data;
    } else {
      console.error('[Web] Failed to fetch weights from backend:', response.status);
      return null;
    }
  } catch (error) {
    console.error('[Web] Error fetching weights from backend:', error);
    return null;
  }
}

export function WeightProvider({ children }) {
  const [savedWeights, setSavedWeights] = useState({});
  const [savedAfterWeights, setSavedAfterWeights] = useState({});
  const socket = useSocket();

  const saveBeforeWeight = (tray, value) => {
    setSavedWeights(prev => ({ ...prev, [tray]: { before: value, frozen: true } }));
    patchWeightToBackend(tray, value, undefined);
  };

  const saveAfterWeight = (tray, value) => {
    setSavedAfterWeights(prev => ({ ...prev, [tray]: { after: value, frozen: true } }));
    patchWeightToBackend(tray, undefined, value);
  };

  const resetBeforeWeight = async (tray) => {
    setSavedWeights(prev => { const next = { ...prev }; delete next[tray]; return next; });
    
    // Clear weight from backend (MongoDB)
    await patchWeightToBackend(tray, null, null);
    
    // Fetch fresh data from backend to ensure consistency
    const freshData = await fetchWeightsFromBackend();
    if (freshData && freshData.weights) {
      setSavedWeights(freshData.weights);
    }
    
    // Emit socket event for mobile app
    const socketConnection = socket?.socket; // Get socket from the object
    console.log('[Web] Socket object:', socket);
    console.log('[Web] Socket connection:', socketConnection);
    console.log('[Web] Socket connected:', socketConnection?.connected);
    
    if (socketConnection && socketConnection.emit) {
      const eventData = { tray, timestamp: new Date().toISOString() };
      console.log('[Web] Emitting weight:reset_before event:', eventData);
      socketConnection.emit('weight:reset_before', eventData);
      console.log(`[Web] Emitted weight reset before event for tray ${tray}`);
    } else {
      console.warn('[Web] Socket not available for weight reset event');
      console.warn('[Web] SocketConnection exists:', !!socketConnection);
      console.warn('[Web] SocketConnection.emit exists:', !!socketConnection?.emit);
    }
  };

  const resetAfterWeight = async (tray) => {
    setSavedAfterWeights(prev => { const next = { ...prev }; delete next[tray]; return next; });
    
    // Clear weight from backend (MongoDB)
    await patchWeightToBackend(tray, null, null);
    
    // Fetch fresh data from backend to ensure consistency
    const freshData = await fetchWeightsFromBackend();
    if (freshData && freshData.afterWeights) {
      setSavedAfterWeights(freshData.afterWeights);
    }
    
    // Emit socket event for mobile app
    const socketConnection = socket?.socket; // Get socket from the object
    console.log('[Web] Socket object:', socket);
    console.log('[Web] Socket connection:', socketConnection);
    console.log('[Web] Socket connected:', socketConnection?.connected);
    
    if (socketConnection && socketConnection.emit) {
      const eventData = { tray, timestamp: new Date().toISOString() };
      console.log('[Web] Emitting weight:reset_after event:', eventData);
      socketConnection.emit('weight:reset_after', eventData);
      console.log(`[Web] Emitted weight reset after event for tray ${tray}`);
    } else {
      console.warn('[Web] Socket not available for weight reset event');
      console.warn('[Web] SocketConnection exists:', !!socketConnection);
      console.warn('[Web] SocketConnection.emit exists:', !!socketConnection?.emit);
    }
  };

  return (
    <WeightContext.Provider value={{
      savedWeights, savedAfterWeights,
      saveBeforeWeight, saveAfterWeight,
      resetBeforeWeight, resetAfterWeight,
    }}>
      {children}
    </WeightContext.Provider>
  );
}

export function useWeight() {
  const ctx = useContext(WeightContext);
  if (!ctx) throw new Error('useWeight must be used inside <WeightProvider>');
  return ctx;
}