import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Animated, Vibration } from 'react-native';

const STORAGE_KEY = 'devicePin';

export type PinMode = 'loading' | 'setup' | 'confirm' | 'enter' | 'forgot' | 'reset';

export const usePinLogic = () => {
  const router = useRouter();
  const [mode, setMode] = useState<PinMode>('loading');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState<string>('');
  const [shakeAnimation] = useState(new Animated.Value(0));
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutTime, setLockoutTime] = useState<Date | null>(null);

  // Initialize PIN state
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        const attempts = await AsyncStorage.getItem('pinAttempts');
        const lockout = await AsyncStorage.getItem('pinLockout');
        
        if (lockout) {
          const lockoutDate = new Date(lockout);
          const now = new Date();
          const timeDiff = now.getTime() - lockoutDate.getTime();
          const minutesDiff = timeDiff / (1000 * 60);
          
          if (minutesDiff < 5) { // 5 minute lockout
            setIsLocked(true);
            setLockoutTime(lockoutDate);
            setMode('forgot');
          } else {
            // Clear lockout after 5 minutes
            await AsyncStorage.removeItem('pinAttempts');
            await AsyncStorage.removeItem('pinLockout');
          }
        }
        
        if (attempts) {
          setFailedAttempts(parseInt(attempts));
        }
        
        setMode(saved ? 'enter' : 'setup');
      } catch {
        setMode('setup');
      }
    })();
  }, []);

  // Shake animation for errors
  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnimation, { toValue: 10, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: -10, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: 10, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: 0, duration: 100, useNativeDriver: true }),
    ]).start();
  };

  // Handle keypad input
  const handleKeyPress = (digit: string) => {
    if (mode === 'confirm') {
      if (confirmPin.length < 6) {
        setConfirmPin(prev => prev + digit);
      }
    } else {
      if (pin.length < 6) {
        setPin(prev => prev + digit);
      }
    }
    setError('');
  };

  // Handle delete
  const handleDelete = () => {
    if (mode === 'confirm') {
      setConfirmPin(prev => prev.slice(0, -1));
    } else {
      setPin(prev => prev.slice(0, -1));
    }
    setError('');
  };

  // Handle clear
  const handleClear = () => {
    if (mode === 'confirm') {
      setConfirmPin('');
    } else {
      setPin('');
    }
    setError('');
  };

  // Handle retry during PIN creation
  const handleRetry = () => {
    setPin('');
    setConfirmPin('');
    setMode('setup');
    setError('');
  };

  // Handle forgot PIN
  const handleForgotPin = async () => {
    try {
      // Clear all PIN data
      await AsyncStorage.removeItem(STORAGE_KEY);
      await AsyncStorage.removeItem('pinAttempts');
      await AsyncStorage.removeItem('pinLockout');
      
      // Reset state
      setPin('');
      setConfirmPin('');
      setFailedAttempts(0);
      setIsLocked(false);
      setLockoutTime(null);
      setMode('setup');
      setError('');
    } catch {
      setError('Failed to reset PIN. Please try again.');
    }
  };

  // Handle lockout timer
  const getRemainingTime = () => {
    if (!lockoutTime) return 0;
    const now = new Date();
    const timeDiff = now.getTime() - lockoutTime.getTime();
    const minutesDiff = timeDiff / (1000 * 60);
    return Math.max(0, 5 - Math.floor(minutesDiff));
  };

  // Auto-submit when PIN is complete
  useEffect(() => {
    if (mode === 'setup' && pin.length === 4) {
      setTimeout(() => setMode('confirm'), 300);
    } else if (mode === 'confirm' && confirmPin.length === 4) {
      handleSavePin();
    } else if (mode === 'enter' && pin.length === 4) {
      handleUnlock();
    }
  }, [pin, confirmPin, mode]);

  const handleSavePin = async () => {
    setError('');
    if (pin !== confirmPin) {
      setError('PINs do not match.');
      shake();
      Vibration.vibrate(100);
      setConfirmPin('');
      return;
    }
    try {
      await AsyncStorage.setItem(STORAGE_KEY, pin);
      router.replace('/(tabs)/sell');
    } catch {
      setError('Failed to save PIN. Please try again.');
      shake();
      Vibration.vibrate(100);
    }
  };

  const handleUnlock = async () => {
    setError('');
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved && pin === saved) {
        // Reset failed attempts on successful login
        await AsyncStorage.removeItem('pinAttempts');
        await AsyncStorage.removeItem('pinLockout');
        setFailedAttempts(0);
        router.replace('/(tabs)/sell');
      } else {
        const newAttempts = failedAttempts + 1;
        setFailedAttempts(newAttempts);
        await AsyncStorage.setItem('pinAttempts', newAttempts.toString());
        
        if (newAttempts >= 3) {
          // Lock out after 3 failed attempts
          const lockoutDate = new Date();
          await AsyncStorage.setItem('pinLockout', lockoutDate.toISOString());
          setIsLocked(true);
          setLockoutTime(lockoutDate);
          setMode('forgot');
          setError('Too many failed attempts. PIN is locked for 5 minutes.');
        } else {
          setError(`Incorrect PIN. ${3 - newAttempts} attempts remaining.`);
        }
        
        shake();
        Vibration.vibrate(100);
        setPin('');
      }
    } catch {
      setError('Error reading PIN.');
      shake();
      Vibration.vibrate(100);
    }
  };

  return {
    // State
    mode,
    pin,
    confirmPin,
    error,
    shakeAnimation,
    failedAttempts,
    isLocked,
    lockoutTime,
    
    // Actions
    handleKeyPress,
    handleDelete,
    handleClear,
    handleRetry,
    handleForgotPin,
    getRemainingTime,
    setMode,
  };
};
