// import React from "react";
// import {
//   View,
//   Text,
//   StyleSheet,
//   ImageBackground,
//   TouchableOpacity,
//   ScrollView,
//   Image,
// } from "react-native";
// import { SafeAreaView } from "react-native-safe-area-context";

// const LandingScreen = ({ navigation }:any) => {
//   return (
//     <SafeAreaView style={styles.safeArea}>
//       {/* Navigation Bar */}
//       <View style={styles.navbar}>
//         {/* Logo */}
//         <View style={styles.logoContainer}>
//           <Image
//             source={require("../assets/images/logo2.png")}
//             style={styles.logo}
//             resizeMode="contain"
//           />
//         </View>

//         {/* Nav Buttons */}
//         <View style={styles.navButtons}>
//           <TouchableOpacity
//             style={styles.signupBtn}
//             onPress={() => navigation.navigate("SigninPage")}
//           >
//             <Text style={styles.signupText}>Sign Up</Text>
//           </TouchableOpacity>

//           <TouchableOpacity
//             style={styles.loginBtn}
//             onPress={() => navigation.navigate("LoginPage")}
//           >
//             <Text style={styles.loginText}>Login</Text>
//           </TouchableOpacity>
//         </View>
//       </View>

//       {/* Background with Content */}
//       <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
//         <ImageBackground
//           source={require("../assets/images/banner1.jpg")}
//           style={styles.background}
//           imageStyle={{ opacity: 0.7 }}
//         >
//           <View style={styles.overlay}>
//             <Text style={styles.title}>
//               Optimizing Post-Harvest Rice Drying:{"\n"}A Real-Time IoT System
//               for Time Reduction and Quality Control
//             </Text>

//             <Text style={styles.subtitle}>
//               The aforementioned problem motivated the researchers to develop an
//               alternative to traditional post-harvest rice grain dryers,
//               utilizing IoT-based monitoring devices.
//             </Text>

//             <TouchableOpacity
//               style={styles.button}
//             >
//               <Text style={styles.buttonText}>Explore Project</Text>
//             </TouchableOpacity>
//           </View>
//         </ImageBackground>
//       </ScrollView>
//     </SafeAreaView>
//   );
// };

// export default LandingScreen;

// const styles = StyleSheet.create({
//   safeArea: {
//     flex: 1,
//     backgroundColor: "#48BB74FF",
//   },
//   navbar: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     alignItems: "center",
//     paddingHorizontal: 15,
//     paddingVertical: 10,
//     backgroundColor: "#fff",
//     elevation: 3,
//   },
//   logoContainer: {
//     flexDirection: "row",
//     alignItems: "center",
//   },
//   logo: {
//     width: 50,
//     height: 50,
//     marginRight: 8,
//   },
//   navButtons: {
//     flexDirection: "row",
//     alignItems: "center",
//   },
//   signupBtn: {
//     marginRight: 15,
//   },
//   signupText: {
//     fontSize: 16,
//     fontWeight: "bold",
//     color: "#2c3e50",
//   },
//   loginBtn: {
//     borderWidth: 1,
//     borderColor: "#48BB74",
//     borderRadius: 6,
//     paddingVertical: 6,
//     paddingHorizontal: 15,
//   },
//   loginText: {
//     fontSize: 16,
//     fontWeight: "bold",
//     color: "#48BB74",
//   },
//   background: {
//     flex: 1,
//     resizeMode: "cover",
//     justifyContent: "center",
//     padding: 20,
//   },
//   overlay: {
//     backgroundColor: "rgba(0,0,0,0.3)",
//     borderRadius: 10,
//     padding: 20,
//     alignItems: "center",
//   },
//   title: {
//     fontSize: 30,
//     fontWeight: "700",
//     color: "#fff",
//     textAlign: "center",
//     marginBottom: 15,
//   },
//   subtitle: {
//     fontSize: 16,
//     color: "#eee",
//     textAlign: "center",
//     marginBottom: 20,
//   },
//   button: {
//     backgroundColor: "#fff",
//     paddingHorizontal: 25,
//     paddingVertical: 12,
//     borderRadius: 8,
//   },
//   buttonText: {
//     color: "#2c3e50",
//     fontWeight: "bold",
//     fontSize: 15,
//   },
// });
