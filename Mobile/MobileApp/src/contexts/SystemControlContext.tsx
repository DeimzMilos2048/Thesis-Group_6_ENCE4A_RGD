import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Alert } from 'react-native';
import FCMService from '../services/FCMService';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

  // Drying timer effect
  useEffect(() => {
    console.log('[DryingTimer] isDrying=', isDrying, 'dryingSeconds=', dryingSeconds);
    if (isDrying) {
      console.log('[DryingTimer] Starting interval...');
      dryingIntervalRef.current = setInterval(() => {
        setDryingSeconds(prev => {
          console.log('[DryingTimer] Incrementing:', prev, '->', prev + 1);
          return prev + 1;
        });
      }, 1000);
    } else {
      console.log('[DryingTimer] Clearing interval');
      if (dryingIntervalRef.current) {
        clearInterval(dryingIntervalRef.current);
      }
      setDryingSeconds(0);
    }

    return () => {
      if (dryingIntervalRef.current) {
        clearInterval(dryingIntervalRef.current);
      }
    };
  }, [isDrying]);

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
        timeout: 60000,
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

      // Listen for drying started event
      newSocket.on('drying_started', (data: any) => {
        console.log('[Socket] Drying started event received:', data);
        console.log('[Socket] Setting isDrying to true and dryingSeconds to 0');
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
        
        // Send notification
        Alert.alert(
          'Drying Started',
          `Target: ${data.temperature}°C, Moisture: ${data.moisture}%`,
          [{ text: 'OK' }]
        );
      });

      // Listen for drying stopped event
      newSocket.on('drying_stopped', (data: any) => {
        console.log('[Socket] Drying stopped event received:', data);
        console.log('[Socket] Setting isDrying to false');
        setIsDrying(false);
        setSystemData(prev => ({
          ...prev,
          isDrying: false,
          dryingTime: data.dryingSeconds,
          timestamp: new Date().toISOString(),
        }));
        
        // Send notification
        const hours = Math.floor((data.dryingSeconds || 0) / 3600);
        const minutes = Math.floor(((data.dryingSeconds || 0) % 3600) / 60);
        Alert.alert(
          'Drying Completed',
          `Total drying time: ${hours}h ${minutes}m`,
          [{ text: 'OK' }]
        );
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

      // Listen for drying time updates
      newSocket.on('drying_time_update', (data: { dryingSeconds: number }) => {
        console.log('Drying time update received:', data);
        setSystemData(prev => ({
          ...prev,
          dryingTime: data.dryingSeconds,
          dryingSeconds: data.dryingSeconds,
          timestamp: new Date().toISOString(),
        }));
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

  const value: SystemControlContextType = {
    systemData: {
      ...systemData,
      dryingSeconds: dryingSeconds,
      isDrying: isDrying,
    },
    isConnected,
    userId,
    initializeSystem,
  };

  console.log('[Context] Value created with dryingSeconds=', dryingSeconds, 'isDrying=', isDrying);

  return (
    <SystemControlContext.Provider value={value}>
      {children}
    </SystemControlContext.Provider>
  );
};
