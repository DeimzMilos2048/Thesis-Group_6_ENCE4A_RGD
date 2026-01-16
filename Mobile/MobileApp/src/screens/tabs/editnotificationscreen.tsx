import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
  ScrollView,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useEffect } from 'react';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Notifications {
  webNotifications: boolean;
  mobileNotifications: boolean;
  systemAlerts: boolean;
  moistureAlerts: boolean;
  humidityAlerts: boolean;
  temperatureAlerts: boolean;
  weightAlerts: boolean;
}

const defaultNotifications: Notifications = {
  webNotifications: true,
  mobileNotifications: false,
  systemAlerts: true,
  moistureAlerts: true,
  humidityAlerts: false,
  temperatureAlerts: true,
  weightAlerts: false,
};

const editnotificationscreen: React.FC = () => {
  const navigation = useNavigation();
  const [notifications, setNotifications] = useState<Notifications>(defaultNotifications);

  // Load notification settings from AsyncStorage on mount
  useEffect(() => {
    loadNotificationSettings();
  }, []);

  // Save notification settings whenever they change
  useEffect(() => {
    saveNotificationSettings();
  }, [notifications]);

  const loadNotificationSettings = async () => {
    try {
      const saved = await AsyncStorage.getItem('notificationSettings');
      if (saved) {
        setNotifications(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
      setNotifications(defaultNotifications);
    }
  };

  const saveNotificationSettings = async () => {
    try {
      await AsyncStorage.setItem('notificationSettings', JSON.stringify(notifications));
    } catch (error) {
      console.error('Error saving notification settings:', error);
    }
  };

  const handleNotificationToggle = (field: keyof Notifications) => {
    setNotifications((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={28} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Notification</Text>
        </View>

        {/* Content */}
        <ScrollView style={styles.content}>
          <View style={styles.profileSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Notification Preferences</Text>
            </View>

            {/* Edit Notifications */}
            <View style={styles.notificationSettings}>
              {/* General Notifications */}
              <View style={styles.notificationGroup}>
                <Text style={styles.groupTitle}>General Notifications</Text>

                <View style={styles.notificationItem}>
                  <View style={styles.notificationInfo}>
                    <Text style={styles.notificationTitle}>
                      Web Alert Notification
                    </Text>
                    <Text style={styles.notificationDescription}>
                      Receive notifications via web
                    </Text>
                  </View>
                  <Switch
                    value={notifications.webNotifications}
                    onValueChange={() =>
                      handleNotificationToggle('webNotifications')
                    }
                    trackColor={{ false: '#D1D1D6', true: '#34C759' }}
                    thumbColor="#FFFFFF"
                    ios_backgroundColor="#D1D1D6"
                  />
                </View>

                <View style={styles.notificationItem}>
                  <View style={styles.notificationInfo}>
                    <Text style={styles.notificationTitle}>
                      Mobile Alert Notification
                    </Text>
                    <Text style={styles.notificationDescription}>
                      Receive notifications via mobile
                    </Text>
                  </View>
                  <Switch
                    value={notifications.mobileNotifications}
                    onValueChange={() =>
                      handleNotificationToggle('mobileNotifications')
                    }
                    trackColor={{ false: '#D1D1D6', true: '#34C759' }}
                    thumbColor="#FFFFFF"
                    ios_backgroundColor="#D1D1D6"
                  />
                </View>
              </View>

              {/* System Alerts */}
              <View style={styles.notificationGroup}>
                <Text style={styles.groupTitle}>System Alerts</Text>

                <View style={styles.notificationItem}>
                  <View style={styles.notificationInfo}>
                    <Text style={styles.notificationTitle}>System Alerts</Text>
                    <Text style={styles.notificationDescription}>
                      Critical system notifications
                    </Text>
                  </View>
                  <Switch
                    value={notifications.systemAlerts}
                    onValueChange={() =>
                      handleNotificationToggle('systemAlerts')
                    }
                    trackColor={{ false: '#D1D1D6', true: '#34C759' }}
                    thumbColor="#FFFFFF"
                    ios_backgroundColor="#D1D1D6"
                  />
                </View>

                <View style={styles.notificationItem}>
                  <View style={styles.notificationInfo}>
                    <Text style={styles.notificationTitle}>
                      Moisture Content Alerts
                    </Text>
                    <Text style={styles.notificationDescription}>
                      Alerts when moisture reaches target
                    </Text>
                  </View>
                  <Switch
                    value={notifications.moistureAlerts}
                    onValueChange={() =>
                      handleNotificationToggle('moistureAlerts')
                    }
                    trackColor={{ false: '#D1D1D6', true: '#34C759' }}
                    thumbColor="#FFFFFF"
                    ios_backgroundColor="#D1D1D6"
                  />
                </View>

                <View style={styles.notificationItem}>
                  <View style={styles.notificationInfo}>
                    <Text style={styles.notificationTitle}>
                      Humidity Alerts
                    </Text>
                    <Text style={styles.notificationDescription}>
                      Alerts for humidity changes
                    </Text>
                  </View>
                  <Switch
                    value={notifications.humidityAlerts}
                    onValueChange={() =>
                      handleNotificationToggle('humidityAlerts')
                    }
                    trackColor={{ false: '#D1D1D6', true: '#34C759' }}
                    thumbColor="#FFFFFF"
                    ios_backgroundColor="#D1D1D6"
                  />
                </View>

                <View style={styles.notificationItem}>
                  <View style={styles.notificationInfo}>
                    <Text style={styles.notificationTitle}>
                      Temperature Alerts
                    </Text>
                    <Text style={styles.notificationDescription}>
                      Alerts for temperature changes
                    </Text>
                  </View>
                  <Switch
                    value={notifications.temperatureAlerts}
                    onValueChange={() =>
                      handleNotificationToggle('temperatureAlerts')
                    }
                    trackColor={{ false: '#D1D1D6', true: '#34C759' }}
                    thumbColor="#FFFFFF"
                    ios_backgroundColor="#D1D1D6"
                  />
                </View>

                <View style={styles.notificationItem}>
                  <View style={styles.notificationInfo}>
                    <Text style={styles.notificationTitle}>Weight Alerts</Text>
                    <Text style={styles.notificationDescription}>
                      Alerts for weight changes
                    </Text>
                  </View>
                  <Switch
                    value={notifications.weightAlerts}
                    onValueChange={() =>
                      handleNotificationToggle('weightAlerts')
                    }
                    trackColor={{ false: '#D1D1D6', true: '#34C759' }}
                    thumbColor="#FFFFFF"
                    ios_backgroundColor="#D1D1D6"
                  />
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

interface Styles {
  safeArea: ViewStyle;
  container: ViewStyle;
  header: ViewStyle;
  backButton: ViewStyle;
  headerTitle: TextStyle;
  content: ViewStyle;
  profileSection: ViewStyle;
  sectionHeader: ViewStyle;
  sectionTitle: TextStyle;
  notificationSettings: ViewStyle;
  notificationGroup: ViewStyle;
  groupTitle: TextStyle;
  notificationItem: ViewStyle;
  notificationInfo: ViewStyle;
  notificationTitle: TextStyle;
  notificationDescription: TextStyle;
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
  content: {
    flex: 1,
  },
  profileSection: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 12,
    padding: 20,
  },
  sectionHeader: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000000',
  },
  notificationSettings: {
    gap: 24,
  },
  notificationGroup: {
    gap: 16,
  },
  groupTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  notificationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  notificationInfo: {
    flex: 1,
    marginRight: 16,
    gap: 4,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  notificationDescription: {
    fontSize: 14,
    color: '#666666',
  },
});

export default editnotificationscreen;