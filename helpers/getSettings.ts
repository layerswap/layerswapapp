import LayerSwapApiClient from "../lib/layerSwapApiClient";
import { getThemeData } from "./settingsHelper";

export async function getServerSideProps(context) {

    context.res.setHeader(
        'Cache-Control',
        's-maxage=60, stale-while-revalidate'
    );

    const apiClient = new LayerSwapApiClient()
    const { data: netWorkData } = await apiClient.GetLSNetworksAsync()
    const { data: exchangeData } = await apiClient.GetExchangesAsync()

    if (!netWorkData || !exchangeData) return

    const settings = {
        networks: netWorkData,
        exchanges: exchangeData,
    }

    const themeData = await getThemeData(context.query)

    return {
        props: { settings, themeData }
    }
}