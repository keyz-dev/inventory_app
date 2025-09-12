import { BulkImportModal } from '@/components/products/BulkImportModal';
import { ProductForm } from '@/components/products/ProductForm';
import { ProductList } from '@/components/products/ProductList';
import { ProductsFilters } from '@/components/products/ProductsFilters';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { useSettings } from '@/contexts/SettingsContext';
import { useCanManageProducts, useUser } from '@/contexts/UserContext';
import { createProduct, deleteProduct, updateProduct } from '@/data/productManagementRepo';
import { useProducts } from '@/hooks/useProducts';
import { useSync } from '@/hooks/useSync';
import { Product } from '@/types/domain';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
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
  const { showSettings } = useSettings();
  const { currentUser } = useUser();
  const canManageProducts = useCanManageProducts();
  
  const { queueOperation } = useSync(); // Add sync functionality
  
  const [showProductForm, setShowProductForm] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [highlightedProductId, setHighlightedProductId] = useState<string | null>(null);
  const flatListRef = useRef<any>(null);

  const handleCreateProduct = async (data: any) => {
    try {
      const product = createProduct(data);
      reload();
      
      // Queue sync operation for the created product
      try {
        // For products, we need to sync each variant
        for (const variant of product.variants) {
          await queueOperation('product', 'create', {
            id: variant.id,
            name: product.name,
            priceXaf: variant.priceXaf,
            quantity: variant.quantity,
            sizeLabel: variant.sizeLabel,
            variantOfId: product.variants.length > 1 ? product.id : null,
            categoryId: product.categoryId
          });
        }
      } catch (syncError) {
        // Don't show error to user - the product was created successfully
        // Sync will retry automatically
      }
      
      Alert.alert('Success', 'Product created successfully');
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to create product');
    }
  };

  const handleUpdateProduct = async (data: any) => {
    if (!selectedProduct) return;
    
    try {
      const updatedProduct = updateProduct(selectedProduct.id, data);
      reload();
      
      // Queue sync operation for the updated product
      try {
        // For products, we need to sync each variant
        for (const variant of updatedProduct.variants) {
          await queueOperation('product', 'update', {
            id: variant.id,
            name: updatedProduct.name,
            priceXaf: variant.priceXaf,
            quantity: variant.quantity,
            sizeLabel: variant.sizeLabel,
            variantOfId: updatedProduct.variants.length > 1 ? updatedProduct.id : null,
            categoryId: updatedProduct.categoryId
          });
        }
      } catch (syncError) {
        // Don't show error to user - sync will retry automatically
      }
      
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
          onPress: async () => {
            try {
              deleteProduct(product.id);
              reload();
              
              // Queue sync operation for the deleted product
              try {
                // For products, we need to sync each variant
                for (const variant of product.variants) {
                  await queueOperation('product', 'delete', {
                    id: variant.id,
                    name: product.name,
                    priceXaf: variant.priceXaf,
                    quantity: variant.quantity,
                    sizeLabel: variant.sizeLabel,
                    variantOfId: product.variants.length > 1 ? product.id : null,
                    categoryId: product.categoryId
                  });
                }
              } catch (syncError) {
                // Don't show error to user - sync will retry automatically
              }
              
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

  // Handle product selection from search
  useFocusEffect(
    useCallback(() => {
      let isProcessing = false;
      
      const checkForSelectedProduct = async () => {
        if (isProcessing) return;
        
        try {
          const selectedData = await AsyncStorage.getItem('selectedProductFromSearch');
          
          if (selectedData) {
            const { product, variant, context } = JSON.parse(selectedData);
            
            // Only handle if this is the products context
            if (context === 'products') {
              isProcessing = true;
              
              // Clear the stored data immediately to prevent multiple processing
              await AsyncStorage.removeItem('selectedProductFromSearch');
              
              // Find the product in the current list
              const productIndex = products.findIndex(p => p.id === product.id);
              
              if (productIndex !== -1) {
                
                // Highlight the product immediately
                setHighlightedProductId(product.id);
                
                // Scroll to center the product in the viewport
                setTimeout(() => {
                  
                  // Try scrollToIndex first (more accurate)
                  try {
                    flatListRef.current?.scrollToIndex({
                      index: productIndex,
                      animated: true,
                      viewPosition: 0.5, // Center the item in the viewport
                    });
                  } catch (error) {
                    // Fallback to scrollToOffset if scrollToIndex fails
                    const estimatedItemHeight = 120;
                    const itemOffset = productIndex * estimatedItemHeight;
                    const viewportHeight = 600;
                    const centeredOffset = Math.max(0, itemOffset - (viewportHeight / 2) + (estimatedItemHeight / 2));
                    
                    flatListRef.current?.scrollToOffset({
                      offset: centeredOffset,
                      animated: true
                    });
                  }
                }, 100);
                
                // Remove highlight after 10 seconds
                setTimeout(() => {
                  setHighlightedProductId(null);
                }, 10000);
              } else {
              }
            } else {
            }
          } else {
          }
        } catch (error) {
        } finally {
          isProcessing = false;
        }
      };

      checkForSelectedProduct();
    }, [products])
  );

  return (
    <Screen 
      title={`Products - ${currentUser?.name || 'User'}`}
      rightHeaderAction={{
        icon: 'settings',
        onPress: showSettings
      }}
    >
      <View style={styles.container}>
        {/* Action Buttons - Only show if user can manage products */}
        {canManageProducts && (
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
        )}

        <ProductsFilters
          search={search}
          setSearch={setSearch}
          group={group}
          setGroup={setGroup}
          onApply={reload}
        />
        
        <ProductList 
          ref={flatListRef}
          data={products} 
          onEdit={canManageProducts ? handleEditProduct : undefined}
          onDelete={canManageProducts ? handleDeleteProduct : undefined}
          onLoadMore={loadMore}
          hasMore={hasMore}
          loadingMore={loadingMore}
          total={pagination.total}
          highlightedProductId={highlightedProductId}
          loading={loading}
          emptyMessage={group === 'all' ? "No products found" : `No ${group} products found`}
        />
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


