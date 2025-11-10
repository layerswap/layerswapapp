import { getThemeData } from "./settingsHelper";
import { getSettings } from "@layerswap/widget";
import { resolvePersistantQueryParams } from "./querryHelper";

export async function getServerSideProps(context) {

    context.res.setHeader(
        'Cache-Control',
        's-maxage=60, stale-while-revalidate'
    );
    const themeData = await getThemeData(context.query)

    const app = context.query?.appName || context.query?.addressSource
    const apiKey = JSON.parse(process.env.API_KEYS || "{}")?.[app] || process.env.NEXT_PUBLIC_API_KEY
    const settings = await getSettings(apiKey)

    // Extract persistent query params to pass to widget as initial values
    const initialValues = resolvePersistantQueryParams(context.query) || {}

    return {
        props: { settings, themeData, apiKey, initialValues }
    }
}