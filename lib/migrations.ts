// Simple versioned migrations for SQLite
// Keep SQL deterministic and idempotent where possible

export type Migration = {
  id: number; // increasing integer id
  name: string;
  up: string; // SQL to apply
};

export const migrations: Migration[] = [
  {
    id: 1,
    name: 'initial_schema_with_categories_and_inline_variants',
    up: `
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS meta (
        key TEXT PRIMARY KEY,
        value TEXT
      );

      -- Categories hierarchy (optional parentId)
      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        parentId TEXT,
        FOREIGN KEY(parentId) REFERENCES categories(id)
      );

      -- Products with inline variant support
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        priceXaf INTEGER,            -- nullable for parent rows
        quantity INTEGER NOT NULL DEFAULT 0,
        sizeLabel TEXT,              -- e.g., Big/Medium/Small
        variantOfId TEXT,            -- references products(id) if this is a variant row
        categoryId TEXT,             -- references categories(id)
        updatedAt TEXT NOT NULL,
        deletedAt TEXT,
        FOREIGN KEY(variantOfId) REFERENCES products(id) ON DELETE CASCADE,
        FOREIGN KEY(categoryId) REFERENCES categories(id)
      );

      CREATE INDEX IF NOT EXISTS idx_products_variantOf ON products(variantOfId);
      CREATE INDEX IF NOT EXISTS idx_products_category ON products(categoryId);

      -- Sales and adjustments
      CREATE TABLE IF NOT EXISTS sales (
        id TEXT PRIMARY KEY,
        total INTEGER NOT NULL,
        paymentMethod TEXT NOT NULL,
        createdAt TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sale_items (
        id TEXT PRIMARY KEY,
        saleId TEXT NOT NULL,
        productId TEXT NOT NULL,     -- direct reference to products row (variant or standalone)
        quantity INTEGER NOT NULL,
        unitPrice INTEGER NOT NULL,
        FOREIGN KEY(saleId) REFERENCES sales(id) ON DELETE CASCADE,
        FOREIGN KEY(productId) REFERENCES products(id)
      );

      CREATE TABLE IF NOT EXISTS stock_adjustments (
        id TEXT PRIMARY KEY,
        productId TEXT NOT NULL,     -- direct reference to products row
        delta INTEGER NOT NULL,
        reason TEXT,
        createdAt TEXT NOT NULL,
        FOREIGN KEY(productId) REFERENCES products(id)
      );

      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        createdAt TEXT NOT NULL
      );

      -- Seed top-level categories
      INSERT OR IGNORE INTO categories(id, name, parentId) VALUES
        ('cat_cosmetics', 'Cosmetics', NULL),
        ('cat_pharma', 'Pharmaceuticals', NULL),
        ('cat_services', 'Services', NULL);

      -- Seed some subcategories under Cosmetics
      INSERT OR IGNORE INTO categories(id, name, parentId) VALUES
        ('cat_soap', 'Soaps & Body Wash', 'cat_cosmetics'),
        ('cat_lotion', 'Lotions & Creams', 'cat_cosmetics'),
        ('cat_oil', 'Oils & Butters', 'cat_cosmetics'),
        ('cat_perfume', 'Perfumes & Deodorants', 'cat_cosmetics'),
        ('cat_hygiene', 'Hygiene & Antiseptics', 'cat_cosmetics');

      -- Example products
      -- Parent: Santex soap, with two sizes (children rows hold stock & price)
      INSERT OR IGNORE INTO products(id, name, priceXaf, quantity, sizeLabel, variantOfId, categoryId, updatedAt, deletedAt)
      VALUES ('prod_santex_parent', 'Santex soap', NULL, 0, NULL, NULL, 'cat_soap', datetime('now'), NULL);

      INSERT OR IGNORE INTO products(id, name, priceXaf, quantity, sizeLabel, variantOfId, categoryId, updatedAt, deletedAt)
      VALUES
        ('prod_santex_large', 'Santex soap', 2100, 3, 'Largest', 'prod_santex_parent', 'cat_soap', datetime('now'), NULL),
        ('prod_santex_regular', 'Santex soap', 1500, 5, 'Regular', 'prod_santex_parent', 'cat_soap', datetime('now'), NULL);

      -- Single item: Dettol (no sizes)
      INSERT OR IGNORE INTO products(id, name, priceXaf, quantity, sizeLabel, variantOfId, categoryId, updatedAt, deletedAt)
      VALUES ('prod_dettol', 'Dettol', 1500, 10, NULL, NULL, 'cat_hygiene', datetime('now'), NULL);

      -- Track schema version
      INSERT OR REPLACE INTO meta(key, value) VALUES ('schema_version', '1');
      INSERT OR IGNORE INTO meta(key, value) VALUES ('lastSyncedAt', '');
    `,
  },
];


