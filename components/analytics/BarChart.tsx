import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/DesignSystem';
import React from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { BarChart as RNBarChart } from 'react-native-chart-kit';

type BarChartProps = {
  data: {
    label: string;
    value: number;
  }[];
  title: string;
  color?: string;
  height?: number;
};

const screenWidth = Dimensions.get('window').width;

export function BarChart({ data, title, color = Colors.primary[500], height = 220 }: BarChartProps) {
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

  const chartData = {
    labels: data.map(item => item.label),
    datasets: [
      {
        data: data.map(item => item.value),
      },
    ],
  };

  const chartConfig = {
    backgroundColor: 'white',
    backgroundGradientFrom: 'white',
    backgroundGradientTo: 'white',
    decimalPlaces: 0,
    color: (opacity = 1) => color,
    labelColor: (opacity = 1) => Colors.neutral[500],
    style: {
      borderRadius: 16,
    },
    propsForBackgroundLines: {
      strokeDasharray: '',
      stroke: Colors.neutral[200],
      strokeWidth: 1,
    },
  };

  return (
    <View style={styles.container}>
      <ThemedText style={styles.title}>{title}</ThemedText>
      <View style={styles.chartContainer}>
        <RNBarChart
          data={chartData}
          width={screenWidth - 32}
          height={height - 60}
          chartConfig={chartConfig}
          style={styles.chart}
          withInnerLines={false}
          withOuterLines={true}
          withVerticalLines={false}
          withHorizontalLines={true}
          showValuesOnTopOfBars={true}
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
