
import { 
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  StyleProp,
  ViewStyle,
  TextStyle,
  ImageBackground,
  Dimensions,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState } from 'react';
import { LineChart } from 'react-native-chart-kit';

const screenWidth = Dimensions.get('window').width;

const Header: React.FC = () => {
  return (
    <ImageBackground
      source={require("../../assets/images/banner2.jpg")}
      style={styles.header}
    >
      <View style={styles.headerOverlay}>
        <Text style={styles.headerText}>Analytics</Text>
      </View>
    </ImageBackground>
  );
};

const analyticsScreen: React.FC = () => {
  const [timeRange, setTimeRange] = useState<'1h' | '6h' | '24h'>('6h');

  // Data for different time ranges
  const chartData = {
    '1h': {
      labels: ['10m', '20m', '30m', '40m', '50m', '60m'],
      moisture: [18.5, 18.2, 17.8, 17.5, 17.2, 17.0],
      temperature: [50, 51, 52, 52.5, 53, 53.2],
      humidity: [65, 63, 61, 59, 57, 55],
      weight: [20.0, 19.8, 19.6, 19.4, 19.2, 19.0],
    },
    '6h': {
      labels: ['1h', '2h', '3h', '4h', '5h', '6h'],
      moisture: [18.5, 17.0, 15.5, 14.0, 13.0, 12.5],
      temperature: [50, 52, 54, 55, 55.5, 55.8],
      humidity: [65, 58, 52, 45, 42, 39],
      weight: [20.0, 19.2, 18.5, 17.8, 17.2, 16.8],
    },
    '24h': {
      labels: ['4h', '8h', '12h', '16h', '20h', '24h'],
      moisture: [18.5, 16.0, 14.5, 13.5, 12.8, 12.2],
      temperature: [50, 53, 55, 55.5, 55.2, 54.8],
      humidity: [65, 55, 48, 42, 40, 38],
      weight: [20.0, 18.5, 17.5, 17.0, 16.8, 16.4],
    },
  };

  const currentData = chartData[timeRange];

  // Multi-metric chart data
  const multiChartData = {
    labels: currentData.labels,
    datasets: [
      {
        data: currentData.moisture,
        color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
        strokeWidth: 3,
      },
      {
        data: currentData.temperature,
        color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`,
        strokeWidth: 3,
      },
      {
        data: currentData.humidity,
        color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`,
        strokeWidth: 3,
      },
    ],
    legend: ['Moisture', 'Temp', 'Humidity'],
  };

  // Weight chart (separate scale)
  const weightChartData = {
    labels: currentData.labels,
    datasets: [{
      data: currentData.weight,
      color: (opacity = 1) => `rgba(168, 85, 247, ${opacity})`,
      strokeWidth: 3,
    }],
  };

  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#f9fafb',
    decimalPlaces: 1,
    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '5',
      strokeWidth: '2',
    },
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Header/>

        {/* Time Range Selector */}
        <View style={styles.timeRangeContainer}>
          <TouchableOpacity
            style={[styles.timeBtn, timeRange === '1h' && styles.timeBtnActive]}
            onPress={() => setTimeRange('1h')}
          >
            <Text style={[styles.timeBtnText, timeRange === '1h' && styles.timeBtnTextActive]}>
              1 Hour
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.timeBtn, timeRange === '6h' && styles.timeBtnActive]}
            onPress={() => setTimeRange('6h')}
          >
            <Text style={[styles.timeBtnText, timeRange === '6h' && styles.timeBtnTextActive]}>
              6 Hours
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.timeBtn, timeRange === '24h' && styles.timeBtnActive]}
            onPress={() => setTimeRange('24h')}
          >
            <Text style={[styles.timeBtnText, timeRange === '24h' && styles.timeBtnTextActive]}>
              24 Hours
            </Text>
          </TouchableOpacity>
        </View>

        {/* Main Multi-Metric Chart */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Moisture, Temperature & Humidity</Text>
          <LineChart
            data={multiChartData}
            width={screenWidth - 50}
            height={240}
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
            withInnerLines={true}
            withOuterLines={true}
            withVerticalLabels={true}
            withHorizontalLabels={true}
            fromZero={false}
          />
          <View style={styles.legendContainer}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#3B82F6' }]} />
              <Text style={styles.legendText}>Moisture (%)</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
              <Text style={styles.legendText}>Temperature (°C)</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#22C55E' }]} />
              <Text style={styles.legendText}>Humidity (%)</Text>
            </View>
          </View>
        </View>

        {/* Weight Chart */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Weight Reduction</Text>
          <LineChart
            data={weightChartData}
            width={screenWidth - 50}
            height={200}
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
            withInnerLines={true}
            withOuterLines={true}
            withVerticalLabels={true}
            withHorizontalLabels={true}
            fromZero={false}
          />
          <View style={styles.legendContainer}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#A855F7' }]} />
              <Text style={styles.legendText}>Weight (kg)</Text>
            </View>
          </View>
        </View>

        {/* Stats Summary */}
        <Text style={styles.sectionTitle}>Session Statistics</Text>
        <View style={styles.controls}>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Duration:</Text>
            <Text style={styles.statValue}>2h 15m</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Weight Loss:</Text>
            <Text style={styles.statValue}>3.2 kg (16%)</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Moisture Reduction:</Text>
            <Text style={styles.statValue}>11.0%</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Avg Temperature:</Text>
            <Text style={styles.statValue}>54.2°C</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Status:</Text>
            <Text style={[styles.statValue, { color: '#27AE60' }]}>In Progress</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

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
  controls: ViewStyle;
  input: ViewStyle;
  buttonRow: ViewStyle;
  applyBtn: ViewStyle;
  btnText: TextStyle;
  header: ViewStyle;
  headerImage: ViewStyle;
  headerOverlay: ViewStyle;
  headerText: TextStyle;
  timeRangeContainer: ViewStyle;
  timeBtn: ViewStyle;
  timeBtnActive: ViewStyle;
  timeBtnText: TextStyle;
  timeBtnTextActive: TextStyle;
  chartCard: ViewStyle;
  chartTitle: TextStyle;
  chart: ViewStyle;
  legendContainer: ViewStyle;
  legendItem: ViewStyle;
  legendDot: ViewStyle;
  legendText: TextStyle;
  statRow: ViewStyle;
  statLabel: TextStyle;
  statValue: TextStyle;
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
  timeRangeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    marginBottom: 15,
  },
  timeBtn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 5,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  timeBtnActive: {
    backgroundColor: '#27AE60',
  },
  timeBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  timeBtnTextActive: {
    color: '#FFFFFF',
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 15,
    marginHorizontal: 15,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 10,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 8,
    marginVertical: 4,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  legendText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginVertical: 6,
    paddingHorizontal: 15,
  },
  statusCard: {
    width: '30%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
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
    fontSize: 16,
    fontWeight: "600",
    color: "#27AE60",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginVertical: 10,
    color: "#333",
    paddingHorizontal: 15,
  },
  card: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
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
  controls: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 15,
    marginVertical: 6,
    marginHorizontal: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    padding: 10,
    marginVertical: 5,
    backgroundColor: "#fff",
  },
  buttonRow: {
    marginTop: 15,
  },
  applyBtn: {
    backgroundColor: "#27AE60",
    padding: 12,
    borderRadius: 6,
    alignItems: "center",
    elevation: 2,
  },
  btnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  statLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  statValue: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '700',
  },
});

export default analyticsScreen