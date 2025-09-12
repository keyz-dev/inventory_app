import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ThemedText } from '../ThemedText';

interface PinErrorDisplayProps {
  error: string;
}

export const PinErrorDisplay: React.FC<PinErrorDisplayProps> = ({ error }) => {
  if (!error) return null;

  return (
    <View style={styles.errorContainer}>
      <ThemedText style={styles.errorText}>{error}</ThemedText>
    </View>
  );
};

const styles = StyleSheet.create({
  errorContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    textAlign: 'center',
    backgroundColor: '#FEF2F2',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
    fontFamily: 'Poppins_400Regular',
  },
});
