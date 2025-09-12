import { query } from '@/lib/db';
import { supabase } from '@/lib/supabase';

class BackupService {
  // Create a full backup of local data to Supabase
  async createBackup(): Promise<{
    success: boolean;
    backedUp: {
      products: number;
      categories: number;
      sales: number;
      stockAdjustments: number;
    };
    errors: string[];
  }> {
    const result = {
      success: true,
      backedUp: {
        products: 0,
        categories: 0,
        sales: 0,
        stockAdjustments: 0
      },
      errors: [] as string[]
    };

    try {
      console.log('🔄 Creating backup of local data...');

      // 1. Backup categories first
      await this.backupCategories(result);
      
      // 2. Backup products
      await this.backupProducts(result);
      
      // 3. Backup sales
      await this.backupSales(result);
      
      // 4. Backup stock adjustments
      await this.backupStockAdjustments(result);

      // 5. Mark backup as completed
      await this.markBackupCompleted();

      console.log('✅ Backup completed successfully:', result.backedUp);
      
    } catch (error) {
      console.error('❌ Backup failed:', error);
      result.success = false;
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
    }

    return result;
  }

  private async backupCategories(result: any): Promise<void> {
    try {
      const categories = query<any>('SELECT * FROM categories WHERE deletedAt IS NULL');
      
      if (categories.length === 0) {
        return;
      }

      const categoryData = categories.map(cat => ({
        id: cat.id,
        name: cat.name,
        parent_id: cat.parentId,
        updated_at: cat.updatedAt || new Date().toISOString(),
        deleted_at: null,
        version: cat.version || 1,
        created_at: cat.createdAt || new Date().toISOString(),
        backup_source: 'local_backup'
      }));

      const { error } = await supabase
        .from('categories')
        .upsert(categoryData, { onConflict: 'id' });

      if (error) {
        throw new Error(`Categories backup failed: ${error.message}`);
      }

      result.backedUp.categories = categories.length;
      
    } catch (error) {
      console.error('❌ Categories backup failed:', error);
      result.errors.push(`Categories: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async backupProducts(result: any): Promise<void> {
    try {
      const products = query<any>('SELECT * FROM products WHERE deletedAt IS NULL');
      
      if (products.length === 0) {
        return;
      }

      const productData = products.map(prod => ({
        id: prod.id,
        name: prod.name,
        price_xaf: prod.priceXaf,
        quantity: prod.quantity,
        size_label: prod.sizeLabel,
        variant_of_id: prod.variantOfId,
        category_id: prod.categoryId,
        updated_at: prod.updatedAt || new Date().toISOString(),
        deleted_at: null,
        version: prod.version || 1,
        created_at: prod.createdAt || new Date().toISOString(),
        backup_source: 'local_backup'
      }));

      const { error } = await supabase
        .from('products')
        .upsert(productData, { onConflict: 'id' });

      if (error) {
        throw new Error(`Products backup failed: ${error.message}`);
      }

      result.backedUp.products = products.length;
      
    } catch (error) {
      console.error('❌ Products backup failed:', error);
      result.errors.push(`Products: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async backupSales(result: any): Promise<void> {
    try {
      const sales = query<any>('SELECT * FROM sales WHERE deletedAt IS NULL');
      
      if (sales.length === 0) {
        return;
      }

      const saleData = sales.map(sale => ({
        id: sale.id,
        product_id: sale.productId,
        quantity: sale.quantity,
        price_xaf: sale.priceXaf,
        total_xaf: sale.totalXaf,
        updated_at: sale.updatedAt || new Date().toISOString(),
        deleted_at: null,
        version: sale.version || 1,
        created_at: sale.createdAt || new Date().toISOString(),
        backup_source: 'local_backup'
      }));

      const { error } = await supabase
        .from('sales')
        .upsert(saleData, { onConflict: 'id' });

      if (error) {
        throw new Error(`Sales backup failed: ${error.message}`);
      }

      result.backedUp.sales = sales.length;
      
    } catch (error) {
      console.error('❌ Sales backup failed:', error);
      result.errors.push(`Sales: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async backupStockAdjustments(result: any): Promise<void> {
    try {
      const adjustments = query<any>('SELECT * FROM stock_adjustments WHERE deletedAt IS NULL');
      
      if (adjustments.length === 0) {
        return;
      }

      const adjustmentData = adjustments.map(adj => ({
        id: adj.id,
        product_id: adj.productId,
        quantity_change: adj.quantityChange,
        reason: adj.reason,
        updated_at: adj.updatedAt || new Date().toISOString(),
        deleted_at: null,
        version: adj.version || 1,
        created_at: adj.createdAt || new Date().toISOString(),
        backup_source: 'local_backup'
      }));

      const { error } = await supabase
        .from('stock_adjustments')
        .upsert(adjustmentData, { onConflict: 'id' });

      if (error) {
        throw new Error(`Stock adjustments backup failed: ${error.message}`);
      }

      result.backedUp.stockAdjustments = adjustments.length;
      
    } catch (error) {
      console.error('❌ Stock adjustments backup failed:', error);
      result.errors.push(`Stock adjustments: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async markBackupCompleted(): Promise<void> {
    const { error } = await supabase
      .from('meta')
      .upsert({ 
        key: 'lastBackupAt', 
        value: new Date().toISOString() 
      });

    if (error) {
      console.warn('Failed to mark backup as completed:', error);
    }
  }

  // Get backup status
  async getBackupStatus(): Promise<{
    lastBackupAt?: string;
    hasBackup: boolean;
  }> {
    try {
      const { data } = await supabase
        .from('meta')
        .select('value')
        .eq('key', 'lastBackupAt')
        .single();

      return {
        lastBackupAt: data?.value,
        hasBackup: !!data?.value
      };
    } catch (error) {
      return {
        hasBackup: false
      };
    }
  }

  // Restore data from Supabase to local database
  async restoreData(): Promise<{
    success: boolean;
    restored: {
      products: number;
      categories: number;
      sales: number;
      stockAdjustments: number;
    };
    errors: string[];
  }> {
    const result = {
      success: true,
      restored: {
        products: 0,
        categories: 0,
        sales: 0,
        stockAdjustments: 0
      },
      errors: [] as string[]
    };

    try {
      console.log('🔄 Restoring data from cloud...');

      // 1. Restore categories first (dependencies)
      await this.restoreCategories(result);
      
      // 2. Restore products
      await this.restoreProducts(result);
      
      // 3. Restore sales
      await this.restoreSales(result);
      
      // 4. Restore stock adjustments
      await this.restoreStockAdjustments(result);

      // 5. Mark restore as completed
      await this.markRestoreCompleted();

      console.log('✅ Restore completed successfully:', result.restored);
      
    } catch (error) {
      console.error('❌ Restore failed:', error);
      result.success = false;
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
    }

    return result;
  }

  private async restoreCategories(result: any): Promise<void> {
    try {
      const { data: categories, error } = await supabase
        .from('categories')
        .select('*')
        .is('deleted_at', null);

      if (error) {
        throw new Error(`Categories restore failed: ${error.message}`);
      }

      if (!categories || categories.length === 0) {
        return;
      }

      // Clear existing categories and restore from cloud
      query('DELETE FROM categories');
      
      for (const category of categories) {
        query(
          `INSERT INTO categories (id, name, parentId, createdAt, updatedAt, version) 
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            category.id,
            category.name,
            category.parent_id,
            category.created_at,
            category.updated_at,
            category.version
          ]
        );
      }

      result.restored.categories = categories.length;
      
    } catch (error) {
      console.error('❌ Categories restore failed:', error);
      result.errors.push(`Categories: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async restoreProducts(result: any): Promise<void> {
    try {
      const { data: products, error } = await supabase
        .from('products')
        .select('*')
        .is('deleted_at', null);

      if (error) {
        throw new Error(`Products restore failed: ${error.message}`);
      }

      if (!products || products.length === 0) {
        return;
      }

      // Clear existing products and restore from cloud
      query('DELETE FROM products');
      
      for (const product of products) {
        query(
          `INSERT INTO products (id, name, priceXaf, quantity, sizeLabel, variantOfId, categoryId, createdAt, updatedAt, version) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            product.id,
            product.name,
            product.price_xaf,
            product.quantity,
            product.size_label,
            product.variant_of_id,
            product.category_id,
            product.created_at,
            product.updated_at,
            product.version
          ]
        );
      }

      result.restored.products = products.length;
      
    } catch (error) {
      console.error('❌ Products restore failed:', error);
      result.errors.push(`Products: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async restoreSales(result: any): Promise<void> {
    try {
      const { data: sales, error } = await supabase
        .from('sales')
        .select('*')
        .is('deleted_at', null);

      if (error) {
        throw new Error(`Sales restore failed: ${error.message}`);
      }

      if (!sales || sales.length === 0) {
        return;
      }

      // Clear existing sales and restore from cloud
      query('DELETE FROM sales');
      
      for (const sale of sales) {
        query(
          `INSERT INTO sales (id, productId, quantity, priceXaf, totalXaf, createdAt, updatedAt, version) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            sale.id,
            sale.product_id,
            sale.quantity,
            sale.price_xaf,
            sale.total_xaf,
            sale.created_at,
            sale.updated_at,
            sale.version
          ]
        );
      }

      result.restored.sales = sales.length;
      
    } catch (error) {
      console.error('❌ Sales restore failed:', error);
      result.errors.push(`Sales: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async restoreStockAdjustments(result: any): Promise<void> {
    try {
      const { data: adjustments, error } = await supabase
        .from('stock_adjustments')
        .select('*')
        .is('deleted_at', null);

      if (error) {
        throw new Error(`Stock adjustments restore failed: ${error.message}`);
      }

      if (!adjustments || adjustments.length === 0) {
        return;
      }

      // Clear existing stock adjustments and restore from cloud
      query('DELETE FROM stock_adjustments');
      
      for (const adjustment of adjustments) {
        query(
          `INSERT INTO stock_adjustments (id, productId, quantityChange, reason, createdAt, updatedAt, version) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            adjustment.id,
            adjustment.product_id,
            adjustment.quantity_change,
            adjustment.reason,
            adjustment.created_at,
            adjustment.updated_at,
            adjustment.version
          ]
        );
      }

      result.restored.stockAdjustments = adjustments.length;
      
    } catch (error) {
      console.error('❌ Stock adjustments restore failed:', error);
      result.errors.push(`Stock adjustments: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async markRestoreCompleted(): Promise<void> {
    const { error } = await supabase
      .from('meta')
      .upsert({ 
        key: 'lastRestoreAt', 
        value: new Date().toISOString() 
      });

    if (error) {
      console.warn('Failed to mark restore as completed:', error);
    }
  }

  // Get restore status
  async getRestoreStatus(): Promise<{
    lastRestoreAt?: string;
    hasRestore: boolean;
  }> {
    try {
      const { data } = await supabase
        .from('meta')
        .select('value')
        .eq('key', 'lastRestoreAt')
        .single();

      return {
        lastRestoreAt: data?.value,
        hasRestore: !!data?.value
      };
    } catch (error) {
      return {
        hasRestore: false
      };
    }
  }

  // Get local data counts
  getLocalDataCounts(): {
    products: number;
    categories: number;
    sales: number;
    stockAdjustments: number;
  } {
    try {
      const products = query<any>('SELECT COUNT(*) as count FROM products WHERE deletedAt IS NULL')[0]?.count || 0;
      const categories = query<any>('SELECT COUNT(*) as count FROM categories WHERE deletedAt IS NULL')[0]?.count || 0;
      const sales = query<any>('SELECT COUNT(*) as count FROM sales WHERE deletedAt IS NULL')[0]?.count || 0;
      const stockAdjustments = query<any>('SELECT COUNT(*) as count FROM stock_adjustments WHERE deletedAt IS NULL')[0]?.count || 0;

      return {
        products,
        categories,
        sales,
        stockAdjustments
      };
    } catch (error) {
      console.error('Failed to get local data counts:', error);
      return {
        products: 0,
        categories: 0,
        sales: 0,
        stockAdjustments: 0
      };
    }
  }
}

export default new BackupService();
