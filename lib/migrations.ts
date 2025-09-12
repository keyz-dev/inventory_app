// Simple versioned migrations for SQLite
// Keep SQL deterministic and idempotent where possible

export type Migration = {
  id: number; // increasing integer id
  name: string;
  up: string; // SQL to apply
  seedFunction?: () => Promise<void>; // Optional function for data seeding
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
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        deletedAt TEXT,
        version INTEGER NOT NULL DEFAULT 1,
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
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        deletedAt TEXT,
        version INTEGER NOT NULL DEFAULT 1,
        FOREIGN KEY(variantOfId) REFERENCES products(id) ON DELETE CASCADE,
        FOREIGN KEY(categoryId) REFERENCES categories(id)
      );

      CREATE INDEX IF NOT EXISTS idx_products_variantOf ON products(variantOfId);
      CREATE INDEX IF NOT EXISTS idx_products_category ON products(categoryId);
      
      -- Unique constraint: product name + category + size must be unique
      CREATE UNIQUE INDEX IF NOT EXISTS idx_products_unique_name_category_size 
      ON products(name, categoryId, sizeLabel) WHERE deletedAt IS NULL;

      -- Sales and adjustments
      CREATE TABLE IF NOT EXISTS sales (
        id TEXT PRIMARY KEY,
        productId TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        priceXaf INTEGER NOT NULL,
        totalXaf INTEGER NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        deletedAt TEXT,
        version INTEGER NOT NULL DEFAULT 1,
        FOREIGN KEY(productId) REFERENCES products(id)
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
        quantityChange INTEGER NOT NULL,
        reason TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        deletedAt TEXT,
        version INTEGER NOT NULL DEFAULT 1,
        FOREIGN KEY(productId) REFERENCES products(id)
      );

      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        createdAt TEXT NOT NULL
      );

      -- Seed top-level categories
      INSERT OR IGNORE INTO categories(id, name, parentId, createdAt, updatedAt, version) VALUES
        ('cat_cosmetics', 'Cosmetics', NULL, datetime('now'), datetime('now'), 1),
        ('cat_pharma', 'Pharmaceuticals', NULL, datetime('now'), datetime('now'), 1),
        ('cat_services', 'Services', NULL, datetime('now'), datetime('now'), 1);

      -- Seed some subcategories under Cosmetics
      INSERT OR IGNORE INTO categories(id, name, parentId, createdAt, updatedAt, version) VALUES
        ('cat_soap', 'Soaps & Body Wash', 'cat_cosmetics', datetime('now'), datetime('now'), 1),
        ('cat_lotion', 'Lotions & Creams', 'cat_cosmetics', datetime('now'), datetime('now'), 1),
        ('cat_oil', 'Oils & Butters', 'cat_cosmetics', datetime('now'), datetime('now'), 1),
        ('cat_perfume', 'Perfumes & Deodorants', 'cat_cosmetics', datetime('now'), datetime('now'), 1),
        ('cat_hygiene', 'Hygiene & Antiseptics', 'cat_cosmetics', datetime('now'), datetime('now'), 1);

      -- Track schema version
      INSERT OR REPLACE INTO meta(key, value) VALUES ('schema_version', '1');
      INSERT OR IGNORE INTO meta(key, value) VALUES ('lastSyncedAt', '');
    `,
  },
  {
    id: 2,
    name: 'add_sync_support',
    up: `
      -- Sync queue for offline operations
      CREATE TABLE IF NOT EXISTS sync_queue (
        id TEXT PRIMARY KEY,
        entity TEXT NOT NULL,
        operation TEXT NOT NULL,
        data TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        synced INTEGER NOT NULL DEFAULT 0,
        retryCount INTEGER NOT NULL DEFAULT 0,
        lastError TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_sync_queue_synced ON sync_queue(synced);
      CREATE INDEX IF NOT EXISTS idx_sync_queue_timestamp ON sync_queue(timestamp);

      -- Update schema version
      INSERT OR REPLACE INTO meta(key, value) VALUES ('schema_version', '2');
    `,
  },
  {
    id: 3,
    name: 'seed_initial_inventory_data',
    up: `
      -- This migration seeds the initial inventory data
      -- It will only run once due to the migration system's versioning
      
      -- The actual seeding logic is handled by the seedFunction
      -- This SQL just updates the schema version
      
      -- Update schema version to track this migration
      INSERT OR REPLACE INTO meta(key, value) VALUES ('schema_version', '3');
    `,
    seedFunction: async () => {
      const { runSeedMigration } = await import('./migration/seed_inventory');
      await runSeedMigration();
    },
  },
];


