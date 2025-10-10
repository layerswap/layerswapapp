import React, { Context, FC } from 'react'
import { InitialSettings } from '../Models/InitialSettings';

export const QueryStateContext = React.createContext<InitialSettings | null>(null);

const QueryProvider: FC<{ query: InitialSettings, children?: React.ReactNode }> = ({ query, children }) => {
  return (
    <QueryStateContext.Provider value={mapLegacyQueryParams(query)}>
      {children}
    </QueryStateContext.Provider>
  );
}

function mapLegacyQueryParams(params: InitialSettings): InitialSettings {
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

export function useQueryState() {
  const data = React.useContext<InitialSettings>(QueryStateContext as Context<InitialSettings>);

  if (data === undefined) {
    throw new Error('useQueryState must be used within a QueryStateProvider');
  }

  return data;
}

export default QueryProvider;
