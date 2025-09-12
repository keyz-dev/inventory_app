import { Screen } from '@/components/Screen';
import { StockAdjustmentForm } from '@/components/stock/StockAdjustmentForm';
import { ThemedText } from '@/components/ThemedText';
import { formatXAF } from '@/constants/Currency';
import { useSettings } from '@/contexts/SettingsContext';
import { useCanAdjustStock, useUser } from '@/contexts/UserContext';
import { getLowStockProducts, getStockSummary, recordStockAdjustment } from '@/data/stockRepo';
import { useProducts } from '@/hooks/useProducts';
import { Product } from '@/types/domain';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, RefreshControl, StyleSheet, TouchableOpacity, View } from 'react-native';

export default function StockScreen() {
  const { products, loading, loadingMore, loadMore, reload } = useProducts(true); // Enable pagination
  const { showSettings } = useSettings();
  const { currentUser } = useUser();
  const canAdjustStock = useCanAdjustStock();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showAdjustmentForm, setShowAdjustmentForm] = useState(false);
  const [stockSummary, setStockSummary] = useState({
    totalProducts: 0,
    totalValue: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
  });
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [highlightedProductId, setHighlightedProductId] = useState<string | null>(null);
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    loadStockData();
  }, []);

  // Refresh stock data when products change
  useEffect(() => {
    loadStockData();
  }, [products]);

  const loadStockData = () => {
    try {
      const summary = getStockSummary(3);
      console.log('Stock summary loaded:', summary);
      setStockSummary(summary);
      
      const lowStock = getLowStockProducts(3);
      setLowStockProducts(lowStock);
    } catch (error) {
      console.error('Error loading stock data:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await reload(); // Reload products
      loadStockData(); // Reload stock summary and low stock data
    } finally {
      setRefreshing(false);
    }
  };

  const handleAdjustStock = (productId: string, delta: number, reason: string) => {
    try {
      console.log('Adjusting stock for product:', productId, 'delta:', delta, 'reason:', reason);
      recordStockAdjustment(productId, delta, reason);
      console.log('Stock adjustment recorded, reloading data...');
      reload();
      loadStockData();
      Alert.alert('Success', 'Stock adjusted successfully');
    } catch (error) {
      console.error('Stock adjustment error:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to adjust stock');
    }
  };

  const openAdjustmentForm = (product: Product) => {
    setSelectedProduct(product);
    setShowAdjustmentForm(true);
  };

  // Handle product selection from search
  useFocusEffect(
    useCallback(() => {
      let isProcessing = false;
      
      const checkForSelectedProduct = async () => {
        if (isProcessing) return;
        
        try {
          const selectedData = await AsyncStorage.getItem('selectedProductFromSearch');
          console.log('Stock page: Retrieved data:', selectedData);
          
          if (selectedData) {
            const { product, variant, context } = JSON.parse(selectedData);
            console.log('Stock page: Parsed data:', { product: product.name, variant, context });
            
            // Only handle if this is the stock context
            if (context === 'stock') {
              console.log('Stock page: Context matches, processing...');
              isProcessing = true;
              
              // Clear the stored data immediately to prevent multiple processing
              await AsyncStorage.removeItem('selectedProductFromSearch');
              
              // Find the product in the current list
              const productIndex = products.findIndex(p => p.id === product.id);
              console.log('Stock page: Product index:', productIndex);
              console.log('Stock page: Total products:', products.length);
              
              if (productIndex !== -1) {
                console.log('Stock page: Product found, highlighting and scrolling...');
                
                // Highlight the product immediately
                setHighlightedProductId(variant.id);
                console.log('Stock page: Highlighted product ID set to:', variant.id);
                
                // Scroll to center the product in the viewport
                setTimeout(() => {
                  console.log('Stock page: Centering product at index:', productIndex);
                  
                  // Try scrollToIndex first (more accurate)
                  try {
                    flatListRef.current?.scrollToIndex({
                      index: productIndex,
                      animated: true,
                      viewPosition: 0.5, // Center the item in the viewport
                    });
                  } catch {
                    // Fallback to scrollToOffset if scrollToIndex fails
                    console.log('Stock page: scrollToIndex failed, using scrollToOffset');
                    const estimatedItemHeight = 100;
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
                  console.log('Stock page: Highlight removed');
                }, 10000);
              } else {
                console.log('Stock page: Product not found in products list');
                console.log('Stock page: Available product IDs:', products.map(p => p.id));
              }
            } else {
              console.log('Stock page: Context does not match, ignoring');
            }
          } else {
            console.log('Stock page: No selected data found');
          }
        } catch (error) {
          console.error('Stock page: Error handling selected product:', error);
        } finally {
          isProcessing = false;
        }
      };

      checkForSelectedProduct();
    }, [products])
  );

  const renderProduct = ({ item }: { item: Product }) => {
    return (
      <View>
        {item.variants.map((variant) => (
          <View key={variant.id} style={[
            styles.productCard,
            highlightedProductId === variant.id && styles.productCardHighlighted
          ]}>
            <View style={styles.productInfo}>
              <ThemedText style={styles.productName}>{item.name}</ThemedText>
              {variant.sizeLabel && (
                <ThemedText style={styles.sizeLabel}>{variant.sizeLabel}</ThemedText>
              )}
              <ThemedText style={styles.price}>{formatXAF(variant.priceXaf)}</ThemedText>
            </View>
            
            <View style={styles.stockInfo}>
              <View style={[
                styles.stockBadge,
                variant.quantity === 0 && styles.stockBadgeOut,
                variant.quantity > 0 && variant.quantity < 3 && styles.stockBadgeLow
              ]}>
                <ThemedText style={[
                  styles.stockText,
                  variant.quantity === 0 && styles.stockTextOut,
                  variant.quantity > 0 && variant.quantity < 3 && styles.stockTextLow
                ]}>
                  {variant.quantity} units
                </ThemedText>
              </View>
              
              {canAdjustStock && (
                <TouchableOpacity
                  style={styles.adjustButton}
                  onPress={() => openAdjustmentForm(item)}
                >
                  <Ionicons name="create-outline" size={16} color="#3b82f6" />
                  <ThemedText style={styles.adjustButtonText}>Adjust</ThemedText>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}
      </View>
    );
  };

  const renderLowStockItem = ({ item }: { item: any }) => (
    <View style={styles.lowStockItem}>
      <View style={styles.lowStockInfo}>
        <ThemedText style={styles.lowStockName}>{item.name}</ThemedText>
        {item.sizeLabel && (
          <ThemedText style={styles.lowStockSize}>{item.sizeLabel}</ThemedText>
        )}
      </View>
      <View style={[
        styles.lowStockBadge,
        item.quantity === 0 && styles.lowStockBadgeOut
      ]}>
        <ThemedText style={[
          styles.lowStockCount,
          item.quantity === 0 && styles.lowStockCountOut
        ]}>
          {item.quantity}
        </ThemedText>
      </View>
    </View>
  );

  return (
    <Screen 
      title={`Stock - ${currentUser?.name || 'User'}`}
      rightHeaderAction={{
        icon: 'settings',
        onPress: showSettings
      }}
    >
      <View style={styles.container}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <TouchableOpacity 
            style={styles.searchBar}
            onPress={() => router.push('/search?context=stock')}
          >
            <Ionicons name="search" size={20} color="#9ca3af" />
            <ThemedText style={styles.searchPlaceholder}>Search products...</ThemedText>
          </TouchableOpacity>
        </View>
        {/* Stock Summary */}
        <View style={styles.summaryCard}>
          <ThemedText type="subtitle" style={styles.summaryTitle}>Stock Summary</ThemedText>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <ThemedText style={styles.summaryValue}>{stockSummary.totalProducts}</ThemedText>
              <ThemedText style={styles.summaryLabel}>Products</ThemedText>
            </View>
            <View style={styles.summaryItem}>
              <ThemedText style={styles.summaryValue}>{formatXAF(stockSummary.totalValue)}</ThemedText>
              <ThemedText style={styles.summaryLabel}>Total Value</ThemedText>
            </View>
            <View style={styles.summaryItem}>
              <ThemedText style={[styles.summaryValue, styles.summaryValueWarning]}>
                {stockSummary.lowStockCount}
              </ThemedText>
              <ThemedText style={styles.summaryLabel}>Low Stock</ThemedText>
            </View>
            <View style={styles.summaryItem}>
              <ThemedText style={[styles.summaryValue, styles.summaryValueDanger]}>
                {stockSummary.outOfStockCount}
              </ThemedText>
              <ThemedText style={styles.summaryLabel}>Out of Stock</ThemedText>
            </View>
          </View>
        </View>

        {/* Low Stock Alert */}
        {lowStockProducts.length > 0 && (
          <View style={styles.alertCard}>
            <View style={styles.alertHeader}>
              <Ionicons name="warning" size={20} color="#f59e0b" />
              <ThemedText style={styles.alertTitle}>Low Stock Alert</ThemedText>
            </View>
            <FlatList
              data={lowStockProducts}
              keyExtractor={(item) => item.id}
              renderItem={renderLowStockItem}
              showsVerticalScrollIndicator={false}
            />
          </View>
        )}

        {/* All Products */}
        <View style={styles.productsSection}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>All Products</ThemedText>
          {loading && products.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#3b82f6" />
              <ThemedText style={styles.loadingText}>Loading products...</ThemedText>
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={products}
              keyExtractor={(item) => item.id}
              renderItem={renderProduct}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.productsList}
              onEndReached={loadMore}
              onEndReachedThreshold={0.1}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={['#3b82f6']}
                  tintColor="#3b82f6"
                />
              }
              ListFooterComponent={() => (
                loadingMore ? (
                  <View style={styles.loadingMoreContainer}>
                    <ActivityIndicator size="small" color="#3b82f6" />
                    <ThemedText style={styles.loadingMoreText}>Loading more...</ThemedText>
                  </View>
                ) : null
              )}
            />
          )}
        </View>
      </View>

      <StockAdjustmentForm
        visible={showAdjustmentForm}
        product={selectedProduct}
        onClose={() => setShowAdjustmentForm(false)}
        onAdjust={handleAdjustStock}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
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
    marginHorizontal: 16,
  },
  searchPlaceholder: {
    color: '#9ca3af',
    fontSize: 16,
    fontFamily: 'Poppins_400Regular',
  },
  summaryCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  summaryTitle: {
    marginBottom: 16,
    textAlign: 'center',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  summaryItem: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
  },
  summaryValueWarning: {
    color: '#f59e0b',
  },
  summaryValueDanger: {
    color: '#ef4444',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  alertCard: {
    backgroundColor: '#fef3c7',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fbbf24',
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  alertTitle: {
    marginLeft: 8,
    fontWeight: '600',
    color: '#92400e',
  },
  lowStockItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#fde68a',
  },
  lowStockInfo: {
    flex: 1,
  },
  lowStockName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#92400e',
  },
  lowStockSize: {
    fontSize: 12,
    color: '#a16207',
    marginTop: 2,
  },
  lowStockBadge: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  lowStockBadgeOut: {
    backgroundColor: '#ef4444',
  },
  lowStockCount: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  lowStockCountOut: {
    color: 'white',
  },
  productsSection: {
    flex: 1,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  productsList: {
    paddingBottom: 24,
  },
  productCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productCardHighlighted: {
    borderWidth: 3,
    borderColor: '#3b82f6',
    backgroundColor: '#dbeafe',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  sizeLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  price: {
    fontSize: 14,
    fontWeight: '500',
    color: '#059669',
    marginTop: 4,
  },
  stockInfo: {
    alignItems: 'flex-end',
  },
  stockBadge: {
    backgroundColor: '#d1fae5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8,
  },
  stockBadgeLow: {
    backgroundColor: '#fef3c7',
  },
  stockBadgeOut: {
    backgroundColor: '#fee2e2',
  },
  stockText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#065f46',
  },
  stockTextLow: {
    color: '#92400e',
  },
  stockTextOut: {
    color: '#991b1b',
  },
  adjustButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
  },
  adjustButtonText: {
    marginLeft: 4,
    fontSize: 12,
    fontWeight: '500',
    color: '#3b82f6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  loadingMoreContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
  },
  loadingMoreText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#6b7280',
  },
});


