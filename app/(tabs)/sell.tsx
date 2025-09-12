import { Screen } from '@/components/Screen';
import { CategoryButtons } from '@/components/sell/CategoryButtons';
import { ProductCard } from '@/components/sell/ProductCard';
import { ThemedText } from '@/components/ThemedText';
import { recordSale } from '@/data/salesRepo';
import { useProducts } from '@/hooks/useProducts';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import { Alert, FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';

export default function SellScreen() {
  const { products, reload, loadMore, loadingMore } = useProducts(true); // Enable pagination
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [highlightedProductId, setHighlightedProductId] = useState<string | null>(null);
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);

  const filteredProducts = products.filter(product => {
    if (selectedCategory === 'all') return true;
    if (selectedCategory === 'cosmetics') {
      return product.categoryId === 'cat_cosmetics' || 
             product.categoryId === 'cat_soap' || 
             product.categoryId === 'cat_lotion' || 
             product.categoryId === 'cat_oil' || 
             product.categoryId === 'cat_perfume' || 
             product.categoryId === 'cat_hygiene';
    }
    if (selectedCategory === 'pharma') {
      return product.categoryId === 'cat_pharma';
    }
    return true;
  });

  const handleSell = (productId: string) => {
    try {
      recordSale(productId, 1);
      reload(); // Refresh the product list
      // Could add haptic feedback here
    } catch {
      Alert.alert('Error', 'Could not record sale. Please try again.');
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
            
            // Only handle if this is the sell context
            if (context === 'sell') {
              isProcessing = true;
              
              // Clear the stored data immediately to prevent multiple processing
              await AsyncStorage.removeItem('selectedProductFromSearch');
              
              // Find the product in the current list
              const productIndex = filteredProducts.findIndex(p => p.id === product.id);
              
              if (productIndex !== -1) {
                
                // Find the matching variant in the product list
                const matchingVariant = filteredProducts[productIndex].variants.find(v => 
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
                      index: productIndex,
                      animated: true,
                      viewPosition: 0.5, // Center the item in the viewport
                    });
                  } catch {
                    // Fallback to scrollToOffset if scrollToIndex fails
                    const estimatedItemHeight = 80;
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
    }, [filteredProducts])
  );

  const renderProduct = ({ item }: any) => {
    return item.variants.map((variant: any) => {
      const isHighlighted = highlightedProductId === variant.id;
      
      return (
        <ProductCard
          key={variant.id}
          name={item.name}
          variant={variant}
          onSell={() => handleSell(variant.id)}
          highlighted={isHighlighted}
        />
      );
    });
  };

  return (
    <Screen title="Sell">
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
          onSelect={setSelectedCategory}
        />
      </View>
      
      {/* Products List */}
      <FlatList
        ref={flatListRef}
        data={filteredProducts}
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
});


