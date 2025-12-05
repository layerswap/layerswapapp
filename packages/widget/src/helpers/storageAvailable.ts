export type storageType = 'localStorage' |  'sessionStorage';

export function checkStorageIsAvailable(type: storageType) {
    try {
        var storage = window[type],
            x = '__storage_test__';
        storage.setItem(x, x);
        storage.removeItem(x);
        return true;
    }
    catch(e) {
        return false;
    }
}