import { ThemedText } from '@/components/ThemedText';
import { formatXAF } from '@/constants/Currency';
import { Product } from '@/types/domain';
import { Ionicons } from '@expo/vector-icons';
import React, { forwardRef, useCallback } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';

type Props = {
  data: Product[];
  onEdit?: (product: Product) => void;
  onDelete?: (product: Product) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  loadingMore?: boolean;
  total?: number;
  highlightedProductId?: string | null;
  loading?: boolean;
  emptyMessage?: string;
};

export const ProductList = forwardRef<FlatList, Props>(function ProductList({ 
  data, 
  onEdit, 
  onDelete, 
  onLoadMore, 
  hasMore = false, 
  loadingMore = false,
  total = 0,
  highlightedProductId = null,
  loading = false,
  emptyMessage = "No products found"
}, ref) {
  
  const renderItem = useCallback(({ item }: { item: Product }) => (
    <View style={[
      styles.card,
      highlightedProductId === item.id && styles.cardHighlighted
    ]}>
      <View style={styles.cardHeader}>
        <ThemedText type="subtitle" style={styles.title}>{item.name}</ThemedText>
        <View style={styles.actions}>
          {onEdit && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => onEdit(item)}
            >
              <Ionicons name="create-outline" size={16} color="#3b82f6" />
            </TouchableOpacity>
          )}
          {onDelete && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => onDelete(item)}
            >
              <Ionicons name="trash-outline" size={16} color="#ef4444" />
            </TouchableOpacity>
          )}
        </View>
      </View>
      {item.variants.map((v) => (
        <View key={v.id} style={styles.variantRow}>
          <ThemedText style={styles.variantText}>
            {v.sizeLabel ? `${v.sizeLabel}` : 'Default'}
          </ThemedText>
          <ThemedText style={styles.variantText}>{formatXAF(v.priceXaf)}</ThemedText>
          <ThemedText style={styles.variantText}>Qty: {v.quantity}</ThemedText>
        </View>
      ))}
    </View>
  ), [onEdit, onDelete, highlightedProductId]);

  const renderFooter = useCallback(() => {
    if (!loadingMore) return null;
    
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#3b82f6" />
        <ThemedText style={styles.loadingText}>Loading more products...</ThemedText>
      </View>
    );
  }, [loadingMore]);

  const renderHeader = useCallback(() => {
    if (total === 0) return null;
    
    return (
      <View style={styles.header}>
        <ThemedText style={styles.headerText}>
          Showing {data.length} of {total} products
        </ThemedText>
      </View>
    );
  }, [data.length, total]);

  const renderEmpty = useCallback(() => {
    if (loading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <ThemedText style={styles.emptyText}>Loading products...</ThemedText>
        </View>
      );
    }
    
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="cube-outline" size={64} color="#9ca3af" />
        <ThemedText style={styles.emptyText}>{emptyMessage}</ThemedText>
      </View>
    );
  }, [loading, emptyMessage]);

  const keyExtractor = useCallback((item: Product) => item.id, []);

  const getItemLayout = useCallback((data: any, index: number) => ({
    length: 120, // Approximate item height
    offset: 120 * index,
    index,
  }), []);

  return (
    <FlatList
      ref={ref}
      data={data}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      contentContainerStyle={styles.list}
      ListHeaderComponent={renderHeader}
      ListFooterComponent={renderFooter}
      ListEmptyComponent={renderEmpty}
      onEndReached={onLoadMore}
      onEndReachedThreshold={0.5}
      getItemLayout={getItemLayout}
      removeClippedSubviews={true}
      maxToRenderPerBatch={10}
      updateCellsBatchingPeriod={50}
      initialNumToRender={20}
      windowSize={10}
    />
  );
});

const styles = StyleSheet.create({
  list: {
    paddingBottom: 24,
    gap: 12,
  },
  card: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 4,
    marginBottom: 12,
    backgroundColor: 'white',
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    textAlign: 'left',
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#f8fafc',
  },
  variantRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  variantText: {
    fontSize: 16,
  },
  header: {
    padding: 16,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  footerLoader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
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
});


