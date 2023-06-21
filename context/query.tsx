import React, { FC, useEffect, useState } from 'react'
import { usePersistedState } from '../hooks/usePersistedState';
import useStorage from '../hooks/useStorage';
import { QueryParams } from '../Models/QueryParams';

const STORAGE_KEY = "settings_query_params"

const QueryStateContext = React.createContext<QueryParams>(null);

const QueryProvider: FC<{ query: QueryParams }> = ({ query, children }) => {

  const [data, setData] = usePersistedState<QueryParams>(mapLegacyQueryParams(query), STORAGE_KEY, 'sessionStorage');

  useEffect(() => {
    const emptyParams = new QueryParams()
    if (query && Object.keys(emptyParams).some(key => query[key] !== undefined)) {
      setData(mapLegacyQueryParams(query));
    }
  }, [query])

  return (
    <QueryStateContext.Provider value={data}>
      {children}
    </QueryStateContext.Provider>
  );
}

function mapLegacyQueryParams(params: QueryParams) {
  return {
    ...params, 
    from:params.from ?? params.sourceExchangeName,
    to : params.to ?? params.destNetwork,
    lockFrom : params.lockFrom ?? params.lockExchange,
    lockTo : params.lockTo ?? params.lockNetwork
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
