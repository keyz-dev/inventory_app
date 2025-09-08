import { Screen } from '@/components/Screen';
import { ProductList } from '@/components/products/ProductList';
import { ProductsFilters } from '@/components/products/ProductsFilters';
import { useProducts } from '@/hooks/useProducts';
import React from 'react';
import { StyleSheet } from 'react-native';

export default function ProductsScreen() {
  const { products, loading, group, setGroup, search, setSearch, reload } = useProducts();
  return (
    <Screen title="Products">
      <ProductsFilters
        search={search}
        setSearch={setSearch}
        group={group}
        setGroup={setGroup}
        onApply={reload}
      />
      {loading ? null : <ProductList data={products} />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
});


