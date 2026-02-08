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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import React, { useState, useCallback, useEffect } from 'react';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useMessaging } from '../../../android/app/hooks/firebase/useMessaging';
import NetInfo from '@react-native-community/netinfo';

const NotificationScreen: React.FC = () => {
  const navigation = useNavigation();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState<boolean | null>(true);
  
  const { fcmToken } = useMessaging();
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      
      const checkConnectivityAndLoad = async () => {
        try {
          const netInfoState = await NetInfo.fetch();
          setIsConnected(netInfoState.isConnected);

          setTimeout(() => {
            setLoading(false);
          }, 1500);
        } catch (error) {
          console.error('Error checking connectivity:', error);
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
      
      setTimeout(() => {
        setRefreshing(false);
      }, 2000);
    } catch (error) {
      console.error('Error refreshing:', error);
      setRefreshing(false);
    }
  }, []);

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
                <TouchableOpacity 
                  style={styles.retryButton}
                  onPress={onRefresh}
                >
                  <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <Text style={styles.messageText}>
                All alerts were acknowledge...
              </Text>
            )}
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
  scrollContent: ViewStyle;
  content: ViewStyle;
  messageText: TextStyle;
  loadingContainer: ViewStyle;
  loadingText: TextStyle;
  retryButton: ViewStyle;
  retryText: TextStyle;
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
    backgroundColor: "#FFFFFF",
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
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  messageText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginTop: 12,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666666',
    marginTop: 12,
    textAlign: 'center',
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
});

export default NotificationScreen;