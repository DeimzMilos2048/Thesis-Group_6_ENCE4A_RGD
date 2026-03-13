import React, { createContext, useState, useContext, useEffect } from 'react';
import { useSocket } from './SocketContext';
import API_CONFIG from '../config/api.config';

const WeightContext = createContext(null);

const API_URLs = API_CONFIG.baseURLs;
const API_URL = Array.isArray(API_URLs) ? API_URLs[0] : API_URLs;

// Helper functions for localStorage
const saveToLocalStorage = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.warn(`Failed to save ${key} to localStorage:`, error);
  }
};

const loadFromLocalStorage = (key, defaultValue = {}) => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch (error) {
    console.warn(`Failed to load ${key} from localStorage:`, error);
    return defaultValue;
  }
};

async function patchWeightToBackend(tray, beforeWeight, afterWeight) {
  try {
    const token = localStorage.getItem('token');
    if (!token) return null;
    
    // Try primary URL first
    const primaryURL = API_URLs[0];
    try {
      const response = await fetch(`${primaryURL}/api/sensor/latest/weights`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ tray, beforeWeight, afterWeight }),
      });
      
      if (response.ok) {
        console.log(`[Web] Successfully patched weight to backend (${primaryURL})`);
        return response;
      }
    } catch (err) {
      console.warn(`[Web] Primary URL failed: ${err.message}`);
    }
    
    // Only try fallbacks if primary fails
    for (let i = 1; i < API_URLs.length; i++) {
      try {
        const response = await fetch(`${API_URLs[i]}/api/sensor/latest/weights`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ tray, beforeWeight, afterWeight }),
        });
        
        if (response.ok) {
          console.log(`[Web] Successfully patched weight to fallback (${API_URLs[i]})`);
          return response;
        }
      } catch (err) {
        console.warn(`[Web] Fallback ${API_URLs[i]} failed: ${err.message}`);
      }
    }

    console.error('[Web] All API URLs failed for patching weight');
    return null;
  } catch (err) {
    console.error('[Web] Failed to patch weight to backend:', err);
    return null;
  }
}

async function fetchWeightsFromBackend() {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('[Web] No token found, cannot fetch weights from backend');
      return null;
    }

    // Try primary URL first
    const primaryURL = API_URLs[0];
    try {
      const response = await fetch(`${primaryURL}/api/sensor/latest/weights`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`[Web] Fetched weights from primary backend (${primaryURL}):`, data);
        return data;
      }
    } catch (err) {
      console.warn(`[Web] Primary URL failed: ${err.message}`);
    }
    
    // Only try fallbacks if primary fails
    for (let i = 1; i < API_URLs.length; i++) {
      try {
        const response = await fetch(`${API_URLs[i]}/api/sensor/latest/weights`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          console.log(`[Web] Fetched weights from fallback (${API_URLs[i]}):`, data);
          return data;
        }
      } catch (err) {
        console.warn(`[Web] Fallback ${API_URLs[i]} failed: ${err.message}`);
      }
    }

    console.error('[Web] All API URLs failed for fetching weights');
    return null;
  } catch (error) {
    console.error('[Web] Error fetching weights from backend:', error);
    return null;
  }
}

export function WeightProvider({ children }) {
  // Initialize state from localStorage
  const [savedWeights, setSavedWeights] = useState(() => 
    loadFromLocalStorage('savedWeights', {})
  );
  const [savedAfterWeights, setSavedAfterWeights] = useState(() => 
    loadFromLocalStorage('savedAfterWeights', {})
  );
  const socket = useSocket();

  // Save to localStorage whenever state changes
  useEffect(() => {
    saveToLocalStorage('savedWeights', savedWeights);
  }, [savedWeights]);

  useEffect(() => {
    saveToLocalStorage('savedAfterWeights', savedAfterWeights);
  }, [savedAfterWeights]);

  const saveBeforeWeight = (tray, value) => {
    const newWeights = { ...savedWeights, [tray]: { before: value, frozen: true } };
    setSavedWeights(newWeights);
    patchWeightToBackend(tray, value, undefined);
  };

  const saveAfterWeight = (tray, value) => {
    const newAfterWeights = { ...savedAfterWeights, [tray]: { after: value, frozen: true } };
    setSavedAfterWeights(newAfterWeights);
    patchWeightToBackend(tray, undefined, value);
  };

  const resetBeforeWeight = async (tray) => {
    const newWeights = { ...savedWeights };
    delete newWeights[tray];
    setSavedWeights(newWeights);
    
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
    const newAfterWeights = { ...savedAfterWeights };
    delete newAfterWeights[tray];
    setSavedAfterWeights(newAfterWeights);
    
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