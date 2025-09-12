import React from 'react';
import { StyleSheet, View } from 'react-native';

interface PinDotsProps {
  length: number;
  maxLength?: number;
}

export const PinDots: React.FC<PinDotsProps> = ({ length, maxLength = 4 }) => {
  return (
    <View style={styles.pinDotsContainer}>
      {Array.from({ length: maxLength }).map((_, index) => (
        <View
          key={index}
          style={[
            styles.pinDot,
            index < length && styles.pinDotFilled
          ]}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  pinDotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  pinDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
    borderWidth: 2,
    borderColor: '#D1D5DB',
  },
  pinDotFilled: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
});
