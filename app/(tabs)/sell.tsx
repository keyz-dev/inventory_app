import { Screen } from '@/components/Screen';
import { CategoryButtons } from '@/components/sell/CategoryButtons';
import { ProductCard } from '@/components/sell/ProductCard';
import { EnhancedButton } from '@/components/ui/EnhancedButton';
import { recordSale } from '@/data/salesRepo';
import { useProducts } from '@/hooks/useProducts';
import React, { useState } from 'react';
import { Alert, FlatList, StyleSheet, View } from 'react-native';

export default function SellScreen() {
  const { products, reload } = useProducts();
  const [selectedCategory, setSelectedCategory] = useState('all');

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
    } catch (error) {
      Alert.alert('Error', 'Could not record sale. Please try again.');
    }
  };

  const renderProduct = ({ item }: any) => {
    return item.variants.map((variant: any) => (
      <ProductCard
        key={variant.id}
        name={item.name}
        variant={variant}
        onSell={() => handleSell(variant.id)}
      />
    ));
  };

  return (
    <Screen title="Sell">
      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <EnhancedButton
          title="Search Products"
          onPress={() => {/* Navigate to search */}}
          variant="outline"
          size="sm"
          icon="search"
          style={styles.quickActionButton}
        />
        <EnhancedButton
          title="View Cart"
          onPress={() => {/* Navigate to cart */}}
          variant="outline"
          size="sm"
          icon="cart"
          style={styles.quickActionButton}
        />
      </View>

      <CategoryButtons
        selected={selectedCategory}
        onSelect={setSelectedCategory}
      />
      
      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => item.id}
        renderItem={renderProduct}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  quickActionButton: {
    flex: 1,
  },
  list: {
    paddingBottom: 24,
  },
});


