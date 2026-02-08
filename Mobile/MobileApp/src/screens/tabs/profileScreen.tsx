import { 
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ViewStyle,
  TextStyle,
  ImageBackground,
  ActivityIndicator,
  Modal,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import React, { useState, useEffect } from 'react';
import useAuthStore from '../../store/authStore';
import { useNavigation } from '@react-navigation/native';
import NetInfo from '@react-native-community/netinfo';

interface HeaderProps {
  username: string;
}
const Header: React.FC<HeaderProps> = ({ username }) => {
  return (
    <ImageBackground
      source={require("../../assets/images/banner2.jpg")}
      style={styles.header}
    >
       <View style={styles.headerOverlay}>
        <View style={styles.headerContent}>
           <View style={styles.avatarContainer}>
            <Ionicons name="person-circle" size={100} color="#FFFFFF" />
          </View>
          <Text style={styles.usernameText}>{username}</Text>
        </View>
      </View>
    </ImageBackground>
  );
};

const profileScreen: React.FC = () => {
  const { logout, user } = useAuthStore();
  const navigation = useNavigation<any>();
  const [username, setUsername] = useState('User');
  const [isConnected, setIsConnected] = useState<boolean | null>(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    fetchUserData();
  }, [user]);

  const fetchUserData = async () => {
    if (user) { 
      setUsername(user.username || 'User');
    }
  };

  const navigateToEditProfile = () => {
    navigation.navigate('EditProfileScreen');
  }

  const navigateToNotifications = () => {
    navigation.navigate('EditNotificationScreen');
  }

  const navigateToHelpCenter = () => {
    navigation.navigate('HelpCenterScreen');
  }

  const navigateToSettings = () => {
    navigation.navigate('SettingsScreen');
  }

  const handleLogout = () => {
    Alert.alert(
      'Confirm Logout',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log out',
          style: 'destructive',
          onPress: async () => {
            // Check internet connectivity
            const netInfoState = await NetInfo.fetch();
            setIsConnected(netInfoState.isConnected);
            
            if (!netInfoState.isConnected) {
              Alert.alert('No Connection', 'Please check your internet connection and try again.');
              return;
            }
            
            setIsLoggingOut(true);
            try {
              await logout();
              setIsLoggingOut(false);
              navigation.reset({
                index: 0,
                routes: [{ name: 'LoginPage' }],
              });
            } catch (error) {
              setIsLoggingOut(false);
              Alert.alert('Error', 'Failed to log out.');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Loading Overlay */}
      <Modal
        transparent={true}
        animationType="fade"
        visible={isLoggingOut && isConnected === true}
      >
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContent}>
            <ActivityIndicator size="large" color="#27AE60" style={{ marginTop: 20 }} />
          </View>
        </View>
      </Modal>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Header username={username} />

        <View style={styles.menuSection}>
          <TouchableOpacity style={styles.menuItem} onPress={navigateToEditProfile}>
            <View style={styles.menuIcon}>
              <Ionicons name="person-circle-outline" size={24} color="#27AE60" />
            </View>
            <Text style={styles.menuText}>Edit Profile</Text>
              <Ionicons name="chevron-forward" size={20} color="#999" style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
          <View style={styles.separator} />
          
          <TouchableOpacity style={styles.menuItem} onPress={navigateToNotifications}>
            <View style={styles.menuIcon}>
              <Ionicons name="notifications-outline" size={24} color="#27AE60" />
            </View>
            <Text style={styles.menuText}>Edit Notification</Text>
              <Ionicons name="chevron-forward" size={20} color="#999" style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
          <View style={styles.separator} />
          
          <TouchableOpacity style={styles.menuItem} onPress={navigateToHelpCenter}>
            <View style={styles.menuIcon}>
              <Ionicons name="help-circle-outline" size={24} color="#27AE60" />
            </View>
            <Text style={styles.menuText}>Help Center</Text>
              <Ionicons name="chevron-forward" size={20} color="#999" style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
          <View style={styles.separator} />
          
          <TouchableOpacity style={styles.menuItem} onPress={navigateToSettings}>
            <View style={styles.menuIcon}>
              <Ionicons name="settings-outline" size={24} color="#27AE60" />
            </View>
            <Text style={styles.menuText}>Settings</Text>
              <Ionicons name="chevron-forward" size={20} color="#999" style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
        </View>
    
        {/* Logout Button */}
        <View style={styles.logoutContainer}>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={styles.logoutText}>Log out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
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
  logoutContainer: ViewStyle;
  logoutBtn: ViewStyle;
  logoutText: TextStyle;
  menuSection: ViewStyle;
  menuItem: ViewStyle;
  menuIcon: ViewStyle;
  menuText: TextStyle;
  headerContent: ViewStyle;
  avatarContainer: TextStyle;
  usernameText: TextStyle;
  separator: ViewStyle;
  loadingOverlay: ViewStyle;
  loadingContent: ViewStyle;
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
    height: 250,
    overflow: 'hidden',
  },
  headerImage: {
    opacity: 0.3,
  },
  headerOverlay: {
    flex: 1,
    justifyContent: 'center',
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
  logoutContainer: {
    paddingHorizontal: 15,
    paddingTop: 10,
    paddingBottom: 20,
  },
  logoutBtn: {
    backgroundColor: '#27AE60',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    elevation: 2,
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  menuSection: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,  
    marginTop: 15,
    marginBottom: 15,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  menuIcon: {
    marginRight: 15,
  },
  menuText: {
    fontSize: 16,
    color: '#333333',
  },
  headerContent: {
    alignItems: 'center',
  },  
  avatarContainer: {
    marginBottom: 15,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  usernameText: {
    fontSize: 28,
    color: '#FFFFFF',
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  separator: {
    height: 1,
    backgroundColor: '#E5E5E5',
    marginHorizontal: 20,
  },
  loadingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 15,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default profileScreen;