import { execute, query } from '@/lib/db';
import { UUID } from '@/types/domain';

export function recordSale(productId: UUID, quantity: number = 1): string {
  // Get current stock
  const current = query<{ quantity: number }>(
    `SELECT quantity FROM products WHERE id = ?`,
    [productId]
  )[0];

  if (!current) {
    throw new Error('Product not found');
  }

  if (current.quantity < quantity) {
    throw new Error('Insufficient stock');
  }

  // Update stock
  execute(
    `UPDATE products SET quantity = quantity - ?, updatedAt = datetime('now') WHERE id = ?`,
    [quantity, productId]
  );

  // Get product price
  const product = query<{ priceXaf: number }>(
    `SELECT priceXaf FROM products WHERE id = ?`,
    [productId]
  )[0];

  if (!product) {
    throw new Error('Product not found');
  }

  const totalXaf = product.priceXaf * quantity;

  // Record the sale with new schema
  const saleId = `sale_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  execute(
    `INSERT INTO sales (id, productId, quantity, priceXaf, totalXaf, createdAt, updatedAt, deletedAt, version) 
     VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'), NULL, 1)`,
    [saleId, productId, quantity, product.priceXaf, totalXaf]
  );
  
  return saleId;
}
