import React, { Context, FC } from 'react'
import { LayerSwapAppSettings } from '../Models/LayerSwapAppSettings';

export const SettingsStateContext = React.createContext<LayerSwapAppSettings | null>(null);

export const SettingsProvider: FC<{ data: LayerSwapAppSettings, children?: React.ReactNode }> = ({ children, data }) => {
  throw new Error('SettingsProvider is deprecated, please use SettingsProvider in context/settings.tsx');
  return (
    <SettingsStateContext.Provider value={data}>
      {children}
    </SettingsStateContext.Provider>
  );
}

export function useSettingsState() {
  const data = React.useContext<LayerSwapAppSettings>(SettingsStateContext as Context<LayerSwapAppSettings>);

  if (data === undefined) {
    throw new Error('useSettingsState must be used within a SettingsProvider');
  }

  return data;
}
