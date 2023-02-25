import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { storageAvailable } from '../helpers/storageAvailable';

type PersistedState<T> = [T, Dispatch<SetStateAction<T>>];

function usePersistedState<T>(defaultValue: T, key: string): PersistedState<T> {
  const [value, setValue] = useState<T>(() => {
    const value = storageAvailable('localStorage') && window.localStorage.getItem(key);

    return value ? (JSON.parse(value) as T) : defaultValue;
  });

  useEffect(() => {
    storageAvailable('localStorage') && window.localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue];
}

export { usePersistedState };