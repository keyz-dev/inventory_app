import { listProducts, listProductsLegacy, PaginatedResult, PaginationOptions } from '@/data/productsRepo';
import { Product } from '@/types/domain';
import { useCallback, useEffect, useRef, useState } from 'react';

export function useProducts(usePagination: boolean = false) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [group, setGroup] = useState<'all' | 'pharma' | 'cosmetics'>('all');
  const [search, setSearch] = useState<string>('');
  const [pagination, setPagination] = useState<{
    total: number;
    hasMore: boolean;
    nextOffset: number;
  }>({
    total: 0,
    hasMore: false,
    nextOffset: 0
  });
  const paginationRef = useRef(pagination);

  const loadProducts = useCallback(async (
    reset: boolean = true, 
    options: PaginationOptions = {}
  ) => {
    // Smart caching: Don't reload if we already have data and it's not a reset
    if (!reset && products.length > 0 && !usePagination) {
      return;
    }

    if (reset) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      if (usePagination) {
        const result: PaginatedResult<Product> = listProducts(group, search, {
          limit: 50,
          offset: reset ? 0 : paginationRef.current.nextOffset,
          ...options
        });

        if (reset) {
          setProducts(result.data);
        } else {
          setProducts(prev => [...prev, ...result.data]);
        }

        const newPagination = {
          total: result.total,
          hasMore: result.hasMore,
          nextOffset: result.nextOffset
        };
        setPagination(newPagination);
        paginationRef.current = newPagination;
      } else {
        // Legacy mode for backward compatibility
        const data = listProductsLegacy(group, search);
        setProducts(data);
        const newPagination = {
          total: data.length,
          hasMore: false,
          nextOffset: 0
        };
        setPagination(newPagination);
        paginationRef.current = newPagination;
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [group, search, usePagination, products.length]);

  const reload = useCallback(() => {
    loadProducts(true);
  }, [loadProducts]);

  const loadMore = useCallback(() => {
    if (usePagination && pagination.hasMore && !loadingMore) {
      loadProducts(false);
    }
  }, [usePagination, pagination.hasMore, loadingMore, loadProducts]);

  const changeGroup = useCallback((newGroup: 'all' | 'pharma' | 'cosmetics') => {
    setGroup(newGroup);
  }, []);

  const changeSearch = useCallback((newSearch: string) => {
    setSearch(newSearch);
  }, []);

  // Update ref when pagination changes
  useEffect(() => {
    paginationRef.current = pagination;
  }, [pagination]);

  useEffect(() => {
    loadProducts(true);
  }, [group, search]);

  // Function to find and load a specific product
  const findAndLoadProduct = useCallback(async (productId: string) => {
    // First, check if the product is already in the current list
    const existingProduct = products.find(p => p.id === productId);
    if (existingProduct) {
      return { product: existingProduct, index: products.indexOf(existingProduct) };
    }

    // If not found, we need to load it
    // For now, we'll load all products to find it (not ideal for performance)
    // In a real-world scenario, you'd want a specific API endpoint
    try {
      const allProducts = listProductsLegacy('all', '');
      const foundProduct = allProducts.find(p => p.id === productId);
      
      if (foundProduct) {
        // Add the product to the current list if it's not there
        setProducts(prev => {
          const exists = prev.find(p => p.id === productId);
          if (!exists) {
            return [...prev, foundProduct];
          }
          return prev;
        });
        
        return { product: foundProduct, index: products.length };
      }
      
      return null;
    } catch (error) {
      console.error('Error finding product:', error);
      return null;
    }
  }, [products]);

  // Function to update a specific product's quantity without full reload
  const updateProductQuantity = useCallback((productId: string, quantityChange: number) => {
    setProducts(prevProducts => 
      prevProducts.map(product => {
        // Check if this is the product we want to update
        const updatedVariants = product.variants.map(variant => {
          if (variant.id === productId) {
            const newQuantity = Math.max(0, variant.quantity + quantityChange);
            return { ...variant, quantity: newQuantity };
          }
          return variant;
        });
        
        // If any variant was updated, return the updated product
        if (updatedVariants.some((variant, index) => variant.quantity !== product.variants[index].quantity)) {
          return { ...product, variants: updatedVariants };
        }
        
        return product;
      })
    );
  }, []);

  return { 
    products, 
    loading, 
    loadingMore,
    reload, 
    loadMore,
    group, 
    setGroup: changeGroup, 
    search, 
    setSearch: changeSearch,
    pagination,
    hasMore: pagination.hasMore,
    findAndLoadProduct,
    updateProductQuantity
  };
}


