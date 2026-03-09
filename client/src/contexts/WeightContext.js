import { createContext, useContext, useState } from 'react';

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
  } catch (err) {
    console.error('Failed to patch weight to backend:', err);
  }
}

export function WeightProvider({ children }) {
  const [savedWeights, setSavedWeights] = useState({});
  const [savedAfterWeights, setSavedAfterWeights] = useState({});

  const saveBeforeWeight = (tray, value) => {
    setSavedWeights(prev => ({ ...prev, [tray]: { before: value, frozen: true } }));
    patchWeightToBackend(tray, value, undefined);
  };

  const saveAfterWeight = (tray, value) => {
    setSavedAfterWeights(prev => ({ ...prev, [tray]: { after: value, frozen: true } }));
    patchWeightToBackend(tray, undefined, value);
  };

  const resetBeforeWeight = (tray) => {
    setSavedWeights(prev => { const next = { ...prev }; delete next[tray]; return next; });
  };

  const resetAfterWeight = (tray) => {
    setSavedAfterWeights(prev => { const next = { ...prev }; delete next[tray]; return next; });
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