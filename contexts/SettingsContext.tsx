import { SyncSettings } from '@/components/sync/SyncSettings';
import { useSync } from '@/hooks/useSync';
import React, { createContext, useContext, useState } from 'react';

interface SettingsContextType {
  showSettings: () => void;
  hideSettings: () => void;
  isSettingsVisible: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const { syncState, syncNow } = useSync();

  const showSettings = () => setIsSettingsVisible(true);
  const hideSettings = () => setIsSettingsVisible(false);

  const handleSyncPress = async () => {
    try {
      await syncNow();
    } catch (error) {
      console.error('Sync failed:', error);
    }
  };

  return (
    <SettingsContext.Provider value={{ showSettings, hideSettings, isSettingsVisible }}>
      {children}
      <SyncSettings
        visible={isSettingsVisible}
        onClose={hideSettings}
        syncState={syncState}
        onSyncNow={handleSyncPress}
      />
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
