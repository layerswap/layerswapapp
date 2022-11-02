import React, { FC } from 'react'
import { LayerSwapSettings } from '../Models/LayerSwapSettings';

const SettingsStateContext = React.createContext<LayerSwapSettings | null>(null);



export const SettingsProvider: FC<LayerSwapSettings> = ({ children, data, validSignatureisPresent }) => {
  return (
    <SettingsStateContext.Provider value={{ data: data, validSignatureisPresent: validSignatureisPresent }}>
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
