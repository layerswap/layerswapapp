import { THEME_COLORS } from "../Models/Theme";
import LayerSwapApiClient from "../lib/layerSwapApiClient";

export async function getServerSideProps(context) {

    context.res.setHeader(
        'Cache-Control',
        's-maxage=60, stale-while-revalidate'
    );

    var apiClient = new LayerSwapApiClient();
    const { data: settings } = await apiClient.GetSettingsAsync()
    let themeData = null
    try {
        const theme_name = context.query.theme || context.query.addressSource
        // const internalApiClient = new InternalApiClient()
        // const themeData = await internalApiClient.GetThemeData(theme_name);
        // result.themeData = themeData as ThemeData;
        themeData = THEME_COLORS[theme_name] || null;
    }
    catch (e) {
        console.log(e)
    }

    return {
        props: { settings, themeData }
    }
}