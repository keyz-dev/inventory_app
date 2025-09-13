import { ThemedText } from '@/components/ThemedText';
import { formatXAF } from '@/constants/Currency';
import { ProductVariant } from '@/types/domain';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

type Props = {
  name: string;
  variant: ProductVariant;
  onSell: (quantity: number) => void;
  highlighted?: boolean;
};

export function ProductCard({ name, variant, onSell, highlighted = false }: Props) {
  const [sellQuantity, setSellQuantity] = useState(1);
  const [inputValue, setInputValue] = useState('1');
  const isLowStock = variant.quantity <= 3;
  const isOutOfStock = variant.quantity === 0;
  
  // Reset quantity when variant changes
  useEffect(() => {
    setSellQuantity(1);
    setInputValue('1');
  }, [variant.id]);
  
  const handleQuantityChange = useCallback((value: string) => {
    setInputValue(value);
    const num = parseInt(value) || 1;
    const clampedQuantity = Math.max(1, Math.min(num, variant.quantity));
    setSellQuantity(clampedQuantity);
  }, [variant.quantity]);

  const incrementQuantity = useCallback(() => {
    if (sellQuantity < variant.quantity) {
      const newQuantity = sellQuantity + 1;
      setSellQuantity(newQuantity);
      setInputValue(newQuantity.toString());
    }
  }, [sellQuantity, variant.quantity]);

  const decrementQuantity = useCallback(() => {
    if (sellQuantity > 1) {
      const newQuantity = sellQuantity - 1;
      setSellQuantity(newQuantity);
      setInputValue(newQuantity.toString());
    }
  }, [sellQuantity]);

  const handleSell = useCallback(() => {
    onSell(sellQuantity);
    // Reset quantity to 1 after successful sale (if still in stock)
    if (variant.quantity > sellQuantity) {
      setSellQuantity(1);
      setInputValue('1');
    }
  }, [onSell, sellQuantity, variant.quantity]);
  
  return (
    <View style={[
      styles.card, 
      isOutOfStock && styles.cardDisabled,
      highlighted && styles.cardHighlighted
    ]}>
      <View style={styles.content}>
        <View style={styles.info}>
          <ThemedText style={styles.name}>{name}</ThemedText>
          {variant.sizeLabel && (
            <ThemedText style={styles.size}>{variant.sizeLabel}</ThemedText>
          )}
          <ThemedText style={styles.price}>{formatXAF(variant.priceXaf)}</ThemedText>
          
          {!isOutOfStock && (
            <View style={styles.quantitySection}>
              <View style={styles.quantityControls}>
                <TouchableOpacity
                  style={[styles.quantityButton, sellQuantity <= 1 && styles.quantityButtonDisabled]}
                  onPress={decrementQuantity}
                  disabled={sellQuantity <= 1}
                >
                  <Ionicons 
                    name="remove" 
                    size={18} 
                    color={sellQuantity <= 1 ? '#9ca3af' : '#374151'} 
                  />
                </TouchableOpacity>
                
                <View style={styles.quantityInputContainer}>
                  <TextInput
                    style={styles.quantityInput}
                    value={inputValue}
                    onChangeText={handleQuantityChange}
                    keyboardType="numeric"
                    selectTextOnFocus
                    onBlur={() => {
                      // Ensure input shows the actual sell quantity on blur
                      setInputValue(sellQuantity.toString());
                    }}
                  />
                </View>
                
                <TouchableOpacity
                  style={[styles.quantityButton, sellQuantity >= variant.quantity && styles.quantityButtonDisabled]}
                  onPress={incrementQuantity}
                  disabled={sellQuantity >= variant.quantity}
                >
                  <Ionicons 
                    name="add" 
                    size={18} 
                    color={sellQuantity >= variant.quantity ? '#9ca3af' : '#374151'} 
                  />
                </TouchableOpacity>
              </View>
            </View>
          )}
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
            onPress={handleSell}
            disabled={isOutOfStock}
          >
            <Ionicons 
              name="checkmark" 
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
  cardHighlighted: {
    borderWidth: 3,
    borderColor: '#3b82f6',
    backgroundColor: '#dbeafe',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
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
  quantitySection: {
    marginTop: 8,
    alignItems: 'flex-start',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  quantityButtonDisabled: {
    backgroundColor: '#f3f4f6',
    borderColor: '#e5e7eb',
  },
  quantityInputContainer: {
    width: 40,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  quantityInput: {
    width: '100%',
    height: '100%',
    textAlign: 'center',
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: '#1f2937',
    backgroundColor: 'transparent',
    padding: 0,
    margin: 0,
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
