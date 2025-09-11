import { ThemedText } from '@/components/ThemedText';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

type Category = {
  id: 'all' | 'cosmetics' | 'pharma';
  label: string;
  icon: string;
  color: string;
};

type Props = {
  selected: string;
  onSelect: (id: string) => void;
};

const categories: Category[] = [
  { id: 'all', label: 'All', icon: 'grid', color: '#3b82f6' },
  { id: 'cosmetics', label: 'Cosmetics', icon: 'sparkles', color: '#8b5cf6' },
  { id: 'pharma', label: 'Pharma', icon: 'medical', color: '#10b981' },
];

export function CategoryButtons({ selected, onSelect }: Props) {
  return (
    <View style={styles.container}>
      {categories.map((cat) => (
        <TouchableOpacity
          key={cat.id}
          onPress={() => onSelect(cat.id)}
          style={[
            styles.button,
            selected === cat.id && styles.buttonActive,
          ]}
        >
          <Ionicons
            name={cat.icon as any}
            size={20}
            color={selected === cat.id ? 'white' : cat.color}
          />
          <ThemedText
            style={[
              styles.label,
              { color: selected === cat.id ? 'white' : cat.color },
            ]}
          >
            {cat.label}
          </ThemedText>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
  },
  buttonActive: {
    backgroundColor: '#3b82f6',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  label: {
    marginTop: 4,
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
  },
});
