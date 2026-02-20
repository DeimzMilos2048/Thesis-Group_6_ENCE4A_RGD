import 'react-native-get-random-values';
import { 
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ViewStyle,
  TextStyle,
  ImageBackground,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Ionicons from "react-native-vector-icons/Ionicons";
import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

type RootStackParmList = {
  LandingPage: undefined;
  NotificationScreen: undefined;
}

type NavigationProp = NativeStackNavigationProp<RootStackParmList>;

const Header: React.FC<{ onNotificationPress: () => void }> = ({ onNotificationPress }) => {
  return (
    <ImageBackground
      source={require("../../assets/images/banner2.jpg")}
      style={styles.header}
    >
      <View style={styles.headerOverlay}>
        <Text style={styles.headerText}>Dashboard</Text>
        <TouchableOpacity 
          style={styles.notificationButton}
          onPress={onNotificationPress}
        >
          <Ionicons name="notifications-outline" size={24} color="#27AE60" />
        </TouchableOpacity>
      </View>
    </ImageBackground>
  );
};

const DashboardPageScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();

  const handleNotificationPress = () => {
    navigation.navigate('NotificationScreen');
  };

  const [sensorData, setSensorData] = useState({
    temperature: 0,
    humidity: 0,
    moisture1: 0,
    moisture2: 0,
    weight1: 0,
    weight2: 0,
    status: 'Idle'
  });

  useEffect(() => {
     const SOCKET_URL = __DEV__ 
      ? 'http://192.168.86.144:5001'        
       : 'https://mala-backend-q03k.onrender.com'; 

    const socket = io(SOCKET_URL,{
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: Infinity,
      timeout: 60000,
      forceNew: true,
      autoConnect: true,
    });

    socket.on('connect', () => {
      console.log('Connected to sensor server');
    });

    socket.on('connect_error', (err) => {
      console.error('Connection error:', err);
    });

    socket.on('sensor_readings_table', (data) => {
      console.log('Sensor data received:', data);
      setSensorData({
        temperature: typeof data.temperature === 'number' ? data.temperature :  0,
        humidity: typeof data.humidity === 'number' ? data.humidity : 0,
        moisture1: typeof data.moisture1 === 'number' ? data.moisture1 : 0,
        moisture2: typeof data.moisture2 === 'number' ? data.moisture2 : 0,
        weight1: typeof data.weight1 === 'number' ? data.weight1 : 0,
        weight2: typeof data.weight2 === 'number' ? data.weight2 : 0,
        status: data.status || 'Idle'
      });
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <Header onNotificationPress={handleNotificationPress} />

      <View style={styles.statusGrid}>
        <View style={styles.statusCard}>
          <Text style={styles.statusTitle}>System Status</Text>
          <Text style={styles.statusValue}>{sensorData.status || 'Idle'}</Text>
        </View>
      </View>
      
      <Text style={styles.sectionTitle}>Sensor Readings</Text>
      <View style={styles.statusGrid}> 
        <View style={styles.card}>
          <View style={[styles.iconContainer, styles.iconOrange]}>
            <Ionicons name="thermometer-outline" size={28} color="#FFFFFF" />
          </View>
          <Text style={styles.label}>Temperature</Text>
          <Text style={styles.value}>{(sensorData.temperature || 0).toFixed(1)}°C</Text>
          <Text style={styles.sub}>Normal (40–50 °C)</Text>
        </View>
        <View style={styles.card}>
          <View style={[styles.iconContainer, styles.iconCyan]}>
            <Ionicons name="water-outline" size={28} color="#FFFFFF" />
          </View>
          <Text style={styles.label}>Humidity</Text>
          <Text style={styles.value}>{(sensorData.humidity || 0).toFixed(1)}%</Text>
          <Text style={styles.sub}>Target (≤ 100%)</Text>
        </View>
        <View style={styles.card}>
          <View style={[styles.iconContainer, styles.iconGreen]}>
            <Ionicons name="leaf-outline" size={28} color="#FFFFFF" />
          </View>
          <Text style={styles.label}>Moisture Content 1</Text>
          <Text style={styles.value}>{(sensorData.moisture1 || 0).toFixed(1)}%</Text>
          <Text style={styles.sub}>Target 13–14%</Text>
        </View>
        <View style={styles.card}>
          <View style={[styles.iconContainer, styles.iconGreen]}>
            <Ionicons name="leaf-outline" size={28} color="#FFFFFF" />
          </View>
          <Text style={styles.label}>Moisture Content 2</Text>
          <Text style={styles.value}>{(sensorData.moisture2 || 0).toFixed(1)}%</Text>
          <Text style={styles.sub}>Target 13–14%</Text>
        </View>
        <View style={styles.card}>
         <View style={[styles.iconContainer, styles.iconGray]}>
            <Ionicons name="scale-outline" size={28} color="#FFFFFF" />
          </View>
          <Text style={styles.label}>Current Weight 1</Text>
          <Text style={styles.value}>{(sensorData.weight1 || 0).toFixed(1)}kg</Text>
          <Text style={styles.sub}>Initial 5 kg</Text>
        </View>
        <View style={styles.card}>
          <View style={[styles.iconContainer, styles.iconGray]}>
            <Ionicons name="scale-outline" size={28} color="#FFFFFF" />
          </View>
          <Text style={styles.label}>Current Weight 2</Text>
          <Text style={styles.value}>{(sensorData.weight2 || 0).toFixed(1)}kg</Text>
          <Text style={styles.sub}>Initial 5 kg</Text>
        </View>
      </View>

     {/* Test Button
      <View style={{paddingHorizontal: 15, marginTop: 20, marginBottom: 30}}>
        <TouchableOpacity 
          style={styles.applyBtn}
          onPress={async () => {
            try {
              console.log('Testing HTTP connection...');
              const response = await fetch('http://192.168.0.109:5001/');
              const data = await response.json();
              console.log('Success:', data);
              Alert.alert('Success!', `Server: ${data.status}`);
            } catch (error:any) {
              console.error('Failed:', error);
              Alert.alert('Failed', error.message || 'connection failed');
            }
          }}
        >
          <Text style={styles.btnText}>Test Server Connection</Text>
        </TouchableOpacity>
      </View>
    </ScrollView> */}
    
    </SafeAreaView>
  );
};



interface Styles {
  safeArea: ViewStyle;
  container: ViewStyle;
  scrollContent: ViewStyle;
  statusGrid: ViewStyle;
  statusCard: ViewStyle;
  statusTitle: TextStyle;
  statusValue: TextStyle;
  sectionTitle: TextStyle;
  card: ViewStyle;
  label: TextStyle;
  value: TextStyle;
  sub: TextStyle;
  header: ViewStyle;
  headerImage: ViewStyle;
  headerOverlay: ViewStyle;
  headerText: TextStyle;
  notificationButton: ViewStyle;
  iconContainer: ViewStyle;
  iconOrange: ViewStyle;
  iconCyan: ViewStyle;
  iconGreen: ViewStyle;
  iconGray: ViewStyle;
}



const styles = StyleSheet.create<Styles>({
  safeArea: {
    flex: 1,
    backgroundColor: "#F0F0F0",
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  header: {
    height: 80,
    marginBottom: 15,
    overflow: 'hidden',
  },
  headerImage: {
    opacity: 0.3,
  },
  headerOverlay: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    backgroundColor: 'rgba(72, 187, 116, 0.7)', 
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginVertical: 6,
    paddingHorizontal: 15,
  },
  statusCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 10,
    marginVertical: 6,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statusTitle: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 4,
  },
  statusValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#27AE60",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginVertical: 5,
    color: "#333",
    paddingHorizontal: 15,
  },
  card: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 10,
    marginVertical: 6,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    marginTop: 8,
    color: "#333",
  },
  value: {
    fontSize: 18,
    fontWeight: "700",
    marginVertical: 5,
    color: "#000",
  },
  sub: {
    fontSize: 12,
    color: "#6b7280",
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconOrange: {
    backgroundColor: '#FF6B35',
  },
  iconCyan: {
    backgroundColor: '#06B6D4',
  },
  iconGreen: {
    backgroundColor: '#27AE60',
  },
  iconGray: {
    backgroundColor: '#9CA3AF',
  },
});

export default DashboardPageScreen;