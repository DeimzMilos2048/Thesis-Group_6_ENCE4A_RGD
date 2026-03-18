import { AppRegistry } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import { Alert } from 'react-native';

// Background message handler
const backgroundMessageHandler = async (remoteMessage) => {
    console.log('Background Message Handler:', remoteMessage);
    
    // Handle the background notification
    const { notification, data } = remoteMessage;
    const title = notification?.title || 'MALA Notification';
    const body = notification?.body || 'New notification received';
    
    // Extract sensor data if available
    const sensorData = data?.sensorData ? JSON.parse(data.sensorData) : null;
    
    // Create formatted sensor data string
    let sensorDataString = '';
    if (sensorData) {
        const temp = sensorData.temperature != null ? `${sensorData.temperature}°C` : 'N/A°C';
        const moisture = sensorData.moistureavg != null ? `${sensorData.moistureavg}%` : 'N/A%';
        const humidity = sensorData.humidity != null ? `${sensorData.humidity}%` : 'N/A%';
        sensorDataString = `${temp} | ${moisture} | ${humidity}`;
    }
    
    const fullMessage = sensorDataString ? `${body}\n\nSensor Data: ${sensorDataString}` : body;
    
    // Log the notification for debugging
    console.log('Background notification processed:', {
        title,
        message: fullMessage,
        sensorData,
        event: data?.event
    });
    
    // Return true to indicate the message was handled
    return true;
};

// Register the background message handler
AppRegistry.registerHeadlessTask('ReactNativeFirebaseMessagingHeadlessTask', () => backgroundMessageHandler);

export default backgroundMessageHandler;
