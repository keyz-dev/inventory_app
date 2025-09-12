import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { PinMode } from '../../hooks/usePinLogic';
import { ThemedText } from '../ThemedText';

interface PinHeaderProps {
  mode: PinMode;
  isLocked: boolean;
  remainingTime: number;
}

export const PinHeader: React.FC<PinHeaderProps> = ({ mode, isLocked, remainingTime }) => {
  const getTitle = () => {
    switch (mode) {
      case 'setup':
        return 'Create your new PIN';
      case 'confirm':
        return 'Confirm your PIN';
      case 'enter':
        return 'Welcome Back';
      case 'forgot':
        return 'PIN Locked';
      default:
        return 'Create your new PIN';
    }
  };

  const getSubtitle = () => {
    switch (mode) {
      case 'setup':
        return 'Set your personal 4-digit code. It will be used for secure and fast log in.';
      case 'confirm':
        return 'Re-enter your 4-digit code to confirm.';
      case 'enter':
        return 'Enter your 4-digit PIN to access the app.';
      case 'forgot':
        return isLocked 
          ? `Too many failed attempts. Please wait ${remainingTime} minutes or reset your PIN.`
          : 'Your PIN has been locked due to multiple failed attempts.';
      default:
        return 'Set your personal 4-digit code. It will be used for secure and fast log in.';
    }
  };

  return (
    <View style={styles.header}>
      <View style={styles.iconContainer}>
        <Ionicons name="lock-closed" size={32} color="#8B5CF6" />
      </View>
      
      <ThemedText style={styles.title}>{getTitle()}</ThemedText>
      <ThemedText style={styles.subtitle}>{getSubtitle()}</ThemedText>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 40,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 12,
    fontFamily: 'Poppins_700Bold',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
    fontFamily: 'Poppins_400Regular',
  },
});
