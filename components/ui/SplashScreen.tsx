import { Image } from 'expo-image';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ThemedText } from '../ThemedText';

interface SplashScreenProps {
  visible: boolean;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ visible }) => {
  if (!visible) return null;

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Image
          source={require('@/assets/images/logo/logo-colored.png')}
          style={styles.logo}
          contentFit="contain"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 250,
    height: 250,
    marginBottom: 32,
  }
});
