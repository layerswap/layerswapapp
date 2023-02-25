import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { storageAvailable, storageType } from '../helpers/storageAvailable';

type PersistedState<T> = [T, Dispatch<SetStateAction<T>>];

function usePersistedState<T>(defaultValue: T, key: string, type: storageType): PersistedState<T> {
  const [value, setValue] = useState<T>(() => {
    const value = storageAvailable(type) && window.localStorage.getItem(key);

    return value ? (JSON.parse(value) as T) : defaultValue;
  });

  useEffect(() => {
    storageAvailable(type) && window.localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue];
}

export { usePersistedState };