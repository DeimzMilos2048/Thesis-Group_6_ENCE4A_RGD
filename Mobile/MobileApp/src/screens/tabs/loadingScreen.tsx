import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Animated,
  Dimensions,
  ViewStyle,
  TextStyle,
  ImageStyle,
} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type RootStackParamList = {
  LoadingScreen: undefined;
  IntroductionUserScreen: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const { width } = Dimensions.get('window');

const LoadingScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [progress, setProgress] = useState(0);
  const [connectionType, setConnectionType] = useState<string>('Checking...');
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const progressAnim = useState(new Animated.Value(0))[0];
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let hasStartedProgress = false;

    const startProgressBar = (connType: string, connected: boolean) => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }

      if (!connected) {
        console.log('No connection - progress paused');
        return;
      }

      let incrementAmount = 2;
      let intervalSpeed = 100;
      
      switch (connType) {
        case 'WiFi':
          incrementAmount = 2; 
          intervalSpeed = 90;
          break;
        case 'Mobile Data':
          incrementAmount = 1; 
          intervalSpeed = 150;
          break;
        default:
          incrementAmount = 1.5; 
          intervalSpeed = 120;
      }
      
      console.log(`Starting progress: ${connType}, speed: ${incrementAmount}% per ${intervalSpeed}ms`);
      
      progressIntervalRef.current = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            if (progressIntervalRef.current) {
              clearInterval(progressIntervalRef.current);
              progressIntervalRef.current = null;
            }
            setTimeout(() => {
              navigation.replace('IntroductionUserScreen');
            }, 500);
            return 100;
          }
          return prev + incrementAmount;
        });
      }, intervalSpeed);
    };

    const stopProgressBar = () => {
      if (progressIntervalRef.current) {
        console.log('Connection lost - pausing progress');
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    };

    const unsubscribe = NetInfo.addEventListener(state => {
      console.log('Connection type:', state.type);
      console.log('Is connected?', state.isConnected);
      
      const connected = state.isConnected ?? false;
      setIsConnected(connected);
      
      let connType = 'Network';
      if (connected) {
        const typeMap: { [key: string]: string } = {
          'wifi': 'WiFi',
          'cellular': 'Mobile Data',
        };
        connType = typeMap[state.type] || 'Network';
        setConnectionType(connType);
        
        if (hasStartedProgress) {
          console.log('Connection restored - resuming progress');
        } else {
          hasStartedProgress = true;
          console.log('Initial connection detected - starting progress');
        }
        startProgressBar(connType, connected);
      } else {
        setConnectionType('No Connection');
        stopProgressBar();
      }
    });

    const fallbackTimeout = setTimeout(() => {
      if (!hasStartedProgress && isConnected === null) {
        hasStartedProgress = true;
        console.log('Fallback timeout - starting progress');
        setIsConnected(true);
        setConnectionType('Network');
        startProgressBar('Network', true);
      }
    }, 1000);

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      clearTimeout(fallbackTimeout);
      unsubscribe();
    };
  }, [navigation]);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 100,
      useNativeDriver: false,
    }).start();
  }, [progress, progressAnim]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  const getConnectionStatus = () => {
    if (isConnected === null) {
      return 'Checking connection...';
    } else if (isConnected) {
      return `Connected via ${connectionType}`;
    } else {
      return 'No internet connection - Loading paused';
    }
  };

  return (
    <View style={styles.container}>
      {/* Logo/Brand Section */}
      <View style={styles.logoContainer}>
        <Image
          source={require("../../assets/images/tp_thesis_logo_1024.png")}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      {/* Progress Bar Section */}
      <View style={styles.progressSection}>
        <View style={styles.progressBarContainer}>
          <Animated.View
            style={[
              styles.progressBar,
              {
                width: progressWidth,
                backgroundColor: isConnected === false ? '#FFA500' : '#4CAF50',
              },
            ]}
          />
        </View>
        
        {/* Progress Percentage */}
        {/* <Text style={styles.progressText}>{Math.round(progress)}%</Text> */}
        
        {/* Connection Status */}
        {/* <View style={styles.connectionContainer}>
          <View style={[
            styles.connectionDot, 
            { backgroundColor: isConnected === null ? '#FFA500' : isConnected ? '#4CAF50' : '#F44336' }
          ]} />
          <Text style={[
            styles.connectionText,
            { color: isConnected === false ? '#F44336' : '#6B7280' }
          ]}>
            {getConnectionStatus()}
          </Text>
        </View> */}
      </View>
    </View>
  );
};

interface Styles {
  container: ViewStyle;
  logoContainer: ViewStyle;
  logo: ImageStyle;
  progressSection: ViewStyle;
  progressBarContainer: ViewStyle;
  progressBar: ViewStyle;
  progressText: TextStyle;
  connectionContainer: ViewStyle;
  connectionDot: ViewStyle;
  connectionText: TextStyle;
}

const styles = StyleSheet.create<Styles>({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 60,
  },
  logoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: width * 0.6,
    height: width * 0.6,
  },
  progressSection: {
    width: '100%',
    paddingHorizontal: 40,
    paddingBottom: 40,
    alignItems: 'center',
  },
  progressBarContainer: {
    width: '100%',
    height: 12,
    backgroundColor: '#E5E5E5',
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 15,
  },
  progressBar: {
    height: '100%',
    borderRadius: 20,
  },
  progressText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginTop: 8,
  },
  connectionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  connectionText: {
    fontSize: 12,
    color: '#6B7280',
  },
});

export default LoadingScreen;