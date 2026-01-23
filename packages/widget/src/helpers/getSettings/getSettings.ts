import LayerSwapApiClient from "../../lib/apiClients/layerSwapApiClient";

export async function getSettings(apiKey: string) {

    const apiClient = new LayerSwapApiClient()
    LayerSwapApiClient.apiKey = apiKey

    try {
        // Fetch all data in parallel for faster page load (async-parallel)
        const [
            { data: networkData },
            { data: sourceExchangesData },
            { data: sourceRoutes },
            { data: destinationRoutes },
        ] = await Promise.all([
            apiClient.GetLSNetworksAsync(),
            apiClient.GetSourceExchangesAsync(),
            apiClient.GetRoutesAsync('sources'),
            apiClient.GetRoutesAsync('destinations'),
        ])

        if (!networkData) return
    
        const settings = {
            networks: networkData,
            sourceExchanges: sourceExchangesData || [],
            sourceRoutes: sourceRoutes || [],
            destinationRoutes: destinationRoutes || []
        }
    
        return settings
    }
    catch (error) {
        return null
    }

}