import React, { Context, FC, useEffect, useState } from 'react'
import { LayerSwapAppSettings } from '../Models/LayerSwapAppSettings';
import inIframe from '@/components/utils/inIframe';

type SettingsState = LayerSwapAppSettings & { isEmbedded?: boolean }

export const SettingsStateContext = React.createContext<SettingsState | null>(null);

export const SettingsProvider: FC<{ data: LayerSwapAppSettings, children?: React.ReactNode }> = ({ children, data }) => {
  const [embedded, setEmbedded] = useState<boolean>(false)
  useEffect(() => {
    setEmbedded(inIframe())
  }, [])

  return (
    <SettingsStateContext.Provider value={{ ...data, isEmbedded: embedded }}>
      {children}
    </SettingsStateContext.Provider>
  );
}

export function useSettingsState() {
  const data = React.useContext<SettingsState>(SettingsStateContext as Context<SettingsState>);

  if (data === undefined) {
    throw new Error('useSettingsState must be used within a SettingsProvider');
  }

  return data;
}
