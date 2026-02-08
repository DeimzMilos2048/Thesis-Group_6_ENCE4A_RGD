import messaging from '@react-native-firebase/messaging';

export const notificationListener = async () => {
    messaging().onMessage(async remoteMessage => {
        console.log("Notification Received: ", remoteMessage);

        alert(remoteMessage.notification.body);
    });
    };