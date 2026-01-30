import { useCallback,useEffect,useState } from "react";
import { usePermission } from "../permissions/usePermission";
import messaging from '@react-native-firebase/messaging';
import { errorHandler } from "../../utilities/functions/errorHandler";

export const useMessaging = () => {
  const { userNotificationPermission } = usePermission();
  const [fcmToken, setFcmToken] = useState<string | null>(null);

  const getTokens = useCallback(async () => {
    try{
        const hasPermission = await userNotificationPermission();
        if(!hasPermission)
        return null;

        const token = await messaging().getToken();
        console.log('FCM Token =>', token);
        setFcmToken(token);
    } catch (error: any){
        errorHandler('useMessaging.tsx', 'getTokens', error as Error);
    }
    }, [userNotificationPermission]);

    useEffect(() => {
        !fcmToken && getTokens();
    }, [fcmToken, getTokens]);

    return { 
    fcmToken,
    getTokens,  
    };
};