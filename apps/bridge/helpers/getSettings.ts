import { getThemeData } from "./settingsHelper";
import { encodeSettingsForSSR, getSettings } from "@layerswap/widget";
import { resolvePersistantQueryParams } from "./querryHelper";
import { resolveExtendedRouteFlags } from "../flags";
import { AppSettings, LayerswapApiClient } from "@layerswap/widget/internal";

export async function getServerSideProps(context) {

    context.res.setHeader(
        'Cache-Control',
        's-maxage=60, stale-while-revalidate'
    );
    const app = context.query?.appName || context.query?.addressSource
    const apiKey = JSON.parse(process.env.API_KEYS || "{}")?.[app] || process.env.NEXT_PUBLIC_API_KEY
    LayerswapApiClient.apiBaseEndpoint = process.env.NEXT_PUBLIC_LS_API || AppSettings.LayerswapApiUri
    // Theme, settings, and flag resolution are independent — start them
    // together so neither flags nor theme serialize behind the settings fetch.
    // `includeFeatureFlags: false` skips the widget's public-endpoint flags
    // fetch: this SSR path resolves the flags first-party via the Vercel Flags
    // SDK (avoids a self-HTTP call). The resolved extended-route kill switches
    // are carried into the SSR settings, so LayerSwapAppSettings gates which
    // extended providers contribute.
    const [themeData, settings, featureFlags] = await Promise.all([
        getThemeData(context.query),
        getSettings(apiKey, { includeFeatureFlags: false }),
        resolveExtendedRouteFlags(context.req),
    ])
    // Preserve a failed settings request as null. Spreading null into an object
    // produced `{ featureFlags }`, which the serializer turned into
    // `networks: []`; the client then attempted to initialize Wagmi without a
    // chain and crashed while reading `chains[0].id`.
    const compressedSettings = encodeSettingsForSSR(
        settings ? { ...settings, featureFlags } : null
    )

    // Extract persistent query params to pass to widget as initial values
    const initialValues = resolvePersistantQueryParams(context.query) || {}

    return {
        props: { settings: compressedSettings, themeData, apiKey, initialValues }
    }
}
