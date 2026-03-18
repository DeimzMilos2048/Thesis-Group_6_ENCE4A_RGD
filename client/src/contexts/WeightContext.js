import React, { createContext, useState, useContext } from 'react';
import { useSocket } from './SocketContext';
import API_CONFIG from '../config/api.config';

const WeightContext = createContext(null);

const API_URLs = API_CONFIG.baseURLs;

async function patchWeightToBackend(tray, beforeWeight, afterWeight) {
  try {
    const token = localStorage.getItem('token');
    if (!token) return null;

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
      if (response.ok) return response;
    } catch (err) {
      console.warn(`[Web] Primary URL failed: ${err.message}`);
    }

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
        if (response.ok) return response;
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
    if (!token) return null;

    const primaryURL = API_URLs[0];
    try {
      const response = await fetch(`${primaryURL}/api/sensor/latest/weights`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) return await response.json();
    } catch (err) {
      console.warn(`[Web] Primary URL failed: ${err.message}`);
    }

    for (let i = 1; i < API_URLs.length; i++) {
      try {
        const response = await fetch(`${API_URLs[i]}/api/sensor/latest/weights`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        if (response.ok) return await response.json();
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
  const [savedWeights, setSavedWeights] = useState(() => {
    try {
      const stored = localStorage.getItem('savedWeights');
      return stored ? JSON.parse(stored) : {};
    } catch { return {}; }
  });

  const [savedAfterWeights, setSavedAfterWeights] = useState(() => {
    try {
      const stored = localStorage.getItem('savedAfterWeights');
      return stored ? JSON.parse(stored) : {};
    } catch { return {}; }
  });

  const { socket: socketConnection } = useSocket();

  const saveBeforeWeight = (tray, value) => {
    const newWeights = { ...savedWeights, [tray]: { before: value, frozen: true } };
    setSavedWeights(newWeights);
    localStorage.setItem('savedWeights', JSON.stringify(newWeights));
    
    // Run backend update in background without blocking UI
    setTimeout(() => {
      patchWeightToBackend(tray, value, undefined).catch((err) => {
        console.warn('Failed to save before weight to backend (non-critical):', err);
      });
    }, 0);
  };

  const saveAfterWeight = (tray, value) => {
    const newAfterWeights = { ...savedAfterWeights, [tray]: { after: value, frozen: true } };
    setSavedAfterWeights(newAfterWeights);
    localStorage.setItem('savedAfterWeights', JSON.stringify(newAfterWeights));
    
    // Run backend update in background without blocking UI
    setTimeout(() => {
      patchWeightToBackend(tray, undefined, value).catch((err) => {
        console.warn('Failed to save after weight to backend (non-critical):', err);
      });
    }, 0);
  };

  const resetBeforeWeight = async (tray) => {
    const newWeights = { ...savedWeights };
    delete newWeights[tray];
    setSavedWeights(newWeights);
    localStorage.setItem('savedWeights', JSON.stringify(newWeights));

    await patchWeightToBackend(tray, null, null);

    const freshData = await fetchWeightsFromBackend();
    if (freshData?.afterWeights) {
      setSavedAfterWeights(freshData.afterWeights);
      localStorage.setItem('savedAfterWeights', JSON.stringify(freshData.afterWeights));
    }

    if (socketConnection?.connected) {
      socketConnection.emit('weight:reset_before', {
        tray,
        timestamp: new Date().toISOString(),
      });
    }
  };

  const resetAfterWeight = async (tray) => {
    const newAfterWeights = { ...savedAfterWeights };
    delete newAfterWeights[tray];
    setSavedAfterWeights(newAfterWeights);
    localStorage.setItem('savedAfterWeights', JSON.stringify(newAfterWeights));

    await patchWeightToBackend(tray, null, null);

    const freshData = await fetchWeightsFromBackend();
    if (freshData?.afterWeights) {
      setSavedAfterWeights(freshData.afterWeights);
      localStorage.setItem('savedAfterWeights', JSON.stringify(freshData.afterWeights));
    }

    if (socketConnection?.connected) {
      socketConnection.emit('weight:reset_after', {
        tray,
        timestamp: new Date().toISOString(),
      });
    }
  };

  return (
    <WeightContext.Provider value={{
      savedWeights,
      setSavedWeights,
      savedAfterWeights,
      setSavedAfterWeights,
      saveBeforeWeight,
      saveAfterWeight,
      resetBeforeWeight,
      resetAfterWeight,
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