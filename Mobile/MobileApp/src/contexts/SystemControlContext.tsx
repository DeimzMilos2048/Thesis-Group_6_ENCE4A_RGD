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
  socket: Socket | null;
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

  // FIX: Use a ref for socket so the cleanup effect always has the latest value
  const socketRef = useRef<Socket | null>(null);

  // FIX: Use refs for userId and socket inside callbacks to avoid stale closures
  const userIdRef = useRef<string | null>(null);
  const socketCallbackRef = useRef<Socket | null>(null);

  useEffect(() => {
    userIdRef.current = userId;
  }, [userId]);

  useEffect(() => {
    socketCallbackRef.current = socket;
    socketRef.current = socket;
  }, [socket]);

  // Drying timer effect with sync
  useEffect(() => {
    console.log('[DryingTimer] isDrying=', isDrying, 'dryingSeconds=', dryingSeconds);
    if (isDrying) {
      console.log('[DryingTimer] Starting interval...');
      dryingIntervalRef.current = setInterval(() => {
        setDryingSeconds(prev => {
          const newSeconds = prev + 1;
          console.log('[DryingTimer] Incrementing:', prev, '->', newSeconds);

          // FIX: Use refs to avoid stale closure over socket and userId
          const currentSocket = socketCallbackRef.current;
          const currentUserId = userIdRef.current;
          if (currentSocket && currentUserId) {
            currentSocket.emit('drying_time_sync', {
              dryingSeconds: newSeconds,
              userId: currentUserId,
              timestamp: new Date().toISOString(),
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
    }

    return () => {
      if (dryingIntervalRef.current) {
        clearInterval(dryingIntervalRef.current);
      }
    };
  }, [isDrying]); // FIX: removed userId and socket from deps — accessed via refs instead

  const setupSocketHandlers = (newSocket: Socket) => {
    // FIX: Removed the orphaned `} catch` block that was here in the original
    newSocket.on('disconnect', () => {
      console.log('[Socket] Disconnected');
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error: any) => {
      console.error('[Socket] Connection error:', error);
    });

    // Listen for dryer status updates from backend
    newSocket.on('dryer:status_updated', (data: any) => {
      console.log('[Socket] Dryer status updated:', data);
      const currentUserId = userIdRef.current;

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

        FCMService.sendLocalNotification({
          title: 'Drying Started',
          body: `Target: ${data.temperature}°C, Moisture: ${data.moisture}%`,
          data: { type: 'DRYING_STARTED', userId: currentUserId },
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

        const hours = Math.floor(elapsedSeconds / 3600);
        const minutes = Math.floor((elapsedSeconds % 3600) / 60);
        FCMService.sendLocalNotification({
          title: 'Drying Completed',
          body: `Total drying time: ${hours}h ${minutes}m`,
          data: { type: 'DRYING_COMPLETED', userId: currentUserId },
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

    // Listen for drying time sync across all devices
    newSocket.on('drying_time_sync', (data: { dryingSeconds: number; userId: string; timestamp: string }) => {
      console.log('[Socket] Drying time sync received:', data);
      const currentUserId = userIdRef.current;

      if (!currentUserId || data.userId === currentUserId) {
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
    newSocket.on('user_logout_notification', (data: { userId: string; message: string }) => {
      console.log('[Socket] User logout notification:', data);
      const currentUserId = userIdRef.current;

      if (data.userId === currentUserId) {
        Alert.alert('Session Ended', data.message, [
          {
            text: 'OK',
            onPress: () => {
              AsyncStorage.multiRemove(['token', 'userId', 'fcmToken']);
            },
          },
        ]);
      }
    });

    // FIX: Set socket state here after all handlers are attached
    setSocket(newSocket);
  };

  // FIX: connectSocketWithFallback now properly stops after first successful connection
  const connectSocketWithFallback = async () => {
    const urls = [
      'https://mala-backend-u0gt.onrender.com',  // Production backend (more reliable)
      // 'http://10.30.105.83:5001',
      'http://192.168.86.255:5001'           
    ];

    for (const url of urls) {
      try {
        const connected = await new Promise<boolean>(resolve => {
          const newSocket = io(url, {
            transports: ['websocket', 'polling'],
            reconnection: true,          // FIX: re-enable built-in reconnection
            reconnectionAttempts: 5,
            reconnectionDelay: 2000,
            timeout: 5000,
          });

          const connectTimeout = setTimeout(() => {
            newSocket.disconnect();
            resolve(false);
          }, 6000);

          newSocket.on('connect', () => {
            clearTimeout(connectTimeout);
            console.log(`[Socket] Connected to: ${url}, ID:`, newSocket.id);
            setIsConnected(true);
            setupSocketHandlers(newSocket);
            resolve(true);
          });

          newSocket.on('connect_error', (err: any) => {
            clearTimeout(connectTimeout);
            console.warn(`[Socket] Failed to connect to ${url}:`, err.message);
            newSocket.disconnect();
            resolve(false);
          });
        });

        if (connected) {
          return; // FIX: stop trying other URLs once one succeeds
        }
      } catch (error) {
        console.warn(`[Socket] Error creating socket for ${url}:`, error);
      }
    }

    console.error('[Socket] All socket connection attempts failed');
  };

  // Initialize system control
  const initializeSystem = async () => {
    try {
      // Get user ID from AsyncStorage
      const token = await AsyncStorage.getItem('token');
      if (token) {
        const savedUserId = await AsyncStorage.getItem('userId');
        if (savedUserId) {
          setUserId(savedUserId);
          userIdRef.current = savedUserId;

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
          }
        }
      }

      await connectSocketWithFallback();
    } catch (error) {
      console.error('Error initializing system control:', error);
    }
  };

  useEffect(() => {
    initializeSystem();

    return () => {
      try {
        FCMService.cleanup();
      } catch (error) {
        console.error('Error during FCM cleanup:', error);
      }

      // FIX: Use ref so the cleanup always disconnects the actual socket instance
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  // Sync drying status from backend on startup
  useEffect(() => {
    const syncDryingStatus = async () => {
      try {
        const response = await dryerService.getStatus();
        if (response.success && response.data) {
          const { isRunning, elapsedSeconds } = response.data;
          console.log('[Backend Sync] isRunning=', isRunning, 'elapsedSeconds=', elapsedSeconds);

          if (isRunning !== isDrying || (isRunning && Math.abs(elapsedSeconds - dryingSeconds) > 2)) {
            setIsDrying(isRunning);
            setDryingSeconds(elapsedSeconds);
          }
        }
      } catch (error) {
        console.error('Failed to sync drying status from backend:', error);
      }
    };

    syncDryingStatus();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Start drying via backend API
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

        const currentSocket = socketRef.current;
        const currentUserId = userIdRef.current;
        if (currentSocket && currentUserId) {
          currentSocket.emit('drying_time_sync', {
            dryingSeconds: 0,
            userId: currentUserId,
            timestamp: new Date().toISOString(),
          });
        }

        Alert.alert('Drying Started', `Target: ${temperature}°C, Moisture: ${moisture}%`, [{ text: 'OK' }]);
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
        Alert.alert('Drying Completed', `Total drying time: ${hours}h ${minutes}m`, [{ text: 'OK' }]);
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
      dryingSeconds,
      isDrying,
    },
    isConnected,
    userId,
    socket,
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