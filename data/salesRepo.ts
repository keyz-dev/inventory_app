import { execute, query } from '@/lib/db';
import { UUID } from '@/types/domain';

export function recordSale(productId: UUID, quantity: number = 1): void {
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

  // Record the sale
  const saleId = `sale_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  execute(
    `INSERT INTO sales (id, total, paymentMethod, createdAt) VALUES (?, 0, 'cash', datetime('now'))`,
    [saleId]
  );

  // Record sale item
  const itemId = `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const product = query<{ priceXaf: number }>(
    `SELECT priceXaf FROM products WHERE id = ?`,
    [productId]
  )[0];

  execute(
    `INSERT INTO sale_items (id, saleId, productId, quantity, unitPrice) VALUES (?, ?, ?, ?, ?)`,
    [itemId, saleId, productId, quantity, product.priceXaf]
  );

  // Update sale total
  execute(
    `UPDATE sales SET total = (SELECT SUM(quantity * unitPrice) FROM sale_items WHERE saleId = ?) WHERE id = ?`,
    [saleId, saleId]
  );
}
