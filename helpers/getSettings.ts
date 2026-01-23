import LayerSwapApiClient from "../lib/apiClients/layerSwapApiClient";
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

    try {
        // Fetch all data in parallel for faster page load (async-parallel)
        const [
            { data: networkData },
            { data: sourceExchangesData },
            { data: sourceRoutes },
            { data: destinationRoutes },
            themeData
        ] = await Promise.all([
            apiClient.GetLSNetworksAsync(),
            apiClient.GetSourceExchangesAsync(),
            apiClient.GetRoutesAsync('sources'),
            apiClient.GetRoutesAsync('destinations'),
            getThemeData(context.query)
        ])

        if (!networkData) return
    
        const settings = {
            networks: networkData,
            sourceExchanges: sourceExchangesData || [],
            sourceRoutes: sourceRoutes || [],
            destinationRoutes: destinationRoutes || []
        }
    
        return {
            props: { settings, themeData, apiKey }
        }
    }
    catch (error) {
        console.error(error)
        return {
            props: { settings: null, themeData: null, apiKey: null }
        }
    }

}