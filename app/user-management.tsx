import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { EnhancedButton } from '@/components/ui/EnhancedButton';
import { useUser } from '@/contexts/UserContext';
import { ROLE_COLORS, ROLE_LABELS, User } from '@/types/user';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

export default function UserManagementScreen() {
  const { users, addUser, updateUser, deleteUser, currentUser } = useUser();
  const router = useRouter();
  const [showAddForm, setShowAddForm] = useState(false);

  const handleDeleteUser = (user: User) => {
    if (user.id === currentUser?.id) {
      Alert.alert('Cannot Delete', 'You cannot delete your own account.');
      return;
    }

    Alert.alert(
      'Delete User',
      `Are you sure you want to delete ${user.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteUser(user.id),
        },
      ]
    );
  };

  const handleToggleUserStatus = (user: User) => {
    if (user.id === currentUser?.id) {
      Alert.alert('Cannot Deactivate', 'You cannot deactivate your own account.');
      return;
    }

    updateUser(user.id, { isActive: !user.isActive });
  };

  const handleAddUser = () => {
    // Simple form for adding a new user
    Alert.prompt(
      'Add New User',
      'Enter user name:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Next',
          onPress: (name) => {
            if (name && name.trim()) {
              // Ask for PIN
              Alert.prompt(
                'Set PIN',
                `Enter 4-digit PIN for ${name.trim()}:`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Add',
                    onPress: (pin) => {
                      if (pin && pin.length === 4 && /^\d{4}$/.test(pin)) {
                        // Ask for role
                        Alert.alert(
                          'Select Role',
                          `Choose role for ${name.trim()}:`,
                          [
                            { text: 'Cancel', style: 'cancel' },
                            {
                              text: 'Manager',
                              onPress: () => {
                                addUser({
                                  name: name.trim(),
                                  role: 'manager',
                                  pin: pin,
                                  isActive: true,
                                });
                                Alert.alert('User Added', `Manager "${name.trim()}" has been added.`);
                              },
                            },
                            {
                              text: 'Cashier',
                              onPress: () => {
                                addUser({
                                  name: name.trim(),
                                  role: 'cashier',
                                  pin: pin,
                                  isActive: true,
                                });
                                Alert.alert('User Added', `Cashier "${name.trim()}" has been added.`);
                              },
                            },
                            {
                              text: 'Viewer',
                              onPress: () => {
                                addUser({
                                  name: name.trim(),
                                  role: 'viewer',
                                  pin: pin,
                                  isActive: true,
                                });
                                Alert.alert('User Added', `Viewer "${name.trim()}" has been added.`);
                              },
                            },
                          ]
                        );
                      } else {
                        Alert.alert('Invalid PIN', 'Please enter a 4-digit PIN.');
                      }
                    },
                  },
                ],
                'plain-text'
              );
            }
          },
        },
      ],
      'plain-text'
    );
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#3b82f6" />
        </TouchableOpacity>
        <ThemedText type="title" style={styles.title}>
          User Management
        </ThemedText>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.userList} showsVerticalScrollIndicator={false}>
        {users.map((user) => (
          <View key={user.id} style={styles.userCard}>
            <View style={styles.userInfo}>
              <View style={styles.userHeader}>
                <ThemedText type="subtitle" style={styles.userName}>
                  {user.name}
                </ThemedText>
                <View style={[
                  styles.roleBadge,
                  { backgroundColor: ROLE_COLORS[user.role] }
                ]}>
                  <ThemedText style={styles.roleText}>
                    {ROLE_LABELS[user.role]}
                  </ThemedText>
                </View>
              </View>
              
              <ThemedText style={styles.userDetails}>
                PIN: {user.pin} • {user.isActive ? 'Active' : 'Inactive'}
              </ThemedText>
              
              {user.lastLoginAt && (
                <ThemedText style={styles.lastLogin}>
                  Last login: {formatLastLogin(user.lastLoginAt)}
                </ThemedText>
              )}
            </View>
            
            <View style={styles.userActions}>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  user.isActive ? styles.deactivateButton : styles.activateButton
                ]}
                onPress={() => handleToggleUserStatus(user)}
              >
                <Ionicons 
                  name={user.isActive ? "pause" : "play"} 
                  size={16} 
                  color="white" 
                />
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.actionButton, styles.deleteButton]}
                onPress={() => handleDeleteUser(user)}
              >
                <Ionicons name="trash" size={16} color="white" />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <EnhancedButton
          title="Add User"
          onPress={handleAddUser}
          icon="person-add-outline"
        />
      </View>
    </ThemedView>
  );
}

function formatLastLogin(lastLoginAt: string): string {
  const date = new Date(lastLoginAt);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString();
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 60,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 8,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  placeholder: {
    width: 40,
  },
  userList: {
    flex: 1,
    padding: 16,
  },
  userCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  userInfo: {
    flex: 1,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  userName: {
    flex: 1,
    marginRight: 12,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  roleText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  userDetails: {
    color: '#6b7280',
    fontSize: 14,
    marginBottom: 4,
  },
  lastLogin: {
    color: '#9ca3af',
    fontSize: 12,
  },
  userActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activateButton: {
    backgroundColor: '#10b981',
  },
  deactivateButton: {
    backgroundColor: '#f59e0b',
  },
  deleteButton: {
    backgroundColor: '#ef4444',
  },
  footer: {
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
});
