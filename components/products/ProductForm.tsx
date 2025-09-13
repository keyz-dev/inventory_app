import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { listCategories } from '@/data/categoriesRepo';
import { CreateProductData, Product, UpdateProductData } from '@/data/productManagementRepo';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

type Props = {
  visible: boolean;
  product: Product | null;
  onClose: () => void;
  onSave: (data: CreateProductData | UpdateProductData) => void;
};

type ProductVariant = {
  id?: string;
  sizeLabel: string | null;
  priceXaf: number;
  quantity: number;
};

export function ProductForm({ visible, product, onClose, onSave }: Props) {
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    if (product) {
      setIsEditing(true);
      setName(product.name);
      setCategoryId(product.categoryId);
      setVariants(product.variants.map(v => ({
        id: v.id,
        sizeLabel: v.sizeLabel,
        priceXaf: v.priceXaf,
        quantity: v.quantity,
      })));
    } else {
      setIsEditing(false);
      setName('');
      setCategoryId(null);
      setVariants([{ sizeLabel: null, priceXaf: 0, quantity: 0 }]);
    }
  }, [product]);

  const loadCategories = () => {
    try {
      const cats = listCategories();
      setCategories(cats);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const addVariant = () => {
    setVariants([...variants, { sizeLabel: null, priceXaf: 0, quantity: 0 }]);
  };

  const removeVariant = (index: number) => {
    if (variants.length > 1) {
      setVariants(variants.filter((_, i) => i !== index));
    }
  };

  const updateVariant = (index: number, field: keyof ProductVariant, value: any) => {
    const newVariants = [...variants];
    newVariants[index] = { ...newVariants[index], [field]: value };
    setVariants(newVariants);
  };

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a product name');
      return;
    }

    if (!categoryId) {
      Alert.alert('Error', 'Please select a category');
      return;
    }

    if (variants.length === 0) {
      Alert.alert('Error', 'Please add at least one variant');
      return;
    }

    for (const variant of variants) {
      if (variant.priceXaf <= 0) {
        Alert.alert('Error', 'Please enter a valid price for all variants');
        return;
      }
      if (variant.quantity < 0) {
        Alert.alert('Error', 'Please enter a valid quantity for all variants');
        return;
      }
    }

    const data = {
      name: name.trim(),
      categoryId,
      variants: variants.map(v => ({
        id: v.id,
        sizeLabel: v.sizeLabel?.trim() || null,
        priceXaf: v.priceXaf,
        quantity: v.quantity,
      })),
    };

    onSave(data);
    handleClose();
  };

  const handleClose = () => {
    setName('');
    setCategoryId(null);
    setVariants([{ sizeLabel: null, priceXaf: 0, quantity: 0 }]);
    setIsEditing(false);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose}>
            <Ionicons name="close" size={24} color="#374151" />
          </TouchableOpacity>
          <ThemedText type="subtitle">
            {isEditing ? 'Edit Product' : 'Add Product'}
          </ThemedText>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Basic Info */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Basic Information</ThemedText>
            
            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>Product Name *</ThemedText>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Enter product name"
                autoFocus
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>Category</ThemedText>
              <View style={styles.categoryGrid}>
                <TouchableOpacity
                  key="no-category"
                  style={[
                    styles.categoryButton,
                    categoryId === null && styles.categoryButtonActive,
                  ]}
                  onPress={() => setCategoryId(null)}
                >
                  <ThemedText
                    style={[
                      styles.categoryButtonText,
                      categoryId === null && styles.categoryButtonTextActive,
                    ]}
                  >
                    No Category
                  </ThemedText>
                </TouchableOpacity>
                {categories
                  .filter(category => category.id !== null) // Filter out null IDs
                  .map((category) => (
                    <TouchableOpacity
                      key={category.id}
                      style={[
                        styles.categoryButton,
                        categoryId === category.id && styles.categoryButtonActive,
                      ]}
                      onPress={() => setCategoryId(category.id)}
                    >
                      <ThemedText
                        style={[
                          styles.categoryButtonText,
                          categoryId === category.id && styles.categoryButtonTextActive,
                        ]}
                      >
                        {category.name}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
              </View>
            </View>
          </View>

          {/* Variants */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <ThemedText style={styles.sectionTitle}>Variants</ThemedText>
              <TouchableOpacity style={styles.addButton} onPress={addVariant}>
                <Ionicons name="add" size={16} color="white" />
                <ThemedText style={styles.addButtonText}>Add Variant</ThemedText>
              </TouchableOpacity>
            </View>

            {variants.map((variant, index) => (
              <View key={index} style={styles.variantCard}>
                <View style={styles.variantHeader}>
                  <ThemedText style={styles.variantTitle}>
                    Variant {index + 1}
                  </ThemedText>
                  {variants.length > 1 && (
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => removeVariant(index)}
                    >
                      <Ionicons name="trash-outline" size={16} color="#ef4444" />
                    </TouchableOpacity>
                  )}
                </View>

                <View style={styles.variantInputs}>
                  <View style={styles.inputGroup}>
                    <ThemedText style={styles.label}>Size Label</ThemedText>
                    <TextInput
                      style={styles.input}
                      value={variant.sizeLabel || ''}
                      onChangeText={(value) => updateVariant(index, 'sizeLabel', value)}
                      placeholder="e.g., Large, Medium, Small"
                    />
                  </View>

                  <View style={styles.inputRow}>
                    <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                      <ThemedText style={styles.label}>Price (XAF) *</ThemedText>
                      <TextInput
                        style={styles.input}
                        value={variant.priceXaf.toString()}
                        onChangeText={(value) => updateVariant(index, 'priceXaf', parseFloat(value) || 0)}
                        placeholder="0"
                        keyboardType="numeric"
                      />
                    </View>

                    <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                      <ThemedText style={styles.label}>Quantity *</ThemedText>
                      <TextInput
                        style={styles.input}
                        value={variant.quantity.toString()}
                        onChangeText={(value) => updateVariant(index, 'quantity', parseInt(value) || 0)}
                        placeholder="0"
                        keyboardType="numeric"
                      />
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
            <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <ThemedText style={styles.saveButtonText}>
              {isEditing ? 'Update Product' : 'Add Product'}
            </ThemedText>
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
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: 'white',
  },
  categoryButtonActive: {
    borderColor: '#3b82f6',
    backgroundColor: '#3b82f6',
  },
  categoryButtonText: {
    fontSize: 14,
    color: '#374151',
  },
  categoryButtonTextActive: {
    color: 'white',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#3b82f6',
    borderRadius: 8,
  },
  addButtonText: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: '500',
    color: 'white',
  },
  variantCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  variantHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  variantTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  removeButton: {
    padding: 4,
  },
  variantInputs: {
    gap: 12,
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
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});
