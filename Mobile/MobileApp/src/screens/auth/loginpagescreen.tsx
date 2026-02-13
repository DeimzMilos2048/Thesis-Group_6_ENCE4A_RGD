import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  SafeAreaView,
  Alert,
  Keyboard,
  ActivityIndicator,
  Modal,
} from "react-native";
import NetInfo from "@react-native-community/netinfo";
import useAuthStore from "../../store/authStore";

const LoginScreen = ({ navigation }: any) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isConnected, setIsConnected] = useState<boolean | null>(true);
  const { login, loading } = useAuthStore();

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleLogin = async () => {
    Keyboard.dismiss();
    
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    // Check internet connectivity
    const netInfoState = await NetInfo.fetch();
    setIsConnected(netInfoState.isConnected);
    
    if (!netInfoState.isConnected) {
      Alert.alert('No Connection', 'Please check your internet connection and try again.');
      return;
    }

    try {
      await login(email, password);
      navigation.navigate('DashboardPage');
    } catch (error: any) {
      let errorMessage = 'Invalid credentials';
      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      Alert.alert('Error', errorMessage);
    } finally {
      setPassword(''); 
    }
  };
  
  return (
    <SafeAreaView style={styles.container}>
      {/* Loading Overlay */}
      <Modal
        transparent={true}
        animationType="fade"
        visible={loading && isConnected}
      >
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContent}>
            <ActivityIndicator size="large" color="#28a745" style={{ marginTop: 20 }} />
          </View>
        </View>
      </Modal>

      {/* Logo */}
      <Image
        source={require("../../assets/images/thesis_logo_1024.png")} 
        style={styles.logo}
        resizeMode="contain"
      />

      {/* Email */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Email Address</Text>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            placeholder="Enter your email address"
            placeholderTextColor="#999"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
        </View>
      </View>

      {/* Password */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Password</Text>
        <View style={styles.inputWrapper}>
          <TextInput
            key={`password-${showPassword}`}
            style={[styles.input, { flex: 1 }]}
            placeholder="Enter your password"
            placeholderTextColor="#999"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
            autoComplete="off"
            textContentType="none"
            autoCorrect={false}
            autoCapitalize="none"
          />
          {/* <TouchableOpacity
            style={styles.toggleButton}
            onPress={togglePasswordVisibility}
          >
            <Text style={styles.toggleButtonText}>
              {showPassword ? 'HIDE' : 'SHOW'}
            </Text>
          </TouchableOpacity> */}
        </View>
      </View>

      {/* Forgot Password */}
      <View style={styles.optionsRow}>
        <TouchableOpacity>
          <Text style={styles.forgotPassword}>Forgot Password?</Text>
        </TouchableOpacity>
      </View>

      {/* Sign In Button */}
      <TouchableOpacity style={styles.signInButton}
      onPress={handleLogin}>
        <Text style={styles.signInText}>Login</Text>
      </TouchableOpacity>

      {/* Create Account */}
      <View style={styles.signupRow}>
        <Text style={styles.signupText}>Don't have an account?</Text>
        <TouchableOpacity 
           onPress={() => navigation.navigate("SigninPage")}>
          
          <Text style={styles.createAccount}> Create Account</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent:"center",
    padding: 20,
  },
  logo: {
    width: 120,
    height: 120,
    marginVertical: 40,
  },
  inputContainer: {
    width: "100%",
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: "#fff",
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: "#333",
  },
  optionsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    width: "100%",
    marginBottom: 25,
    alignItems: "center",
  },
  forgotPassword: {
    fontSize: 13,
    color: "#2ce57fff",
  },
  signInButton: {
    backgroundColor: "#28a745",
    paddingVertical: 14,
    borderRadius: 8,
    width: "100%",
    alignItems: "center",
    marginBottom: 20,
  },
  signInText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 15,
  },
  signupRow: {
    flexDirection: "row",
    marginTop: 10,
  },
  signupText: {
    fontSize: 13,
  },
  toggleButton: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    justifyContent: 'center',
  },
  toggleButtonText: {
    color: '#2ce57fff',
    fontSize: 14,
    fontWeight: '500',
  },
  createAccount: {
    color: '#2ce57fff',
    fontSize: 13,
    fontWeight: "bold",
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