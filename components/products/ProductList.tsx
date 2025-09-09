import { ThemedText } from '@/components/ThemedText';
import { formatXAF } from '@/constants/Currency';
import { Product } from '@/types/domain';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';

type Props = {
  data: Product[];
  onEdit?: (product: Product) => void;
  onDelete?: (product: Product) => void;
};

export function ProductList({ data, onEdit, onDelete }: Props) {
  return (
    <FlatList
      data={data}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <ThemedText type="subtitle" style={styles.title}>{item.name}</ThemedText>
            <View style={styles.actions}>
              {onEdit && (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => onEdit(item)}
                >
                  <Ionicons name="create-outline" size={16} color="#3b82f6" />
                </TouchableOpacity>
              )}
              {onDelete && (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => onDelete(item)}
                >
                  <Ionicons name="trash-outline" size={16} color="#ef4444" />
                </TouchableOpacity>
              )}
            </View>
          </View>
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    textAlign: 'left',
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#f8fafc',
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


