import LayerSwapApiClient from "../lib/apiClients/layerSwapApiClient";

export async function getSettings() {

    const apiClient = new LayerSwapApiClient()

    const { data: networkData } = await apiClient.GetLSNetworksAsync()
    const { data: sourceExchangesData } = await apiClient.GetSourceExchangesAsync()
    const { data: destinationExchangesData } = await apiClient.GetDestinationExchangesAsync()

    const { data: sourceRoutes } = await apiClient.GetRoutesAsync('sources')
    const { data: destinationRoutes } = await apiClient.GetRoutesAsync('destinations')



    if (!networkData) return

    const settings = {
        networks: networkData,
        sourceExchanges: sourceExchangesData || [],
        destinationExchanges: destinationExchangesData || [],
        sourceRoutes: sourceRoutes || [],
        destinationRoutes: destinationRoutes || []
    }

    return settings
}