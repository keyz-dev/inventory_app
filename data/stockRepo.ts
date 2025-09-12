import { execute, query } from '@/lib/db';
import { UUID } from '@/types/domain';

export type StockAdjustment = {
  id: string;
  productId: string;
  delta: number; // positive for adding stock, negative for removing
  reason: string;
  createdAt: string;
};

export type StockAdjustmentWithProduct = StockAdjustment & {
  productName: string;
  sizeLabel: string | null;
};

export function recordStockAdjustment(
  productId: UUID,
  delta: number,
  reason: string
): void {
  console.log('recordStockAdjustment called with:', { productId, delta, reason });
  
  // Validate product exists
  const product = query<{ id: string }>(
    `SELECT id FROM products WHERE id = ? AND deletedAt IS NULL`,
    [productId]
  )[0];

  if (!product) {
    console.error('Product not found:', productId);
    throw new Error('Product not found');
  }

  // Check if adjustment would result in negative stock
  const currentStock = query<{ quantity: number }>(
    `SELECT quantity FROM products WHERE id = ?`,
    [productId]
  )[0];

  console.log('Current stock:', currentStock);

  if (currentStock.quantity + delta < 0) {
    console.error('Insufficient stock:', currentStock.quantity, '+', delta, '=', currentStock.quantity + delta);
    throw new Error('Insufficient stock for this adjustment');
  }

  // Record the adjustment
  const adjustmentId = `adj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  console.log('Recording adjustment:', adjustmentId);
  execute(
    `INSERT INTO stock_adjustments (id, productId, delta, reason, createdAt) VALUES (?, ?, ?, ?, datetime('now'))`,
    [adjustmentId, productId, delta, reason]
  );

  // Update product stock
  console.log('Updating product stock:', productId, 'delta:', delta);
  execute(
    `UPDATE products SET quantity = quantity + ?, updatedAt = datetime('now') WHERE id = ?`,
    [delta, productId]
  );
  
  // Verify the update
  const updatedStock = query<{ quantity: number }>(
    `SELECT quantity FROM products WHERE id = ?`,
    [productId]
  )[0];
  console.log('Updated stock:', updatedStock);
}

export function getStockAdjustments(
  productId?: UUID,
  limit: number = 50
): StockAdjustmentWithProduct[] {
  let whereClause = '';
  let params: any[] = [];

  if (productId) {
    whereClause = 'WHERE sa.productId = ?';
    params = [productId];
  }

  return query<StockAdjustmentWithProduct>(
    `SELECT 
      sa.id,
      sa.productId,
      sa.delta,
      sa.reason,
      sa.createdAt,
      p.name as productName,
      p.sizeLabel
    FROM stock_adjustments sa
    JOIN products p ON sa.productId = p.id
    ${whereClause}
    ORDER BY sa.createdAt DESC
    LIMIT ?`,
    [...params, limit]
  );
}

export function getLowStockProducts(threshold: number = 3): {
  id: string;
  name: string;
  sizeLabel: string | null;
  quantity: number;
  categoryId: string | null;
}[] {
  return query(
    `SELECT 
      p.id,
      p.name,
      p.sizeLabel,
      p.quantity,
      p.categoryId
    FROM products p
    WHERE p.quantity < ? 
      AND p.deletedAt IS NULL
    ORDER BY p.quantity ASC`,
    [threshold]
  );
}

export function getStockSummary(lowStockThreshold: number = 3): {
  totalProducts: number;
  totalValue: number;
  lowStockCount: number;
  outOfStockCount: number;
} {
  const summary = query<{
    totalProducts: number;
    totalValue: number;
    lowStockCount: number;
    outOfStockCount: number;
  }>(
    `SELECT 
      COUNT(DISTINCT CASE WHEN variantOfId IS NULL THEN id END) as totalProducts,
      COALESCE(SUM(quantity * priceXaf), 0) as totalValue,
      COUNT(CASE WHEN quantity < ? AND quantity > 0 THEN 1 END) as lowStockCount,
      COUNT(CASE WHEN quantity = 0 THEN 1 END) as outOfStockCount
    FROM products 
    WHERE deletedAt IS NULL`,
    [lowStockThreshold]
  )[0];

  return summary || {
    totalProducts: 0,
    totalValue: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
  };
}
