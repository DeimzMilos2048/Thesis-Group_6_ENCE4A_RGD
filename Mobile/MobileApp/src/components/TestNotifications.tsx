import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNotificationServiceNative } from '../services/Usenotificationservicenative';

// Add this to your dashboard or notification screen for testing
const TestNotifications = () => {
  const { 
    fcmToken, 
    notificationSettings, 
    requestNotificationPermission,
  } = useNotificationServiceNative('http://192.168.0.109:5001');

  const testPermission = async () => {
    const hasPermission = await requestNotificationPermission();
    console.log('Permission test result:', hasPermission);
  };

  const testLocalNotification = async () => {
    // This will trigger a local notification if mobile notifications are enabled
    try {
      const { default: NotificationServiceManager } = await import('../services/Usenotificationservicenative');
      await NotificationServiceManager.getInstance().showLocalNotification(
        'INFO',
        'Test Notification',
        'This is a test notification from the app',
        { test: true }
      );
    } catch (error) {
      console.error('Test notification failed:', error);
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <Text>FCM Token: {fcmToken ? '✓' : '✗'}</Text>
      <Text>Mobile Notifications: {notificationSettings.mobileNotifications ? '✓' : '✗'}</Text>
      
      <TouchableOpacity style={styles.button} onPress={testPermission}>
        <Text style={styles.buttonText}>Test Permission</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.button} onPress={testLocalNotification}>
        <Text style={styles.buttonText}>Test Local Notification</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#27AE60',
    padding: 10,
    margin: 5,
    borderRadius: 5,
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
  }
});

export default TestNotifications;
