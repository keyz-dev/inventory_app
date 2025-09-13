import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { EnhancedButton } from '@/components/ui/EnhancedButton';
import { useUser } from '@/contexts/UserContext';
import { ROLE_COLORS, UserRole } from '@/types/user';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, StyleSheet, TouchableOpacity, View } from 'react-native';

export default function UserSelectionScreen() {
  const { users, login, logout } = useUser();
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);

  // Get users by role (focusing on Manager and Cashier as primary roles)

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
  };

  const handleContinue = () => {
    if (!selectedRole) return;

    // Get the first available user for the selected role
    const availableUsers = users.filter(user => user.role === selectedRole && user.isActive);
    
    if (availableUsers.length === 0) {
      Alert.alert('No Users Available', `No active ${selectedRole} users found.`);
      return;
    }

    // If multiple users with same role, show selection
    if (availableUsers.length > 1) {
      // For now, just use the first one
      // In a more advanced implementation, you could show a user picker
      login(availableUsers[0]);
    } else {
      login(availableUsers[0]);
    }

    router.replace('/(tabs)/sell');
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: () => {
            logout();
            router.replace('/pin');
          },
        },
      ]
    );
  };

  const getRoleDescription = (role: UserRole) => {
    switch (role) {
      case 'manager':
        return 'You will have full access to inventory management, sales, analytics, and user management.';
      case 'cashier':
        return 'You will be able to process sales and view products, but cannot modify inventory or access analytics.';
      case 'viewer':
        return 'You will only have permission to view the content but you can\'t edit or make changes.';
      default:
        return '';
    }
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <ThemedText type="title" style={styles.title}>
            Select user type
          </ThemedText>
        </View>

        <View style={styles.roleSelection}>
          <View style={styles.roleRow}>
            {/* Manager Role */}
            <TouchableOpacity
              style={[
                styles.roleCard,
                selectedRole === 'manager' && styles.roleCardSelected
              ]}
              onPress={() => handleRoleSelect('manager')}
            >
              <View style={[
                styles.roleIcon,
                { backgroundColor: selectedRole === 'manager' ? ROLE_COLORS.manager : '#f3f4f6' }
              ]}>
                <Ionicons 
                  name="shield-checkmark" 
                  size={24} 
                  color={selectedRole === 'manager' ? 'white' : '#6b7280'} 
                />
              </View>
              <ThemedText style={[
                styles.roleTitle,
                selectedRole === 'manager' && styles.roleTitleSelected
              ]}>
                Manager
              </ThemedText>
            </TouchableOpacity>

            {/* Cashier Role */}
            <TouchableOpacity
              style={[
                styles.roleCard,
                selectedRole === 'cashier' && styles.roleCardSelected
              ]}
              onPress={() => handleRoleSelect('cashier')}
            >
              <View style={[
                styles.roleIcon,
                { backgroundColor: selectedRole === 'cashier' ? ROLE_COLORS.cashier : '#f3f4f6' }
              ]}>
                <Ionicons 
                  name="cash-outline" 
                  size={24} 
                  color={selectedRole === 'cashier' ? 'white' : '#6b7280'} 
                />
              </View>
              <ThemedText style={[
                styles.roleTitle,
                selectedRole === 'cashier' && styles.roleTitleSelected
              ]}>
                Cashier
              </ThemedText>
            </TouchableOpacity>

            {/* Viewer Role */}
            <TouchableOpacity
              style={[
                styles.roleCard,
                selectedRole === 'viewer' && styles.roleCardSelected
              ]}
              onPress={() => handleRoleSelect('viewer')}
            >
              <View style={[
                styles.roleIcon,
                { backgroundColor: selectedRole === 'viewer' ? ROLE_COLORS.viewer : '#f3f4f6' }
              ]}>
                <Ionicons 
                  name="eye-outline" 
                  size={24} 
                  color={selectedRole === 'viewer' ? 'white' : '#6b7280'} 
                />
              </View>
              <ThemedText style={[
                styles.roleTitle,
                selectedRole === 'viewer' && styles.roleTitleSelected
              ]}>
                Viewer
              </ThemedText>
            </TouchableOpacity>
          </View>

          {/* Role Description */}
          {selectedRole && (
            <View style={styles.descriptionContainer}>
              <ThemedText style={styles.roleDescription}>
                {getRoleDescription(selectedRole)}
              </ThemedText>
            </View>
          )}
        </View>

        <View style={styles.footer}>
          <EnhancedButton
            title="Continue"
            onPress={handleContinue}
            disabled={!selectedRole}
            style={styles.continueButton}
          />
          
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <ThemedText style={styles.logoutText}>Logout</ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    </ThemedView>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  header: {
    marginBottom: 40,
  },
  title: {
    textAlign: 'center',
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  roleSelection: {
    width: '100%',
    maxWidth: 400,
    marginBottom: 40,
  },
  roleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 24,
  },
  roleCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  roleCardSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#3b82f6',
  },
  roleIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  roleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    textAlign: 'center',
  },
  roleTitleSelected: {
    color: 'white',
  },
  descriptionContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  roleDescription: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  footer: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  continueButton: {
    width: '100%',
    marginBottom: 16,
  },
  logoutButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  logoutText: {
    color: '#6b7280',
    fontSize: 16,
  },
});
