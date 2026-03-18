import messaging from '@react-native-firebase/messaging';
import { Alert, AppState } from 'react-native';

// Helper function to format sensor values with N/A fallback
const formatSensorValue = (value, unit = '', decimals = 1) => {
    if (value === null || value === undefined || isNaN(value)) {
        return `N/A${unit}`;
    }
    return `${parseFloat(value).toFixed(decimals)}${unit}`;
};

// Helper function to create formatted sensor data string
const createSensorDataString = (sensorData) => {
    const temp = formatSensorValue(sensorData?.temperature, '°C');
    const moistureAvg = formatSensorValue(sensorData?.moistureavg, '%');
    const moisture1 = formatSensorValue(sensorData?.moisture1, '%');
    const moisture2 = formatSensorValue(sensorData?.moisture2, '%');
    const humidity = formatSensorValue(sensorData?.humidity, '%');
    const weight1 = formatSensorValue(sensorData?.weight1, 'kg');
    const weight2 = formatSensorValue(sensorData?.weight2, 'kg');
    
    return `${temp} | ${moistureAvg} | M1: ${moisture1} M2: ${moisture2} | ${humidity} | W1: ${weight1} W2: ${weight2}`;
};

// Check if app is in foreground or background
const getAppState = () => {
    return AppState.currentState === 'active' ? 'foreground' : 'background';
};

export const notificationListener = async () => {
    messaging().onMessage(async remoteMessage => {
        console.log("Notification Received: ", remoteMessage);
        
        const isForeground = getAppState() === 'foreground';
        const sensorData = remoteMessage.data?.sensorData ? 
            JSON.parse(remoteMessage.data.sensorData) : null;
        
        // Create formatted sensor data string
        const sensorDataString = sensorData ? createSensorDataString(sensorData) : 
            'N/A°C | N/A% | M1: N/A% M2: N/A% | N/A% | W1: N/Akg W2: N/Akg';

        // Handle tray-specific notifications
        if (remoteMessage.data?.event === 'TRAY_READY') {
            const trayNumber = remoteMessage.data.tray_number;
            const baseMessage = trayNumber 
                ? `Tray ${trayNumber} is ready for removal! Moisture reached 14%.`
                : remoteMessage.notification?.body || 'Tray is ready for removal!';
            
            const fullMessage = `${baseMessage}\n\nSensor Data: ${sensorDataString}`;
            
            if (isForeground) {
                Alert.alert(
                    'Tray Ready for Removal',
                    fullMessage,
                    [{ text: 'OK', style: 'default' }]
                );
            }
            
            // Emit mobile-specific socket events
            // This would be handled by the mobile socket service
            console.log(`Mobile ${isForeground ? 'foreground' : 'background'} notification:`, {
                event: 'TRAY_READY',
                trayNumber,
                sensorData,
                isForeground
            });
        } else {
            // Handle other notifications
            const baseMessage = remoteMessage.notification?.body || 'New notification received';
            const fullMessage = `${baseMessage}\n\nSensor Data: ${sensorDataString}`;
            
            if (isForeground) {
                Alert.alert(
                    remoteMessage.notification?.title || 'Notification',
                    fullMessage,
                    [{ text: 'OK', style: 'default' }]
                );
            }
            
            // Emit mobile-specific socket events
            console.log(`Mobile ${isForeground ? 'foreground' : 'background'} notification:`, {
                title: remoteMessage.notification?.title,
                body: remoteMessage.notification?.body,
                sensorData,
                isForeground
            });
        }
    });

    // Handle background notifications
    messaging().setBackgroundMessageHandler(async remoteMessage => {
        console.log("Background Notification Received: ", remoteMessage);
        
        const sensorData = remoteMessage.data?.sensorData ? 
            JSON.parse(remoteMessage.data.sensorData) : null;
        
        // Create formatted sensor data string
        const sensorDataString = sensorData ? createSensorDataString(sensorData) : 
            'N/A°C | N/A% | M1: N/A% M2: N/A% | N/A% | W1: N/Akg W2: N/Akg';

        // Handle tray-specific notifications in background
        if (remoteMessage.data?.event === 'TRAY_READY') {
            const trayNumber = remoteMessage.data.tray_number;
            const message = trayNumber 
                ? `Tray ${trayNumber} is ready for removal! Moisture reached 14%.\n\nSensor Data: ${sensorDataString}`
                : `${remoteMessage.notification?.body || 'Tray is ready for removal!'}\n\nSensor Data: ${sensorDataString}`;
            
            // This will show as a system notification when app is in background
            console.log(`Background notification for tray ${trayNumber}:`, message);
        } else {
            const message = `${remoteMessage.notification?.body || 'New notification received'}\n\nSensor Data: ${sensorDataString}`;
            console.log("Background notification:", message);
        }
    });
};

export const trayThresholdNotification = (trayNumber, moisture, sensorData = null) => {
    const isForeground = getAppState() === 'foreground';
    const sensorDataString = sensorData ? createSensorDataString(sensorData) : 
        'N/A°C | N/A% | M1: N/A% M2: N/A% | N/A% | W1: N/Akg W2: N/Akg';
    
    const message = `Tray ${trayNumber} moisture content reached ${moisture.toFixed(1)}% - ready for removal!\n\nSensor Data: ${sensorDataString}`;
    
    if (isForeground) {
        Alert.alert(
            `Tray ${trayNumber} Ready`,
            message,
            [{ text: 'OK', style: 'default' }]
        );
    }
    
    console.log(`Mobile ${isForeground ? 'foreground' : 'background'} tray notification:`, {
        trayNumber,
        moisture,
        sensorData,
        isForeground
    });
};

// Export helper functions for use in other components
export { formatSensorValue, createSensorDataString, getAppState };