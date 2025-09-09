import { BorderRadius, Colors, Shadows, Spacing } from '@/constants/DesignSystem';
import React from 'react';
import { StyleSheet, TouchableOpacity, View, ViewStyle } from 'react-native';

type CardProps = {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  variant?: 'default' | 'elevated' | 'outlined' | 'filled';
  padding?: keyof typeof Spacing;
  borderRadius?: keyof typeof BorderRadius;
  shadow?: keyof typeof Shadows;
};

export function EnhancedCard({
  children,
  style,
  onPress,
  variant = 'default',
  padding = 'lg',
  borderRadius = 'lg',
  shadow = 'md',
}: CardProps) {
  const cardStyle = [
    styles.base,
    styles[variant],
    {
      padding: Spacing[padding],
      borderRadius: BorderRadius[borderRadius],
      ...Shadows[shadow],
    },
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity style={cardStyle} onPress={onPress} activeOpacity={0.7}>
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={cardStyle}>{children}</View>;
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: 'white',
  },
  default: {
    borderWidth: 1,
    borderColor: Colors.neutral[200],
  },
  elevated: {
    backgroundColor: 'white',
  },
  outlined: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: Colors.primary[200],
  },
  filled: {
    backgroundColor: Colors.primary[50],
    borderWidth: 1,
    borderColor: Colors.primary[100],
  },
});
