import React, { FC } from 'react'
import { QueryParams } from '../Models/QueryParams';

const QueryStateContext = React.createContext<QueryParams>(null);

const QueryProvider: FC<{ query: QueryParams }> = ({ query, children }) => {
  return (
    <QueryStateContext.Provider value={mapLegacyQueryParams(query)}>
      {children}
    </QueryStateContext.Provider>
  );
}

function mapLegacyQueryParams(params: QueryParams) {
  return {
    ...params,
    from: params.from ?? params.sourceExchangeName,
    to: params.to ?? params.destNetwork,
    lockFrom: params.lockFrom ?? params.lockExchange,
    lockTo: params.lockTo ?? params.lockNetwork
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
