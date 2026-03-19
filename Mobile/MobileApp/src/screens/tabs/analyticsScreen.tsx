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
import { useWeight } from '../../contexts/WeightContext';
import WeightMobileGroupedBarChart from '../../components/WeightMobileGroupedBarChart';

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
  data: ChartDataPoint[];
  color: string;
  unit: string;
  minValue: number;
  maxValue: number;
}

//  Sanitize a number — replace Infinity, -Infinity, NaN with fallback
const sanitize = (val: number, fallback: number = 0): number => {
  if (!isFinite(val) || isNaN(val)) return fallback;
  return val;
};

const LiveLineGraph: FC<LiveLineGraphProps> = ({ data, color, unit, minValue, maxValue }) => {
  const safeData = Array.isArray(data) ? data : [];

  // Sanitize every chart value before passing to LineChart
  const chartValues = safeData.length > 0
    ? safeData.map(point => sanitize(point.value, minValue))
    : [minValue]; // fallback so chart doesn't crash on empty data

  const chartLabels = safeData.length > 0
    ? safeData.map((_, i) => (i % 5 === 0 ? safeData[i]?.time || '' : ''))
    : [''];

  return (
    <LineChart
      data={{
        labels: chartLabels,
        datasets: [
          { data: chartValues },
          { data: [sanitize(minValue, 0)], withDots: false },
          { data: [sanitize(maxValue, 100)], withDots: false },
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

const latestValue = (arr: ChartDataPoint[], unit: string): string => {
  if (!Array.isArray(arr) || arr.length === 0) return 'N/A';
  const lastValue = arr[arr.length - 1];
  if (!lastValue || typeof lastValue.value !== 'number') return 'N/A';
  if (!isFinite(lastValue.value) || isNaN(lastValue.value)) return 'N/A';
  return `${lastValue.value.toFixed(2)}${unit}`;
};

interface LatestValues {
  moisture1: number | null;
  moisture2: number | null;
  moisture3: number | null;
  moisture4: number | null;
  moisture5: number | null;
  moisture6: number | null;
  humidity: number | null;
  temperature: number | null;
  weight1: number | null;
}

interface ChartDataPoint {
  time: string;
  value: number;
}

interface ChartData {
  moisture1: ChartDataPoint[];
  moisture2: ChartDataPoint[];
  moisture3: ChartDataPoint[];
  moisture4: ChartDataPoint[];
  moisture5: ChartDataPoint[];
  moisture6: ChartDataPoint[];
  humidity: ChartDataPoint[];
  temperature: ChartDataPoint[];
  weight1: ChartDataPoint[];
}

const MAX_POINTS = 20;

//  Sanitize incoming socket number values
const safeNum = (val: any): number | null => {
  if (typeof val !== 'number') return null;
  if (!isFinite(val) || isNaN(val)) return null;
  return val;
};

const safePoint = (timestamp: string, val: any): ChartDataPoint => ({
  time: timestamp,
  value: sanitize(typeof val === 'number' ? val : 0),
});

const AnalyticsScreen = () => {
  const { savedWeights, savedAfterWeights } = useWeight();

  const [latestValuesFromSocket, setLatestValuesFromSocket] = useState<LatestValues>({
    moisture1: null, moisture2: null, moisture3: null,
    moisture4: null, moisture5: null, moisture6: null,
    humidity: null, temperature: null, weight1: null,
  });

  const [chartData, setChartData] = useState<ChartData>({
    moisture1: [] as ChartDataPoint[],
    moisture2: [] as ChartDataPoint[],
    moisture3: [] as ChartDataPoint[],
    moisture4: [] as ChartDataPoint[],
    moisture5: [] as ChartDataPoint[],
    moisture6: [] as ChartDataPoint[],
    humidity: [] as ChartDataPoint[],
    temperature: [] as ChartDataPoint[],
    weight1: [] as ChartDataPoint[],
  });

  const fmt = (val: number | null, unit: string): string => {
    if (val === null) return 'N/A';
    if (!isFinite(val) || isNaN(val)) return 'N/A';
    return `${Number(val).toFixed(2)}${unit}`;
  };

  useEffect(() => {
    console.log('Analytics: Attempting to connect to socket...');

    const SOCKET_URL = 'https://mala-backend-u0gt.onrender.com';

    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: Infinity,
      timeout: 60000,
      forceNew: true,
      autoConnect: true,
      upgrade: true,
    });

    socket.on('connect', () => {
      console.log('Analytics: Connected to sensor server:', socket.id);
    });

    socket.on('connect_error', (err) => {
      console.error('Analytics: Connection error:', err);
    });

    socket.on('sensor_readings_table', (data) => {
      console.log('Analytics: Sensor data received:', data);

      const timestamp = new Date(data.timestamp || Date.now()).toLocaleTimeString();

      //  Use safeNum to filter out Infinity/NaN before storing
      setLatestValuesFromSocket({
        moisture1:   safeNum(data.moisture1),
        moisture2:   safeNum(data.moisture2),
        moisture3:   safeNum(data.moisture3),
        moisture4:   safeNum(data.moisture4),
        moisture5:   safeNum(data.moisture5),
        moisture6:   safeNum(data.moisture6),
        humidity:    safeNum(data.humidity),
        temperature: safeNum(data.temperature),
        weight1:     safeNum(data.weight1),
      });

      // ✅ Use safePoint to sanitize chart values before pushing
      setChartData(prev => ({
        moisture1:   [...prev.moisture1,   safePoint(timestamp, data.moisture1)].slice(-MAX_POINTS),
        moisture2:   [...prev.moisture2,   safePoint(timestamp, data.moisture2)].slice(-MAX_POINTS),
        moisture3:   [...prev.moisture3,   safePoint(timestamp, data.moisture3)].slice(-MAX_POINTS),
        moisture4:   [...prev.moisture4,   safePoint(timestamp, data.moisture4)].slice(-MAX_POINTS),
        moisture5:   [...prev.moisture5,   safePoint(timestamp, data.moisture5)].slice(-MAX_POINTS),
        moisture6:   [...prev.moisture6,   safePoint(timestamp, data.moisture6)].slice(-MAX_POINTS),
        humidity:    [...prev.humidity,    safePoint(timestamp, data.humidity)].slice(-MAX_POINTS),
        temperature: [...prev.temperature, safePoint(timestamp, data.temperature)].slice(-MAX_POINTS),
        weight1:     [...prev.weight1,     safePoint(timestamp, data.weight1)].slice(-MAX_POINTS),
      }));
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

  const moistureColors = ['#22c55e', '#16a34a', '#15803d', '#166534', '#14532d', '#052e16'];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Header />

        <View style={styles.grid}>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.title}>Temperature</Text>
              <Text style={[styles.badge, { color: '#efb944ff' }]}>
                {fmt(latestValuesFromSocket.temperature, '°C')}
              </Text>
            </View>
            <LiveLineGraph
              data={chartData.temperature}
              color="#efb944ff"
              unit="°C"
              minValue={0}
              maxValue={60}
            />
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.title}>Humidity</Text>
              <Text style={[styles.badge, { color: '#3b82f6' }]}>
                {fmt(latestValuesFromSocket.humidity, '%')}
              </Text>
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
            <Text style={styles.title}>Moisture Content</Text>
            <View style={styles.badgeRow}>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Text key={i} style={[styles.badge, { color: moistureColors[i - 1] }]}>
                  S{i}: {fmt((latestValuesFromSocket as any)[`moisture${i}`], '%')}
                </Text>
              ))}
            </View>
            {[1, 2, 3, 4, 5, 6].map(i => (
              <View key={`moisture-${i}`} style={{ width: '100%' }}>
                <View style={styles.sensorRow}>
                  <Text style={styles.sensorLabel}>Sensor {i}</Text>
                  <Text style={styles.sensorValue}>
                    {latestValue(chartData[`moisture${i}` as keyof ChartData], '%')}
                  </Text>
                </View>
                <LiveLineGraph
                  data={chartData[`moisture${i}` as keyof ChartData]}
                  color={moistureColors[i - 1]}
                  unit="%"
                  minValue={0}
                  maxValue={100}
                />
              </View>
            ))}
          </View>

          <View style={styles.card}>
            <WeightMobileGroupedBarChart savedWeights={savedWeights} savedAfterWeights={savedAfterWeights} />
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignSelf: 'stretch',
    alignItems: 'center',
    marginBottom: 6,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 8,
  },
  badge: {
    fontSize: 12,
    fontWeight: '700',
    backgroundColor: 'white',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
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