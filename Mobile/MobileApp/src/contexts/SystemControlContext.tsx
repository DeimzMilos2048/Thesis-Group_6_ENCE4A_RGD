import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Alert } from 'react-native';
import FCMService from '../services/FCMService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import dryerService from '../services/dryerService';

interface SystemControlData {
  targetTemperature?: number;
  targetMoisture?: number;
  dryingTime?: number;
  dryingSeconds?: number;
  isDrying?: boolean;
  status?: string;
  timestamp?: string;
}

interface SystemControlContextType {
  systemData: SystemControlData;
  isConnected: boolean;
  userId: string | null;
  initializeSystem: () => Promise<void>;
  startDrying: (temperature: number, moisture: number) => Promise<void>;
  stopDrying: () => Promise<void>;
}

const SystemControlContext = createContext<SystemControlContextType | null>(null);

export const useSystemControl = (): SystemControlContextType => {
  const context = useContext(SystemControlContext);
  if (!context) {
    throw new Error('useSystemControl must be used within SystemControlProvider');
  }
  return context;
};

export const SystemControlProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [systemData, setSystemData] = useState<SystemControlData>({});
  const [isConnected, setIsConnected] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isDrying, setIsDrying] = useState(false);
  const [dryingSeconds, setDryingSeconds] = useState(0);
  const dryingIntervalRef = useRef<any>(null);

  // Drying timer effect with sync
  useEffect(() => {
    console.log('[DryingTimer] isDrying=', isDrying, 'dryingSeconds=', dryingSeconds);
    if (isDrying) {
      console.log('[DryingTimer] Starting interval...');
      dryingIntervalRef.current = setInterval(() => {
        setDryingSeconds(prev => {
          const newSeconds = prev + 1;
          console.log('[DryingTimer] Incrementing:', prev, '->', newSeconds);
          
          // Emit sync to all devices for this user
          if (socket && userId) {
            socket.emit('drying_time_sync', {
              dryingSeconds: newSeconds,
              userId,
              timestamp: new Date().toISOString()
            });
          }
          
          return newSeconds;
        });
      }, 1000);
    } else {
      console.log('[DryingTimer] Clearing interval');
      if (dryingIntervalRef.current) {
        clearInterval(dryingIntervalRef.current);
      }
      // Don't reset dryingSeconds when stopping - keep the final elapsed time
      // It will be set by the dryer:status_updated event from backend
    }

    return () => {
      if (dryingIntervalRef.current) {
        clearInterval(dryingIntervalRef.current);
      }
    };
  }, [isDrying, userId, socket]);

  // Initialize system control
  const initializeSystem = async () => {
    try {
      // Get user ID from AsyncStorage
      const token = await AsyncStorage.getItem('token');
      if (token) {
        // Extract user ID from token or get from user profile
        const savedUserId = await AsyncStorage.getItem('userId');
        if (savedUserId) {
          setUserId(savedUserId);
          
          // Initialize FCM with error handling
          try {
            console.log('Initializing FCM...');
            const fcmInitialized = await FCMService.initializeFCM();
            if (fcmInitialized) {
              await FCMService.registerTokenWithBackend(savedUserId);
              FCMService.setupMessageHandlers();
              console.log('FCM initialized successfully');
            } else {
              console.warn('FCM initialization returned null token, continuing without FCM');
            }
          } catch (fcmError) {
            console.warn('FCM initialization failed, continuing without FCM:', fcmError);
            // Don't fail the entire system if FCM fails
          }
        }
      }

      // Connect to socket for real-time updates
      const SOCKET_URL = __DEV__ 
        ? 'http://192.168.0.109:5001'        
        : 'https://mala-backend-q03k.onrender.com';

      console.log('[Socket] Connecting to:', SOCKET_URL, '(__DEV__=' + __DEV__ + ')');

      const newSocket = io(SOCKET_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: Infinity,
        timeout: 10000,
        forceNew: true,
        autoConnect: true,
        upgrade: true,
      });

      newSocket.on('connect', () => {
        console.log('[Socket] Connected successfully, socket ID:', newSocket.id);
        setIsConnected(true);
      });

      newSocket.on('disconnect', () => {
        console.log('[Socket] Disconnected');
        setIsConnected(false);
      });

      newSocket.on('connect_error', (error) => {
        console.error('[Socket] Connection error:', error);
      });

      // Listen for dryer status updates from backend
      newSocket.on('dryer:status_updated', (data: any) => {
        console.log('[Socket] Dryer status updated:', data);
        
        if (data.status === 'drying') {
          console.log('[Socket] Drying started - Setting isDrying to true and dryingSeconds to 0');
          setIsDrying(true);
          setDryingSeconds(0);
          setSystemData(prev => ({
            ...prev,
            isDrying: true,
            dryingSeconds: 0,
            dryingTime: undefined,
            targetTemperature: data.temperature,
            targetMoisture: data.moisture,
            timestamp: new Date().toISOString(),
          }));
          
          // Send FCM notification for drying started
          FCMService.sendLocalNotification({
            title: 'Drying Started',
            body: `Target: ${data.temperature}°C, Moisture: ${data.moisture}%`,
            data: { type: 'DRYING_STARTED', userId }
          });
          
        } else if (data.status === 'idle') {
          console.log('[Socket] Drying stopped - Setting isDrying to false');
          const elapsedSeconds = data.elapsedSeconds || 0;
          setIsDrying(false);
          setDryingSeconds(elapsedSeconds);
          setSystemData(prev => ({
            ...prev,
            isDrying: false,
            dryingTime: elapsedSeconds,
            dryingSeconds: elapsedSeconds,
            timestamp: new Date().toISOString(),
          }));
          
          // Send FCM notification for drying completed
          const hours = Math.floor(elapsedSeconds / 3600);
          const minutes = Math.floor((elapsedSeconds % 3600) / 60);
          FCMService.sendLocalNotification({
            title: 'Drying Completed',
            body: `Total drying time: ${hours}h ${minutes}m`,
            data: { type: 'DRYING_COMPLETED', userId }
          });
        }
      });

      // Listen for system control updates from web
      newSocket.on('system_control_update', (data: SystemControlData) => {
        console.log('System control update received:', data);
        setSystemData(prev => ({
          ...prev,
          ...data,
          timestamp: new Date().toISOString(),
        }));
      });

      // Listen for drying time updates from backend (sync across all devices)
      newSocket.on('drying_time_sync', (data: { dryingSeconds: number, userId: string, timestamp: string }) => {
        console.log('[Socket] Drying time sync received:', data);
        
        // Only update if it's from the same user or if no user ID is set
        if (!userId || data.userId === userId) {
          setDryingSeconds(data.dryingSeconds);
          setSystemData(prev => ({
            ...prev,
            dryingSeconds: data.dryingSeconds,
            dryingTime: data.dryingSeconds,
            timestamp: data.timestamp,
          }));
        }
      });

      // Listen for user logout notifications
      newSocket.on('user_logout_notification', (data: { userId: string, message: string }) => {
        console.log('[Socket] User logout notification:', data);
        
        if (data.userId === userId) {
          Alert.alert(
            'Session Ended',
            data.message,
            [
              { text: 'OK', onPress: () => {
                // Clear local storage and navigate to login
                AsyncStorage.multiRemove(['token', 'userId', 'fcmToken']);
                // Navigate to login screen (you'll need to implement this navigation)
              }}
            ]
          );
        }
      });

      setSocket(newSocket);

    } catch (error) {
      console.error('Error initializing system control:', error);
    }
  };

  useEffect(() => {
    initializeSystem();

    return () => {
      // Cleanup FCM handlers
      try {
        FCMService.cleanup();
      } catch (error) {
        console.error('Error during FCM cleanup:', error);
      }
      
      // Disconnect socket
      if (socket) {
        socket.disconnect();
      }
    };
  }, []);

  // Sync drying status from backend only on startup and when drying state changes
  useEffect(() => {
    const syncDryingStatus = async () => {
      try {
        const response = await dryerService.getStatus();
        if (response.success && response.data) {
          const { isRunning, elapsedSeconds } = response.data;
          console.log('[Backend Sync] isRunning=', isRunning, 'elapsedSeconds=', elapsedSeconds);
          
          // Only update if state differs from current state
          if (isRunning !== isDrying || (isRunning && Math.abs(elapsedSeconds - dryingSeconds) > 2)) {
            setIsDrying(isRunning);
            setDryingSeconds(elapsedSeconds);
          }
        }
      } catch (error) {
        console.error('Failed to sync drying status from backend:', error);
      }
    };

    // Initial sync only
    syncDryingStatus();
  }, []);

  // Start drying via backend API with sync
  const startDrying = async (temperature: number, moisture: number) => {
    try {
      const response = await dryerService.startDrying(temperature, moisture);
      if (response.success) {
        setIsDrying(true);
        setDryingSeconds(0);
        setSystemData(prev => ({
          ...prev,
          isDrying: true,
          dryingSeconds: 0,
          targetTemperature: temperature,
          targetMoisture: moisture,
          timestamp: new Date().toISOString(),
        }));
        
        // Emit drying time sync to all devices for this user
        if (socket && userId) {
          socket.emit('drying_time_sync', {
            dryingSeconds: 0,
            userId,
            timestamp: new Date().toISOString()
          });
        }
        
        Alert.alert(
          'Drying Started',
          `Target: ${temperature}°C, Moisture: ${moisture}%`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error starting drying:', error);
      Alert.alert('Error', 'Failed to start drying. Please try again.');
      throw error;
    }
  };

  // Stop drying via backend API
  const stopDrying = async () => {
    try {
      const response = await dryerService.stopDrying();
      if (response.success) {
        const elapsedSeconds = response.data?.elapsedSeconds || dryingSeconds;
        setIsDrying(false);
        setDryingSeconds(elapsedSeconds);
        setSystemData(prev => ({
          ...prev,
          isDrying: false,
          dryingTime: elapsedSeconds,
          timestamp: new Date().toISOString(),
        }));
        const hours = Math.floor(elapsedSeconds / 3600);
        const minutes = Math.floor((elapsedSeconds % 3600) / 60);
        Alert.alert(
          'Drying Completed',
          `Total drying time: ${hours}h ${minutes}m`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error stopping drying:', error);
      Alert.alert('Error', 'Failed to stop drying. Please try again.');
      throw error;
    }
  };

  const value: SystemControlContextType = {
    systemData: {
      ...systemData,
      dryingSeconds: dryingSeconds,
      isDrying: isDrying,
    },
    isConnected,
    userId,
    initializeSystem,
    startDrying,
    stopDrying,
  };

  console.log('[Context] Value created with dryingSeconds=', dryingSeconds, 'isDrying=', isDrying);

  return (
    <SystemControlContext.Provider value={value}>
      {children}
    </SystemControlContext.Provider>
  );
};
