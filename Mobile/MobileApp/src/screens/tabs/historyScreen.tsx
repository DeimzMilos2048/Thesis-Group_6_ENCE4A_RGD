import { 
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
  ImageBackground,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import React, { useState } from 'react';

const Header: React.FC = () => {
  return (
    <ImageBackground
      source={require("../../assets/images/banner2.jpg")}
      style={styles.header}
    >
      <View style={styles.headerOverlay}>
        <Text style={styles.headerText}>History</Text>
      </View>
    </ImageBackground>
  );
};

interface DryingSession {
  id: string;
  date: string;
  time: string;
  duration: string;
  initialWeight: number;
  finalWeight: number;
  weightLoss: number;
  initialMoisture: number;
  finalMoisture: number;
  avgTemp: number;
  status: 'Complete' | 'Incomplete' | 'Error';
}

const historyScreen: React.FC = () => {
  const [sessions] = useState<DryingSession[]>([
    {
      id: '1',
      date: 'Dec 17, 2024',
      time: '10:30 AM',
      duration: '3h 45m',
      initialWeight: 20.0,
      finalWeight: 16.4,
      weightLoss: 18,
      initialMoisture: 18.5,
      finalMoisture: 12.5,
      avgTemp: 54.2,
      status: 'Complete',
    },
    {
      id: '2',
      date: 'Dec 16, 2024',
      time: '02:15 PM',
      duration: '3h 10m',
      initialWeight: 25.0,
      finalWeight: 20.5,
      weightLoss: 18,
      initialMoisture: 19.2,
      finalMoisture: 12.8,
      avgTemp: 55.1,
      status: 'Complete',
    },
    {
      id: '3',
      date: 'Dec 15, 2024',
      time: '09:00 AM',
      duration: '3h 30m',
      initialWeight: 18.0,
      finalWeight: 14.8,
      weightLoss: 17.8,
      initialMoisture: 17.8,
      finalMoisture: 12.2,
      avgTemp: 53.8,
      status: 'Complete',
    },
  ]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Complete':
        return '#22C55E';
      case 'Incomplete':
        return '#F59E0B';
      case 'Error':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Complete':
        return 'checkmark-circle';
      case 'Incomplete':
        return 'alert-circle';
      case 'Error':
        return 'close-circle';
      default:
        return 'help-circle';
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Header />

        {/* Summary Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{sessions.length}</Text>
            <Text style={styles.statLabel}>Total Sessions</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>
              {sessions.filter(s => s.status === 'Complete').length}
            </Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>54.1°C</Text>
            <Text style={styles.statLabel}>Avg Temp</Text>
          </View>
        </View>

        {/* History List */}
        <Text style={styles.sectionTitle}>Recent Sessions</Text>
        
        {sessions.map((session) => (
          <TouchableOpacity 
            key={session.id} 
            style={styles.sessionCard}
            activeOpacity={0.7}
          >
            {/* Header Row */}
            <View style={styles.sessionHeader}>
              <View style={styles.sessionDateContainer}>
                <Ionicons name="calendar-outline" size={16} color="#6B7280" />
                <Text style={styles.sessionDate}>{session.date}</Text>
                <Text style={styles.sessionTime}>{session.time}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(session.status)}20` }]}>
                <Ionicons 
                  name={getStatusIcon(session.status)} 
                  size={14} 
                  color={getStatusColor(session.status)} 
                />
                <Text style={[styles.statusText, { color: getStatusColor(session.status) }]}>
                  {session.status}
                </Text>
              </View>
            </View>

            {/* Details Grid */}
            <View style={styles.detailsGrid}>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Duration</Text>
                <Text style={styles.detailValue}>{session.duration}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Weight Loss</Text>
                <Text style={styles.detailValue}>{session.weightLoss}%</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Avg Temp</Text>
                <Text style={styles.detailValue}>{session.avgTemp}°C</Text>
              </View>
            </View>

            {/* Weight Info */}
            <View style={styles.weightInfo}>
              <View style={styles.weightRow}>
                <Text style={styles.weightLabel}>Initial: {session.initialWeight} kg</Text>
                <Ionicons name="arrow-forward" size={14} color="#6B7280" />
                <Text style={styles.weightLabel}>Final: {session.finalWeight} kg</Text>
              </View>
              <View style={styles.moistureRow}>
                <Text style={styles.moistureLabel}>Moisture: {session.initialMoisture}% → {session.finalMoisture}%</Text>
              </View>
            </View>

            {/* View Details Button */}
            <TouchableOpacity style={styles.viewDetailsBtn}>
              <Text style={styles.viewDetailsText}>View Details</Text>
              <Ionicons name="chevron-forward" size={16} color="#27AE60" />
            </TouchableOpacity>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

interface Styles {
  safeArea: ViewStyle;
  container: ViewStyle;
  scrollContent: ViewStyle;
  header: ViewStyle;
  headerOverlay: ViewStyle;
  headerText: TextStyle;
  statsContainer: ViewStyle;
  statBox: ViewStyle;
  statNumber: TextStyle;
  statLabel: TextStyle;
  sectionTitle: TextStyle;
  sessionCard: ViewStyle;
  sessionHeader: ViewStyle;
  sessionDateContainer: ViewStyle;
  sessionDate: TextStyle;
  sessionTime: TextStyle;
  statusBadge: ViewStyle;
  statusText: TextStyle;
  detailsGrid: ViewStyle;
  detailItem: ViewStyle;
  detailLabel: TextStyle;
  detailValue: TextStyle;
  weightInfo: ViewStyle;
  weightRow: ViewStyle;
  weightLabel: TextStyle;
  moistureRow: ViewStyle;
  moistureLabel: TextStyle;
  viewDetailsBtn: ViewStyle;
  viewDetailsText: TextStyle;
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
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    marginBottom: 20,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 15,
    marginHorizontal: 5,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#27AE60',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginVertical: 10,
    color: '#1F2937',
    paddingHorizontal: 15,
  },
  sessionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 15,
    marginHorizontal: 15,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sessionDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sessionDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 6,
  },
  sessionTime: {
    fontSize: 12,
    color: '#9CA3AF',
    marginLeft: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  detailsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  detailItem: {
    flex: 1,
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  weightInfo: {
    marginBottom: 10,
  },
  weightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  weightLabel: {
    fontSize: 13,
    color: '#4B5563',
    marginHorizontal: 6,
    fontWeight: '500',
  },
  moistureRow: {
    alignItems: 'center',
  },
  moistureLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  viewDetailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  viewDetailsText: {
    fontSize: 14,
    color: '#27AE60',
    fontWeight: '600',
    marginRight: 4,
  },
});

export default historyScreen;