import 'react-native-get-random-values';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ImageBackground,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import React, { useState, useEffect } from "react";
import { LineChart } from "react-native-chart-kit";
import { FC } from "react";
import { io } from 'socket.io-client';

const screenWidth = Dimensions.get("window").width;

const Header = () => (
  <ImageBackground
    source={require("../../assets/images/banner2.jpg")}
    style={styles.header}
  >
    <View style={styles.headerOverlay}>
      <Text style={styles.headerText}>Analytics</Text>
    </View>
  </ImageBackground>
);

interface LiveLineGraphProps {
  data: number[];
  color: string;
  unit: string;
  minValue: number;
  maxValue: number;
}

const LiveLineGraph: FC<LiveLineGraphProps> = ({ data, color, unit, minValue, maxValue }) => {
  // Ensure we have at least 2 data points to avoid chart errors
  // Include minValue and maxValue in the dataset to set the y-axis range
  const safeData = Array.isArray(data) ? data : [];
  const chartData = safeData.length >= 2 ? safeData : [minValue, minValue];
  
  return (
    <LineChart
      data={{
        labels: chartData.map((_, i) => (i % 5 === 0 ? i.toString() : '')),
        datasets: [
          { data: chartData },
          { data: [minValue], withDots: false }, 
          { data: [maxValue], withDots: false }, 
        ],
      }}
      width={screenWidth - 40}
      height={160}
      yAxisSuffix={unit}
      yAxisInterval={1}
      chartConfig={{
        backgroundGradientFrom: "#fff",
        backgroundGradientTo: "#fff",
        color: () => color,
        labelColor: () => "#6b7280",
        strokeWidth: 2.5,
        propsForDots: {
          r: "3",
        },
        decimalPlaces: 1,
      }}
      bezier={false}
      style={{ borderRadius: 10 }}
      fromZero={false}
      segments={5}
      withInnerLines={true}
      withOuterLines={true}
      withVerticalLines={false}
      withHorizontalLines={true}
      withVerticalLabels={true}
      withHorizontalLabels={true}
    />
  );
};

// Helper: get the latest value from an array, formatted with unit
const latestValue = (arr: number[], unit: string): string => {
  if (!Array.isArray(arr) || arr.length === 0) return 'N/A';
  return `${arr[arr.length - 1].toFixed(1)}${unit}`;
};

const AnalyticsScreen = () => {
  const [chartData, setChartData] = useState({
    moisture1: [] as number[],
    moisture2: [] as number[],
    humidity: [] as number[],
    temperature: [] as number[],
    weight1: [] as number[],
    weight2: [] as number[],
  });

  // Socket.io setup for real-time sensor data
  useEffect(() => {
    console.log('Analytics: Attempting to connect to socket...');

     const SOCKET_URL = __DEV__ 
      ? 'http://192.168.86.144:5001'        
       : 'https://mala-backend-q03k.onrender.com'; 
    
    const socket = io(SOCKET_URL, {
      transports: ['polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: Infinity,
      timeout: 60000,
      forceNew: true,
      autoConnect: true,
    });

    socket.on('connect', () => {
      console.log('Analytics: Connected to sensor server:', socket.id);
    });

    socket.on('connect_error', (err) => {
      console.error('Analytics: Connection error:', err);
    });

    // Listen for real-time sensor data updates
    socket.on('sensor_readings_table', (data) => {
      console.log('Analytics: Sensor data received:', data);
      
      // Update chart data with new readings
      setChartData(prevData => {
        const maxDataPoints = 20; // Keep last 20 data points

        return {
          moisture1: [
            ...prevData.moisture1,
            typeof data.moisture1 === 'number' ? data.moisture1 : 0
          ].slice(-maxDataPoints),
          moisture2: [
            ...prevData.moisture2,
            typeof data.moisture2 === 'number' ? data.moisture2 : 0
          ].slice(-maxDataPoints),
          humidity: [
            ...prevData.humidity,
            typeof data.humidity === 'number' ? data.humidity : 0
          ].slice(-maxDataPoints),
          temperature: [
            ...prevData.temperature,
            typeof data.temperature === 'number' ? data.temperature : 0
          ].slice(-maxDataPoints),
          weight1: [
            ...prevData.weight1,
            typeof data.weight1 === 'number' ? data.weight1 : 0
          ].slice(-maxDataPoints),
          weight2: [
            ...prevData.weight2,
            typeof data.weight2 === 'number' ? data.weight2 : 0
          ].slice(-maxDataPoints),
        };
      });
    });

    socket.on('disconnect', (reason) => {
      console.log('Analytics: Socket disconnected:', reason);
    });

    socket.on('error', (error) => {
      console.error('Analytics: Socket error:', error);
    });

    return () => {
      console.log('Analytics: Cleaning up socket connection');
      socket.disconnect();
    };
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Header />

        <View style={styles.grid}>

          <View style={styles.card}>
            <Text style={styles.title}>Moisture Content</Text>

            <View style={styles.sensorRow}>
              <Text style={styles.sensorLabel}>Sensor 1</Text>
              <Text style={styles.sensorValue}>{latestValue(chartData.moisture1, '%')}</Text>
            </View>
            <LiveLineGraph
              data={chartData.moisture1}
              color="#22c55e"
              unit="%"
              minValue={0}
              maxValue={100}
            />

            <View style={styles.sensorRow}>
              <Text style={styles.sensorLabel}>Sensor 2</Text>
              <Text style={styles.sensorValue}>{latestValue(chartData.moisture2, '%')}</Text>
            </View>
            <LiveLineGraph
              data={chartData.moisture2}
              color="#16a34a"
              unit="%"
              minValue={0}
              maxValue={100}
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.title}>Humidity</Text>
            <View style={styles.sensorRow}>
              <Text style={styles.sensorLabel}>Sensor 1</Text>
              <Text style={styles.sensorValue}>{latestValue(chartData.humidity, '%')}</Text>
            </View>
            <LiveLineGraph 
              data={chartData.humidity} 
              color="#3b82f6" 
              unit="%" 
              minValue={0}
              maxValue={100}
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.title}>Temperature</Text>
             <View style={styles.sensorRow}>
              <Text style={styles.sensorLabel}>Sensor 1</Text>
              <Text style={styles.sensorValue}>{latestValue(chartData.temperature, '°C')}</Text>
            </View>
            <LiveLineGraph 
              data={chartData.temperature} 
              color="#efb944ff" 
              unit="°C" 
              minValue={0}
              maxValue={100}
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.title}>Weight</Text>

            <View style={styles.sensorRow}>
              <Text style={styles.sensorLabel}>Sensor 1</Text>
              <Text style={styles.sensorValue}>{latestValue(chartData.weight1, 'kg')}</Text>
            </View>
            <LiveLineGraph
              data={chartData.weight1}
              color="#9E9E9E"
              unit="kg"
              minValue={0}
              maxValue={50}
            />

            <View style={styles.sensorRow}>
              <Text style={styles.sensorLabel}>Sensor 2</Text>
              <Text style={styles.sensorValue}>{latestValue(chartData.weight2, 'kg')}</Text>
            </View>
            <LiveLineGraph
              data={chartData.weight2}
              color="#9e9e9ead"
              unit="kg"
              minValue={0}
              maxValue={50}
            />
          </View>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default AnalyticsScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F0F0F0",
  },
  scrollContent: {
    paddingBottom: 30,
  },
  header: {
    height: 80,
    marginBottom: 10,
  },
  headerOverlay: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    backgroundColor: "rgba(72,187,116,0.7)",
  },
  headerText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
  },
  grid: {
    paddingHorizontal: 10,
  },
  card: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
    alignItems: "center",
    elevation: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 6,
  },
  sensorRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    alignSelf: "stretch",
    marginTop: 8,
    marginBottom: 4,
    marginHorizontal: 4,
  },
  sensorLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "#6b7280",
  },
  sensorValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },
});