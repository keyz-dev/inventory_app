import { Screen } from '@/components/Screen';
import { BarChart } from '@/components/analytics/BarChart';
import { LineChart } from '@/components/analytics/LineChart';
import { MetricCard } from '@/components/analytics/MetricCard';
import { PieChart } from '@/components/analytics/PieChart';
import { EnhancedButton } from '@/components/ui/EnhancedButton';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { formatXAF } from '@/constants/Currency';
import { Colors } from '@/constants/DesignSystem';
import {
    getCategoryAnalytics,
    getHourlySales,
    getRevenueByPaymentMethod,
    getSalesAnalytics,
    getSalesTrend,
    getStockAnalytics,
    getTopProducts,
    TimeRange,
} from '@/data/analyticsRepo';
import React, { useEffect, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function AnalyticsScreen() {
  const [timeRange, setTimeRange] = useState<TimeRange>('month');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Analytics data
  const [salesAnalytics, setSalesAnalytics] = useState<any>(null);
  const [stockAnalytics, setStockAnalytics] = useState<any>(null);
  const [salesTrend, setSalesTrend] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [categoryAnalytics, setCategoryAnalytics] = useState<any[]>([]);
  const [paymentMethodData, setPaymentMethodData] = useState<any[]>([]);
  const [hourlySales, setHourlySales] = useState<any[]>([]);

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      
      const [
        sales,
        stock,
        trend,
        products,
        categories,
        paymentMethods,
        hourly,
      ] = await Promise.all([
        getSalesAnalytics(timeRange),
        getStockAnalytics(),
        getSalesTrend(timeRange),
        getTopProducts(5, timeRange),
        getCategoryAnalytics(timeRange),
        getRevenueByPaymentMethod(timeRange),
        getHourlySales(timeRange),
      ]);

      setSalesAnalytics(sales);
      setStockAnalytics(stock);
      setSalesTrend(trend);
      setTopProducts(products);
      setCategoryAnalytics(categories);
      setPaymentMethodData(paymentMethods);
      setHourlySales(hourly);
    } catch (error) {
      Alert.alert('Error', 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAnalytics();
    setRefreshing(false);
  };

  const timeRangeOptions: Array<{ key: TimeRange; label: string }> = [
    { key: 'today', label: 'Today' },
    { key: 'week', label: 'Week' },
    { key: 'month', label: 'Month' },
    { key: 'quarter', label: 'Quarter' },
    { key: 'year', label: 'Year' },
  ];

  if (loading) {
    return (
      <Screen title="Analytics">
        <View style={styles.loadingContainer}>
          <LoadingSpinner size="lg" />
          <Text style={styles.loadingText}>Loading analytics...</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen title="Analytics">
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Time Range Selector */}
        <View style={styles.timeRangeContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {timeRangeOptions.map((option) => (
              <EnhancedButton
                key={option.key}
                title={option.label}
                onPress={() => setTimeRange(option.key)}
                variant={timeRange === option.key ? 'primary' : 'outline'}
                size="sm"
                style={styles.timeRangeButton}
              />
            ))}
          </ScrollView>
        </View>

        {/* Sales Metrics */}
        {salesAnalytics && (
          <View style={styles.metricsContainer}>
            <Text style={styles.sectionTitle}>Sales Overview</Text>
            <View style={styles.metricsRow}>
              <MetricCard
                title="Total Revenue"
                value={formatXAF(salesAnalytics.totalRevenue)}
                icon="cash"
                iconColor={Colors.success[500]}
              />
              <MetricCard
                title="Total Sales"
                value={salesAnalytics.totalSales}
                icon="trending-up"
                iconColor={Colors.primary[500]}
              />
            </View>
            <View style={styles.metricsRow}>
              <MetricCard
                title="Transactions"
                value={salesAnalytics.totalTransactions}
                icon="receipt"
                iconColor={Colors.warning[500]}
              />
              <MetricCard
                title="Avg Order Value"
                value={formatXAF(salesAnalytics.averageOrderValue)}
                icon="calculator"
                iconColor={Colors.error[500]}
              />
            </View>
          </View>
        )}

        {/* Stock Metrics */}
        {stockAnalytics && (
          <View style={styles.metricsContainer}>
            <Text style={styles.sectionTitle}>Stock Overview</Text>
            <View style={styles.metricsRow}>
              <MetricCard
                title="Total Products"
                value={stockAnalytics.totalProducts}
                icon="cube"
                iconColor={Colors.primary[500]}
              />
              <MetricCard
                title="Stock Value"
                value={formatXAF(stockAnalytics.totalValue)}
                icon="wallet"
                iconColor={Colors.success[500]}
              />
            </View>
            <View style={styles.metricsRow}>
              <MetricCard
                title="Low Stock"
                value={stockAnalytics.lowStockCount}
                icon="warning"
                iconColor={Colors.warning[500]}
              />
              <MetricCard
                title="Out of Stock"
                value={stockAnalytics.outOfStockCount}
                icon="close-circle"
                iconColor={Colors.error[500]}
              />
            </View>
          </View>
        )}

        {/* Sales Trend Chart */}
        {salesTrend.length > 0 && (
          <LineChart
            title="Sales Trend"
            data={salesTrend.map(item => ({
              date: item.date,
              value: item.revenue,
            }))}
            color={Colors.primary[500]}
          />
        )}

        {/* Top Products Chart */}
        {topProducts.length > 0 && (
          <BarChart
            title="Top Selling Products"
            data={topProducts.map(item => ({
              label: item.sizeLabel ? `${item.productName} (${item.sizeLabel})` : item.productName,
              value: item.totalSold,
            }))}
            color={Colors.success[500]}
          />
        )}

        {/* Payment Methods Chart */}
        {paymentMethodData.length > 0 && (
          <PieChart
            title="Revenue by Payment Method"
            data={paymentMethodData.map((item, index) => ({
              name: item.paymentMethod,
              value: item.revenue,
              color: [Colors.primary[500], Colors.success[500], Colors.warning[500], Colors.error[500]][index % 4],
            }))}
          />
        )}

        {/* Hourly Sales Chart */}
        {hourlySales.length > 0 && (
          <BarChart
            title="Sales by Hour"
            data={hourlySales.map(item => ({
              label: `${item.hour}:00`,
              value: item.sales,
            }))}
            color={Colors.warning[500]}
          />
        )}

        {/* Category Performance */}
        {categoryAnalytics.length > 0 && (
          <View style={styles.tableContainer}>
            <Text style={styles.sectionTitle}>Category Performance</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={styles.tableHeaderText}>Category</Text>
                <Text style={styles.tableHeaderText}>Revenue</Text>
                <Text style={styles.tableHeaderText}>Sales</Text>
              </View>
              {categoryAnalytics.map((category, index) => (
                <View key={category.categoryId} style={styles.tableRow}>
                  <Text style={styles.tableCell}>{category.categoryName}</Text>
                  <Text style={styles.tableCell}>{formatXAF(category.revenue)}</Text>
                  <Text style={styles.tableCell}>{category.totalSold}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutral[50],
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.neutral[50],
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.neutral[600],
  },
  timeRangeContainer: {
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[200],
  },
  timeRangeButton: {
    marginRight: 8,
  },
  metricsContainer: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.neutral[800],
    marginBottom: 16,
  },
  metricsRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  tableContainer: {
    backgroundColor: 'white',
    margin: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  table: {
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    borderRadius: 8,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: Colors.neutral[100],
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  tableHeaderText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.neutral[700],
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[200],
  },
  tableCell: {
    flex: 1,
    fontSize: 14,
    color: Colors.neutral[600],
  },
});
