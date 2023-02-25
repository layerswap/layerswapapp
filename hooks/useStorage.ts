import { storageAvailable, storageType } from "../helpers/storageAvailable";

type UseStorageReturnValue = {
  getItem: (key: string, type?: storageType) => string;
  setItem: (key: string, value: string, type?: storageType) => boolean;
  removeItem: (key: string, type?: storageType) => void;
};

const useStorage = (): UseStorageReturnValue => {
  const getItem = (key: string, type?: storageType): string => {
    return storageAvailable(type) ? window[type][key] : '';
  };

  const setItem = (key: string, value: string, type?: storageType): boolean => {
    if (storageAvailable(type)) {
      window[type].setItem(key, value);
      return true;
    }

    return false;
  };

  const removeItem = (key: string, type?: storageType): void => {
    storageAvailable(type) && window[type].removeItem(key);
  };

  return {
    getItem,
    setItem,
    removeItem,
  };
};

export default useStorage;