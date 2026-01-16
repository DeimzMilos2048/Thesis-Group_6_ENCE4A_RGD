import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import React from 'react';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';

const helpcenterscreen: React.FC = () => {
  const navigation = useNavigation();

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
          <Text style={styles.headerTitle}>Help Center</Text>
        </View>

        {/* Content */}
        <ScrollView style={styles.content}>
          <View style={styles.profileSection}>
            <View style={styles.helpContent}>
              <View style={styles.helpCard}>
                <Text style={styles.cardTitle}>Frequently Asked Questions</Text>

                <View style={styles.faqItem}>
                  <Text style={styles.faqQuestion}>
                    How do I set target temperature?
                  </Text>
                  <Text style={styles.faqAnswer}>
                    Navigate to the Dashboard and use the System Controls panel
                    to set your desired target temperature between 50°C - 60°C.
                  </Text>
                </View>

                <View style={styles.faqItem}>
                  <Text style={styles.faqQuestion}>
                    What is the optimal moisture content?
                  </Text>
                  <Text style={styles.faqAnswer}>
                    The optimal moisture content for rice drying is between
                    10-14%. The system will alert you when this range is
                    reached.
                  </Text>
                </View>

                <View style={styles.faqItem}>
                  <Text style={styles.faqQuestion}>
                    How do I view historical data?
                  </Text>
                  <Text style={styles.faqAnswer}>
                    Click on the History tab in the sidebar to view past drying
                    sessions and sensor readings.
                  </Text>
                </View>

                <View style={styles.faqItem}>
                  <Text style={styles.faqQuestion}>
                    Can I export historical data?
                  </Text>
                  <Text style={styles.faqAnswer}>
                    Yes, go to the History page and use the export button to
                    download your data in CSV/XLSX format.
                  </Text>
                </View>
              </View>
            </View>
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
  content: ViewStyle;
  profileSection: ViewStyle;
  helpContent: ViewStyle;
  helpCard: ViewStyle;
  cardTitle: TextStyle;
  faqItem: ViewStyle;
  faqQuestion: TextStyle;
  faqAnswer: TextStyle;
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
    backgroundColor: '#FFFFFF',
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
  content: {
    flex: 1,
  },
  profileSection: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 12,
    padding: 20,
  },
  helpContent: {
    gap: 16,
  },
  helpCard: {
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 20,
    gap: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 8,
  },
  faqItem: {
    gap: 8,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  faqAnswer: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
  },
});

export default helpcenterscreen;