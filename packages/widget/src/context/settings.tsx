import React, { Context, FC } from 'react'
import { LayerSwapAppSettings } from '../Models/LayerSwapAppSettings';
import { InitialSettings } from '../Models/InitialSettings';

export interface SettingsContextValue {
  settings: LayerSwapAppSettings;
  initialSettings: InitialSettings;
}

export const SettingsStateContext = React.createContext<SettingsContextValue | null>(null);

export const SettingsProvider: FC<{
  initialLayerswapData: LayerSwapAppSettings,
  initialSettings?: InitialSettings,
  children?: React.ReactNode
}> = ({ children, initialLayerswapData, initialSettings: initialSettings = {} }) => {
  const value: SettingsContextValue = {
    settings: initialLayerswapData,
    initialSettings: mapLegacySettings(initialSettings)
  };

  return (
    <SettingsStateContext.Provider value={value}>
      {children}
    </SettingsStateContext.Provider>
  );
}

export function useSettingsState() {
  const data = React.useContext<SettingsContextValue>(SettingsStateContext as Context<SettingsContextValue>);
debugger
  if (data === undefined) {
    throw new Error('useSettingsState must be used within a SettingsProvider');
  }

  return data.settings;
}

export function useInitialSettings() {
  const data = React.useContext<SettingsContextValue>(SettingsStateContext as Context<SettingsContextValue>);

  if (data === undefined) {
    throw new Error('useInitialSettings must be used within a SettingsProvider');
  }

  return data.initialSettings;
}

function mapLegacySettings(params: InitialSettings): InitialSettings {
  return {
    ...params,
    ...(params.destAddress ? { destination_address: params.destAddress } : {}),
    ...(params.fromExchange ? { from: params.fromExchange } : {}),
    ...(params.sourceExchangeName ? { from: params.sourceExchangeName } : {}),
    ...(params.destNetwork ? { to: params.destNetwork } : {}),
    ...(params.lockExchange ? { lockFrom: params.lockExchange } : {}),
    ...(params.lockNetwork ? { lockTo: params.lockNetwork } : {}),
    ...(params.addressSource ? { appName: params.addressSource } : {}),
    ...(params.asset ? { [params.to ? "toAsset" : "fromAsset"]: params.asset } : {}),
    ...(params.lockAsset ? { [params.to ? "lockToAsset" : "lockFromAsset"]: params.lockAsset } : {}),
  }
}
