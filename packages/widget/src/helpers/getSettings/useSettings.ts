'use client'
import { useEffect, useState } from "react";
import { LayerSwapSettings } from "../../Models/LayerSwapSettings";
import { getSettings } from "./getSettings";

export function useSettings(apiKey: string) {
    const [loading, setLoading] = useState(true)
    const [settings, setSettings] = useState<LayerSwapSettings | null>(null)

    useEffect(() => {
        (async () => {
            const settings = await getSettings(apiKey)
            if (!settings) throw new Error('Failed to fetch settings')
            setSettings(settings)
            setLoading(false)
        })()
    }, [])

    return { settings, loading }
}