import { getDb } from "../db";
import inventory from "../seeds/initial_inventory.json";

// Simple UUID v4 generator
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export async function runSeedMigration() {
  const db = getDb();
  const now = new Date().toISOString();

  db.execSync("PRAGMA foreign_keys = ON;");

  // Check if data is already seeded
  const existingProducts = db.getFirstSync<{ count: number }>(
    "SELECT COUNT(*) as count FROM products"
  );
  
  if (existingProducts && existingProducts.count > 0) {
    console.log("Inventory data already seeded, skipping...");
    return;
  }

  console.log("Seeding initial inventory data...");
  let totalProducts = 0;
  let processedProducts = 0;

  // Count total products first
  for (const category of inventory.categories) {
    for (const sub of category.subcategories) {
      totalProducts += sub.products.length;
    }
  }

  console.log(`Found ${totalProducts} products to seed across ${inventory.categories.length} categories`);

  for (const category of inventory.categories) {
    // Use predefined category IDs for main categories
    let parentId: string;
    if (category.name.toLowerCase().includes('cosmetic')) {
      parentId = 'cat_cosmetics';
    } else if (category.name.toLowerCase().includes('pharma') || category.name.toLowerCase().includes('pharmaceutical')) {
      parentId = 'cat_pharma';
    } else {
      // For other categories, generate UUID but use a consistent naming pattern
      parentId = `cat_${category.name.toLowerCase().replace(/\s+/g, '_')}`;
    }
    
    // Insert parent category (ignore if already exists)
    db.runSync(
      "INSERT OR IGNORE INTO categories (id, name, parentId, createdAt, updatedAt, version) VALUES (?, ?, ?, ?, ?, ?)",
      [parentId, category.name, null, new Date().toISOString(), new Date().toISOString(), 1]
    );

    for (const sub of category.subcategories) {
      // Generate UUID for subcategory
      const subId = generateUUID();
      
      // Insert subcategory (as a child category)
      db.runSync(
        "INSERT INTO categories (id, name, parentId, createdAt, updatedAt, version) VALUES (?, ?, ?, ?, ?, ?)",
        [subId, sub.name, parentId, new Date().toISOString(), new Date().toISOString(), 1]
      );

      for (const product of sub.products) {
        // Generate UUID for product
        const productId = generateUUID();
        
        // Insert product with proper schema fields
        db.runSync(
          "INSERT INTO products (id, name, priceXaf, quantity, sizeLabel, categoryId, createdAt, updatedAt, deletedAt, version) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
          [
            productId,
            product.name,
            product.priceXaf || 0,
            product.quantity || 0,
            product.sizeLabel || null,
            subId, // Reference to the subcategory
            now,
            now,
            null, // deletedAt is null for active products
            1
          ]
        );
        
        processedProducts++;
        
        // Log progress every 50 products
        if (processedProducts % 50 === 0) {
          console.log(`Seeded ${processedProducts}/${totalProducts} products...`);
        }
      }
    }
  }

  console.log("Inventory data seeded successfully!");
}
