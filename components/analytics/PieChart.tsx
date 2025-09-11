import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/DesignSystem';
import React from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { PieChart as RNPieChart } from 'react-native-chart-kit';

type PieChartProps = {
  data: {
    name: string;
    value: number;
    color: string;
  }[];
  title: string;
  height?: number;
};

const screenWidth = Dimensions.get('window').width;

export function PieChart({ data, title, height = 220 }: PieChartProps) {
  if (data.length === 0) {
    return (
      <View style={[styles.container, { height }]}>
        <ThemedText style={styles.title}>{title}</ThemedText>
        <View style={styles.emptyState}>
          <ThemedText style={styles.emptyText}>No data available</ThemedText>
        </View>
      </View>
    );
  }

  const chartData = data.map((item, index) => ({
    name: item.name,
    population: item.value,
    color: item.color,
    legendFontColor: Colors.neutral[600],
    legendFontSize: 12,
  }));

  const chartConfig = {
    backgroundColor: 'white',
    backgroundGradientFrom: 'white',
    backgroundGradientTo: 'white',
    color: (opacity = 1) => Colors.neutral[600],
    labelColor: (opacity = 1) => Colors.neutral[500],
    style: {
      borderRadius: 16,
    },
  };

  return (
    <View style={styles.container}>
      <ThemedText style={styles.title}>{title}</ThemedText>
      <View style={styles.chartContainer}>
        <RNPieChart
          data={chartData}
          width={screenWidth - 32}
          height={height - 60}
          chartConfig={chartConfig}
          accessor="population"
          backgroundColor="transparent"
          paddingLeft="15"
          style={styles.chart}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    color: Colors.neutral[800],
    marginBottom: 16,
  },
  chartContainer: {
    alignItems: 'center',
  },
  chart: {
    borderRadius: 16,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: Colors.neutral[500],
  },
});
