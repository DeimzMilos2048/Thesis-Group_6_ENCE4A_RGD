import { 

  View,

  Text,

  StyleSheet,

  ScrollView,

  TouchableOpacity,

  TextInput,

  ViewStyle,

  TextStyle,

  ImageBackground,

  Alert,

} from 'react-native'

import { SafeAreaView } from 'react-native-safe-area-context';

import { useNavigation } from '@react-navigation/native';

import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import Ionicons from "react-native-vector-icons/Ionicons";

import React, { useState, useEffect } from 'react';

import { io } from 'socket.io-client';



type RootStackParmList = {

  LandingPage: undefined;

  NotificationScreen: undefined;

}



type NavigationProp = NativeStackNavigationProp<RootStackParmList>;



const Header: React.FC<{ onNotificationPress: () => void }> = ({ onNotificationPress }) => {

  return (

    <ImageBackground

      source={require("../../assets/images/banner2.jpg")}

      style={styles.header}

    >

      <View style={styles.headerOverlay}>

        <Text style={styles.headerText}>Dashboard</Text>

        <TouchableOpacity 

          style={styles.notificationButton}

          onPress={onNotificationPress}

        >

          <Ionicons name="notifications-outline" size={24} color="#27AE60" />

        </TouchableOpacity>

      </View>

    </ImageBackground>

  );

};



const DashboardPageScreen: React.FC = () => {

  const navigation = useNavigation<NavigationProp>();

  const [targetTemp, setTargetTemp] = useState("");

  const [targetMoisture, setTargetMoisture] = useState("");



  const handleApply = () => {

    // Validate inputs are not empty

    if (!targetTemp || !targetMoisture) {

      Alert.alert(

        "Input Required",

        "Please enter both target temperature and moisture values.",

        [{ text: "OK" }]

      );

      return;

    }



    const temp = parseFloat(targetTemp);

    const moisture = parseFloat(targetMoisture);



    if (isNaN(temp) || temp < 50 || temp > 60) {

      Alert.alert(

        "Invalid Temperature",

        "Target temperature must be between 50°C and 60°C.",

        [{ text: "OK" }]

      );

      return;

    }



    if (isNaN(moisture) || moisture < 10 || moisture > 14) {

      Alert.alert(

        "Invalid Moisture",

        "Target moisture must be between 10% and 14%.",

        [{ text: "OK" }]

      );

      return;

    }

    console.log("Applied:", { targetTemp: temp, targetMoisture: moisture });

    

    Alert.alert(

      "Settings Applied",

      `Target Temperature: ${temp}°C\nTarget Moisture: ${moisture}%`,

      [{ text: "OK" }]

    );

    

    // Here you can add your logic to send these values to your backend/socket

  };



  const handleNotificationPress = () => {

    navigation.navigate('NotificationScreen');

  };



  const [sensorData, setSensorData] = useState({

    temperature: 0,

    humidity: 0,

    moisture: 0,

    weight: 0,

    status: 'Idle'

  });



  useEffect(() => {

    const socket = io('http://124.83.13.156:5000', {

      reconnection: true,

      reconnectionDelay: 1000,

      reconnectionDelayMax: 5000,

      reconnectionAttempts: 5

    });



    socket.on('connect', () => {

      console.log('Connected to sensor server');

    });



    // Expecting server to emit `sensor_readings_table` with { temperature, humidity, moisture, weight }

    socket.on('sensor_readings_table', (data) => {

      console.log('Sensor data received:', data);

      setSensorData({

        temperature: data.temperature || 0,

        humidity: data.humidity || 0,

        moisture: data.moisture || 0,

        weight: data.weight || 0,

        status: data.status || 'Idle'

      });

    });



    socket.on('disconnect', () => {

      console.log('Socket disconnected');

    });



    return () => {

      socket.disconnect();

    };

  }, []);



  return (

    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>

      {/* <ScrollView

        style={styles.container}

        contentContainerStyle={styles.scrollContent}

        showsVerticalScrollIndicator={false}> */}

        <Header onNotificationPress={handleNotificationPress} />



        {/* Status Section */}

        <View style={styles.statusGrid}>

          <View style={styles.statusCard}>

            <Text style={styles.statusTitle}>System Status</Text>

            <Text style={styles.statusValue}>Idle</Text>

          </View>

      

        </View>



        {/* System Controls */}

        <Text style={styles.sectionTitle}>System Controls</Text>

        <View style={styles.controls}>

          <Text style={styles.label}>Target Temperature (°C)</Text>

          <TextInput

            style={styles.input}

            keyboardType="numeric"

            placeholder="Enter temperature"

            placeholderTextColor='#9CA3AF'

            value={targetTemp}

            onChangeText={setTargetTemp}

          />



          <Text style={styles.label}>Target Moisture (%)</Text>

          <TextInput

            style={styles.input}

            keyboardType="numeric"

            placeholder="Enter moisture"

            placeholderTextColor='#9CA3AF'

            value={targetMoisture}

            onChangeText={setTargetMoisture}

          />



          <View style={styles.buttonRow}>

            <TouchableOpacity style={styles.applyBtn} onPress={handleApply}>

              <Text style={styles.btnText}>Apply</Text>

            </TouchableOpacity>

          </View>

        </View>



        {/* Sensor Readings */}

        <Text style={styles.sectionTitle}>Sensor Readings</Text>

        <View style={styles.statusGrid}> 

          <View style={styles.card}>

            <Text style={styles.label}>Temperature</Text>

            <Text style={styles.value}>{sensorData.temperature.toFixed(1)}°C</Text>

            <Text style={styles.sub}>Normal (50–60 °C)</Text>

          </View>



          <View style={styles.card}>

            <Text style={styles.label}>Humidity</Text>

            <Text style={styles.value}>{sensorData.humidity.toFixed(1)}%</Text>

            <Text style={styles.sub}>Normal (≤ 65%)</Text>

          </View>



          <View style={styles.card}>

            <Text style={styles.label}>Moisture Content</Text>

            <Text style={styles.value}>{sensorData.moisture.toFixed(1)}%</Text>

            <Text style={styles.sub}>Target 10–14%</Text>

          </View>



          <View style={styles.card}>

            <Text style={styles.label}>Current Weight</Text>

            <Text style={styles.value}>{sensorData.weight.toFixed(1)}kg</Text>

            <Text style={styles.sub}>Initial 25 kg</Text>

          </View>

        </View>



      {/* </ScrollView> */}

    </SafeAreaView>

  );

};



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

  notificationButton: ViewStyle;

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

  statusGrid: {

    flexDirection: 'row',

    flexWrap: 'wrap',

    justifyContent: 'space-between',

    marginVertical: 6,

    paddingHorizontal: 15,

  },

  statusCard: {

    width: '100%',

    backgroundColor: '#FFFFFF',

    borderRadius: 12,

    padding: 10,

    marginVertical: 6,

    alignItems: 'center',

    elevation: 2,

    shadowColor: '#000',

    shadowOffset: { width: 0, height: 1 },

    shadowOpacity: 0.1,

    shadowRadius: 2,

  },

  statusTitle: {

    fontSize: 12,

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

    marginVertical: 5,

    color: "#333",

    paddingHorizontal: 15,

  },

  card: {

    width: '48%',

    backgroundColor: '#FFFFFF',

    borderRadius: 12,

    padding: 10,

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

  notificationButton: {

    width: 44,

    height: 44,

    borderRadius: 22,

    backgroundColor: '#FFFFFF',

    justifyContent: 'center',

    alignItems: 'center',

    elevation: 3,

    shadowColor: '#000',

    shadowOffset: { width: 0, height: 2 },

    shadowOpacity: 0.15,

    shadowRadius: 3,

  },

});



export default DashboardPageScreen;