import React, { FC, useEffect } from 'react'
import { usePersistedState } from '../hooks/usePersistedState';
import { QueryParams } from '../Models/QueryParams';

const STORAGE_KEY = "settings_query_params"

export const QueryStateContext = React.createContext<QueryParams>(null);

const QueryProvider: FC<{ query: QueryParams, children?: React.ReactNode }> = ({ query, children }) => {

  const [data, setData] = usePersistedState<QueryParams>(mapLegacyQueryParams(query), STORAGE_KEY, 'sessionStorage');

  useEffect(() => {
    const emptyParams = new QueryParams()
    if (query && Object.keys(emptyParams).some(key => query[key] !== undefined)) {
      setData(mapLegacyQueryParams(query));
    }
  }, [query])

  return (
    <QueryStateContext.Provider value={mapLegacyQueryParams(query)}>
      {children}
    </QueryStateContext.Provider>
  );
}

function mapLegacyQueryParams(params: QueryParams) {
  return {
    ...params,
    ...(params.sourceExchangeName ? { from: params.sourceExchangeName } : {}),
    ...(params.destNetwork ? { to: params.destNetwork } : {}),
    ...(params.lockExchange ? { lockFrom: params.lockExchange } : {}),
    ...(params.lockNetwork ? { lockTo: params.lockNetwork } : {}),
  }
}

export function useQueryState() {
  const data = React.useContext(QueryStateContext);

  if (data === undefined) {
    throw new Error('useQueryState must be used within a QueryStateProvider');
  }

  return data;
}

export default QueryProvider;
