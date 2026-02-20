import React, { createContext, useContext, useState, useEffect } from 'react';
import io from 'socket.io-client';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [sensorData, setSensorData] = useState({
    temperature: 0,
    humidity: 0,
    moisture1: 0,
    moisture2: 0,
    weight1: 0,
    weight2: 0,
    status: 'Idle'
  });
  const [chartData, setChartData] = useState({
    moisture1: [],
    moisture2: [],
    humidity: [],
    temperature: [],
    weight1: [],
    weight2: [],
  });
  const [latestValues, setLatestValues] = useState({
    moisture1: null, moisture2: null,
    humidity: null,
    temperature: null,
    weight1: null, weight2: null,
  });

  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const socketUrl = process.env.REACT_APP_API_URL || 'http://localhost:5001';
    
    const newSocket = io(socketUrl, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      transports: ['polling'], 
      upgrade: false 
    });

    // Socket event handlers
    newSocket.on('connect', () => {
      console.log('Connected to server:', newSocket.id);
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server');
      setIsConnected(false);
    });

    newSocket.on('sensor_readings_table', (data) => {
      console.log('Sensor data received:', data);
      
      // Update current sensor data
      setSensorData({
        temperature: typeof data.temperature === 'number' ? data.temperature : 0,
        humidity: typeof data.humidity === 'number' ? data.humidity : 0,
        moisture1: typeof data.moisture1 === 'number' ? data.moisture1 : 0,
        moisture2: typeof data.moisture2 === 'number' ? data.moisture2 : 0,
        weight1: typeof data.weight1 === 'number' ? data.weight1 : 0,
        weight2: typeof data.weight2 === 'number' ? data.weight2 : 0,
        status: data.status || 'Idle'
      });

      setLatestValues({
        temperature: data.temperature ?? null,
        humidity: data.humidity ?? null,
        moisture1: data.moisture1 ?? null,
        moisture2: data.moisture2 ?? null,
        weight1: data.weight1 ?? null,
        weight2: data.weight2 ?? null,
      });
      // Update chart data with timestamp
      const timestamp = new Date(data.timestamp).toLocaleTimeString();
      const maxDataPoints = 20;

      // Safely handle chart data updates
      setChartData(prevData => {
        // Ensure prevData is an array before using slice
        const prevMoisture1 = Array.isArray(prevData.moisture1) ? prevData.moisture1 : [];
        const prevMoisture2 = Array.isArray(prevData.moisture2) ? prevData.moisture2 : [];
        const prevHumidity = Array.isArray(prevData.humidity) ? prevData.humidity : [];
        const prevTemperature = Array.isArray(prevData.temperature) ? prevData.temperature : [];
        const prevWeight1 = Array.isArray(prevData.weight1) ? prevData.weight1 : [];
        const prevWeight2 = Array.isArray(prevData.weight2) ? prevData.weight2 : [];

        return {
          moisture1: [
            ...prevMoisture1,
            { time: timestamp, value: typeof data.moisture1 === 'number' ? data.moisture1 : 0 }
          ].slice(-maxDataPoints),
          moisture2: [
            ...prevMoisture2,
            { time: timestamp, value: typeof data.moisture2 === 'number' ? data.moisture2 : 0 }
          ].slice(-maxDataPoints),
          humidity: [
            ...prevHumidity,
            { time: timestamp, value: typeof data.humidity === 'number' ? data.humidity : 0 }
          ].slice(-maxDataPoints),
          temperature: [
            ...prevTemperature,
            { time: timestamp, value: typeof data.temperature === 'number' ? data.temperature : 0 }
          ].slice(-maxDataPoints),
          weight1: [
            ...prevWeight1,
            { time: timestamp, value: typeof data.weight1 === 'number' ? data.weight1 : 0 }
          ].slice(-maxDataPoints),
          weight2: [
            ...prevWeight2,
            { time: timestamp, value: typeof data.weight2 === 'number' ? data.weight2 : 0 }
          ].slice(-maxDataPoints),
        };
      });
    });

    newSocket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    setSocket(newSocket);

    // Cleanup on unmount
    return () => {
      newSocket.close();
    };
  }, []);

  const value = {
    socket,
    sensorData,
    chartData,
    latestValues,
    isConnected,
    setSensorData,
    setChartData,
    setLatestValues
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};
