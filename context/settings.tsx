import React, { Context, FC, useState, useCallback } from 'react'
import { LayerSwapAppSettings } from '../Models/LayerSwapAppSettings';
import { LayerSwapSettings } from '../Models/LayerSwapSettings';
import { useSettingsRefresh } from '@/hooks/useSettingsRefresh';
import LayerSwapApiClient from '@/lib/apiClients/layerSwapApiClient';

interface SettingsContextValue {
  settings: LayerSwapAppSettings | null;
}

export const SettingsStateContext = React.createContext<SettingsContextValue | null>(null);

export const SettingsProvider: FC<{ data: LayerSwapAppSettings, children?: React.ReactNode }> = ({ children, data }) => {
  const [settings, setSettings] = useState<LayerSwapAppSettings | null>(data);

  const apiKey = LayerSwapApiClient.apiKey;
  const refreshSettings = useCallback((newSettings: LayerSwapSettings) => {
    const updatedAppSettings = new LayerSwapAppSettings(newSettings);
    setSettings(updatedAppSettings);
  }, []);

  useSettingsRefresh({
    apiKey: apiKey || '',
    onSettingsUpdate: refreshSettings
  });

  const contextValue: SettingsContextValue = {
    settings,
  };

  return (
    <SettingsStateContext.Provider value={contextValue}>
      {children}
    </SettingsStateContext.Provider>
  );
}

export function useSettingsState() {
  const context = React.useContext<SettingsContextValue>(SettingsStateContext as Context<SettingsContextValue>);

  if (context === null || context === undefined) {
    throw new Error('useSettingsState must be used within a SettingsProvider');
  }

  if (context.settings === null) {
    throw new Error('Settings not initialized');
  }

  return context.settings;
}
