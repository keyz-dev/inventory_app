import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { SafeAreaView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

const STORAGE_KEY = 'devicePin';

type Mode = 'loading' | 'setup' | 'confirm' | 'enter';

export default function PinScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('loading');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        setMode(saved ? 'enter' : 'setup');
      } catch {
        setMode('setup');
      }
    })();
  }, []);

  const handleSetupNext = () => {
    setError('');
    if (pin.length < 4) {
      setError('PIN must be at least 4 digits.');
      return;
    }
    setMode('confirm');
  };

  const handleSavePin = async () => {
    setError('');
    if (pin !== confirmPin) {
      setError('PINs do not match.');
      return;
    }
    try {
      await AsyncStorage.setItem(STORAGE_KEY, pin);
      router.replace('/(tabs)/sell');
    } catch {
      setError('Failed to save PIN. Please try again.');
    }
  };

  const handleUnlock = async () => {
    setError('');
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved && pin === saved) {
        router.replace('/(tabs)/sell');
      } else {
        setError('Incorrect PIN.');
      }
    } catch {
      setError('Error reading PIN.');
    }
  };

  if (mode === 'loading') {
    return (
      <ThemedView style={styles.container}>
        <ThemedText>Loading…</ThemedText>
      </ThemedView>
    );
  }

  return (
    <LinearGradient
      colors={['#667eea', '#764ba2']}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons name="storefront" size={48} color="white" />
            </View>
            <ThemedText style={styles.title}>Inventory Manager</ThemedText>
            <ThemedText style={styles.subtitle}>Secure Access</ThemedText>
          </View>

          <View style={styles.formContainer}>
            {mode === 'setup' && (
              <>
                <ThemedText style={styles.formTitle}>Create Your PIN</ThemedText>
                <ThemedText style={styles.formSubtitle}>Choose a 4-6 digit PIN for security</ThemedText>
                <View style={styles.inputContainer}>
                  <Ionicons name="lock-closed" size={20} color="#6b7280" style={styles.inputIcon} />
                  <TextInput
                    value={pin}
                    onChangeText={setPin}
                    keyboardType="number-pad"
                    secureTextEntry
                    maxLength={6}
                    placeholder="Enter new PIN"
                    style={styles.input}
                    placeholderTextColor="#9ca3af"
                  />
                </View>
                {error ? <ThemedText style={styles.error}>{error}</ThemedText> : null}
                <TouchableOpacity style={styles.button} onPress={handleSetupNext}>
                  <ThemedText style={styles.buttonText}>Continue</ThemedText>
                  <Ionicons name="arrow-forward" size={20} color="white" />
                </TouchableOpacity>
              </>
            )}

            {mode === 'confirm' && (
              <>
                <ThemedText style={styles.formTitle}>Confirm Your PIN</ThemedText>
                <ThemedText style={styles.formSubtitle}>Re-enter your PIN to confirm</ThemedText>
                <View style={styles.inputContainer}>
                  <Ionicons name="lock-closed" size={20} color="#6b7280" style={styles.inputIcon} />
                  <TextInput
                    value={confirmPin}
                    onChangeText={setConfirmPin}
                    keyboardType="number-pad"
                    secureTextEntry
                    maxLength={6}
                    placeholder="Re-enter PIN"
                    style={styles.input}
                    placeholderTextColor="#9ca3af"
                  />
                </View>
                {error ? <ThemedText style={styles.error}>{error}</ThemedText> : null}
                <TouchableOpacity style={styles.button} onPress={handleSavePin}>
                  <ThemedText style={styles.buttonText}>Save PIN</ThemedText>
                  <Ionicons name="checkmark" size={20} color="white" />
                </TouchableOpacity>
              </>
            )}

            {mode === 'enter' && (
              <>
                <ThemedText style={styles.formTitle}>Welcome Back</ThemedText>
                <ThemedText style={styles.formSubtitle}>Enter your PIN to access the app</ThemedText>
                <View style={styles.inputContainer}>
                  <Ionicons name="lock-closed" size={20} color="#6b7280" style={styles.inputIcon} />
                  <TextInput
                    value={pin}
                    onChangeText={setPin}
                    keyboardType="number-pad"
                    secureTextEntry
                    maxLength={6}
                    placeholder="Enter PIN"
                    style={styles.input}
                    placeholderTextColor="#9ca3af"
                  />
                </View>
                {error ? <ThemedText style={styles.error}>{error}</ThemedText> : null}
                <TouchableOpacity style={styles.button} onPress={handleUnlock}>
                  <ThemedText style={styles.buttonText}>Unlock</ThemedText>
                  <Ionicons name="arrow-forward" size={20} color="white" />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  safe: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: 'white',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  formContainer: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  formSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 32,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 18,
    paddingVertical: 16,
    color: '#1f2937',
  },
  button: {
    backgroundColor: '#3b82f6',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginRight: 8,
  },
  error: {
    color: '#dc2626',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
    backgroundColor: '#fef2f2',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
});


