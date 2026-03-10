import React, { createContext, useContext, useState, useEffect } from 'react';
import io from 'socket.io-client';
import { SOCKET_URL } from '../config/apiConfig.js';

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
    moisture3: 0,
    moisture4: 0,
    moisture5: 0,
    moisture6: 0,
    moistureavg: 0,
    weight1: 0,
    weight2: 0,
    status: 'Idle'
  });
  const [chartData, setChartData] = useState({
    moisture1: [],
    moisture2: [],
    moisture3: [],
    moisture4: [],
    moisture5: [],
    moisture6: [],
    moistureavg: [],
    humidity: [],
    temperature: [],
    weight1: [],
    weight2: [],
  });
  const [latestValues, setLatestValues] = useState({
    moisture1: null,
    moisture2: null,
    moisture3: null,
    moisture4: null,
    moisture5: null,
    moisture6: null,
    moistureavg: null,
    humidity: null,
    temperature: null,
    weight1: null,
    weight2: null,
  });

  const [isConnected, setIsConnected] = useState(false);

  // Helper: safely parse any value (string or number) to float
  const toNum = (v) => {
    const n = parseFloat(v);
    return isNaN(n) ? 0 : n;
  };

  // Helper: always compute moistureavg from all 6 tray moisture readings
  const computeAvg = (data) => {
    const values = [
      toNum(data.moisture1),
      toNum(data.moisture2),
      toNum(data.moisture3),
      toNum(data.moisture4),
      toNum(data.moisture5),
      toNum(data.moisture6),
    ];

    return parseFloat((values.reduce((sum, v) => sum + v, 0) / values.length).toFixed(2));
  };

  useEffect(() => {
    // Use production URL for both development and production to avoid connection issues
    const socketUrl = process.env.REACT_APP_API_URL || 'https://mala-backend-q03k.onrender.com';
    
    const newSocket = io(socketUrl, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      transports: ['websocket', 'polling'], 
      upgrade: true 
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

      const moistureavg = data.moistureavg !== undefined ? toNum(data.moistureavg) : computeAvg(data);

      // Update current sensor data — toNum handles both number and string values
      setSensorData({
        temperature: toNum(data.temperature),
        humidity: toNum(data.humidity),
        moisture1: toNum(data.moisture1),
        moisture2: toNum(data.moisture2),
        moisture3: toNum(data.moisture3),
        moisture4: toNum(data.moisture4),
        moisture5: toNum(data.moisture5),
        moisture6: toNum(data.moisture6),
        moistureavg,
        weight1: toNum(data.weight1),
        weight2: toNum(data.weight2),
        status: data.status || 'Idle'
      });

      setLatestValues({
        temperature: data.temperature ?? null,
        humidity: data.humidity ?? null,
        moisture1: data.moisture1 ?? null,
        moisture2: data.moisture2 ?? null,
        moisture3: data.moisture3 ?? null,
        moisture4: data.moisture4 ?? null,
        moisture5: data.moisture5 ?? null,
        moisture6: data.moisture6 ?? null,
        moistureavg: moistureavg ?? null,
        weight1: data.weight1 ?? null,
        weight2: data.weight2 ?? null,
      });

      // Update chart data with timestamp
      const timestamp = new Date(data.timestamp).toLocaleTimeString();
      const maxDataPoints = 20;

      // Safely handle chart data updates
      setChartData(prevData => {
        const prevMoisture1 = Array.isArray(prevData.moisture1) ? prevData.moisture1 : [];
        const prevMoisture2 = Array.isArray(prevData.moisture2) ? prevData.moisture2 : [];
        const prevMoisture3 = Array.isArray(prevData.moisture3) ? prevData.moisture3 : [];
        const prevMoisture4 = Array.isArray(prevData.moisture4) ? prevData.moisture4 : [];
        const prevMoisture5 = Array.isArray(prevData.moisture5) ? prevData.moisture5 : [];
        const prevMoisture6 = Array.isArray(prevData.moisture6) ? prevData.moisture6 : [];
        const prevMoistureavg = Array.isArray(prevData.moistureavg) ? prevData.moistureavg : [];
        const prevHumidity = Array.isArray(prevData.humidity) ? prevData.humidity : [];
        const prevTemperature = Array.isArray(prevData.temperature) ? prevData.temperature : [];
        const prevWeight1 = Array.isArray(prevData.weight1) ? prevData.weight1 : [];
        const prevWeight2 = Array.isArray(prevData.weight2) ? prevData.weight2 : [];

        return {
          moisture1: [...prevMoisture1, { time: timestamp, value: toNum(data.moisture1) }].slice(-maxDataPoints),
          moisture2: [...prevMoisture2, { time: timestamp, value: toNum(data.moisture2) }].slice(-maxDataPoints),
          moisture3: [...prevMoisture3, { time: timestamp, value: toNum(data.moisture3) }].slice(-maxDataPoints),
          moisture4: [...prevMoisture4, { time: timestamp, value: toNum(data.moisture4) }].slice(-maxDataPoints),
          moisture5: [...prevMoisture5, { time: timestamp, value: toNum(data.moisture5) }].slice(-maxDataPoints),
          moisture6: [...prevMoisture6, { time: timestamp, value: toNum(data.moisture6) }].slice(-maxDataPoints),
          moistureavg: [...prevMoistureavg, { time: timestamp, value: moistureavg }].slice(-maxDataPoints),
          humidity: [...prevHumidity, { time: timestamp, value: toNum(data.humidity) }].slice(-maxDataPoints),
          temperature: [...prevTemperature, { time: timestamp, value: toNum(data.temperature) }].slice(-maxDataPoints),
          weight1: [...prevWeight1, { time: timestamp, value: toNum(data.weight1) }].slice(-maxDataPoints),
          weight2: [...prevWeight2, { time: timestamp, value: toNum(data.weight2) }].slice(-maxDataPoints),
        };
      });
    });

    // Listen for drying time updates from other clients
    newSocket.on('drying_started', (data) => {
      console.log('Drying started event received:', data);
    });

    newSocket.on('drying_stopped', (data) => {
      console.log('Drying stopped event received:', data);
    });

    // Listen for dryer status updates from backend (for sync with mobile)
    newSocket.on('dryer:status_updated', (data) => {
      console.log('Dryer status updated from backend:', data);
    });

    newSocket.on('drying_time_update', (data) => {
      console.log('Drying time update received:', data);
    });

    newSocket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    setSocket(newSocket);

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