import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NavigationProp } from "@react-navigation/native";
import useAuthStore from "../../store/authStore";

interface SigninScreenProps {
  navigation: NavigationProp<any>;
}

const SigninScreen: React.FC<SigninScreenProps> = ({ navigation }) => {
  
  const [username, setUserName] = useState("");
  const [fullname, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { register, loading } = useAuthStore();
  
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleSignIn= async () => {
    if (!username || !fullname || !email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      await register(username, fullname, email, password);
      Alert.alert(
        'Success',
        'Registration successful! Please login with your credentials.',
        [
          {
            text: 'OK',
            onPress: () => {
              setUserName('');
              setFullName('');
              setEmail('');
              setPassword('');
              (navigation as any).replace('LoginPage'); 
            }
          }
        ]
      );
    } catch (error: any) {
      // Handle specific error cases
      let errorMessage = 'Registration failed. Please try again.';
      
      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.message && error.message.includes('duplicate')) {
        errorMessage = 'This email is already registered.';
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      Alert.alert('Error', errorMessage);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Logo */}
      <Image
        source={require("../../assets/images/thesis_logo_1024.png")}
        style={styles.logo}
        resizeMode="contain"
      />

      {/* UserName */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>User Name</Text>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            placeholder="Enter username"
            placeholderTextColor="#999"
            value={username}
            onChangeText={setUserName}
            editable={!loading}
          />
        </View>
      </View>

      {/* FullName */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Full Name</Text>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            placeholder="Enter full name"
            placeholderTextColor="#999"
            value={fullname}
            onChangeText={setFullName}
            editable={!loading}
          />
        </View>
      </View>

      {/* Email */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Email Address</Text>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            placeholder="Enter email address"
            placeholderTextColor="#999"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!loading}
          />
        </View>
      </View>

      {/* Password */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Password</Text>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            placeholder="Enter your password"
            placeholderTextColor="#999"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            editable={!loading}
          />
          <TouchableOpacity
            style={styles.toggleButton}
            onPress={togglePasswordVisibility}
          >
            <Text style={styles.toggleButtonText}>
              {showPassword ? "HIDE" : "SHOW"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Sign In Button */}
      <TouchableOpacity
        style={[styles.signInButton, loading && styles.signInButtonDisabled]}
        onPress={handleSignIn}
        disabled={loading}
      >
        <Text style={styles.signInText}>
          {loading ? "Creating..." : "Create an Account"}
        </Text>
      </TouchableOpacity>

      {/* Already have account */}
      <View style={styles.signupRow}>
        <Text style={styles.signupText}>Already have an account?</Text>
        <TouchableOpacity 
          onPress={() => navigation.navigate("LoginPage")}
          disabled={loading}
        >
          <Text style={styles.createAccount}> Log in</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default SigninScreen;

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
  roleContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  roleButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    marginHorizontal: 5,
    backgroundColor: "#fff",
  },
  roleButtonActive: {
    backgroundColor: "#28a745",
    borderColor: "#28a745",
  },
  roleText: {
    color: "#333",
    fontWeight: "500",
    fontSize: 14,
  },
  roleTextActive: {
    color: "#fff",
    fontWeight: "600",
  },
  signInButton: {
    backgroundColor: "#28a745",
    paddingVertical: 14,
    borderRadius: 8,
    width: "100%",
    alignItems: "center",
    marginBottom: 20,
  },
  signInButtonDisabled: {
    backgroundColor: "#6c757d",
    opacity: 0.7,
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
    color: "#333",
  },
  toggleButton: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    justifyContent: 'center',
  },
  toggleButtonText: {
    color: '#28a745',
    fontSize: 14,
    fontWeight: '500',
  },
  createAccount: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#28a745",
  },
});