import React, { Context, FC } from 'react'
import { QueryParams } from '../Models/QueryParams';

export const QueryStateContext = React.createContext<QueryParams | null>(null);

const QueryProvider: FC<{ query: QueryParams, children?: React.ReactNode }> = ({ query, children }) => {
  return (
    <QueryStateContext.Provider value={mapLegacyQueryParams(query)}>
      {children}
    </QueryStateContext.Provider>
  );
}

function mapLegacyQueryParams(params: QueryParams): QueryParams {
  return {
    ...params,
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
  const data = React.useContext<QueryParams>(QueryStateContext as Context<QueryParams>);

  if (data === undefined) {
    throw new Error('useQueryState must be used within a QueryStateProvider');
  }

  return data;
}

export default QueryProvider;
