import { BulkImportModal } from '@/components/products/BulkImportModal';
import { ProductForm } from '@/components/products/ProductForm';
import { ProductList } from '@/components/products/ProductList';
import { ProductsFilters } from '@/components/products/ProductsFilters';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { createProduct, deleteProduct, updateProduct } from '@/data/productManagementRepo';
import { useProducts } from '@/hooks/useProducts';
import { Product } from '@/types/domain';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, StyleSheet, TouchableOpacity, View } from 'react-native';

export default function ProductsScreen() {
  const { 
    products, 
    loading, 
    loadingMore,
    group, 
    setGroup, 
    search, 
    setSearch, 
    reload, 
    loadMore,
    hasMore,
    pagination
  } = useProducts(true); // Enable pagination
  const [showProductForm, setShowProductForm] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const handleCreateProduct = (data: any) => {
    try {
      createProduct(data);
      reload();
      Alert.alert('Success', 'Product created successfully');
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to create product');
    }
  };

  const handleUpdateProduct = (data: any) => {
    if (!selectedProduct) return;
    
    try {
      updateProduct(selectedProduct.id, data);
      reload();
      Alert.alert('Success', 'Product updated successfully');
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to update product');
    }
  };

  const handleDeleteProduct = (product: Product) => {
    Alert.alert(
      'Delete Product',
      `Are you sure you want to delete "${product.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            try {
              deleteProduct(product.id);
              reload();
              Alert.alert('Success', 'Product deleted successfully');
            } catch (error) {
              Alert.alert('Error', error instanceof Error ? error.message : 'Failed to delete product');
            }
          },
        },
      ]
    );
  };

  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product);
    setShowProductForm(true);
  };

  const handleAddProduct = () => {
    setSelectedProduct(null);
    setShowProductForm(true);
  };

  const handleImportComplete = (result: { success: number; errors: any[] }) => {
    reload();
    if (result.errors.length > 0) {
      Alert.alert(
        'Import Complete',
        `Successfully imported ${result.success} products. ${result.errors.length} errors occurred.`
      );
    } else {
      Alert.alert('Success', `Successfully imported ${result.success} products`);
    }
  };

  return (
    <Screen title="Products">
      <View style={styles.container}>
        {/* Action Buttons */}
        <View style={styles.actionBar}>
          <TouchableOpacity style={styles.actionButton} onPress={handleAddProduct}>
            <Ionicons name="add" size={20} color="white" />
            <ThemedText style={styles.actionButtonText}>Add Product</ThemedText>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton} onPress={() => setShowBulkImport(true)}>
            <Ionicons name="cloud-upload" size={20} color="white" />
            <ThemedText style={styles.actionButtonText}>Bulk Import</ThemedText>
          </TouchableOpacity>
        </View>

        <ProductsFilters
          search={search}
          setSearch={setSearch}
          group={group}
          setGroup={setGroup}
          onApply={reload}
        />
        
        {loading ? null : (
          <ProductList 
            data={products} 
            onEdit={handleEditProduct}
            onDelete={handleDeleteProduct}
            onLoadMore={loadMore}
            hasMore={hasMore}
            loadingMore={loadingMore}
            total={pagination.total}
          />
        )}
      </View>

      <ProductForm
        visible={showProductForm}
        product={selectedProduct}
        onClose={() => setShowProductForm(false)}
        onSave={selectedProduct ? handleUpdateProduct : handleCreateProduct}
      />

      <BulkImportModal
        visible={showBulkImport}
        onClose={() => setShowBulkImport(false)}
        onImportComplete={handleImportComplete}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  actionBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#3b82f6',
    borderRadius: 12,
  },
  actionButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
});


