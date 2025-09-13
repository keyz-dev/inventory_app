import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { CustomKeypad } from '@/components/pin/CustomKeypad';
import { PinActionButtons } from '@/components/pin/PinActionButtons';
import { PinDots } from '@/components/pin/PinDots';
import { PinErrorDisplay } from '@/components/pin/PinErrorDisplay';
import { PinHeader } from '@/components/pin/PinHeader';
import { usePinLogic } from '@/hooks/usePinLogic';
import React from 'react';
import { Animated, SafeAreaView, StyleSheet, View } from 'react-native';

export default function PinScreen() {
  try {
    const {
      mode,
      pin,
      confirmPin,
      error,
      shakeAnimation,
      isLocked,
      handleKeyPress,
      handleDelete,
      handleClear,
      handleRetry,
      handleForgotPin,
      getRemainingTime,
      setMode,
    } = usePinLogic();

    if (mode === 'loading') {
      return (
        <ThemedView style={styles.container}>
          <ThemedText>Loading…</ThemedText>
        </ThemedView>
      );
    }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <PinHeader 
          mode={mode} 
          isLocked={isLocked} 
          remainingTime={getRemainingTime()} 
        />

        <Animated.View 
          style={[
            styles.pinDisplayContainer,
            { transform: [{ translateX: shakeAnimation }] }
          ]}
        >
          <PinDots 
            length={mode === 'confirm' ? confirmPin.length : pin.length} 
            maxLength={4} 
          />
        </Animated.View>

        <PinErrorDisplay error={error} />

        {mode !== 'forgot' && (
          <View style={styles.keypadContainer}>
            <CustomKeypad
              onPress={handleKeyPress}
              onDelete={handleDelete}
              onClear={handleClear}
            />
          </View>
        )}

        <PinActionButtons
          mode={mode as 'confirm' | 'forgot'}
          isLocked={isLocked}
          onRetry={handleRetry}
          onReset={handleForgotPin}
          onTryAgain={() => setMode('enter')}
        />

        <View style={styles.footer}>
          <ThemedText style={styles.footerText}>
            This keeps your account secure.
          </ThemedText>
        </View>
      </SafeAreaView>
    </View>
  );
  } catch (error) {
    console.error('PIN Screen Error:', error);
    return (
      <ThemedView style={styles.container}>
        <ThemedText>Error loading PIN screen. Please restart the app.</ThemedText>
      </ThemedView>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: 24,
  },
  pinDisplayContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  keypadContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 40,
  },
  footerText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    fontFamily: 'Poppins_400Regular',
  },
});


