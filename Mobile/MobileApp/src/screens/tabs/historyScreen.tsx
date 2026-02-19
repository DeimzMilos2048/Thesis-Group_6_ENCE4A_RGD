// import { 
//   View,
//   Text,
//   StyleSheet,
//   ScrollView,
//   TouchableOpacity,
//   ViewStyle,
//   TextStyle,
//   ImageBackground,
//   Alert,
//   FlatList,
// } from 'react-native'
// import { SafeAreaView } from 'react-native-safe-area-context';
// import Ionicons from 'react-native-vector-icons/Ionicons';
// import React, { useState } from 'react';

// const Header: React.FC = () => {
//   return (
//     <ImageBackground
//       source={require("../../assets/images/banner2.jpg")}
//       style={styles.header}
//     >
//       <View style={styles.headerOverlay}>
//         <Text style={styles.headerText}>History</Text>
//       </View>
//     </ImageBackground>
//   );
// };

// interface HistoryItem {
//   id: number;
//   date: string;
//   time: string;
//   moisture: string;
//   temperature: string;
//   humidity: string;
//   weight: string;
//   status: 'Complete' | 'Warning' | 'Error';
// }

// // const historyData: HistoryItem[] = [
// //   {
// //     id: 1,
// //     date: "2026-01-05",
// //     time: "10:00 AM",
// //     moisture: "14%",
// //     temperature: "50°C",
// //     humidity: "60%",
// //     weight: "25 kg",
// //     status: "Complete",
// //   },
// //   {
// //     id: 2,
// //     date: "2026-01-06",
// //     time: "12:00 AM",
// //     moisture: "13%",
// //     temperature: "51°C",
// //     humidity: "63%",
// //     weight: "25 kg",
// //     status: "Complete",
// //   },
// //   {
// //     id: 3,
// //     date: "2026-01-06",
// //     time: "1:00 PM",
// //     moisture: "9%",
// //     temperature: "50°C",
// //     humidity: "68%",
// //     weight: "23 kg",
// //     status: "Warning",
// //   },
// //   {
// //     id: 4,
// //     date: "2026-01-06",
// //     time: "4:00 PM",
// //     moisture: "3%",
// //     temperature: "65°C",
// //     humidity: "78%",
// //     weight: "1 kg",
// //     status: "Error",
// //   },
// //   {
// //     id: 5,
// //     date: "2026-01-13",
// //     time: "4:00 PM",
// //     moisture: "3%",
// //     temperature: "65°C",
// //     humidity: "78%",
// //     weight: "1 kg",
// //     status: "Error",
// //   },
// // ];

// const historyScreen: React.FC = () => {
//   const handleDownloadExcel = () => {
//     Alert.alert(
//       "Export Data",
//       "Exporting history data...",
//       [
//         {
//           text: "Cancel",
//           style: "cancel",
//         },
//         {
//           text: "Export",
//           onPress: () => {
//             Alert.alert("Success", "Data exported successfully!");
//           },
//         },
//       ]
//     );
//   };

//   const renderHistoryItem = ({ item }: { item: HistoryItem }) => {
//     const getStatusColor = (status: string) => {
//       switch (status) {
//         case "Complete":
//           return "#28a745";
//         case "Warning":
//           return "#ffc107";
//         case "Error":
//           return "#dc3545";
//         default:
//           return "#6c757d";
//       }
//     };

//     return (
//       <View style={styles.tableRow}>
//         <Text style={[styles.tableCell, { flex: 1.2 }]}>{item.date}</Text>
//         <Text style={[styles.tableCell, { flex: 1 }]}>{item.time}</Text>
//         <Text style={[styles.tableCell, { flex: 1.3 }]}>{item.moisture}</Text>
//         <Text style={[styles.tableCell, { flex: 1.3 }]}>{item.temperature}</Text>
//         <Text style={[styles.tableCell, { flex: 1.2 }]}>{item.humidity}</Text>
//         <Text style={[styles.tableCell, { flex: 1 }]}>{item.weight}</Text>
//         <View
//           style={[
//             styles.statusBadge,
//             { backgroundColor: getStatusColor(item.status), flex: 1 },
//           ]}
//         >
//           <Text style={styles.statusText}>{item.status}</Text>
//         </View>
//       </View>
//     );
//   };

//   return (
//     <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
//       <ScrollView
//         style={styles.container}
//         contentContainerStyle={styles.scrollContent}
//         showsVerticalScrollIndicator={false}
//       >
//         <Header />

//         <View style={styles.contentContainer}>
//           {/* Download Button */}
//           <TouchableOpacity
//             style={styles.downloadBtn}
//             onPress={handleDownloadExcel}
//             activeOpacity={0.7}
//           >
//             <Ionicons name="download" size={18} color="#FFFFFF" />
//             <Text style={styles.downloadBtnText}>Download Excel</Text>
//           </TouchableOpacity>

//           {/* History Table Header */}
//           <View style={styles.tableHeader}>
//             <Text style={[styles.tableHeaderCell, { flex: 1.2 }]}>Date</Text>
//             <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Time</Text>
//             <Text style={[styles.tableHeaderCell, { flex: 1.3 }]}>Moisture</Text>
//             <Text style={[styles.tableHeaderCell, { flex: 1.3 }]}>Temp</Text>
//             <Text style={[styles.tableHeaderCell, { flex: 1.2 }]}>Humidity</Text>
//             <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Weight</Text>
//             <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Status</Text>
//           </View>

//           {/* History Table Data */}
//           <FlatList
//             data={[]}
//             renderItem={renderHistoryItem}
//             keyExtractor={(item) => item.id.toString()}
//             scrollEnabled={false}
//           />
//         </View>
//       </ScrollView>
//     </SafeAreaView>
//   );
// };

// interface Styles {
//   safeArea: ViewStyle;
//   container: ViewStyle;
//   scrollContent: ViewStyle;
//   header: ViewStyle;
//   headerOverlay: ViewStyle;
//   headerText: TextStyle;
//   contentContainer: ViewStyle;
//   downloadBtn: ViewStyle;
//   downloadBtnText: TextStyle;
//   tableHeader: ViewStyle;
//   tableHeaderCell: TextStyle;
//   tableRow: ViewStyle;
//   tableCell: TextStyle;
//   statusBadge: ViewStyle;
//   statusText: TextStyle;
// }

// const styles = StyleSheet.create<Styles>({
//   safeArea: {
//     flex: 1,
//     backgroundColor: "#F0F0F0",
//   },
//   container: {
//     flex: 1,
//   },
//   scrollContent: {
//     paddingBottom: 30,
//   },
//   header: {
//     height: 80,
//     marginBottom: 15,
//     overflow: 'hidden',
//   },
//   headerOverlay: {
//     flex: 1,
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     paddingHorizontal: 20,
//     backgroundColor: 'rgba(72, 187, 116, 0.7)', 
//   },
//   headerText: {
//     fontSize: 24,
//     fontWeight: 'bold',
//     color: '#FFFFFF',
//     textShadowColor: 'rgba(0, 0, 0, 0.3)',
//     textShadowOffset: { width: 0, height: 2 },
//     textShadowRadius: 4,
//   },
//   contentContainer: {
//     paddingHorizontal: 15,
//     paddingVertical: 10,
//   },
//   downloadBtn: {
//     backgroundColor: '#48bb74',
//     paddingVertical: 12,
//     paddingHorizontal: 20,
//     borderRadius: 8,
//     marginBottom: 15,
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.25,
//     shadowRadius: 3.84,
//     elevation: 5,
//   },
//   downloadBtnText: {
//     color: '#FFFFFF',
//     fontSize: 14,
//     fontWeight: '600',
//     marginLeft: 8,
//   },
//   tableHeader: {
//     flexDirection: 'row',
//     backgroundColor: '#2d3748',
//     paddingVertical: 12,
//     paddingHorizontal: 10,
//     borderRadius: 6,
//     marginBottom: 8,
//     alignItems: 'center',
//   },
//   tableHeaderCell: {
//     color: '#FFFFFF',
//     fontSize: 12,
//     fontWeight: '600',
//     textAlign: 'center',
//   },
//   tableRow: {
//     flexDirection: 'row',
//     paddingVertical: 12,
//     paddingHorizontal: 10,
//     borderBottomWidth: 1,
//     borderBottomColor: '#E2E8F0',
//     alignItems: 'center',
//     backgroundColor: '#FFFFFF',
//     marginBottom: 6,
//     borderRadius: 4,
//   },
//   tableCell: {
//     fontSize: 12,
//     color: '#2d3748',
//     textAlign: 'center',
//   },
//   statusBadge: {
//     paddingVertical: 4,
//     paddingHorizontal: 8,
//     borderRadius: 4,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   statusText: {
//     color: '#FFFFFF',
//     fontSize: 9.5,
//     fontWeight: '600',
//     textAlign: 'center',
//   },
// });

// export default historyScreen;