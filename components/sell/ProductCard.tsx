import { ThemedText } from '@/components/ThemedText';
import { formatXAF } from '@/constants/Currency';
import { ProductVariant } from '@/types/domain';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

type Props = {
  name: string;
  variant: ProductVariant;
  onSell: () => void;
};

export function ProductCard({ name, variant, onSell }: Props) {
  const isLowStock = variant.quantity <= 3;
  const isOutOfStock = variant.quantity === 0;

  return (
    <View style={[styles.card, isOutOfStock && styles.cardDisabled]}>
      <View style={styles.content}>
        <View style={styles.info}>
          <ThemedText style={styles.name}>{name}</ThemedText>
          {variant.sizeLabel && (
            <ThemedText style={styles.size}>{variant.sizeLabel}</ThemedText>
          )}
          <ThemedText style={styles.price}>{formatXAF(variant.priceXaf)}</ThemedText>
        </View>
        
        <View style={styles.stockSection}>
          <ThemedText style={[
            styles.stock,
            isLowStock && styles.stockLow,
            isOutOfStock && styles.stockOut
          ]}>
            {isOutOfStock ? 'Out of Stock' : `Stock: ${variant.quantity}`}
          </ThemedText>
          
          <TouchableOpacity
            style={[
              styles.sellButton,
              isOutOfStock && styles.sellButtonDisabled
            ]}
            onPress={onSell}
            disabled={isOutOfStock}
          >
            <ThemedText style={[
              styles.sellButtonText,
              isOutOfStock && styles.sellButtonTextDisabled
            ]}>
              -1
            </ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 4,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  cardDisabled: {
    opacity: 0.6,
    backgroundColor: '#f8fafc',
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  size: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  price: {
    fontSize: 16,
    fontWeight: '600',
    color: '#059669',
  },
  stockSection: {
    alignItems: 'flex-end',
  },
  stock: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    color: '#374151',
  },
  stockLow: {
    color: '#dc2626',
  },
  stockOut: {
    color: '#9ca3af',
  },
  sellButton: {
    backgroundColor: '#3b82f6',
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  sellButtonDisabled: {
    backgroundColor: '#e5e7eb',
    shadowOpacity: 0,
    elevation: 0,
  },
  sellButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
  },
  sellButtonTextDisabled: {
    color: '#9ca3af',
  },
});
