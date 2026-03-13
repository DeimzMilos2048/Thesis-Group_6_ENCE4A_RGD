import messaging from '@react-native-firebase/messaging';
import { Alert } from 'react-native';

export const notificationListener = async () => {
    messaging().onMessage(async remoteMessage => {
        console.log("Notification Received: ", remoteMessage);

        // Handle tray-specific notifications
        if (remoteMessage.data?.event === 'TRAY_READY') {
            const trayNumber = remoteMessage.data.tray_number;
            const message = trayNumber 
                ? `Tray ${trayNumber} is ready for removal! Moisture reached 14%.`
                : remoteMessage.notification?.body || 'Tray is ready for removal!';
            
            Alert.alert(
                'Tray Ready for Removal',
                message,
                [{ text: 'OK', style: 'default' }]
            );
        } else {
            // Handle other notifications
            Alert.alert(
                remoteMessage.notification?.title || 'Notification',
                remoteMessage.notification?.body || 'New notification received'
            );
        }
    });
};

export const trayThresholdNotification = (trayNumber, moisture) => {
    // Local notification for tray threshold
    Alert.alert(
        `Tray ${trayNumber} Ready`,
        `Tray ${trayNumber} moisture content reached ${moisture.toFixed(1)}% - ready for removal!`,
        [{ text: 'OK', style: 'default' }]
    );
};