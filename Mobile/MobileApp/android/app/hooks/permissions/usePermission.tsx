import { Alert } from 'react-native';
import {checkNotifications,
    openSettings,
    requestNotifications
} from 'react-native-permissions';
import { errorHandler } from '../../utilities/functions/errorHandler';
import { dialogConfig, NotificationOptions } from './config';

export const usePermission = () => {
    const userNotificationPermission = async (): Promise<boolean> => {
        try {
            const {status: isGranted} = await checkNotifications();

            if(isGranted === 'granted'){
                return true;
            }else{
                const {status: reqGrant} = await requestNotifications(
                    NotificationOptions, 
                    dialogConfig,
                );
                if(reqGrant === 'granted') return true;
                if(reqGrant === 'blocked') {
                    Alert.alert(dialogConfig.title, dialogConfig.message, [
                        {text: dialogConfig.buttonNegative},
                        {
                            text: dialogConfig.buttonPositive,
                            onPress: () =>openSettings('notifications'),
                        },
                    ]);
                }
            }
        }catch(error:any){
            errorHandler(
                'usePermissions.tsx',
                'userNotificationPermission',
                error as Error,
            );
        }
        return true;
    }
     return {
            userNotificationPermission,
    };
}