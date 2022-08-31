import React from 'react'
import { QueryParams } from '../Models/QueryParams';

const QueryStateContext = React.createContext<QueryParams>(null);

export function QueryProvider({ children, query }) {
    return (
      <QueryStateContext.Provider value={query}>
          {children}
      </QueryStateContext.Provider>
    );
  }

export function useQueryState() {
    const data = React.useContext(QueryStateContext);
  
    if (data === undefined) {
      throw new Error('useQueryState must be used within a QueryStateProvider');
    }
  
    return data;
  }
