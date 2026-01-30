import {NotificationOption,RationaleObject} from 'react-native-permissions';

export const NotificationOptions: NotificationOption[] =[
    'alert', 
    'badge', 
    'sound',
    'providesAppSettings'
];

export const dialogConfig: RationaleObject = {
    title: 'MALA would like to send notification',
    message: 'Stay updated',
    buttonPositive: 'Allow',
    buttonNegative: 'Cancel',
};