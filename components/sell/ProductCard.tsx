import { ThemedText } from '@/components/ThemedText';
import { formatXAF } from '@/constants/Currency';
import { ProductVariant } from '@/types/domain';
import { Ionicons } from '@expo/vector-icons';
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
        
        <View style={styles.rightSection}>
          <View style={styles.stockContainer}>
            <ThemedText style={[
              styles.stock,
              isLowStock && styles.stockLow,
              isOutOfStock && styles.stockOut
            ]}>
              {isOutOfStock ? 'Out of Stock' : `${variant.quantity} left`}
            </ThemedText>
          </View>
          
          <TouchableOpacity
            style={[
              styles.sellButton,
              isOutOfStock && styles.sellButtonDisabled
            ]}
            onPress={onSell}
            disabled={isOutOfStock}
          >
            <Ionicons 
              name="remove" 
              size={20} 
              color={isOutOfStock ? '#9ca3af' : 'white'} 
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardDisabled: {
    opacity: 0.5,
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
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: '#1f2937',
    marginBottom: 2,
  },
  size: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 4,
    fontFamily: 'Poppins_400Regular',
  },
  price: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
    color: '#059669',
  },
  rightSection: {
    alignItems: 'flex-end',
    gap: 8,
  },
  stockContainer: {
    alignItems: 'flex-end',
  },
  stock: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: '#6b7280',
  },
  stockLow: {
    color: '#f59e0b',
  },
  stockOut: {
    color: '#ef4444',
  },
  sellButton: {
    backgroundColor: '#3b82f6',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  sellButtonDisabled: {
    backgroundColor: '#e5e7eb',
    shadowOpacity: 0,
    elevation: 0,
  },
});
