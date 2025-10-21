"use client"
import { LayerSwapAppSettings } from '@layerswap/widget/types';
import React, { Context, FC } from 'react'

export const SettingsStateContext = React.createContext<LayerSwapAppSettings | undefined>(undefined);

export const SettingsProvider: FC<{ data: LayerSwapAppSettings | undefined, children?: React.ReactNode }> = ({ children, data }) => {
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
