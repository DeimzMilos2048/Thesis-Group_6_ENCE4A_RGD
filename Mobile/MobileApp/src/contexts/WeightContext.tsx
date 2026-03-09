import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface WeightData {
  [key: number]: {
    before?: number;
    frozen?: boolean;
  };
}

interface AfterWeightData {
  [key: number]: {
    after?: number;
    frozen?: boolean;
  };
}

interface WeightContextType {
  savedWeights: WeightData;
  savedAfterWeights: AfterWeightData;
  updateBeforeWeight: (tray: number, weight: number) => Promise<void>;
  updateAfterWeight: (tray: number, weight: number) => Promise<void>;
  clearWeights: () => Promise<void>;
  loadWeights: () => Promise<void>;
}

const WeightContext = createContext<WeightContextType | undefined>(undefined);

export const useWeight = (): WeightContextType => {
  const context = useContext(WeightContext);
  if (!context) {
    throw new Error('useWeight must be used within a WeightProvider');
  }
  return context;
};

interface WeightProviderProps {
  children: ReactNode;
}

export const WeightProvider: React.FC<WeightProviderProps> = ({ children }) => {
  const [savedWeights, setSavedWeights] = useState<WeightData>({});
  const [savedAfterWeights, setSavedAfterWeights] = useState<AfterWeightData>({});

  // Load weights from AsyncStorage on mount
  useEffect(() => {
    loadWeights();
  }, []);

  const loadWeights = async () => {
    try {
      const [weightsStr, afterWeightsStr] = await Promise.all([
        AsyncStorage.getItem('savedWeights'),
        AsyncStorage.getItem('savedAfterWeights'),
      ]);

      if (weightsStr) {
        setSavedWeights(JSON.parse(weightsStr));
      }
      if (afterWeightsStr) {
        setSavedAfterWeights(JSON.parse(afterWeightsStr));
      }
    } catch (error) {
      console.error('Error loading weights:', error);
    }
  };

  const updateBeforeWeight = async (tray: number, weight: number) => {
    try {
      const updated = {
        ...savedWeights,
        [tray]: { before: weight, frozen: true },
      };
      setSavedWeights(updated);
      await AsyncStorage.setItem('savedWeights', JSON.stringify(updated));
    } catch (error) {
      console.error('Error updating before weight:', error);
    }
  };

  const updateAfterWeight = async (tray: number, weight: number) => {
    try {
      const updated = {
        ...savedAfterWeights,
        [tray]: { after: weight, frozen: true },
      };
      setSavedAfterWeights(updated);
      await AsyncStorage.setItem('savedAfterWeights', JSON.stringify(updated));
    } catch (error) {
      console.error('Error updating after weight:', error);
    }
  };

  const clearWeights = async () => {
    try {
      setSavedWeights({});
      setSavedAfterWeights({});
      await Promise.all([
        AsyncStorage.removeItem('savedWeights'),
        AsyncStorage.removeItem('savedAfterWeights'),
      ]);
    } catch (error) {
      console.error('Error clearing weights:', error);
    }
  };

  const value: WeightContextType = {
    savedWeights,
    savedAfterWeights,
    updateBeforeWeight,
    updateAfterWeight,
    clearWeights,
    loadWeights,
  };

  return (
    <WeightContext.Provider value={value}>
      {children}
    </WeightContext.Provider>
  );
};
