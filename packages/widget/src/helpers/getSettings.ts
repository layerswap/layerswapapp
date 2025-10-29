import { useEffect, useState } from "react";
import LayerSwapApiClient from "../lib/apiClients/layerSwapApiClient";
import { LayerSwapSettings } from "@/types";

export async function getSettings(apiKey: string) {

    const apiClient = new LayerSwapApiClient()
    LayerSwapApiClient.apiKey = apiKey

    const { data: networkData } = await apiClient.GetLSNetworksAsync()
    const { data: sourceExchangesData } = await apiClient.GetSourceExchangesAsync()

    const { data: sourceRoutes } = await apiClient.GetRoutesAsync('sources')
    const { data: destinationRoutes } = await apiClient.GetRoutesAsync('destinations')

    if (!networkData) return

    const settings = {
        networks: networkData,
        sourceExchanges: sourceExchangesData || [],
        sourceRoutes: sourceRoutes || [],
        destinationRoutes: destinationRoutes || []
    }

    return settings
}

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