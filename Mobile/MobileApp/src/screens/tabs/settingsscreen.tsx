import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useEffect } from 'react';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Settings {
  autoRefresh: boolean;
}

const defaultSettings: Settings = {
  autoRefresh: true,
};

const settingsscreen: React.FC = () => {
  const navigation = useNavigation();
  const [settings, setSettings] = useState<Settings>(defaultSettings);

  // Load settings from AsyncStorage on mount
  useEffect(() => {
    loadSettings();
  }, []);

  // Save settings whenever they change
  useEffect(() => {
    saveSettings();
  }, [settings]);

  const loadSettings = async () => {
    try {
      const saved = await AsyncStorage.getItem('systemSettings');
      if (saved) {
        setSettings(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      setSettings(defaultSettings);
    }
  };

  const saveSettings = async () => {
    try {
      await AsyncStorage.setItem('systemSettings', JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  const handleSettingChange = (key: keyof Settings, value: boolean) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleResetSettings = () => {
    Alert.alert(
      'Reset All Settings',
      'Are you sure you want to reset all settings to default? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('systemSettings');
              await AsyncStorage.removeItem('notificationSettings');
              setSettings(defaultSettings);
              Alert.alert('Success', 'All settings have been reset to default.');
            } catch (error) {
              console.error('Error resetting settings:', error);
              Alert.alert('Error', 'Failed to reset settings.');
            }
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action is permanent and cannot be undone. All your data will be lost.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            // Add your account deletion logic here
            Alert.alert('Account Deletion', 'Account deletion feature coming soon.');
          },
        },
      ]
    );
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
          <Text style={styles.headerTitle}>Settings</Text>
        </View>

        {/* Content */}
        <ScrollView style={styles.content}>
          <View style={styles.profileSection}>
            <View style={styles.settingsContent}>
              {/* Dashboard Settings */}
              <View style={styles.settingsGroup}>
                <Text style={styles.groupTitle}>Dashboard</Text>

                <View style={styles.settingItemToggle}>
                  <View style={styles.settingInfo}>
                    <Text style={styles.settingTitle}>Auto Refresh</Text>
                    <Text style={styles.settingDescription}>
                      Automatically refresh sensor data every 5 seconds
                    </Text>
                  </View>
                  <Switch
                    value={settings.autoRefresh}
                    onValueChange={(value) =>
                      handleSettingChange('autoRefresh', value)
                    }
                    trackColor={{ false: '#D1D1D6', true: '#34C759' }}
                    thumbColor="#FFFFFF"
                    ios_backgroundColor="#D1D1D6"
                  />
                </View>
              </View>

              {/* Danger Zone */}
              {/* <View style={styles.settingsGroup}>
                <View style={styles.dangerZone}>
                  <Text style={styles.dangerZoneTitle}>Danger Zone</Text>

                  <TouchableOpacity
                    style={styles.dangerBtn}
                    onPress={handleResetSettings}
                  >
                    <Ionicons name="refresh-outline" size={20} color="#FFFFFF" />
                    <Text style={styles.dangerBtnText}>Reset All Settings</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.dangerBtn}
                    onPress={handleDeleteAccount}
                  >
                    <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
                    <Text style={styles.dangerBtnText}>Delete Account</Text>
                  </TouchableOpacity>
                </View>
              </View> */}
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
  settingsContent: ViewStyle;
  settingsGroup: ViewStyle;
  groupTitle: TextStyle;
  settingItemToggle: ViewStyle;
  settingInfo: ViewStyle;
  settingTitle: TextStyle;
  settingDescription: TextStyle;
  dangerZone: ViewStyle;
  dangerZoneTitle: TextStyle;
  dangerBtn: ViewStyle;
  dangerBtnText: TextStyle;
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
  settingsContent: {
    gap: 24,
  },
  settingsGroup: {
    gap: 16,
  },
  groupTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  settingItemToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
    gap: 4,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#666666',
  },
  dangerZone: {
    backgroundColor: '#FFF5F5',
    borderRadius: 12,
    padding: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: '#FFE0E0',
  },
  dangerZoneTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#DC2626',
    marginBottom: 8,
  },
  dangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
  },
  dangerBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default settingsscreen;