"use client";
import { useEffect, useState, type Dispatch, type SetStateAction } from "react"
import { checkStorageIsAvailable, type storageType } from "@/lib/storageAvailable"

type PersistedState<T> = [T, Dispatch<SetStateAction<T>>]

function usePersistedState<T>(defaultValue: T, key: string, type: storageType = "localStorage"): PersistedState<T> {
    const [value, setValue] = useState<T>(() => {
        const savedValue = checkStorageIsAvailable(type) && window[type]?.getItem(key)
        return savedValue && isJsonString(savedValue) ? JSON.parse(savedValue) as T : defaultValue
    })

    useEffect(() => {
        if (checkStorageIsAvailable(type)) {
            window[type]?.setItem(key, JSON.stringify(value))
        }
    }, [key, value])

    return [value, newValue => {
        const resolvedValue = typeof newValue === "function"
            ? (newValue as (previous: T) => T)(value)
            : newValue
        if (checkStorageIsAvailable(type)) {
            window[type]?.setItem(key, JSON.stringify(resolvedValue))
        }
        setValue(resolvedValue)
    }]
}

function isJsonString(value: string) {
    try {
        JSON.parse(value)
    } catch {
        return false
    }
    return true
}

export { usePersistedState }