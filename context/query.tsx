import React from 'react'

const QueryStateContext = React.createContext<any>(null);


export function QueryProvider({ children, query }) {
    const [missions, setMissions] = React.useState([]);
  
    const updateFns = {
      // if we need to modify the missions, register those functions here
    };
  
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
