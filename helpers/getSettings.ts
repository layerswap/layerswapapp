import LayerSwapApiClient from "../lib/layerSwapApiClient";
import { getThemeData } from "./settingsHelper";

export async function getServerSideProps(context) {

    context.res.setHeader(
        'Cache-Control',
        's-maxage=60, stale-while-revalidate'
    );

    const apiClient = new LayerSwapApiClient()

    const { data: networkData } = await apiClient.GetLSNetworksAsync()
    const { data: exchangeData } = await apiClient.GetExchangesAsync()
    debugger
    const { data: sourceRoutes } = await apiClient.GetRoutesAsync('sources')
    const { data: destinationRoutes } = await apiClient.GetRoutesAsync('destinations')

    if (!networkData || !exchangeData) return

    const settings = {
        networks: networkData,
        exchanges: exchangeData,
        sourceRoutes: sourceRoutes,
        destinationRoutes: destinationRoutes
    }

    const themeData = await getThemeData(context.query)

    return {
        props: { settings, themeData }
    }
}