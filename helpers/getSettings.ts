import LayerSwapApiClient from "../lib/layerSwapApiClient";
import { getThemeData } from "./settingsHelper";

export async function getServerSideProps(context) {

    context.res.setHeader(
        'Cache-Control',
        's-maxage=60, stale-while-revalidate'
    );

    const app = context.query?.appName || context.query?.addressSource
    const apiKey = JSON.parse(process.env.API_KEYS || "{}")?.[app] || process.env.NEXT_PUBLIC_API_KEY
    LayerSwapApiClient.apiKey = apiKey
    const apiClient = new LayerSwapApiClient()

    const { data: networkData } = await apiClient.GetLSNetworksAsync()
    const { data: sourceExchangesData } = { data: [] } //await apiClient.GetSourceExchangesAsync()
    const { data: destinationExchangesData } = { data: [] } //await apiClient.GetDestinationExchangesAsync()

    const { data: sourceRoutes } = await apiClient.GetLSNetworksAsync()
    const { data: destinationRoutes } = await apiClient.GetLSNetworksAsync()

    if (!networkData) return

    const settings = {
        networks: networkData,
        sourceExchanges: sourceExchangesData || [],
        destinationExchanges: destinationExchangesData || [],
        sourceRoutes: sourceRoutes || [],
        destinationRoutes: destinationRoutes || []
    }

    const themeData = await getThemeData(context.query)

    return {
        props: { settings, themeData, apiKey }
    }
}