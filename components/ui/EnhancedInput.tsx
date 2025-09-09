import { BorderRadius, Colors, Spacing, Typography } from '@/constants/DesignSystem';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';

type InputProps = TextInputProps & {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconPosition?: 'left' | 'right';
  variant?: 'default' | 'filled' | 'outlined';
  size?: 'sm' | 'md' | 'lg';
};

export function EnhancedInput({
  label,
  error,
  helperText,
  icon,
  iconPosition = 'left',
  variant = 'default',
  size = 'md',
  style,
  onFocus,
  onBlur,
  ...props
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);

  const handleFocus = (e: any) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  const inputStyle = [
    styles.input,
    styles[variant],
    styles[size],
    isFocused && styles.focused,
    error && styles.error,
    style,
  ];

  const containerStyle = [
    styles.container,
    icon && styles.containerWithIcon,
  ];

  return (
    <View style={styles.wrapper}>
      {label && <Text style={styles.label}>{label}</Text>}
      
      <View style={containerStyle}>
        {icon && iconPosition === 'left' && (
          <Ionicons
            name={icon}
            size={size === 'sm' ? 16 : size === 'lg' ? 24 : 20}
            color={error ? Colors.error[500] : isFocused ? Colors.primary[500] : Colors.neutral[400]}
            style={styles.iconLeft}
          />
        )}
        
        <TextInput
          style={inputStyle}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholderTextColor={Colors.neutral[400]}
          {...props}
        />
        
        {icon && iconPosition === 'right' && (
          <Ionicons
            name={icon}
            size={size === 'sm' ? 16 : size === 'lg' ? 24 : 20}
            color={error ? Colors.error[500] : isFocused ? Colors.primary[500] : Colors.neutral[400]}
            style={styles.iconRight}
          />
        )}
      </View>
      
      {(error || helperText) && (
        <Text style={[styles.helperText, error && styles.errorText]}>
          {error || helperText}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    color: Colors.neutral[700],
    marginBottom: Spacing.xs,
  },
  container: {
    position: 'relative',
  },
  containerWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.neutral[300],
    borderRadius: BorderRadius.md,
    backgroundColor: 'white',
    fontSize: Typography.sizes.base,
    color: Colors.neutral[900],
  },
  default: {
    // Default variant styles
  },
  filled: {
    backgroundColor: Colors.neutral[50],
    borderColor: Colors.neutral[200],
  },
  outlined: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: Colors.neutral[300],
  },
  sm: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: Typography.sizes.sm,
  },
  md: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: Typography.sizes.base,
  },
  lg: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    fontSize: Typography.sizes.lg,
  },
  focused: {
    borderColor: Colors.primary[500],
    shadowColor: Colors.primary[500],
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  error: {
    borderColor: Colors.error[500],
  },
  iconLeft: {
    position: 'absolute',
    left: Spacing.md,
    zIndex: 1,
  },
  iconRight: {
    position: 'absolute',
    right: Spacing.md,
    zIndex: 1,
  },
  helperText: {
    fontSize: Typography.sizes.xs,
    color: Colors.neutral[500],
    marginTop: Spacing.xs,
  },
  errorText: {
    color: Colors.error[500],
  },
});
