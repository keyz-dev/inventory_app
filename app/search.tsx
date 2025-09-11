import { Screen } from '@/components/Screen';
import { StockAdjustmentForm } from '@/components/stock/StockAdjustmentForm';
import { ThemedText } from '@/components/ThemedText';
import { formatXAF } from '@/constants/Currency';
import { fuzzySearchProducts, getProductById, SearchResult } from '@/data/productsRepo';
import { recordStockAdjustment } from '@/data/stockRepo';
import { Product } from '@/types/domain';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

const HISTORY_KEY = 'search_history_v1';

export default function SearchScreen() {
  const router = useRouter();
  const { context } = useLocalSearchParams<{ context?: string }>();
  const [query, setQuery] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [showStockAdjustment, setShowStockAdjustment] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(HISTORY_KEY);
        setHistory(raw ? JSON.parse(raw) : []);
      } catch {}
    })();
  }, []);

  const suggestions = useMemo(() => {
    if (!query.trim()) return [] as SearchResult[];
    return fuzzySearchProducts(query.trim(), 25);
  }, [query]);

  const hasSubstringMatches = useMemo(() => {
    if (!query.trim()) return true;
    
    // Check if any suggestion contains the search term as a substring
    return suggestions.some(suggestion => {
      const productText = suggestion.name.toLowerCase();
      const searchTerm = query.trim().toLowerCase();
      return productText.includes(searchTerm);
    });
  }, [query, suggestions]);

  const saveHistory = async (q: string) => {
    const cleaned = q.trim();
    if (!cleaned) return;
    const next = [cleaned, ...history.filter((h) => h.toLowerCase() !== cleaned.toLowerCase())].slice(0, 10);
    setHistory(next);
    try { await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(next)); } catch {}
  };

  const onSubmit = async () => {
    if (!query.trim()) return;
    await saveHistory(query);
  };

  const handleProductSelect = async (item: any) => {
    await saveHistory(item.name);
    
    // Get the full product details
    const [productId] = item.key.split(':');
    const product = getProductById(productId);
    
    if (!product) {
      Alert.alert('Error', 'Product not found');
      return;
    }

    // Always open stock adjustment form
    setSelectedProduct(product);
    setShowStockAdjustment(true);
  };

  const handleStockAdjustment = (productId: string, delta: number, reason: string) => {
    try {
      recordStockAdjustment(productId, delta, reason);
      Alert.alert('Success', 'Stock adjusted successfully');
      setShowStockAdjustment(false);
      setSelectedProduct(null);
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to adjust stock');
    }
  };

  const renderItem = ({ item }: { item: SearchResult }) => (
    <TouchableOpacity style={styles.row} onPress={() => handleProductSelect(item)}>
      <View style={{ flex: 1 }}>
        <View style={styles.productHeader}>
          <ThemedText style={styles.name}>{item.name}</ThemedText>
          {item.matchType === 'similar' && (
            <View style={styles.typoIndicator}>
              <Ionicons name="checkmark-circle" size={16} color="#10b981" />
              <ThemedText style={styles.typoText}>Did you mean this?</ThemedText>
            </View>
          )}
        </View>
        <ThemedText style={styles.meta}>
          {item.variant?.sizeLabel ? `${item.variant.sizeLabel} • ` : ''}{formatXAF(item.variant?.priceXaf ?? 0)} • Qty {item.variant?.quantity ?? 0}
        </ThemedText>
      </View>
      <View style={styles.actionIcon}>
        <Ionicons 
          name="settings" 
          size={20} 
          color="#6b7280" 
        />
      </View>
    </TouchableOpacity>
  );

  return (
    <Screen>
      <View style={styles.inputWrap}>
        <Ionicons name="search" size={20} color="#9ca3af" />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search products"
          style={styles.input}
          autoFocus
          returnKeyType="search"
          onSubmitEditing={onSubmit}
        />
        <TouchableOpacity>
          <Ionicons name="mic" size={20} color="#9ca3af" />
        </TouchableOpacity>
      </View>

      {query.trim().length === 0 ? (
        <>
          {history.length > 0 ? (
            <View style={styles.historyWrap}>
              <View style={styles.historyHeader}>
                <ThemedText type="subtitle">Recent</ThemedText>
                <TouchableOpacity onPress={async () => { setHistory([]); await AsyncStorage.removeItem(HISTORY_KEY); }}>
                  <ThemedText>Clear</ThemedText>
                </TouchableOpacity>
              </View>
              {history.map((h) => (
                <TouchableOpacity key={h} style={styles.historyItem} onPress={() => setQuery(h)}>
                  <Ionicons name="time" size={16} color="#6b7280" />
                  <ThemedText style={{ marginLeft: 8 }}>{h}</ThemedText>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.empty}>
              <View style={styles.emptyIconContainer}>
                <Ionicons name="search" size={64} color="#d1d5db" />
              </View>
              <ThemedText style={styles.emptyTitle}>Search Products</ThemedText>
              <ThemedText style={styles.emptySubtitle}>
                {context === 'sell' 
                  ? 'Find products to sell quickly' 
                  : 'Search to adjust stock or view product details'
                }
              </ThemedText>
              <View style={styles.emptyFeatures}>
                <View style={styles.featureItem}>
                  <Ionicons name="flash" size={16} color="#10b981" />
                  <ThemedText style={styles.featureText}>Fast fuzzy search</ThemedText>
                </View>
                <View style={styles.featureItem}>
                  <Ionicons name="time" size={16} color="#10b981" />
                  <ThemedText style={styles.featureText}>Search history</ThemedText>
                </View>
                <View style={styles.featureItem}>
                  <Ionicons name="settings" size={16} color="#10b981" />
                  <ThemedText style={styles.featureText}>Quick stock adjustment</ThemedText>
                </View>
              </View>
            </View>
          )}
        </>
      ) : (
        <View style={styles.resultsContainer}>
          {!hasSubstringMatches && query.trim().length > 0 && (
            <View style={styles.noMatchMessage}>
              <Ionicons name="search" size={24} color="#f59e0b" />
              <ThemedText style={styles.noMatchText}>
                No products found containing "{query.trim()}"
              </ThemedText>
              <ThemedText style={styles.suggestionsText}>
                Here are some suggestions:
              </ThemedText>
            </View>
          )}
          
          {suggestions.length > 0 ? (
            <FlatList 
              data={suggestions} 
              keyExtractor={(it) => it.key} 
              renderItem={renderItem}
              style={styles.resultsList}
            />
          ) : (
            <View style={styles.emptyResults}>
              <Ionicons name="search" size={48} color="#d1d5db" />
              <ThemedText style={styles.emptyResultsText}>
                No relevant products found
              </ThemedText>
              <ThemedText style={styles.emptyResultsSubtext}>
                Try searching for: "Dettol", "Santex", "Soap", "Lotion"
              </ThemedText>
            </View>
          )}
        </View>
      )}

      <StockAdjustmentForm
        visible={showStockAdjustment}
        product={selectedProduct}
        onClose={() => {
          setShowStockAdjustment(false);
          setSelectedProduct(null);
        }}
        onAdjust={handleStockAdjustment}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    backgroundColor: 'white',
  },
  input: {
    flex: 1,
    marginHorizontal: 8,
    fontSize: 16,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 48,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    backgroundColor: 'white',
  },
  name: { 
    fontSize: 16, 
    fontWeight: '500',
    color: '#111827',
  },
  meta: { 
    fontSize: 14, 
    color: '#6b7280',
    marginTop: 2,
  },
  actionIcon: {
    marginLeft: 12,
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  resultsList: {
    backgroundColor: 'white',
    marginTop: 8,
    borderRadius: 12,
    marginHorizontal: 16,
  },
  historyWrap: { 
    paddingTop: 8,
    paddingHorizontal: 16,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  historyItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'white',
    borderRadius: 8,
    marginBottom: 4,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingTop: 64,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f9fafb',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  emptyFeatures: {
    width: '100%',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: 'white',
    borderRadius: 8,
    marginBottom: 8,
  },
  featureText: {
    marginLeft: 12,
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  resultsContainer: {
    flex: 1,
  },
  noMatchMessage: {
    backgroundColor: '#fef3c7',
    borderColor: '#f59e0b',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    margin: 16,
    alignItems: 'center',
  },
  noMatchText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#92400e',
    marginTop: 8,
    textAlign: 'center',
  },
  suggestionsText: {
    fontSize: 14,
    color: '#a16207',
    marginTop: 4,
    textAlign: 'center',
  },
  productHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  typoIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d1fae5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typoText: {
    fontSize: 12,
    color: '#065f46',
    marginLeft: 4,
    fontWeight: '500',
  },
  emptyResults: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  emptyResultsText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 16,
    textAlign: 'center',
  },
  emptyResultsSubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
    textAlign: 'center',
  },
});


