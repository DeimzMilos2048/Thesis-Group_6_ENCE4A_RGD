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
import { useSystemControl } from '../../contexts/SystemControlContext';

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
  const { systemData, isConnected, startDrying, stopDrying } = useSystemControl();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    console.log('[Dashboard] systemData updated:', {
      isDrying: systemData.isDrying,
      dryingSeconds: systemData.dryingSeconds,
      dryingTime: systemData.dryingTime,
    });
  }, [systemData.dryingSeconds]);

  const handleNotificationPress = () => {
    navigation.navigate('NotificationScreen');
  };

  const [sensorData, setSensorData] = useState({
    temperature: 0,
    humidity: 0,
    moisture1: 0,
    moisture2: 0,
    moisture3: 0,
    moisture4: 0,
    moisture5: 0,
    moisture6: 0,
    moistureavg: 0,
    weight1: 0,
    weight2: 0,
    weight3: 0,
    weight4: 0,
    weight5: 0,
    weight6: 0,
    weightbefore1: 0,
    weightbefore2: 0,
    weightbefore3: 0,
    weightbefore4: 0,
    weightbefore5: 0,
    weightbefore6: 0,
    weightafter1: 0,
    weightafter2: 0,
    weightafter3: 0,
    weightafter4: 0,
    weightafter5: 0,
    weightafter6: 0,
    dryingSeconds: 0,
    status: 'Idle'
  });

  const formatDryingTime = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  useEffect(() => {
    const SOCKET_URL = __DEV__ 
      ? 'http://192.168.0.109:5001'        
      : 'https://mala-backend-q03k.onrender.com'; 

    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: Infinity,
      timeout: 10000,
      forceNew: true,
      autoConnect: true,
      upgrade: true,
    });

    socket.on('connect', () => {
      console.log('Connected to sensor server');
    });

    socket.on('connect_error', (err) => {
      console.error('Connection error:', err);
    });

    // helper to safely parse a number field with fallback keys
    const num = (data: any, ...keys: string[]): number => {
      for (const key of keys) {
        if (typeof data[key] === 'number' && !isNaN(data[key])) return data[key];
      }
      return 0;
    };

    const handleSensorData = (data: any) => {
      console.log('Sensor data received:', data);
      setSensorData({
        temperature:  num(data, 'temperature'),
        humidity:     num(data, 'humidity'),
        moisture1:    num(data, 'moisture1'),
        moisture2:    num(data, 'moisture2'),
        moisture3:    num(data, 'moisture3'),
        moisture4:    num(data, 'moisture4'),
        moisture5:    num(data, 'moisture5'),
        moisture6:    num(data, 'moisture6'),
        moistureavg:  num(data, 'moistureavg'),
        
        weight1:      num(data, 'weight1', 'weightbefore1'),
        weight2:      num(data, 'weight2', 'weightbefore2'),
        weight3:      num(data, 'weight3', 'weightbefore3'),
        weight4:      num(data, 'weight4', 'weightbefore4'),
        weight5:      num(data, 'weight5', 'weightbefore5'),
        weight6:      num(data, 'weight6', 'weightbefore6'),
        weightbefore1: num(data, 'weightbefore1'),
        weightbefore2: num(data, 'weightbefore2'),
        weightbefore3: num(data, 'weightbefore3'),
        weightbefore4: num(data, 'weightbefore4'),
        weightbefore5: num(data, 'weightbefore5'),
        weightbefore6: num(data, 'weightbefore6'),
        weightafter1:  num(data, 'weightafter1'),
        weightafter2:  num(data, 'weightafter2'),
        weightafter3:  num(data, 'weightafter3'),
        weightafter4:  num(data, 'weightafter4'),
        weightafter5:  num(data, 'weightafter5'),
        weightafter6:  num(data, 'weightafter6'),
        dryingSeconds: num(data, 'dryingSeconds', 'drying_seconds'),
        status: data.status || data.system_status || 'Idle',
      });
    };

    socket.on('sensor_readings_table', handleSensorData);
    socket.on('sensor_data', handleSensorData);
    socket.on('sensorData', handleSensorData);

    socket.on('dryer:status_updated', (data: any) => {
      console.log('Dryer status updated from backend:', data);
      
      if (data.status === 'drying') {
        setSensorData(prev => ({
          ...prev,
          status: 'Drying',
          dryingSeconds: 0,
        }));
        Alert.alert(
          'Drying Started',
          `Target: ${data.temperature}°C, Moisture: ${data.moisture}%`,
          [{ text: 'OK' }]
        );
      } else if (data.status === 'idle') {
        setSensorData(prev => ({
          ...prev,
          status: 'Idle',
          dryingSeconds: data.elapsedSeconds || 0,
        }));
        const hours = Math.floor((data.elapsedSeconds || 0) / 3600);
        const minutes = Math.floor(((data.elapsedSeconds || 0) % 3600) / 60);
        Alert.alert(
          'Drying Completed',
          `Total drying time: ${hours}h ${minutes}m`,
          [{ text: 'OK' }]
        );
      }
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

      <ScrollView contentContainerStyle={styles.scrollContent}>

        {/* Status Row: System Status + Drying Time */}
        <View style={styles.statusGrid}>
          <View style={styles.statusCard}>
            <Text style={styles.statusTitle}>System Status</Text>
            <Text style={styles.statusValue}>{sensorData.status || 'Idle'}</Text>
          </View>
          <View style={styles.statusCard}>
            <Text style={styles.statusTitle}>Drying Time</Text>
            <Text style={[styles.statusValue, styles.statusValueMono]}>
              {formatDryingTime(systemData.dryingSeconds || 0)}
            </Text>
          </View>
        </View>
        
        <Text style={styles.sectionTitle}>Sensor Readings</Text>

        {/* Temperature & Humidity */}
        <View style={styles.statusGrid}> 
          <View style={styles.card}>
            <View style={[styles.iconContainer, styles.iconOrange]}>
              <Ionicons name="thermometer-outline" size={28} color="#FFFFFF" />
            </View>
            <Text style={styles.label}>Temperature</Text>
            <Text style={styles.value}>{(sensorData.temperature || 0).toFixed(1)}°C</Text>
            <Text style={styles.sub}>Normal (40–45 °C)</Text>
          </View>
          <View style={styles.card}>
            <View style={[styles.iconContainer, styles.iconCyan]}>
              <Ionicons name="water-outline" size={28} color="#FFFFFF" />
            </View>
            <Text style={styles.label}>Humidity</Text>
            <Text style={styles.value}>{(sensorData.humidity || 0).toFixed(1)}%</Text>
            <Text style={styles.sub}>Target (≤ 100%)</Text>
          </View>
        </View>

        {/* Moisture Content - 6 sensors */}
        <Text style={styles.sectionTitle}>Moisture Content</Text>
        <View style={styles.statusGrid}>
          {[1, 2, 3, 4, 5, 6].map(i => (
            <View style={styles.card} key={`moisture-${i}`}>
              <View style={[styles.iconContainer, styles.iconGreen]}>
                <Ionicons name="leaf-outline" size={28} color="#FFFFFF" />
              </View>
              <Text style={styles.label}>Tray {i}</Text>
              <Text style={styles.value}>{(sensorData[`moisture${i}` as keyof typeof sensorData] as number || 0).toFixed(1)}%</Text>
              <Text style={styles.sub}>Target 13–14%</Text>
            </View>
          ))}
        </View>

        {/* Average Moisture - Separate Full Width Card */}
        <View style={styles.averageMoistureContainer}>
          <View style={styles.averageMoistureCard}>
            <View style={[styles.iconContainer, styles.iconGreen]}>
              <Ionicons name="bar-chart-outline" size={28} color="#FFFFFF" />
            </View>
            <Text style={styles.label}>Average Moisture</Text>
            <Text style={styles.averageMoistureValue}>{(sensorData.moistureavg || 0).toFixed(1)}%</Text>
            <Text style={styles.sub}>Mean moisture across all trays</Text>
          </View>
        </View>

        {/* Weight - 6 trays with Before & After */}
        <Text style={styles.sectionTitle}>Weight</Text>
        <View style={styles.statusGrid}>
          {[1, 2, 3, 4, 5, 6].map(i => {
            const beforeVal = sensorData[`weightbefore${i}` as keyof typeof sensorData] as number || 0;
            const afterVal  = sensorData[`weightafter${i}`  as keyof typeof sensorData] as number || 0;
            return (
              <View style={styles.weightCard} key={`weight-tray-${i}`}>
                <View style={[styles.iconContainer, styles.iconGray]}>
                  <Ionicons name="scale-outline" size={28} color="#FFFFFF" />
                </View>
                <Text style={styles.label}>Tray {i}</Text>
                <View style={styles.weightRow}>
                  <View style={styles.weightCol}>
                    <Text style={styles.weightBadgeBefore}>B</Text>
                    <Text style={styles.weightVal}>
                      {beforeVal > 0 ? `${beforeVal.toFixed(2)} kg` : '—'}
                    </Text>
                  </View>
                  <View style={styles.weightDivider} />
                  <View style={styles.weightCol}>
                    <Text style={styles.weightBadgeAfter}>A</Text>
                    <Text style={styles.weightVal}>
                      {afterVal > 0 ? `${afterVal.toFixed(2)} kg` : '—'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.sub}>B = Before · A = After</Text>
              </View>
            );
          })}
        </View>

      </ScrollView>
    
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
  statusValueMono: TextStyle;
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
  weightCard: ViewStyle;
  weightRow: ViewStyle;
  weightCol: ViewStyle;
  weightDivider: ViewStyle;
  weightVal: TextStyle;
  weightBadgeBefore: TextStyle;
  weightBadgeAfter: TextStyle;
  averageMoistureContainer: ViewStyle;
  averageMoistureCard: ViewStyle;
  averageMoistureValue: TextStyle;
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
  statusTitle: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 4,
  },
  statusValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#27AE60",
  },
  statusValueMono: {
    fontFamily: 'monospace',
    fontSize: 18,
    color: '#f59e0b',
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
    fontSize: 11,
    color: "#6b7280",
    marginTop: 4,
    textAlign: 'center',
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
  weightCard: {
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
  weightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6,
    gap: 8,
  },
  weightCol: {
    alignItems: 'center',
    flex: 1,
  },
  weightDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#e5e7eb',
  },
  weightVal: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111',
    marginTop: 2,
  },
  weightBadgeBefore: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10b981',
    backgroundColor: '#d1fae5',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    overflow: 'hidden',
  },
  weightBadgeAfter: {
    fontSize: 11,
    fontWeight: '700',
    color: '#3b82f6',
    backgroundColor: '#dbeafe',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    overflow: 'hidden',
  },
  averageMoistureContainer: {
    paddingHorizontal: 15,
    marginVertical: 12,
  },
  averageMoistureCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    borderLeftWidth: 5,
    borderLeftColor: '#27AE60',
  },
  averageMoistureValue: {
    fontSize: 24,
    fontWeight: '700',
    marginVertical: 8,
    color: '#27AE60',
  },
});

export default DashboardPageScreen;