import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { SafeAreaView, StyleSheet, TextInput, TouchableOpacity } from 'react-native';

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
    <SafeAreaView style={styles.safe}>
      <ThemedView style={styles.container}>
      {mode === 'setup' && (
        <>
          <ThemedText className="text-3xl font-extrabold">Create PIN</ThemedText>
          <TextInput
            value={pin}
            onChangeText={setPin}
            keyboardType="number-pad"
            secureTextEntry
            maxLength={6}
            placeholder="Enter new PIN"
            style={styles.input}
          />
          {error ? <ThemedText style={styles.error}>{error}</ThemedText> : null}
          <TouchableOpacity style={styles.button} onPress={handleSetupNext}>
            <ThemedText lightColor="#fff" darkColor="#fff" className="text-lg">Next</ThemedText>
          </TouchableOpacity>
        </>
      )}

      {mode === 'confirm' && (
        <>
          <ThemedText className="text-3xl font-extrabold">Confirm PIN</ThemedText>
          <TextInput
            value={confirmPin}
            onChangeText={setConfirmPin}
            keyboardType="number-pad"
            secureTextEntry
            maxLength={6}
            placeholder="Re-enter PIN"
            style={styles.input}
          />
          {error ? <ThemedText style={styles.error}>{error}</ThemedText> : null}
          <TouchableOpacity style={styles.button} onPress={handleSavePin}>
            <ThemedText lightColor="#fff" darkColor="#fff" className="text-lg">Save PIN</ThemedText>
          </TouchableOpacity>
        </>
      )}

      {mode === 'enter' && (
        <>
          <ThemedText className="text-3xl font-extrabold">Enter PIN</ThemedText>
          <TextInput
            value={pin}
            onChangeText={setPin}
            keyboardType="number-pad"
            secureTextEntry
            maxLength={6}
            placeholder="••••"
            style={styles.input}
          />
          {error ? <ThemedText style={styles.error}>{error}</ThemedText> : null}
          <TouchableOpacity style={styles.button} onPress={handleUnlock}>
            <ThemedText lightColor="#fff" darkColor="#fff" className="text-lg">Unlock</ThemedText>
          </TouchableOpacity>
        </>
      )}
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 16,
  },
  input: {
    width: '60%',
    fontSize: 24,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#111827',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  error: {
    color: '#b91c1c',
  },
});


