import LayerSwapApiClient from "../lib/layerSwapApiClient";

export async function getServerSideSettings(context) {

    context.res.setHeader(
        'Cache-Control',
        's-maxage=60, stale-while-revalidate'
    );

    var apiClient = new LayerSwapApiClient();
    const { data: settings } = await apiClient.GetSettingsAsync()
console.log(settings,"settings")
    return {
        props: { settings }
    }
}