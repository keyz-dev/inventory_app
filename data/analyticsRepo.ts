import { query } from '@/lib/db';

export type SalesAnalytics = {
  totalSales: number;
  totalRevenue: number;
  averageOrderValue: number;
  totalTransactions: number;
};

export type SalesTrend = {
  date: string;
  sales: number;
  revenue: number;
  transactions: number;
};

export type ProductPerformance = {
  productId: string;
  productName: string;
  sizeLabel: string | null;
  totalSold: number;
  revenue: number;
  stockLevel: number;
};

export type CategoryAnalytics = {
  categoryId: string;
  categoryName: string;
  totalProducts: number;
  totalSold: number;
  revenue: number;
  averagePrice: number;
};

export type StockAnalytics = {
  totalProducts: number;
  totalValue: number;
  lowStockCount: number;
  outOfStockCount: number;
  averageStockLevel: number;
};

export type TimeRange = 'today' | 'week' | 'month' | 'quarter' | 'year';

export function getSalesAnalytics(timeRange: TimeRange = 'month'): SalesAnalytics {
  const dateFilter = getDateFilter(timeRange);
  
  const result = query<{
    totalSales: number;
    totalRevenue: number;
    totalTransactions: number;
  }>(
    `SELECT 
      COUNT(DISTINCT s.id) as totalTransactions,
      SUM(s.total) as totalRevenue,
      SUM(si.quantity) as totalSales
    FROM sales s
    JOIN sale_items si ON s.id = si.saleId
    WHERE s.createdAt >= ?`,
    [dateFilter]
  )[0];

  const totalTransactions = result?.totalTransactions || 0;
  const totalRevenue = result?.totalRevenue || 0;
  const totalSales = result?.totalSales || 0;
  const averageOrderValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

  return {
    totalSales,
    totalRevenue,
    averageOrderValue,
    totalTransactions,
  };
}

export function getSalesTrend(timeRange: TimeRange = 'week'): SalesTrend[] {
  const dateFilter = getDateFilter(timeRange);
  const groupBy = getGroupByClause(timeRange);

  return query<SalesTrend>(
    `SELECT 
      DATE(s.createdAt) as date,
      SUM(si.quantity) as sales,
      SUM(s.total) as revenue,
      COUNT(DISTINCT s.id) as transactions
    FROM sales s
    JOIN sale_items si ON s.id = si.saleId
    WHERE s.createdAt >= ?
    GROUP BY DATE(s.createdAt)
    ORDER BY date ASC`,
    [dateFilter]
  );
}

export function getTopProducts(limit: number = 10, timeRange: TimeRange = 'month'): ProductPerformance[] {
  const dateFilter = getDateFilter(timeRange);

  return query<ProductPerformance>(
    `SELECT 
      p.id as productId,
      p.name as productName,
      p.sizeLabel,
      SUM(si.quantity) as totalSold,
      SUM(si.quantity * si.unitPrice) as revenue,
      p.quantity as stockLevel
    FROM sale_items si
    JOIN sales s ON si.saleId = s.id
    JOIN products p ON si.productId = p.id
    WHERE s.createdAt >= ? AND p.deletedAt IS NULL
    GROUP BY p.id, p.name, p.sizeLabel, p.quantity
    ORDER BY totalSold DESC
    LIMIT ?`,
    [dateFilter, limit]
  );
}

export function getCategoryAnalytics(timeRange: TimeRange = 'month'): CategoryAnalytics[] {
  const dateFilter = getDateFilter(timeRange);

  return query<CategoryAnalytics>(
    `SELECT 
      c.id as categoryId,
      c.name as categoryName,
      COUNT(DISTINCT p.id) as totalProducts,
      COALESCE(SUM(si.quantity), 0) as totalSold,
      COALESCE(SUM(si.quantity * si.unitPrice), 0) as revenue,
      COALESCE(AVG(si.unitPrice), 0) as averagePrice
    FROM categories c
    LEFT JOIN products p ON c.id = p.categoryId AND p.deletedAt IS NULL
    LEFT JOIN sale_items si ON p.id = si.productId
    LEFT JOIN sales s ON si.saleId = s.id AND s.createdAt >= ?
    GROUP BY c.id, c.name
    ORDER BY revenue DESC`,
    [dateFilter]
  );
}

export function getStockAnalytics(lowStockThreshold: number = 3): StockAnalytics {
  const result = query<{
    totalProducts: number;
    totalValue: number;
    lowStockCount: number;
    outOfStockCount: number;
    averageStockLevel: number;
  }>(
    `SELECT 
      COUNT(DISTINCT CASE WHEN variantOfId IS NULL THEN id END) as totalProducts,
      COALESCE(SUM(quantity * priceXaf), 0) as totalValue,
      COUNT(CASE WHEN quantity < ? AND quantity > 0 THEN 1 END) as lowStockCount,
      COUNT(CASE WHEN quantity = 0 THEN 1 END) as outOfStockCount,
      COALESCE(AVG(quantity), 0) as averageStockLevel
    FROM products 
    WHERE deletedAt IS NULL`,
    [lowStockThreshold]
  )[0];

  return result || {
    totalProducts: 0,
    totalValue: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    averageStockLevel: 0,
  };
}

export function getRevenueByPaymentMethod(timeRange: TimeRange = 'month'): {
  paymentMethod: string;
  revenue: number;
  percentage: number;
}[] {
  const dateFilter = getDateFilter(timeRange);
  
  const results = query<{
    paymentMethod: string;
    revenue: number;
  }>(
    `SELECT 
      paymentMethod,
      SUM(total) as revenue
    FROM sales
    WHERE createdAt >= ?
    GROUP BY paymentMethod
    ORDER BY revenue DESC`,
    [dateFilter]
  );

  const totalRevenue = results.reduce((sum, item) => sum + item.revenue, 0);

  return results.map(item => ({
    paymentMethod: item.paymentMethod,
    revenue: item.revenue,
    percentage: totalRevenue > 0 ? (item.revenue / totalRevenue) * 100 : 0,
  }));
}

export function getHourlySales(timeRange: TimeRange = 'week'): {
  hour: number;
  sales: number;
  revenue: number;
}[] {
  const dateFilter = getDateFilter(timeRange);

  return query<{
    hour: number;
    sales: number;
    revenue: number;
  }>(
    `SELECT 
      CAST(strftime('%H', s.createdAt) AS INTEGER) as hour,
      SUM(si.quantity) as sales,
      SUM(s.total) as revenue
    FROM sales s
    JOIN sale_items si ON s.id = si.saleId
    WHERE s.createdAt >= ?
    GROUP BY CAST(strftime('%H', s.createdAt) AS INTEGER)
    ORDER BY hour ASC`,
    [dateFilter]
  );
}

// Helper functions
function getDateFilter(timeRange: TimeRange): string {
  const now = new Date();
  const filters = {
    today: new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString(),
    week: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    month: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
    quarter: new Date(now.getFullYear(), now.getMonth() - 3, 1).toISOString(),
    year: new Date(now.getFullYear(), 0, 1).toISOString(),
  };
  return filters[timeRange];
}

function getGroupByClause(timeRange: TimeRange): string {
  const clauses = {
    today: 'strftime("%H", s.createdAt)',
    week: 'DATE(s.createdAt)',
    month: 'DATE(s.createdAt)',
    quarter: 'strftime("%Y-%m", s.createdAt)',
    year: 'strftime("%Y-%m", s.createdAt)',
  };
  return clauses[timeRange];
}
