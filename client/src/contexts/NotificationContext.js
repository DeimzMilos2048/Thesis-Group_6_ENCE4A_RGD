import React, { createContext, useContext } from 'react';
import useNotificationService from '../components/dashboard/Usenotificationservice';
import { useSocket } from './SocketContext';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { sensorData } = useSocket();

  // Single shared notification service for the whole app
  const service = useNotificationService(sensorData, 15000);

  return (
    <NotificationContext.Provider value={service}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return ctx;
}

