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
import {FC} from "react";

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
}
const LiveLineGraph: FC<LiveLineGraphProps> = ({ data, color, unit }) => (
  <LineChart
    data={{
      labels: data.map((_, i) => i.toString()),
      datasets: [{ data }],
    }}
    width={screenWidth / 2 - 30}
    height={160}
    yAxisSuffix={unit}
    chartConfig={{
      backgroundGradientFrom: "#fff",
      backgroundGradientTo: "#fff",
      color: () => color,
      labelColor: () => "#6b7280",
      strokeWidth: 2,
    }}
    bezier={false}
    style={{ borderRadius: 10 }}
  />
);

const analyticsScreen = () => {
  const [chartData, setChartData] = useState({
  moisture: [10, 11, 12, 11, 13, 12, 14],
  humidity: [40, 42, 45, 43, 44, 46, 47],
  temperature: [50, 52, 54, 55, 56, 55, 53],
  weight: [20, 19.5, 19, 18.7, 18.4, 18, 17.8],
});

  useEffect(() => {
    const interval = setInterval(() => {
      setChartData(prev => ({
        moisture: [...prev.moisture.slice(-10), Math.random() * 4],
        humidity: [...prev.humidity.slice(-10), Math.random() * 65],
        temperature: [...prev.temperature.slice(-10), 50 + Math.random() * 10],
        weight: [...prev.weight.slice(-10), Math.random() * 25],
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Header />

        <View style={styles.grid}>
          <View style={styles.card}>
            <Text style={styles.title}>Moisture</Text>
            <LiveLineGraph data={chartData.moisture} color="#22c55e" unit="%" />
          </View>

          <View style={styles.card}>
            <Text style={styles.title}>Humidity</Text>
            <LiveLineGraph data={chartData.humidity} color="#3b82f6" unit="%" />
          </View>

          <View style={styles.card}>
            <Text style={styles.title}>Temperature</Text>
            <LiveLineGraph data={chartData.temperature} color="#efb944ff" unit="°C" />
          </View>

          <View style={styles.card}>
            <Text style={styles.title}>Weight</Text>
            <LiveLineGraph data={chartData.weight} color="#a855f7" unit="kg" />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default analyticsScreen;

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
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 10,
  },
  card: {
    width: "48%",
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
});
