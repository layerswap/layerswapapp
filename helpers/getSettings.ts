import { THEME_COLORS, ThemeData } from "../Models/Theme";
import LayerSwapApiClient from "../lib/layerSwapApiClient";

export async function getServerSideProps(context) {

    context.res.setHeader(
        'Cache-Control',
        's-maxage=60, stale-while-revalidate'
    );

    var apiClient = new LayerSwapApiClient();
    const { data: settings } = await apiClient.GetSettingsAsync()
    const theme_name = context.query.theme || context.query.addressSource
    const themeData = await getThemeData(theme_name)

    return {
        props: { settings, themeData }
    }
}

const getThemeData = async (theme_name: string) => {
    try {
        // const internalApiClient = new InternalApiClient()
        // const themeData = await internalApiClient.GetThemeData(theme_name);
        // result.themeData = themeData as ThemeData;
        return THEME_COLORS[theme_name] || null;
    }
    catch (e) {
        console.log(e)
    }
} 