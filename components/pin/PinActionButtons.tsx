import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { ThemedText } from '../ThemedText';

interface PinActionButtonsProps {
  mode: 'confirm' | 'forgot';
  isLocked?: boolean;
  onRetry?: () => void;
  onReset?: () => void;
  onTryAgain?: () => void;
}

export const PinActionButtons: React.FC<PinActionButtonsProps> = ({
  mode,
  isLocked = false,
  onRetry,
  onReset,
  onTryAgain,
}) => {
  if (mode === 'confirm') {
    return (
      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
          <ThemedText style={styles.retryButtonText}>Start Over</ThemedText>
        </TouchableOpacity>
      </View>
    );
  }

  if (mode === 'forgot') {
    return (
      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={[styles.resetButton, isLocked && styles.resetButtonDisabled]} 
          onPress={onReset}
          disabled={isLocked}
        >
          <ThemedText style={[styles.resetButtonText, isLocked && styles.resetButtonTextDisabled]}>
            Reset PIN
          </ThemedText>
        </TouchableOpacity>
        {!isLocked && (
          <TouchableOpacity style={styles.backButton} onPress={onTryAgain}>
            <ThemedText style={styles.backButtonText}>Try Again</ThemedText>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  actionButtons: {
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  retryButton: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  retryButtonText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
  },
  resetButton: {
    backgroundColor: '#DC2626',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  resetButtonDisabled: {
    backgroundColor: '#F3F4F6',
    shadowOpacity: 0,
    elevation: 0,
  },
  resetButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
  },
  resetButtonTextDisabled: {
    color: '#9CA3AF',
  },
  backButton: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  backButtonText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
  },
});
