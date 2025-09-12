import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { ThemedText } from '../ThemedText';

interface CustomKeypadProps {
  onPress: (digit: string) => void;
  onDelete: () => void;
  onClear: () => void;
}

export const CustomKeypad: React.FC<CustomKeypadProps> = ({ onPress, onDelete, onClear }) => {
  const keys = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['', '0', 'delete']
  ];

  return (
    <View style={styles.keypad}>
      {keys.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.keypadRow}>
          {row.map((key, keyIndex) => (
            <TouchableOpacity
              key={keyIndex}
              style={[
                styles.keypadButton,
                key === '' && styles.keypadButtonEmpty,
                key === 'delete' && styles.keypadButtonDelete
              ]}
              onPress={() => {
                if (key === 'delete') {
                  onDelete();
                } else if (key !== '') {
                  onPress(key);
                }
              }}
              activeOpacity={0.7}
            >
              {key === 'delete' ? (
                <Ionicons name="backspace-outline" size={24} color="#6B7280" />
              ) : key !== '' ? (
                <ThemedText style={styles.keypadButtonText}>{key}</ThemedText>
              ) : null}
            </TouchableOpacity>
          ))}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  keypad: {
    gap: 16,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  keypadButton: {
    flex: 1,
    height: 64,
    borderRadius: 16,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  keypadButtonEmpty: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0,
  },
  keypadButtonDelete: {
    backgroundColor: '#FEF3F2',
    borderColor: '#FECACA',
  },
  keypadButtonText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#111827',
    fontFamily: 'Poppins_600SemiBold',
  },
});
