import { Image } from 'expo-image';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

interface HeaderLogoProps {
  size?: 'small' | 'medium' | 'large';
  onPress?: () => void;
}

export const HeaderLogo: React.FC<HeaderLogoProps> = ({ 
  size = 'medium', 
  onPress 
}) => {
  const logoSize = {
    small: 40,
    medium: 48,
    large: 56,
  }[size];

  const LogoComponent = (
    <View style={styles.container}>
      <Image
        source={require('@/assets/images/logo/symbol-colored.svg')}
        style={[styles.logo, { width: logoSize, height: logoSize }]}
        contentFit="contain"
      />
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {LogoComponent}
      </TouchableOpacity>
    );
  }

  return LogoComponent;
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    // Size will be set dynamically
  },
});
