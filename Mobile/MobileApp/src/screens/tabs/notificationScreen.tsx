import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import React, { useState, useCallback } from 'react';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useMessaging } from '../../../android/app/hooks/firebase/useMessaging';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Alert {
  _id: string;
  id: string;
  title: string;
  message: string;
  type: 'CRITICAL' | 'WARNING' | 'STABLE';
  isRead: boolean;
  createdAt: string;
  sensorData?: {
    temperature?: number;
    moistureavg?: number;
    humidity?: number;
    weight1?: number;
    weight2?: number;
    moisture1?: number;
    moisture2?: number;
  };
}

interface Styles {
  safeArea: ViewStyle;
  container: ViewStyle;
  header: ViewStyle;
  backButton: ViewStyle;
  headerTitle: TextStyle;
  scrollContent: ViewStyle;
  content: ViewStyle;
  messageText: TextStyle;
  loadingContainer: ViewStyle;
  loadingText: TextStyle;
  retryButton: ViewStyle;
  retryText: TextStyle;
  alertsContainer: ViewStyle;
  actionButtonsRow: ViewStyle;
  acknowledgeAllButton: ViewStyle;
  acknowledgeAllText: TextStyle;
  markUnreadButton: ViewStyle;
  markUnreadText: TextStyle;
  alertCard: ViewStyle;
  unreadAlert: ViewStyle;
  alertLeft: ViewStyle;
  alertCenter: ViewStyle;
  alertTitle: TextStyle;
  alertMessage: TextStyle;
  alertSensorData: TextStyle;
  alertRight: ViewStyle;
  alertStatus: TextStyle;
  alertTime: TextStyle;
  modalOverlay: ViewStyle;
  modalContent: ViewStyle;
  modalHeader: ViewStyle;
  modalTitle: TextStyle;
  modalMessage: TextStyle;
  sensorGrid: ViewStyle;
  sensorItem: ViewStyle;
  sensorText: TextStyle;
  modalActions: ViewStyle;
  acknowledgeButton: ViewStyle;
  disabledButton: ViewStyle;
  acknowledgeButtonText: TextStyle;
  closeButton: ViewStyle;
  closeButtonText: TextStyle;
  deleteButton: ViewStyle;
  deleteButtonText: TextStyle;
}

const styles = StyleSheet.create<Styles>({
  safeArea: {
    flex: 1,
    backgroundColor: '#F0F0F0',
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    backgroundColor: '#FFFFFF',
    borderBottomColor: '#E5E5E5',
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
  },
  messageText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginTop: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666666',
    marginTop: 12,
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: '#27AE60',
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 8,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  alertsContainer: {
    width: '100%',
    paddingHorizontal: 16,
    paddingTop: 12,
    flex: 1,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  acknowledgeAllButton: {
    flex: 1,
    backgroundColor: '#27AE60',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  acknowledgeAllText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  markUnreadButton: {
    flex: 1,
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  markUnreadText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  alertCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  unreadAlert: {
    backgroundColor: '#F8F9FA',
  },
  alertLeft: {
    marginRight: 12,
  },
  alertCenter: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },
  alertMessage: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
  },
  alertSensorData: {
    fontSize: 12,
    color: '#888888',
  },
  alertRight: {
    alignItems: 'flex-end',
  },
  alertStatus: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  alertTime: {
    fontSize: 12,
    color: '#888888',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    flex: 1,
  },
  modalMessage: {
    fontSize: 16,
    color: '#666666',
    lineHeight: 24,
    marginBottom: 20,
  },
  sensorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  sensorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  sensorText: {
    fontSize: 14,
    color: '#666666',
    marginLeft: 8,
  },
  modalActions: {
    gap: 10,
  },
  acknowledgeButton: {
    backgroundColor: '#27AE60',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#CCCCCC',
  },
  acknowledgeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    backgroundColor: '#F0F0F0',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#333333',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#E74C3C',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

const NotificationScreen: React.FC = () => {
  const navigation = useNavigation();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState<boolean | null>(true);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const { fcmToken } = useMessaging();

  const getAPIBaseUrl = () => {
    if (__DEV__) {
      return 'http://192.168.86.181:5001';
    } else {
      return 'https://mala-backend-q03k.onrender.com';
    }
  };

  const fetchAlerts = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`${getAPIBaseUrl()}/api/notifications`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAlerts(Array.isArray(data) ? data : []);
        const unread = Array.isArray(data) ? data.filter((a: Alert) => !a.isRead).length : 0;
        setUnreadCount(unread);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const acknowledgeAlert = async (alertId: string) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`${getAPIBaseUrl()}/api/notifications/${alertId}/read`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        setAlerts(prev =>
          prev.map(alert =>
            alert._id === alertId || alert.id === alertId
              ? { ...alert, isRead: true }
              : alert
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
        setSelectedAlert(null);
      }
    } catch (error) {
      console.error('Error acknowledging notification:', error);
    }
  };

  const acknowledgeAllAlerts = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`${getAPIBaseUrl()}/api/notifications/read-all`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        setAlerts(prev => prev.map(alert => ({ ...alert, isRead: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Error acknowledging all notifications:', error);
    }
  };

  const markAllAsUnread = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`${getAPIBaseUrl()}/api/notifications/unread-all`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        setAlerts(prev => prev.map(alert => ({ ...alert, isRead: false })));
        setUnreadCount(alerts.length);
      }
    } catch (error) {
      console.error('Error marking all as unread:', error);
    }
  };

  const deleteAlert = async (alertId: string) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`${getAPIBaseUrl()}/api/notifications/${alertId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        setAlerts(prev => prev.filter(alert => alert._id !== alertId && alert.id !== alertId));
        const deletedAlert = alerts.find(alert => alert._id === alertId || alert.id === alertId);
        if (deletedAlert && !deletedAlert.isRead) {
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
        setSelectedAlert(null);
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);

      const checkConnectivityAndLoad = async () => {
        try {
          const netInfoState = await NetInfo.fetch();
          setIsConnected(netInfoState.isConnected);
          if (netInfoState.isConnected) await fetchAlerts();
          setTimeout(() => setLoading(false), 1500);
        } catch (error) {
          setIsConnected(false);
          setLoading(false);
        }
      };

      checkConnectivityAndLoad();
    }, [])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const netInfoState = await NetInfo.fetch();
      setIsConnected(netInfoState.isConnected);
      if (netInfoState.isConnected) await fetchAlerts();
      setTimeout(() => setRefreshing(false), 2000);
    } catch (error) {
      setRefreshing(false);
    }
  }, []);

  const formatTime = (createdAt: string) => {
    if (!createdAt) return 'Just now';
    const diffMs = Date.now() - new Date(createdAt).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} mins ago`;
    const h = Math.floor(diffMins / 60);
    if (h < 24) return `${h}hr ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'CRITICAL': return 'warning';
      case 'WARNING':  return 'alert-circle';
      default:         return 'checkmark-circle';
    }
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'CRITICAL': return '#E74C3C';
      case 'WARNING':  return '#F39C12';
      default:         return '#27AE60';
    }
  };

  const hasReadAlerts = alerts.some(a => a.isRead);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.container}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={28} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>System Alerts</Text>
        </View>

        {/* Content with Pull-to-Refresh */}
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#27AE60']}
              tintColor="#27AE60"
            />
          }
        >
          <View style={styles.content}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#27AE60" />
                <Text style={styles.loadingText}>Loading notifications...</Text>
              </View>
            ) : !isConnected ? (
              <View style={styles.loadingContainer}>
                <Ionicons name="cloud-offline-outline" size={50} color="#999" />
                <Text style={styles.messageText}>No internet connection</Text>
                <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
                  <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : alerts.length === 0 ? (
              <View style={styles.loadingContainer}>
                <Ionicons name="checkmark-circle" size={50} color="#27AE60" />
                <Text style={styles.messageText}>No alerts available</Text>
              </View>
            ) : (
              <View style={styles.alertsContainer}>

                {/* Action Buttons Row */}
                {alerts.length > 0 && (
                  <View style={styles.actionButtonsRow}>
                    {unreadCount > 0 && (
                      <TouchableOpacity
                        style={styles.acknowledgeAllButton}
                        onPress={acknowledgeAllAlerts}
                      >
                        <Text style={styles.acknowledgeAllText}>
                          Mark All as Read ({unreadCount})
                        </Text>
                      </TouchableOpacity>
                    )}
                    {hasReadAlerts && (
                      <TouchableOpacity
                        style={styles.markUnreadButton}
                        onPress={markAllAsUnread}
                      >
                        <Text style={styles.markUnreadText}>Mark All as Unread</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                {alerts.map(alert => (
                  <TouchableOpacity
                    key={alert._id || alert.id}
                    style={[
                      styles.alertCard,
                      !alert.isRead && styles.unreadAlert,
                    ]}
                    onPress={() => setSelectedAlert(alert)}
                  >
                    <View style={styles.alertLeft}>
                      <Ionicons
                        name={getAlertIcon(alert.type)}
                        size={24}
                        color={getAlertColor(alert.type)}
                      />
                    </View>
                    <View style={styles.alertCenter}>
                      <Text style={styles.alertTitle}>{alert.title}</Text>
                      <Text style={styles.alertMessage}>{alert.message}</Text>
                      <Text style={styles.alertSensorData}>
                        {alert.sensorData?.temperature ? `${alert.sensorData.temperature}°C | ` : ''}
                        {alert.sensorData?.moistureavg ? `Moisture: ${alert.sensorData.moistureavg.toFixed(1)}%` : ''}
                        {alert.sensorData?.moisture1 && alert.sensorData?.moisture2
                          ? `M1: ${alert.sensorData.moisture1}% M2: ${alert.sensorData.moisture2}%`
                          : ''}
                        {alert.sensorData?.humidity ? `Humidity: ${alert.sensorData.humidity}%` : ''}
                      </Text>
                    </View>
                    <View style={styles.alertRight}>
                      <Text style={[styles.alertStatus, { color: alert.isRead ? '#27AE60' : '#F39C12' }]}>
                        {alert.isRead ? 'Acknowledged' : 'New'}
                      </Text>
                      <Text style={styles.alertTime}>{formatTime(alert.createdAt)}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </ScrollView>

        {/* Alert Detail Modal */}
        <Modal
          visible={!!selectedAlert}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setSelectedAlert(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{selectedAlert?.title}</Text>
                <TouchableOpacity onPress={() => setSelectedAlert(null)}>
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalMessage}>{selectedAlert?.message}</Text>

              {selectedAlert?.sensorData && (
                <View style={styles.sensorGrid}>
                  {selectedAlert.sensorData.temperature != null && (
                    <View style={styles.sensorItem}>
                      <Ionicons name="thermometer" size={16} color="#666" />
                      <Text style={styles.sensorText}>{selectedAlert.sensorData.temperature}°C</Text>
                    </View>
                  )}
                  {selectedAlert.sensorData.moistureavg != null && (
                    <View style={styles.sensorItem}>
                      <Ionicons name="water" size={16} color="#666" />
                      <Text style={styles.sensorText}>Moisture: {selectedAlert.sensorData.moistureavg.toFixed(1)}%</Text>
                    </View>
                  )}
                  {selectedAlert.sensorData.moisture1 != null && (
                    <View style={styles.sensorItem}>
                      <Ionicons name="water" size={16} color="#666" />
                      <Text style={styles.sensorText}>M1: {selectedAlert.sensorData.moisture1}%</Text>
                    </View>
                  )}
                  {selectedAlert.sensorData.moisture2 != null && (
                    <View style={styles.sensorItem}>
                      <Ionicons name="water" size={16} color="#666" />
                      <Text style={styles.sensorText}>M2: {selectedAlert.sensorData.moisture2}%</Text>
                    </View>
                  )}
                  {selectedAlert.sensorData.humidity != null && (
                    <View style={styles.sensorItem}>
                      <Ionicons name="cloud" size={16} color="#666" />
                      <Text style={styles.sensorText}>{selectedAlert.sensorData.humidity}%</Text>
                    </View>
                  )}
                  {selectedAlert.sensorData.weight1 != null && (
                    <View style={styles.sensorItem}>
                      <Ionicons name="scale" size={16} color="#666" />
                      <Text style={styles.sensorText}>W1: {selectedAlert.sensorData.weight1}kg</Text>
                    </View>
                  )}
                  {selectedAlert.sensorData.weight2 != null && (
                    <View style={styles.sensorItem}>
                      <Ionicons name="scale" size={16} color="#666" />
                      <Text style={styles.sensorText}>W2: {selectedAlert.sensorData.weight2}kg</Text>
                    </View>
                  )}
                </View>
              )}

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.acknowledgeButton, selectedAlert?.isRead && styles.disabledButton]}
                  onPress={() => selectedAlert && acknowledgeAlert(selectedAlert._id || selectedAlert.id)}
                  disabled={selectedAlert?.isRead}
                >
                  <Text style={styles.acknowledgeButtonText}>
                    {selectedAlert?.isRead ? 'Already Acknowledged' : 'Acknowledge'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => selectedAlert && deleteAlert(selectedAlert._id || selectedAlert.id)}
                >
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setSelectedAlert(null)}
                >
                  <Text style={styles.closeButtonText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
};

export default NotificationScreen;