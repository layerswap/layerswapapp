import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { checkStorageIsAvailable, storageType } from '../helpers/storageAvailable';

type PersistedState<T> = [T, Dispatch<SetStateAction<T>>];

function usePersistedState<T>(defaultValue: T, key: string, type: storageType = 'localStorage'): PersistedState<T> {
    const [value, setValue] = useState<T>(() => {
        const value = checkStorageIsAvailable(type) && window[type]?.getItem(key);
        return (value && (isJsonString(value))) ? (JSON.parse(value || "null") as T) : defaultValue;
    });

    useEffect(() => {
        checkStorageIsAvailable(type) && window[type]?.setItem(key, JSON.stringify(value));
    }, [key, value]);

    return [value, (newValue) => {
        checkStorageIsAvailable(type) && window[type]?.setItem(key, JSON.stringify(newValue));
        setValue(newValue);
    }];
}

function isJsonString(str: string) {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}

export { usePersistedState };