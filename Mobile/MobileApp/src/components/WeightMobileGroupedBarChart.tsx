import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ScrollView,
} from 'react-native';
import { BarChart } from 'react-native-chart-kit';

const screenWidth = Dimensions.get('window').width;

interface WeightData {
  [key: number]: { before?: number; after?: number; frozen?: boolean };
}

interface WeightMobileGroupedBarChartProps {
  savedWeights?: WeightData;
  savedAfterWeights?: WeightData;
}

const WeightMobileGroupedBarChart: React.FC<WeightMobileGroupedBarChartProps> = ({
  savedWeights = {},
  savedAfterWeights = {},
}) => {
  const [beforeDryingData, setBeforeDryingData] = useState<number[]>([0, 0, 0, 0, 0, 0]);
  const [afterDryingData, setAfterDryingData] = useState<number[]>([0, 0, 0, 0, 0, 0]);
  const [statsData, setStatsData] = useState<
    Array<{ tray: number; reduction: number; percent: string }>
  >([]);

  useEffect(() => {
    if (!savedWeights || !savedAfterWeights || (Object.keys(savedWeights).length === 0 && Object.keys(savedAfterWeights).length === 0)) {
      setBeforeDryingData([0, 0, 0, 0, 0, 0]);
      setAfterDryingData([0, 0, 0, 0, 0, 0]);
      setStatsData(
        Array.from({ length: 6 }, (_, i) => ({
          tray: i + 1,
          reduction: 0,
          percent: '0',
        }))
      );
      return;
    }

    const before: number[] = [];
    const after: number[] = [];
    const stats: Array<{ tray: number; reduction: number; percent: string }> = [];

    for (let i = 1; i <= 6; i++) {
      const beforeValue = savedWeights[i]?.before ?? 0;
      const afterValue = savedAfterWeights[i]?.after ?? 0;

      before.push(Number(beforeValue));
      after.push(Number(afterValue));

      const reduction = beforeValue - afterValue;
      const percent =
        beforeValue > 0 ? ((reduction / beforeValue) * 100).toFixed(1) : '0';

      stats.push({
        tray: i,
        reduction: Number(reduction.toFixed(2)),
        percent,
      });
    }

    setBeforeDryingData(before);
    setAfterDryingData(after);
    setStatsData(stats);
  }, [savedWeights, savedAfterWeights]);

  const maxValue = Math.max(...beforeDryingData, ...afterDryingData, 5);

  const chartData_formatted = {
    labels: ['T1', 'T2', 'T3', 'T4', 'T5', 'T6'],
    datasets: [
      {
        label: 'Before Drying',
        data: beforeDryingData,
        color: () => '#3b82f6',
        barPercentage: 0.85,
      },
      {
        label: 'After Drying',
        data: afterDryingData,
        color: () => '#ef4444',
        barPercentage: 0.85,
      },
    ],
    barRadius: 6,
  };

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContainer}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            Before & After Weight Analysis
          </Text>
          <Text style={styles.headerSubtitle}>
            Weight comparison (kg) for each tray
          </Text>
        </View>

        {beforeDryingData && beforeDryingData.length > 0 ? (
          <View style={styles.chartContainer}>
            <BarChart
              data={chartData_formatted}
              width={screenWidth - 40}
              height={280}
              yAxisSuffix="kg"
              yAxisLabel=""
              yAxisInterval={1}
              chartConfig={{
                backgroundGradientFrom: '#ffffff',
                backgroundGradientTo: '#ffffff',
                color: (opacity = 1) => `rgba(55, 65, 81, ${opacity})`,
                labelColor: () => '#6b7280',
                strokeWidth: 1,
                barPercentage: 0.5,
                propsForBackgroundLines: {
                  strokeDasharray: '3',
                  stroke: '#e5e7eb',
                },
                decimalPlaces: 1,
              }}
              style={{
                borderRadius: 12,
                marginVertical: 10,
              }}
              fromZero
              withInnerLines
              withVerticalLabels
              withHorizontalLabels
            />
          </View>
        ) : (
          <View style={styles.noDataContainer}>
            <Text style={styles.noDataText}>No weight data available. Save weights from the Dashboard to see the comparison.</Text>
          </View>
        )}

        {/* Summary Stats */}
        {statsData && statsData.length > 0 && (
          <View style={styles.statsContainer}>
            <Text style={styles.statsTitle}>Weight Loss Summary</Text>
            <View style={styles.statsGrid}>
              {statsData.map((item) => (
                <View key={item.tray} style={styles.statCard}>
                  <Text style={styles.statLabel}>Tray {item.tray}</Text>
                  <Text style={styles.statValue}>
                    {item.reduction.toFixed(2)}kg
                  </Text>
                  <Text style={styles.statPercent}>
                    {item.percent}% reduction
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Legend */}
        <View style={styles.legendContainer}>
          <View style={styles.legendItem}>
            <View
              style={[styles.legendColor, { backgroundColor: '#3b82f6' }]}
            />
            <Text style={styles.legendText}>Before Drying</Text>
          </View>
          <View style={styles.legendItem}>
            <View
              style={[styles.legendColor, { backgroundColor: '#ef4444' }]}
            />
            <Text style={styles.legendText}>After Drying</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    backgroundColor: '#f9fafb',
  },
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f9fafb',
  },
  header: {
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#6b7280',
  },
  chartContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  noDataContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    minHeight: 250,
  },
  noDataText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#6b7280',
  },
  statsContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  statsTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ef4444',
    marginBottom: 2,
  },
  statPercent: {
    fontSize: 11,
    color: '#9ca3af',
  },
  legendContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 2,
    marginRight: 8,
  },
  legendText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },
});

export default WeightMobileGroupedBarChart;
