import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
  TextInput,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState } from 'react';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';

interface User {
  username: string;
  fullname: string;
  email: string;
}

const editprofilescreen: React.FC = () => {
  const navigation = useNavigation();
  const [isEditing, setIsEditing] = useState(false);
  const [editingUser, setEditingUser] = useState<User>({
    username: '',
    fullname: '',
    email: '',
  });

  const handleSaveEditProfile = () => {
    // Add your save logic here
    console.log('Saving profile:', editingUser);
    setIsEditing(false);
  };

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
          <Text style={styles.headerTitle}>Edit Profile</Text>
        </View>

        {/* Content */}
        <ScrollView style={styles.content}>
          <View style={styles.profileSection}>
            <View style={styles.sectionHeader}>
              {!isEditing ? (
                <TouchableOpacity
                  style={styles.editBtn}
                  onPress={() => setIsEditing(true)}
                >
                  <Text style={styles.editBtnText}>Edit</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.editActions}>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => setIsEditing(false)}
                  >
                    <Ionicons name="close" size={16} color="#666" />
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.saveBtn}
                    onPress={handleSaveEditProfile}
                  >
                    <Ionicons name="checkmark" size={16} color="#fff" />
                    <Text style={styles.saveBtnText}>Save</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <View style={styles.profileAvatarSection}>
              <View style={styles.avatarContainer}>
                <View style={styles.avatarCircle}>
                  <Ionicons name="person" size={48} color="#999" />
                </View>
              </View>
            </View>

            <View style={styles.profileForm}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>User Name</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="person-outline" size={18} color="#666" />
                  <TextInput
                    style={[styles.input, !isEditing && styles.inputDisabled]}
                    value={editingUser?.username || ''}
                    onChangeText={(text) =>
                      setEditingUser({ ...editingUser, username: text })
                    }
                    editable={isEditing}
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Full Name</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="person-outline" size={18} color="#666" />
                  <TextInput
                    style={[styles.input, !isEditing && styles.inputDisabled]}
                    value={editingUser?.fullname || ''}
                    onChangeText={(text) =>
                      setEditingUser({ ...editingUser, fullname: text })
                    }
                    editable={isEditing}
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Email Address</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="mail-outline" size={18} color="#666" />
                  <TextInput
                    style={[styles.input, !isEditing && styles.inputDisabled]}
                    value={editingUser?.email || ''}
                    onChangeText={(text) =>
                      setEditingUser({ ...editingUser, email: text })
                    }
                    editable={isEditing}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
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
  sectionHeader: ViewStyle;
  editBtn: ViewStyle;
  editBtnText: TextStyle;
  editActions: ViewStyle;
  cancelBtn: ViewStyle;
  cancelBtnText: TextStyle;
  saveBtn: ViewStyle;
  saveBtnText: TextStyle;
  profileAvatarSection: ViewStyle;
  avatarContainer: ViewStyle;
  avatarCircle: ViewStyle;
  profileForm: ViewStyle;
  formGroup: ViewStyle;
  label: TextStyle;
  inputWrapper: ViewStyle;
  input: TextStyle;
  inputDisabled: TextStyle;
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 20,
  },
  editBtn: {
    backgroundColor: '#10b981',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  editBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  editActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  cancelBtnText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#34C759',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  profileAvatarSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarContainer: {
    alignItems: 'center',
  },
  avatarCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E5E5E5',
  },
  profileForm: {
    gap: 20,
  },
  formGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#000',
    paddingVertical: 12,
  },
  inputDisabled: {
    color: '#999',
  },
});

export default editprofilescreen;