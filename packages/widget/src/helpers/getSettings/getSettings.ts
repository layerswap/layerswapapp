import LayerSwapApiClient from "../../lib/apiClients/layerSwapApiClient";

export async function getSettings(apiKey: string) {

    const apiClient = new LayerSwapApiClient()
    LayerSwapApiClient.apiKey = apiKey

    try {
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
    catch (error) {
        return null
    }

}