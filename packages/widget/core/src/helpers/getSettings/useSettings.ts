'use client'
import { useEffect, useState } from "react";
import { LayerSwapSettings } from "../../Models/LayerSwapSettings";
import { getSettings } from "./getSettings";

export function useSettings(apiKey: string) {
    const [loading, setLoading] = useState(true)
    const [settings, setSettings] = useState<LayerSwapSettings | null>(null)
    const [error, setError] = useState<Error | null>(null)

    useEffect(() => {
        let cancelled = false;
        (async () => {
            // A throw here would be an unhandled rejection (nothing above an
            // effect catches async errors) and would strand `loading: true`
            // forever — report failure through state instead.
            try {
                const settings = await getSettings(apiKey)
                if (!settings) throw new Error('Failed to fetch settings')
                if (!cancelled) setSettings(settings)
            } catch (e) {
                if (!cancelled) setError(e instanceof Error ? e : new Error(String(e)))
            } finally {
                if (!cancelled) setLoading(false)
            }
        })()
        return () => { cancelled = true }
    }, [])

    return { settings, loading, error }
}