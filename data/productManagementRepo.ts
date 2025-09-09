import { execute, query } from '@/lib/db';
import { Product, ProductRow, UUID } from '@/types/domain';

export type CreateProductData = {
  name: string;
  categoryId: string | null;
  variants: Array<{
    sizeLabel: string | null;
    priceXaf: number;
    quantity: number;
  }>;
};

export type UpdateProductData = {
  name?: string;
  categoryId?: string | null;
  variants?: Array<{
    id?: string; // for existing variants
    sizeLabel: string | null;
    priceXaf: number;
    quantity: number;
  }>;
};

export function createProduct(data: CreateProductData): Product {
  const productId = `prod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // If only one variant with no size label, create as single product
  if (data.variants.length === 1 && !data.variants[0].sizeLabel) {
    const variant = data.variants[0];
    execute(
      `INSERT INTO products (id, name, priceXaf, quantity, sizeLabel, variantOfId, categoryId, updatedAt, deletedAt) 
       VALUES (?, ?, ?, ?, NULL, NULL, ?, datetime('now'), NULL)`,
      [productId, data.name, variant.priceXaf, variant.quantity, data.categoryId]
    );
  } else {
    // Create parent product
    execute(
      `INSERT INTO products (id, name, priceXaf, quantity, sizeLabel, variantOfId, categoryId, updatedAt, deletedAt) 
       VALUES (?, ?, NULL, 0, NULL, NULL, ?, datetime('now'), NULL)`,
      [productId, data.name, data.categoryId]
    );

    // Create variant products
    for (const variant of data.variants) {
      const variantId = `prod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      execute(
        `INSERT INTO products (id, name, priceXaf, quantity, sizeLabel, variantOfId, categoryId, updatedAt, deletedAt) 
         VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), NULL)`,
        [variantId, data.name, variant.priceXaf, variant.quantity, variant.sizeLabel, productId, data.categoryId]
      );
    }
  }

  // Return the created product
  const createdProduct = getProductById(productId);
  if (!createdProduct) {
    throw new Error('Failed to create product');
  }
  return createdProduct;
}

export function updateProduct(productId: UUID, data: UpdateProductData): Product {
  // Get existing product
  const existingProduct = getProductById(productId);
  if (!existingProduct) {
    throw new Error('Product not found');
  }

  // Update parent product name and category
  if (data.name !== undefined || data.categoryId !== undefined) {
    execute(
      `UPDATE products SET 
        name = COALESCE(?, name),
        categoryId = COALESCE(?, categoryId),
        updatedAt = datetime('now')
       WHERE id = ?`,
      [data.name, data.categoryId, productId]
    );
  }

  // Update variants if provided
  if (data.variants) {
    // Delete existing variants
    execute(`DELETE FROM products WHERE variantOfId = ?`, [productId]);

    // Create new variants
    for (const variant of data.variants) {
      const variantId = variant.id || `prod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      execute(
        `INSERT INTO products (id, name, priceXaf, quantity, sizeLabel, variantOfId, categoryId, updatedAt, deletedAt) 
         VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), NULL)`,
        [variantId, data.name || existingProduct.name, variant.priceXaf, variant.quantity, variant.sizeLabel, productId, data.categoryId || existingProduct.categoryId]
      );
    }
  }

  // Return updated product
  const updatedProduct = getProductById(productId);
  if (!updatedProduct) {
    throw new Error('Failed to update product');
  }
  return updatedProduct;
}

export function deleteProduct(productId: UUID): void {
  // Soft delete - mark as deleted
  execute(
    `UPDATE products SET deletedAt = datetime('now'), updatedAt = datetime('now') WHERE id = ? OR variantOfId = ?`,
    [productId, productId]
  );
}

export function getProductById(productId: UUID): Product | null {
  const parent = query<ProductRow>(`SELECT * FROM products WHERE id = ?`, [productId])[0];
  if (!parent) return null;
  
  const rows = query<ProductRow>(`SELECT * FROM products WHERE id = ? OR variantOfId = ?`, [productId, productId]);
  return mapRowsToProducts(rows)[0] || null;
}

// Helper function to map database rows to Product objects
function mapRowsToProducts(rows: ProductRow[]): Product[] {
  const parents: Record<string, Product> = {};
  const childrenByParent: Record<string, any[]> = {};

  for (const r of rows) {
    if (r.variantOfId) {
      const variant = {
        id: r.id,
        sizeLabel: r.sizeLabel,
        priceXaf: Number(r.priceXaf ?? 0),
        quantity: Number(r.quantity ?? 0),
        updatedAt: r.updatedAt,
      };
      const pid = r.variantOfId;
      if (!childrenByParent[pid]) childrenByParent[pid] = [];
      childrenByParent[pid].push(variant);
    } else {
      parents[r.id] = {
        id: r.id,
        name: r.name,
        categoryId: r.categoryId,
        updatedAt: r.updatedAt,
        variants: [],
      };
      // For standalone (no size) rows, create a synthetic single variant
      if (r.sizeLabel == null) {
        parents[r.id].variants = [
          {
            id: r.id,
            sizeLabel: null,
            priceXaf: Number(r.priceXaf ?? 0),
            quantity: Number(r.quantity ?? 0),
            updatedAt: r.updatedAt,
          },
        ];
      }
    }
  }

  // Attach children to parents
  for (const pid of Object.keys(childrenByParent)) {
    if (parents[pid]) {
      parents[pid].variants = childrenByParent[pid].sort((a, b) => {
        const aL = a.sizeLabel ?? '';
        const bL = b.sizeLabel ?? '';
        return aL.localeCompare(bL);
      });
    }
  }

  return Object.values(parents).sort((a, b) => a.name.localeCompare(b.name));
}

// Bulk import functions
export type ImportProductData = {
  name: string;
  category: string;
  sizeLabel?: string;
  priceXaf: number;
  quantity: number;
};

export function bulkImportProducts(products: ImportProductData[]): {
  success: number;
  errors: Array<{ row: number; error: string; data: ImportProductData }>;
} {
  const errors: Array<{ row: number; error: string; data: ImportProductData }> = [];
  let success = 0;

  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    try {
      // Validate required fields
      if (!product.name || !product.priceXaf || product.quantity < 0) {
        throw new Error('Missing required fields or invalid data');
      }

      // Find or create category
      let categoryId: string | null = null;
      if (product.category) {
        const existingCategory = query<{ id: string }>(
          `SELECT id FROM categories WHERE name = ?`,
          [product.category]
        )[0];
        
        if (existingCategory) {
          categoryId = existingCategory.id;
        } else {
          // Create new category
          categoryId = `cat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          execute(
            `INSERT INTO categories (id, name, parentId) VALUES (?, ?, NULL)`,
            [categoryId, product.category]
          );
        }
      }

      // Create product
      createProduct({
        name: product.name,
        categoryId,
        variants: [{
          sizeLabel: product.sizeLabel || null,
          priceXaf: product.priceXaf,
          quantity: product.quantity,
        }],
      });

      success++;
    } catch (error) {
      errors.push({
        row: i + 1,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: product,
      });
    }
  }

  return { success, errors };
}
