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
  { id: 'cosmetics', label: 'Cosmetics', icon: 'sparkles', color: '#ec4899' },
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
            { backgroundColor: selected === cat.id ? cat.color : '#f8fafc' },
            selected === cat.id && styles.buttonActive,
          ]}
        >
          <Ionicons
            name={cat.icon as any}
            size={24}
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
    paddingHorizontal: 4,
    marginBottom: 16,
  },
  button: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    marginHorizontal: 4,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonActive: {
    transform: [{ scale: 1.05 }],
  },
  label: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: '600',
  },
});
