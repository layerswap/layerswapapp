import { useFormikContext } from "formik"
import { debounce } from "lodash"
import { useEffect, useRef } from "react"

type FieldMapping = Record<string, string>

interface UrlSyncProps {
    /** For each object key, the nested property to store in the query */
    fieldMapping?: FieldMapping
    /** List of form keys to skip entirely when syncing */
    excludeFields?: string[]
    /** Debounce delay in milliseconds */
    debounceMs?: number
}

export function UrlQuerySync({
    fieldMapping = {},
    excludeFields = [],
    debounceMs = 200,
}: UrlSyncProps) {
    const { values } = useFormikContext<Record<string, any>>()
    // Debounced replaceState to batch rapid changes
    const replaceRef = useRef(
        debounce((next: Record<string, string>) => {
            const params = new URLSearchParams(next).toString()
            const newUrl = `${window.location.pathname}${params ? '?' + params : ''}`
            window.history.replaceState(null, '', newUrl)
        }, debounceMs)
    ).current

    useEffect(() => {
        const next: Record<string, string> = {}

        Object.entries(values).forEach(([key, val]) => {
            // 1) Skip excluded fields
            if (excludeFields.includes(key)) return
            // 2) If mapping exists and value is object, pull mapped prop
            if (fieldMapping[key] && typeof val === 'object' && val != null) {
                const prop = fieldMapping[key]
                if (prop in val && val[prop] != null) {
                    next[key] = String(val[prop])
                }
            }
            // 3) Primitives: string/number/boolean
            else if (['string', 'number', 'boolean'].includes(typeof val)) {
                if (val !== '' && val != null) next[key] = String(val)
            }
            // Other objects without mapping: skip
        })

        replaceRef(next)
    }, [values, fieldMapping, excludeFields, replaceRef])

    return null
}