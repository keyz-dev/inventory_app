import { Screen } from '@/components/Screen';
import { CategoryButtons } from '@/components/sell/CategoryButtons';
import { ProductCard } from '@/components/sell/ProductCard';
import { ThemedText } from '@/components/ThemedText';
import { useSettings } from '@/contexts/SettingsContext';
import { useCanSell, useUser } from '@/contexts/UserContext';
import { recordSale } from '@/data/salesRepo';
import { useProducts } from '@/hooks/useProducts';
import { useSync } from '@/hooks/useSync';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';

export default function SellScreen() {
  const { 
    products, 
    loadMore, 
    loadingMore, 
    group, 
    setGroup, 
    loading,
    findAndLoadProduct,
    updateProductQuantity
  } = useProducts(true); // Enable pagination
  const { showSettings } = useSettings();
  useUser(); // Get user context for permissions
  const canSell = useCanSell();
  const { queueOperation } = useSync();
  const [highlightedProductId, setHighlightedProductId] = useState<string | null>(null);
  const router = useRouter();

  // Redirect if user doesn't have permission
  useFocusEffect(
    useCallback(() => {
      if (!canSell) {
        router.replace('/(tabs)/products');
      }
    }, [canSell, router])
  );
  const flatListRef = useRef<FlatList>(null);

  // Use the group from useProducts hook instead of local state
  const selectedCategory = group;

  // Helper function to handle product result and scrolling
  const handleProductResult = (result: any, variant: any, productName: string) => {
    if (result) {
      const { product, index } = result;
      
      // Find the matching variant in the product list
      const matchingVariant = product.variants.find((v: any) => 
        v.sizeLabel === variant.sizeLabel && v.priceXaf === variant.priceXaf
      );
      
      if (matchingVariant) {
        // Highlight the product immediately
        setHighlightedProductId(matchingVariant.id);
      } else {
        // Fallback to search variant ID
        setHighlightedProductId(variant.id);
      }
      
      // Scroll to center the product in the viewport
      setTimeout(() => {
        // Try scrollToIndex first (more accurate)
        try {
          flatListRef.current?.scrollToIndex({
            index: index,
            animated: true,
            viewPosition: 0.5, // Center the item in the viewport
          });
        } catch {
          // Fallback to scrollToOffset if scrollToIndex fails
          const estimatedItemHeight = 80;
          const itemOffset = index * estimatedItemHeight;
          const viewportHeight = 600;
          const centeredOffset = Math.max(0, itemOffset - (viewportHeight / 2) + (estimatedItemHeight / 2));
          
          flatListRef.current?.scrollToOffset({
            offset: centeredOffset,
            animated: true
          });
        }
      }, 100);
      
      // Remove highlight after 3 seconds
      setTimeout(() => {
        setHighlightedProductId(null);
      }, 3000);
    } else {
      // Product not found, show a message
      Alert.alert(
        'Product Not Found',
        `${productName || 'The selected product'} could not be found. It may have been deleted or is not available.`,
        [{ text: 'OK' }]
      );
    }
  };

  const handleSell = async (productId: string, quantity: number = 1) => {
    try {
      // Record the sale locally and get the generated sale ID
      const saleId = recordSale(productId, quantity);
      
      // Update the local state immediately for smooth UX
      updateProductQuantity(productId, -quantity);
      
      // Queue sync operation for the sale
      try {
        // Get product price for sync data
        const product = products.find(p => p.id === productId);
        const priceXaf = product?.variants[0]?.priceXaf || 0;
        const totalXaf = priceXaf * quantity;
        
        await queueOperation('sale', 'create', {
          id: saleId,
          productId,
          quantity,
          priceXaf,
          totalXaf,
          timestamp: new Date().toISOString()
        });
      } catch (syncError) {
        // Don't show error to user - the sale was recorded successfully
        // Sync will retry automatically
        console.warn('Failed to queue sale for sync:', syncError);
      }
      
      // No need to reload - we've already updated the local state
      // Could add haptic feedback here
    } catch (error) {
      // Handle specific error cases
      if (error instanceof Error) {
        if (error.message === 'Insufficient stock') {
          Alert.alert('Out of Stock', 'This product is out of stock.');
        } else if (error.message === 'Product not found') {
          Alert.alert('Product Not Found', 'This product is no longer available.');
        } else {
          Alert.alert('Error', 'Could not record sale. Please try again.');
        }
      } else {
        Alert.alert('Error', 'Could not record sale. Please try again.');
      }
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
            const { productId, variant, context, productName, categoryGroup } = JSON.parse(selectedData);
            
            // Only handle if this is the sell context
            if (context === 'sell') {
              isProcessing = true;
              
              // Clear the stored data immediately to prevent multiple processing
              await AsyncStorage.removeItem('selectedProductFromSearch');
              
              // Smart category switching: switch to the product's category if needed
              if (categoryGroup && categoryGroup !== 'all' && categoryGroup !== group) {
                setGroup(categoryGroup);
                
                // Show user feedback about the category switch
                Alert.alert(
                  'Category Switched',
                  `Switched to ${categoryGroup} category to show "${productName}".`,
                  [{ text: 'OK' }]
                );
                
                // Wait a moment for the category to load, then continue
                setTimeout(async () => {
                  const result = await findAndLoadProduct(productId);
                  handleProductResult(result, variant, productName);
                }, 500);
                return;
              }
              
              // Try to find and load the product
              const result = await findAndLoadProduct(productId);
              handleProductResult(result, variant, productName);
            } else {
            }
          } else {
          }
        } catch {
        } finally {
          isProcessing = false;
        }
      };

      checkForSelectedProduct();
    }, [findAndLoadProduct, group, setGroup])
  );

  const renderProduct = ({ item }: any) => {
    return item.variants.map((variant: any) => {
      const isHighlighted = highlightedProductId === variant.id;
      
      return (
        <ProductCard
          key={variant.id}
          name={item.name}
          variant={variant}
          onSell={(quantity) => handleSell(variant.id, quantity)}
          highlighted={isHighlighted}
        />
      );
    });
  };

  // Redirect if user doesn't have permission to sell
  if (!canSell) {
    return (
      <Screen title="Sell" rightHeaderAction={{ icon: 'settings', onPress: showSettings }}>
        <View style={styles.noAccessContainer}>
          <Ionicons name="lock-closed" size={64} color="#ef4444" />
          <ThemedText type="title" style={styles.noAccessTitle}>
            Access Denied
          </ThemedText>
          <ThemedText style={styles.noAccessText}>
            You don&apos;t have permission to access the sales feature.
          </ThemedText>
          <ThemedText style={styles.noAccessSubtext}>
            Contact your manager for access.
          </ThemedText>
        </View>
      </Screen>
    );
  }

  return (
    <Screen 
      title="Sell"
      rightHeaderAction={{
        icon: 'settings',
        onPress: showSettings
      }}
    >
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TouchableOpacity 
          style={styles.searchBar}
          onPress={() => router.push('/search?context=sell')}
        >
          <Ionicons name="search" size={20} color="#9ca3af" />
          <ThemedText style={styles.searchPlaceholder}>Search products...</ThemedText>
        </TouchableOpacity>
      </View>

      {/* Category Filters */}
      <View style={styles.categoryContainer}>
        <CategoryButtons
          selected={selectedCategory}
          onSelect={(id: string) => setGroup(id as "all" | "pharma" | "cosmetics")}
        />
      </View>
      
      {/* Products List */}
      <FlatList
        ref={flatListRef}
        data={products}
        keyExtractor={(item) => item.id}
        renderItem={renderProduct}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        style={styles.productsList}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.loadingFooter}>
              <ThemedText style={styles.loadingText}>Loading more products...</ThemedText>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            {loading ? (
              <>
                <ActivityIndicator size="large" color="#3b82f6" />
                <ThemedText style={styles.emptyText}>Loading products...</ThemedText>
              </>
            ) : (
              <>
                <Ionicons name="cube-outline" size={64} color="#9ca3af" />
                <ThemedText style={styles.emptyText}>
                  {selectedCategory === 'all' ? "No products found" : `No ${selectedCategory} products found`}
                </ThemedText>
              </>
            )}
          </View>
        }
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        initialNumToRender={20}
        windowSize={10}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  searchContainer: {
    paddingVertical: 16,
    backgroundColor: 'white',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchPlaceholder: {
    color: '#9ca3af',
    fontSize: 16,
    fontFamily: 'Poppins_400Regular',
  },
  categoryContainer: {
    paddingBottom: 8,
    backgroundColor: 'white',
  },
  productsList: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  list: {
    paddingTop: 8,
    paddingBottom: 100, // Space for bottom tabs
  },
  loadingFooter: {
    padding: 16,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#6b7280',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 16,
    fontFamily: 'Poppins_400Regular',
  },
  noAccessContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  noAccessTitle: {
    marginTop: 16,
    marginBottom: 8,
    color: '#ef4444',
  },
  noAccessText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 8,
  },
  noAccessSubtext: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
});


