import LayerSwapApiClient from "../../lib/apiClients/layerSwapApiClient";
import { fetchExtendedRouteFlags } from "../../lib/extendedRoutes/remoteFlags";

export type GetSettingsOptions = {
    /** Cancel the backend settings requests when the caller's deadline expires or it disconnects. */
    signal?: AbortSignal
    /**
     * Also resolve the extended-route kill switches from the public flags endpoint
     * (see `lib/extendedRoutes/remoteFlags.ts`). Defaults to true so callers with no
     * SSR flag resolution (CDN embeds, deposit integrations) get gated without extra
     * wiring. Pass false when the caller resolves flags first-party — the bridge's
     * `getServerSideProps` uses the Vercel Flags SDK directly and overrides
     * `featureFlags` on the returned settings.
     */
    includeFeatureFlags?: boolean
}

export async function getSettings(apiKey: string, options?: GetSettingsOptions) {

    const apiClient = new LayerSwapApiClient()
    LayerSwapApiClient.apiKey = apiKey
    const includeFeatureFlags = options?.includeFeatureFlags ?? true

    try {
        // Fetch all data in parallel for faster page load (async-parallel)
        const [
            { data: networkData },
            { data: sourceExchangesData },
            { data: sourceRoutes },
            { data: destinationRoutes },
            featureFlags,
        ] = await Promise.all([
            apiClient.GetLSNetworksAsync({ signal: options?.signal }),
            apiClient.GetSourceExchangesAsync({ signal: options?.signal }).catch(() => ({ data: [] })),
            apiClient.GetRoutesAsync('sources', true, { signal: options?.signal }),
            apiClient.GetRoutesAsync('destinations', true, { signal: options?.signal }),
            // Resolves to undefined on any failure; the extended-route registry then
            // falls back to each provider's `enabledByDefault` (fail-closed for
            // credential-bearing routes).
            includeFeatureFlags ? fetchExtendedRouteFlags() : Promise.resolve(undefined),
        ])

        if (!networkData?.length) return null

        const settings = {
            networks: networkData,
            sourceExchanges: sourceExchangesData || [],
            sourceRoutes: sourceRoutes || [],
            destinationRoutes: destinationRoutes || [],
            featureFlags,
        }

        return settings
    }
    catch (error) {
        // Keep the non-throwing contract (public export, also used in SSR).
        // Caller-controlled cancellation is expected; report other failures.
        if (!options?.signal?.aborted) {
            console.error('[layerswap/widget] Failed to fetch settings', error)
        }
        return null
    }
}
