import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  SafeAreaView,
  Alert,
  ImageBackground,
} from "react-native";

const IntroductionUserScreen = ({ navigation }: any) => {
  const handleSignUp = () => {
    navigation.navigate("SignUp");
  };

  const handleLogIn = () => {
    navigation.navigate("LogIn");
  };

  return (
    <SafeAreaView style={styles.container}>
      <ImageBackground
        source={require("../../assets/images/banner2.jpg")}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <View style={styles.overlay}>
          {/* Logo Container */}
          <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
              <Image
                source={require("../../assets/images/tp_thesis_logo_1024.png")}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
          </View>

          {/* Buttons Container */}
          <View style={styles.buttonsContainer}>
            <TouchableOpacity
              style={styles.signUpButton}
              onPress={() => navigation.navigate("SigninPage")}
              activeOpacity={0.8}
            >
                
              <Text style={styles.signUpButtonText}>SIGN UP</Text>
              
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.logInButton}
              onPress={() => navigation.navigate("LoginPage")}
              activeOpacity={0.8}
            >
              <Text style={styles.logInButtonText}>LOG IN</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ImageBackground>
    </SafeAreaView>
  );
};

export default IntroductionUserScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundImage: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(200, 210, 100, 0.3)", // Yellowish-green overlay
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 80,
  },
  logoContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  logoCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  logo: {
    width: 120,
    height: 120,
  },
  buttonsContainer: {
    width: "100%",
    paddingHorizontal: 40,
    gap: 15,
  },
  signUpButton: {
    backgroundColor: "#4ADE80", // Green color
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  signUpButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 1,
  },
  logInButton: {
    backgroundColor: "white",
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  logInButtonText: {
    color: "#4ADE80", // Green color
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 1,
  },
});