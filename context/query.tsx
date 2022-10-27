import React, { FC, useEffect, useState } from 'react'
import useStorage from '../hooks/useStorage';
import { QueryParams } from '../Models/QueryParams';

const STORAGE_KEY = "settings_query_params"

const QueryStateContext = React.createContext<QueryParams>(null);

const QueryProvider: FC<{ query: QueryParams }> = ({ query, children }) => {

  const [data, setData] = useState<QueryParams>(query)
  const { setItem, getItem } = useStorage()
  useEffect(() => {
    const emptyParams = new QueryParams()
    if (query && Object.keys(emptyParams).some(key => query[key] !== undefined))
      setItem(STORAGE_KEY, JSON.stringify(data), "session")
  }, [query])

  useEffect(() => {
    updateData()
  }, [])

  const updateData = () => {
    const storageData = JSON.parse(getItem(STORAGE_KEY, "session") || "{}") as QueryParams
    setData(storageData)
  }

  useEffect(() => {
    document.addEventListener(
      'storageChange',
      updateData,
      false
    )
    return () => document.removeEventListener('storageChange', () => setData(undefined))
  }, [])

  return (
    <QueryStateContext.Provider value={data}>
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

export default QueryProvider;