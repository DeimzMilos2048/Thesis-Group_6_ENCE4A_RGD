import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface WeightData {
  [key: number]: {
    before?: number;
    frozen?: boolean;
    timestamp?: string;
    unit?: 'kg' | 'g';
  };
}

interface AfterWeightData {
  [key: number]: {
    after?: number;
    frozen?: boolean;
    timestamp?: string;
    unit?: 'kg' | 'g';
  };
}

interface WeightLossData {
  [key: number]: {
    lossPercentage?: number;
    lossAmount?: number;
    calculated?: boolean;
  };
}

interface WeightHistoryEntry {
  tray: number;
  type: 'before' | 'after';
  weight: number;
  timestamp: string;
  unit: 'kg' | 'g';
}

interface WeightContextType {
  savedWeights: WeightData;
  savedAfterWeights: AfterWeightData;
  weightLoss: WeightLossData;
  weightHistory: WeightHistoryEntry[];
  updateBeforeWeight: (tray: number, weight: number, unit?: 'kg' | 'g') => Promise<void>;
  updateAfterWeight: (tray: number, weight: number, unit?: 'kg' | 'g') => Promise<void>;
  clearWeights: () => Promise<void>;
  clearTrayWeights: (tray: number) => Promise<void>;
  loadWeights: () => Promise<void>;
  calculateWeightLoss: (tray: number) => { lossPercentage: number; lossAmount: number } | null;
  getAllWeightLoss: () => WeightLossData;
  exportWeightData: () => string;
  importWeightData: (data: string) => Promise<boolean>;
  getWeightHistory: (tray?: number) => WeightHistoryEntry[];
  isWeightDataComplete: () => boolean;
  getTotalWeightLoss: () => { totalLoss: number; averageLoss: number };
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
  const [weightLoss, setWeightLoss] = useState<WeightLossData>({});
  const [weightHistory, setWeightHistory] = useState<WeightHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load weights from AsyncStorage on mount
  useEffect(() => {
    loadWeights();
  }, []);

  // Recalculate weight loss whenever weights change
  useEffect(() => {
    const lossData = getAllWeightLoss();
    setWeightLoss(lossData);
  }, [savedWeights, savedAfterWeights]);

  const loadWeights = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const [weightsStr, afterWeightsStr, historyStr] = await Promise.all([
        AsyncStorage.getItem('savedWeights'),
        AsyncStorage.getItem('savedAfterWeights'),
        AsyncStorage.getItem('weightHistory'),
      ]);

      if (weightsStr) {
        const weights = JSON.parse(weightsStr);
        setSavedWeights(weights);
      }
      if (afterWeightsStr) {
        const afterWeights = JSON.parse(afterWeightsStr);
        setSavedAfterWeights(afterWeights);
      }
      if (historyStr) {
        const history = JSON.parse(historyStr);
        setWeightHistory(history);
      }
    } catch (error) {
      console.error('Error loading weights:', error);
      setError('Failed to load weight data');
    } finally {
      setIsLoading(false);
    }
  };

  const updateBeforeWeight = async (tray: number, weight: number, unit: 'kg' | 'g' = 'kg') => {
    try {
      setIsLoading(true);
      setError(null);
      
      const timestamp = new Date().toISOString();
      const updated = {
        ...savedWeights,
        [tray]: { before: weight, frozen: true, timestamp, unit },
      };
      setSavedWeights(updated);
      
      // Add to history
      const historyEntry: WeightHistoryEntry = {
        tray,
        type: 'before',
        weight,
        timestamp,
        unit,
      };
      const updatedHistory = [...weightHistory, historyEntry];
      setWeightHistory(updatedHistory);
      
      await Promise.all([
        AsyncStorage.setItem('savedWeights', JSON.stringify(updated)),
        AsyncStorage.setItem('weightHistory', JSON.stringify(updatedHistory)),
      ]);
    } catch (error) {
      console.error('Error updating before weight:', error);
      setError('Failed to update before weight');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const updateAfterWeight = async (tray: number, weight: number, unit: 'kg' | 'g' = 'kg') => {
    try {
      setIsLoading(true);
      setError(null);
      
      const timestamp = new Date().toISOString();
      const updated = {
        ...savedAfterWeights,
        [tray]: { after: weight, frozen: true, timestamp, unit },
      };
      setSavedAfterWeights(updated);
      
      // Add to history
      const historyEntry: WeightHistoryEntry = {
        tray,
        type: 'after',
        weight,
        timestamp,
        unit,
      };
      const updatedHistory = [...weightHistory, historyEntry];
      setWeightHistory(updatedHistory);
      
      await Promise.all([
        AsyncStorage.setItem('savedAfterWeights', JSON.stringify(updated)),
        AsyncStorage.setItem('weightHistory', JSON.stringify(updatedHistory)),
      ]);
    } catch (error) {
      console.error('Error updating after weight:', error);
      setError('Failed to update after weight');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const clearWeights = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      setSavedWeights({});
      setSavedAfterWeights({});
      setWeightHistory([]);
      setWeightLoss({});
      
      await Promise.all([
        AsyncStorage.removeItem('savedWeights'),
        AsyncStorage.removeItem('savedAfterWeights'),
        AsyncStorage.removeItem('weightHistory'),
      ]);
    } catch (error) {
      console.error('Error clearing weights:', error);
      setError('Failed to clear weight data');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const clearTrayWeights = async (tray: number) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const updatedWeights = { ...savedWeights };
      const updatedAfterWeights = { ...savedAfterWeights };
      const updatedHistory = weightHistory.filter(entry => entry.tray !== tray);
      
      delete updatedWeights[tray];
      delete updatedAfterWeights[tray];
      
      setSavedWeights(updatedWeights);
      setSavedAfterWeights(updatedAfterWeights);
      setWeightHistory(updatedHistory);
      
      await Promise.all([
        AsyncStorage.setItem('savedWeights', JSON.stringify(updatedWeights)),
        AsyncStorage.setItem('savedAfterWeights', JSON.stringify(updatedAfterWeights)),
        AsyncStorage.setItem('weightHistory', JSON.stringify(updatedHistory)),
      ]);
    } catch (error) {
      console.error('Error clearing tray weights:', error);
      setError('Failed to clear tray weights');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const calculateWeightLoss = (tray: number) => {
    const beforeWeight = savedWeights[tray]?.before;
    const afterWeight = savedAfterWeights[tray]?.after;
    
    if (beforeWeight && afterWeight && beforeWeight > 0) {
      const lossAmount = beforeWeight - afterWeight;
      const lossPercentage = (lossAmount / beforeWeight) * 100;
      
      return {
        lossPercentage: Math.round(lossPercentage * 100) / 100,
        lossAmount: Math.round(lossAmount * 1000) / 1000,
      };
    }
    
    return null;
  };

  const getAllWeightLoss = () => {
    const lossData: WeightLossData = {};
    
    for (let tray = 1; tray <= 6; tray++) {
      const loss = calculateWeightLoss(tray);
      if (loss) {
        lossData[tray] = {
          lossPercentage: loss.lossPercentage,
          lossAmount: loss.lossAmount,
          calculated: true,
        };
      }
    }
    
    return lossData;
  };

  const exportWeightData = () => {
    const exportData = {
      savedWeights,
      savedAfterWeights,
      weightLoss,
      weightHistory,
      exportDate: new Date().toISOString(),
    };
    
    return JSON.stringify(exportData, null, 2);
  };

  const importWeightData = async (data: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const importData = JSON.parse(data);
      
      if (importData.savedWeights) {
        setSavedWeights(importData.savedWeights);
        await AsyncStorage.setItem('savedWeights', JSON.stringify(importData.savedWeights));
      }
      
      if (importData.savedAfterWeights) {
        setSavedAfterWeights(importData.savedAfterWeights);
        await AsyncStorage.setItem('savedAfterWeights', JSON.stringify(importData.savedAfterWeights));
      }
      
      if (importData.weightHistory) {
        setWeightHistory(importData.weightHistory);
        await AsyncStorage.setItem('weightHistory', JSON.stringify(importData.weightHistory));
      }
      
      return true;
    } catch (error) {
      console.error('Error importing weight data:', error);
      setError('Failed to import weight data');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const getWeightHistory = (tray?: number) => {
    if (tray) {
      return weightHistory.filter(entry => entry.tray === tray);
    }
    return weightHistory;
  };

  const isWeightDataComplete = () => {
    for (let tray = 1; tray <= 6; tray++) {
      const hasBefore = !!savedWeights[tray]?.before;
      const hasAfter = !!savedAfterWeights[tray]?.after;
      
      if (!hasBefore || !hasAfter) {
        return false;
      }
    }
    return true;
  };

  const getTotalWeightLoss = () => {
    let totalLoss = 0;
    let validTrays = 0;
    
    for (let tray = 1; tray <= 6; tray++) {
      const loss = calculateWeightLoss(tray);
      if (loss) {
        totalLoss += loss.lossAmount;
        validTrays++;
      }
    }
    
    const averageLoss = validTrays > 0 ? totalLoss / validTrays : 0;
    
    return {
      totalLoss: Math.round(totalLoss * 1000) / 1000,
      averageLoss: Math.round(averageLoss * 1000) / 1000,
    };
  };

  const value: WeightContextType = {
    savedWeights,
    savedAfterWeights,
    weightLoss,
    weightHistory,
    updateBeforeWeight,
    updateAfterWeight,
    clearWeights,
    clearTrayWeights,
    loadWeights,
    calculateWeightLoss,
    getAllWeightLoss,
    exportWeightData,
    importWeightData,
    getWeightHistory,
    isWeightDataComplete,
    getTotalWeightLoss,
  };

  return (
    <WeightContext.Provider value={value}>
      {children}
    </WeightContext.Provider>
  );
};
