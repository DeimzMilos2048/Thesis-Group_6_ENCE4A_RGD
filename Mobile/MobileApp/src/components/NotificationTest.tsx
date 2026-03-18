import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';

// Simple notification test component
const NotificationTest = () => {
  const testForegroundNotification = () => {
    console.log('Testing foreground notification...');
    
    // This simulates what happens when a foreground message is received
    Alert.alert(
      'Foreground Test',
      'This simulates a foreground notification. You should see this if the basic Alert system works!',
      [
        { text: 'OK' },
        { text: 'Test Navigation', onPress: () => console.log('Navigation test') }
      ]
    );
  };

  const testBackgroundNotification = () => {
    console.log('Testing background notification...');
    
    // For background notifications, you need to send via FCM
    Alert.alert(
      'Background Test',
      'To test background notifications, you need to:\n1. Put app in background (home button)\n2. Send FCM notification from backend\n3. Tap notification to open app',
      [{ text: 'OK' }]
    );
  };

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 20 }}>Notification Tests</Text>
      
      <TouchableOpacity 
        style={styles.testButton} 
        onPress={testForegroundNotification}
      >
        <Text style={styles.buttonText}>Test Foreground</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.testButton} 
        onPress={testBackgroundNotification}
      >
        <Text style={styles.buttonText}>Test Background</Text>
      </TouchableOpacity>
      
      <Text style={{ marginTop: 20, fontSize: 14, color: '#666' }}>
        Console logs will show detailed test results
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  testButton: {
    backgroundColor: '#27AE60',
    padding: 15,
    margin: 10,
    borderRadius: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  }
});

export default NotificationTest;
