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

    const themeData = await getThemeData(context.query)

    return {
        props: { settings, themeData, apiKey }
    }
}