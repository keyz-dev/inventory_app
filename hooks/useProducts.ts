import { listProducts } from '@/data/productsRepo';
import { Product } from '@/types/domain';
import { useEffect, useState } from 'react';

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [group, setGroup] = useState<'all' | 'pharma' | 'cosmetics'>('all');
  const [search, setSearch] = useState<string>('');

  const reload = () => {
    setLoading(true);
    try {
      const data = listProducts(group, search);
      setProducts(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, []);

  return { products, loading, reload, group, setGroup, search, setSearch };
}


