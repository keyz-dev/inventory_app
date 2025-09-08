import { ThemedText } from '@/components/ThemedText';
import { formatXAF } from '@/constants/Currency';
import { Product } from '@/types/domain';
import React from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

type Props = {
  data: Product[];
};

export function ProductList({ data }: Props) {
  return (
    <FlatList
      data={data}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <ThemedText type="subtitle" style={styles.title}>{item.name}</ThemedText>
          {item.variants.map((v) => (
            <View key={v.id} style={styles.variantRow}>
              <ThemedText style={styles.variantText}>
                {v.sizeLabel ? `${v.sizeLabel}` : 'Default'}
              </ThemedText>
              <ThemedText style={styles.variantText}>{formatXAF(v.priceXaf)}</ThemedText>
              <ThemedText style={styles.variantText}>Qty: {v.quantity}</ThemedText>
            </View>
          ))}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    paddingBottom: 24,
    gap: 12,
  },
  card: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 4,
    marginBottom: 12,
    backgroundColor: 'white',
  },
  title: {
    textAlign: 'left',
    marginBottom: 8,
  },
  variantRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  variantText: {
    fontSize: 16,
  },
});


