import { storageType } from "../helpers/storageAvailable";

type UseStorageReturnValue = {
  getItem: (key: string, type?: storageType) => string;
  setItem: (key: string, value: string, type?: storageType) => boolean;
  removeItem: (key: string, type?: storageType) => void;
};

const useStorage = (): UseStorageReturnValue => {
  const isBrowser: boolean = ((): boolean => typeof window !== 'undefined')();
  const getItem = (key: string, type?: storageType): string => {
    return isBrowser ? window[type][key] : '';
  };

  const setItem = (key: string, value: string, type?: storageType): boolean => {
    if (isBrowser) {
      window[type].setItem(key, value);
      return true;
    }

    return false;
  };

  const removeItem = (key: string, type?: storageType): void => {
    window[type].removeItem(key);
  };

  return {
    getItem,
    setItem,
    removeItem,
  };
};

export default useStorage;