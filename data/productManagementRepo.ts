import { execute, query } from '@/lib/db';
import { Product, ProductRow, UUID } from '@/types/domain';

// Helper function to check for duplicate products
function checkForDuplicateProduct(name: string, categoryId: string, sizeLabel: string | null): void {
  const existingProduct = query<{ id: string; name: string; sizeLabel: string | null }>(
    `SELECT id, name, sizeLabel FROM products 
     WHERE LOWER(name) = LOWER(?) AND categoryId = ? AND sizeLabel = ? AND deletedAt IS NULL`,
    [name, categoryId, sizeLabel]
  )[0];

  if (existingProduct) {
    const sizeText = existingProduct.sizeLabel ? ` (${existingProduct.sizeLabel})` : '';
    throw new Error(`Product "${existingProduct.name}${sizeText}" already exists in this category`);
  }
}

export type CreateProductData = {
  name: string;
  categoryId: string | null;
  variants: {
    sizeLabel: string | null;
    priceXaf: number;
    quantity: number;
  }[];
};

export type UpdateProductData = {
  name?: string;
  categoryId?: string | null;
  variants?: {
    id?: string; // for existing variants
    sizeLabel: string | null;
    priceXaf: number;
    quantity: number;
  }[];
};

export function createProduct(data: CreateProductData): Product {
  // Validate required fields
  if (!data.name?.trim()) {
    throw new Error('Product name is required');
  }
  if (!data.categoryId) {
    throw new Error('Product category is required');
  }
  if (!data.variants || data.variants.length === 0) {
    throw new Error('At least one product variant is required');
  }

  // Check for duplicates before creating
  for (const variant of data.variants) {
    checkForDuplicateProduct(data.name, data.categoryId, variant.sizeLabel || null);
  }

  // Generate deterministic ID based on product data for consistent sync
  const productKey = `${data.name}|${data.categoryId}|${data.variants.map(v => v.sizeLabel || 'default').join('|')}`;
  const productId = `prod_${Date.now()}_${productKey.replace(/[^a-zA-Z0-9]/g, '').substring(0, 9)}`;
  
  // If only one variant with no size label, create as single product
  if (data.variants.length === 1 && !data.variants[0].sizeLabel) {
    const variant = data.variants[0];
    execute(
      `INSERT INTO products (id, name, priceXaf, quantity, sizeLabel, variantOfId, categoryId, createdAt, updatedAt, deletedAt, version) 
       VALUES (?, ?, ?, ?, NULL, NULL, ?, datetime('now'), datetime('now'), NULL, 1)`,
      [productId, data.name, variant.priceXaf, variant.quantity, data.categoryId]
    );
  } else {
    // Create parent product
    execute(
      `INSERT INTO products (id, name, priceXaf, quantity, sizeLabel, variantOfId, categoryId, createdAt, updatedAt, deletedAt, version) 
       VALUES (?, ?, NULL, 0, NULL, NULL, ?, datetime('now'), datetime('now'), NULL, 1)`,
      [productId, data.name, data.categoryId]
    );

    // Create variant products
    for (const variant of data.variants) {
      const variantKey = `${data.name}|${variant.sizeLabel || 'default'}|${variant.priceXaf}`;
      const variantId = `prod_${Date.now()}_${variantKey.replace(/[^a-zA-Z0-9]/g, '').substring(0, 9)}`;
      execute(
        `INSERT INTO products (id, name, priceXaf, quantity, sizeLabel, variantOfId, categoryId, createdAt, updatedAt, deletedAt, version) 
         VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), NULL, 1)`,
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
      const variantKey = `${data.name}|${variant.sizeLabel || 'default'}|${variant.priceXaf}`;
      const variantId = variant.id || `prod_${Date.now()}_${variantKey.replace(/[^a-zA-Z0-9]/g, '').substring(0, 9)}`;
      execute(
        `INSERT INTO products (id, name, priceXaf, quantity, sizeLabel, variantOfId, categoryId, createdAt, updatedAt, deletedAt, version) 
         VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), NULL, 1)`,
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
  parentCategory: string;
  subcategory: string;
  sizeLabel?: string;
  priceXaf: number;
  quantity: number;
};

export function bulkImportProducts(products: ImportProductData[]): {
  success: number;
  errors: { row: number; error: string; data: ImportProductData }[];
} {
  const errors: { row: number; error: string; data: ImportProductData }[] = [];
  let success = 0;

  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    try {
      // Validate required fields
      if (!product.name?.trim()) {
        throw new Error('Product name is required');
      }
      if (!product.parentCategory?.trim()) {
        throw new Error('Parent category is required');
      }
      if (!product.priceXaf || product.priceXaf <= 0) {
        throw new Error('Valid price is required');
      }
      if (product.quantity < 0) {
        throw new Error('Quantity cannot be negative');
      }

      // Find or create parent category first
      let parentCategoryId: string | null = null;
      if (product.parentCategory) {
        const existingParentCategory = query<{ id: string }>(
          `SELECT id FROM categories WHERE LOWER(name) = LOWER(?) AND parentId IS NULL`,
          [product.parentCategory]
        )[0];
        
        if (existingParentCategory) {
          parentCategoryId = existingParentCategory.id;
        } else {
          // Create new parent category
          parentCategoryId = `cat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          execute(
            `INSERT INTO categories (id, name, parentId, createdAt, updatedAt, version) VALUES (?, ?, NULL, datetime('now'), datetime('now'), 1)`,
            [parentCategoryId, product.parentCategory]
          );
        }
      }

      // Find or create subcategory
      let categoryId: string | null = null;
      if (product.subcategory) {
        const existingSubcategory = query<{ id: string }>(
          `SELECT id FROM categories WHERE LOWER(name) = LOWER(?) AND parentId = ?`,
          [product.subcategory, parentCategoryId]
        )[0];
        
        if (existingSubcategory) {
          categoryId = existingSubcategory.id;
        } else {
          // Create new subcategory
          categoryId = `cat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          execute(
            `INSERT INTO categories (id, name, parentId, createdAt, updatedAt, version) VALUES (?, ?, ?, datetime('now'), datetime('now'), 1)`,
            [categoryId, product.subcategory, parentCategoryId]
          );
        }
      }

      // Check for duplicate before creating
      checkForDuplicateProduct(product.name, categoryId || '', product.sizeLabel || null);

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

// Database reset functions
export function clearAllProducts(): void {
  execute('DELETE FROM products');
  execute('DELETE FROM sales');
  execute('DELETE FROM sale_items');
  execute('DELETE FROM stock_adjustments');
}

export function resetToCleanState(): void {
  // Clear all data
  clearAllProducts();
  
  // Reset schema version to force re-migration
  execute(`DELETE FROM meta WHERE key = 'schema_version'`);
  execute(`INSERT INTO meta(key, value) VALUES ('schema_version', '0')`);
}
