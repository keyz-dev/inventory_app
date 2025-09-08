import { useColorScheme as useRNColorScheme } from 'react-native';

export function useColorScheme() {
  // Keep a hook call to preserve hook order in components using this helper
  useRNColorScheme();
  return 'light' as const;
}
