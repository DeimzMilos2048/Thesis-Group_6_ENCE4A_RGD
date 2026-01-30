import { Alert } from "react-native";
import messaging from "@react-native-firebase/messaging";

export const notificationListeners = () => {
messaging().setBackgroundMessageHandler(async data => {
    console.log("Received quit/background app notification", data);
});

const unsubscribeOnMessage = messaging().onMessage(async data => {
    console.log("Received forground app notification", data);
    Alert.alert(
        'Foreground Notification',
        '${title}\n${body}\n${JSON.stringfy(data?.data,null,2)}',
    );
});

messaging().onNotificationOpenedApp(async data => {
    console.log("Notification caused app to open from background state:", data);
});


messaging()
    .getInitialNotification()
    .then(async data => {
        console.log('Open App from closed state', data);
    });

return () => {
    unsubscribeOnMessage;
    };
}