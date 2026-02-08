import React,{use, useEffect} from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context"; 
import { createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import MaterialDesignIcons from "react-native-vector-icons/MaterialCommunityIcons";
import Entypo from "react-native-vector-icons/Entypo";
import Ionicons from "react-native-vector-icons/Ionicons";
import FontAwesome5 from "react-native-vector-icons/FontAwesome5";
import useAuthStore from "./src/store/authStore";

// import LandingScreen from "./src/screens/landingpagescreen";
import IntroductionUserScreen from "./src/screens/tabs/introductionUserScreen";
import LoginScreen from "./src/screens/auth/loginpagescreen";
import SigninScreen from "./src/screens/auth/signinpagescreen"
import DashboardScreen from "./src/screens/tabs/dashboardpagescreen";
import AnalyticsScreen from "./src/screens/tabs/analyticsScreen";
import HistoryScreen from "./src/screens/tabs/historyScreen";
import ProfileScreen from "./src/screens/tabs/profileScreen";
import NotificationScreen from "./src/screens/tabs/notificationScreen";
import EditProfileScreen from "./src/screens/tabs/editprofilescreen";
import EditNotificationScreen from "./src/screens/tabs/editnotificationscreen";
import HelpCenterScreen from "./src/screens/tabs/helpcenterscreen";
import SettingsScreen from "./src/screens/tabs/settingsscreen";
import {notificationListener} from "./src/services/notificationServices";

//Profile Screen Page


const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator(); 

const TabNavigator = () => {
  return (
    <Tab.Navigator 
      screenOptions={{ 
          headerShown: false,
          tabBarActiveTintColor: "#27AE60",
          tabBarInactiveTintColor: "#090909",
          tabBarHideOnKeyboard: true,
          tabBarStyle: {
            backgroundColor: '#FFFFFF',
            borderTopWidth: 0,
            borderTopColor: 'transparent',
            elevation: 0,
            shadowOpacity: 0,
            shadowOffset: { width: 0, height: 0 },
            shadowRadius: 0,
            shadowColor: 'transparent',
          },
          }}>
      <Tab.Screen 
          name = "Dashboard" 
          component={DashboardScreen}
           options={{
            tabBarIcon: ({size,color,focused}) => {
              return <Entypo name="home" size={size} color={color} />
            },
          }}
          />
      <Tab.Screen 
          name = "Analytics" 
          component={AnalyticsScreen} 
           options={{
            tabBarIcon: ({size,color,focused}) => {
              return <Ionicons name="analytics" size={size} color={color} />
            },
          }}
          />
      <Tab.Screen 
          name = "History" 
          component={HistoryScreen} 
          options={{
            tabBarIcon: ({size,color,focused}) => {
              return <FontAwesome5 name="history" size={size} color={color} />
            },
          }}
          />
      <Tab.Screen 
          name = "Profile" 
          component={ProfileScreen} 
          options={{
            tabBarIcon: ({size,color,focused}) => {
              return <MaterialDesignIcons name="account-outline" size={size} color={color} />
            },
          }}
          />
    </Tab.Navigator>
  );
};

export default function App() {
   const initializeAuth = useAuthStore(state => state.initializeAuth);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  useEffect(() => {
    notificationListener();
  }, []);
  
  return (
    <SafeAreaProvider> 
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen
            name="IntroductionUserScreen"
            component={IntroductionUserScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="LoginPage"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="SigninPage"
            component={SigninScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="DashboardPage"
            component={TabNavigator}
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="NotificationScreen" 
            component={NotificationScreen}
            options={{headerShown: false}} 
          />
          <Stack.Screen
            name="EditProfileScreen"
            component={EditProfileScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="EditNotificationScreen"
            component={EditNotificationScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="HelpCenterScreen"
            component={HelpCenterScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="SettingsScreen"
            component={SettingsScreen}
            options={{ headerShown: false }}
          />   
          
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
