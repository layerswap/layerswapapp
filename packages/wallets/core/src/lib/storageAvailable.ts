export type storageType = "localStorage" | "sessionStorage"

export function checkStorageIsAvailable(type: storageType) {
    try {
        const storage = window[type]
        const key = "__storage_test__"
        storage.setItem(key, key)
        storage.removeItem(key)
        return true
    } catch {
        return false
    }
}
