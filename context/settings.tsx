import React from 'react'
import { LayerSwapSettings } from '../Models/LayerSwapSettings';

const SettingsStateContext = React.createContext<LayerSwapSettings | null>(null);

export function SettingsProvider({ children, data }) {
  return (
    <SettingsStateContext.Provider value={data}>
      {children}
    </SettingsStateContext.Provider>
  );
}

export function useSettingsState() {
  const data = React.useContext(SettingsStateContext);

  if (data === undefined) {
    throw new Error('useSettingsState must be used within a SettingsProvider');
  }

  return data;
}
