import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Product } from '@/types/domain';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, Modal, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

type Props = {
  visible: boolean;
  product: Product | null;
  onClose: () => void;
  onAdjust: (productId: string, delta: number, reason: string) => void;
};

const ADJUSTMENT_REASONS = [
  'Received Stock',
  'Damaged Goods',
  'Expired Product',
  'Theft/Loss',
  'Return to Supplier',
  'Stock Count Adjustment',
  'Other',
];

export function StockAdjustmentForm({ visible, product, onClose, onAdjust }: Props) {
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [isAdding, setIsAdding] = useState(true);

  const handleSubmit = () => {
    if (!product || !quantity.trim()) {
      Alert.alert('Error', 'Please enter a quantity');
      return;
    }

    const delta = parseInt(quantity);
    if (isNaN(delta) || delta === 0) {
      Alert.alert('Error', 'Please enter a valid quantity');
      return;
    }

    const finalReason = reason === 'Other' ? customReason : reason;
    if (!finalReason.trim()) {
      Alert.alert('Error', 'Please select or enter a reason');
      return;
    }

    const actualDelta = isAdding ? Math.abs(delta) : -Math.abs(delta);
    
    onAdjust(product.id, actualDelta, finalReason);
    handleClose();
  };

  const handleClose = () => {
    setQuantity('');
    setReason('');
    setCustomReason('');
    setIsAdding(true);
    onClose();
  };

  if (!product) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose}>
            <Ionicons name="close" size={24} color="#374151" />
          </TouchableOpacity>
          <ThemedText type="subtitle">Adjust Stock</ThemedText>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.content}>
          <View style={styles.productInfo}>
            <ThemedText type="subtitle">{product.name}</ThemedText>
            {product.variants.map((variant, index) => (
              <View key={variant.id} style={styles.variantInfo}>
                <ThemedText style={styles.variantText}>
                  {variant.sizeLabel || 'Default'}: {variant.quantity} units
                </ThemedText>
              </View>
            ))}
          </View>

          <View style={styles.adjustmentType}>
            <TouchableOpacity
              style={[styles.typeButton, isAdding && styles.typeButtonActive]}
              onPress={() => setIsAdding(true)}
            >
              <Ionicons name="add" size={20} color={isAdding ? 'white' : '#10b981'} />
              <ThemedText style={[styles.typeButtonText, isAdding && styles.typeButtonTextActive]}>
                Add Stock
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.typeButton, !isAdding && styles.typeButtonActive]}
              onPress={() => setIsAdding(false)}
            >
              <Ionicons name="remove" size={20} color={!isAdding ? 'white' : '#ef4444'} />
              <ThemedText style={[styles.typeButtonText, !isAdding && styles.typeButtonTextActive]}>
                Remove Stock
              </ThemedText>
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>Quantity</ThemedText>
            <TextInput
              style={styles.input}
              value={quantity}
              onChangeText={setQuantity}
              placeholder="Enter quantity"
              keyboardType="numeric"
              autoFocus
            />
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>Reason</ThemedText>
            <View style={styles.reasonGrid}>
              {ADJUSTMENT_REASONS.map((reasonOption) => (
                <TouchableOpacity
                  key={reasonOption}
                  style={[
                    styles.reasonButton,
                    reason === reasonOption && styles.reasonButtonActive,
                  ]}
                  onPress={() => setReason(reasonOption)}
                >
                  <ThemedText
                    style={[
                      styles.reasonButtonText,
                      reason === reasonOption && styles.reasonButtonTextActive,
                    ]}
                  >
                    {reasonOption}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>

            {reason === 'Other' && (
              <TextInput
                style={styles.input}
                value={customReason}
                onChangeText={setCustomReason}
                placeholder="Enter custom reason"
                multiline
              />
            )}
          </View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
            <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
            <ThemedText style={styles.submitButtonText}>Adjust Stock</ThemedText>
          </TouchableOpacity>
        </View>
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: 'white',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  productInfo: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  variantInfo: {
    marginTop: 8,
  },
  variantText: {
    fontSize: 14,
    color: '#6b7280',
  },
  adjustmentType: {
    flexDirection: 'row',
    marginBottom: 24,
    gap: 12,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    backgroundColor: 'white',
  },
  typeButtonActive: {
    borderColor: '#3b82f6',
    backgroundColor: '#3b82f6',
  },
  typeButtonText: {
    marginLeft: 8,
    fontWeight: '600',
    color: '#374151',
  },
  typeButtonTextActive: {
    color: 'white',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#374151',
  },
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  reasonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  reasonButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: 'white',
  },
  reasonButtonActive: {
    borderColor: '#3b82f6',
    backgroundColor: '#3b82f6',
  },
  reasonButtonText: {
    fontSize: 14,
    color: '#374151',
  },
  reasonButtonTextActive: {
    color: 'white',
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: 'white',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  submitButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});
