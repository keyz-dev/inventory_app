import { Screen } from '@/components/Screen';
import { StockAdjustmentForm } from '@/components/stock/StockAdjustmentForm';
import { ThemedText } from '@/components/ThemedText';
import { formatXAF } from '@/constants/Currency';
import { getLowStockProducts, getStockSummary, recordStockAdjustment } from '@/data/stockRepo';
import { useProducts } from '@/hooks/useProducts';
import { Product } from '@/types/domain';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Alert, FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';

export default function StockScreen() {
  const { products, reload } = useProducts();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showAdjustmentForm, setShowAdjustmentForm] = useState(false);
  const [stockSummary, setStockSummary] = useState({
    totalProducts: 0,
    totalValue: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
  });
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);

  useEffect(() => {
    loadStockData();
  }, []);

  const loadStockData = () => {
    try {
      const summary = getStockSummary();
      setStockSummary(summary);
      
      const lowStock = getLowStockProducts(5);
      setLowStockProducts(lowStock);
    } catch (error) {
      console.error('Error loading stock data:', error);
    }
  };

  const handleAdjustStock = (productId: string, delta: number, reason: string) => {
    try {
      recordStockAdjustment(productId, delta, reason);
      reload();
      loadStockData();
      Alert.alert('Success', 'Stock adjusted successfully');
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to adjust stock');
    }
  };

  const openAdjustmentForm = (product: Product) => {
    setSelectedProduct(product);
    setShowAdjustmentForm(true);
  };

  const renderProduct = ({ item }: { item: Product }) => {
    return item.variants.map((variant) => (
      <View key={variant.id} style={styles.productCard}>
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
            variant.quantity > 0 && variant.quantity <= 5 && styles.stockBadgeLow
          ]}>
            <ThemedText style={[
              styles.stockText,
              variant.quantity === 0 && styles.stockTextOut,
              variant.quantity > 0 && variant.quantity <= 5 && styles.stockTextLow
            ]}>
              {variant.quantity} units
            </ThemedText>
          </View>
          
          <TouchableOpacity
            style={styles.adjustButton}
            onPress={() => openAdjustmentForm(item)}
          >
            <Ionicons name="create-outline" size={16} color="#3b82f6" />
            <ThemedText style={styles.adjustButtonText}>Adjust</ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    ));
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
    <Screen title="Stock Management">
      <View style={styles.container}>
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
          <FlatList
            data={products}
            keyExtractor={(item) => item.id}
            renderItem={renderProduct}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.productsList}
          />
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
    padding: 16,
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
});


