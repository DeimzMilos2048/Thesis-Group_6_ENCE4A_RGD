import { 
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
  ImageBackground,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import React, { useState } from 'react';

const Header: React.FC = () => {
  return (
    <ImageBackground
      source={require("../../assets/images/banner2.jpg")}
      style={styles.header}
    >
      <View style={styles.headerOverlay}>
        <Text style={styles.headerText}>History</Text>
      </View>
    </ImageBackground>
  );
};


const historyScreen: React.FC = () => {
 

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Header />

      </ScrollView>
    </SafeAreaView>
  );
};

interface Styles {
  safeArea: ViewStyle;
  container: ViewStyle;
  scrollContent: ViewStyle;
  header: ViewStyle;
  headerOverlay: ViewStyle;
  headerText: TextStyle;
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
});

export default historyScreen;