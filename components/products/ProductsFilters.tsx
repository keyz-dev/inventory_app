import { ThemedText } from '@/components/ThemedText';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

type Props = {
  search: string;
  setSearch: (v: string) => void;
  group: 'all' | 'pharma' | 'cosmetics';
  setGroup: (g: 'all' | 'pharma' | 'cosmetics') => void;
  onApply: () => void;
};

export function ProductsFilters({ search, setSearch, group, setGroup, onApply }: Props) {
  const router = useRouter();
  return (
    <View style={styles.container}>
      <View style={styles.inputWrap}>
        <Ionicons name="search" size={18} color="#9ca3af" />
        <TextInput
          value={search}
          onFocus={() => router.push('/search')}
          onChangeText={setSearch}
          placeholder="Search products"
          style={styles.input}
          onSubmitEditing={onApply}
        />
        <TouchableOpacity style={{ marginRight: 8 }}>
          <Ionicons name="mic" size={18} color="#9ca3af" />
        </TouchableOpacity>
        <TouchableOpacity>
          <Ionicons name="filter" size={18} color="#9ca3af" />
        </TouchableOpacity>
      </View>
      <View style={styles.segment}>
        {(
          [
            { key: 'all', label: 'All' },
            { key: 'pharma', label: 'Pharma' },
            { key: 'cosmetics', label: 'Cosmetics' },
          ] as const
        ).map(({ key, label }) => (
          <TouchableOpacity
            key={key}
            onPress={() => {
              setGroup(key);
              onApply();
            }}
            style={[styles.tab, group === key ? styles.tabActive : undefined]}
          >
            <ThemedText style={group === key ? styles.tabActiveText : undefined}>{label}</ThemedText>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 12,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 12,
    backgroundColor: 'white',
  },
  input: {
    flex: 1,
    paddingHorizontal: 8,
    fontSize: 16,
  },
  segment: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    backgroundColor: 'white',
    marginRight: 8,
  },
  tabActive: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  tabActiveText: {
    color: 'white',
  },
});


