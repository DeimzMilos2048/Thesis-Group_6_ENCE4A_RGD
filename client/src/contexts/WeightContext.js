import { createContext, useContext, useState } from 'react';

const WeightContext = createContext(null);

export function WeightProvider({ children }) {
  const [savedWeights, setSavedWeights] = useState({});       // { 1: { before: 1.5, frozen: true }, ... }
  const [savedAfterWeights, setSavedAfterWeights] = useState({}); // { 1: { after: 1.2, frozen: true }, ... }

  const saveBeforeWeight = (tray, value) => {
    setSavedWeights(prev => ({
      ...prev,
      [tray]: { before: value, frozen: true },
    }));
  };

  const saveAfterWeight = (tray, value) => {
    setSavedAfterWeights(prev => ({
      ...prev,
      [tray]: { after: value, frozen: true },
    }));
  };

  return (
    <WeightContext.Provider value={{ savedWeights, savedAfterWeights, saveBeforeWeight, saveAfterWeight }}>
      {children}
    </WeightContext.Provider>
  );
}

export function useWeight() {
  const ctx = useContext(WeightContext);
  if (!ctx) throw new Error('useWeight must be used inside <WeightProvider>');
  return ctx;
}