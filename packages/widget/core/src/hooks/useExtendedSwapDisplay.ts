import { useMemo } from "react"
import { Token, NetworkWithTokens } from "@/Models/Network"
import { useSettingsState } from "@/context/settings"
import { ExtendedRouteRecord, useExtendedRoutesStore } from "@/stores/extendedRoutesStore"
import { SwapBasicData, SwapQuote } from "@/lib/apiClients/layerSwapApiClient"
import { resolveExtendedRoutePlan } from "@/lib/extendedRoutes/registry"
import { transformQuoteForExtendedRoute } from "@/lib/extendedRoutes/transforms"
import { buildExtendedSourceSkin } from "@/lib/extendedRoutes/skin"

export type ExtendedSwapDisplay = {
    /** Source the swap should show: the REAL network in every blockchain-functional
     * respect (name, type, chain_id, explorer templates, …) skinned with the
     * extended source's display identity (display_name/logo). Consumers use it
     * directly — no real-vs-extended reconciliation needed. */
    network: NetworkWithTokens
    /** Source token, real-functional with the extended source's display logo. */
    token: Token
    /** Persisted record for this swap (raw extended/real identity). */
    record: ExtendedRouteRecord
}

/**
 * For a given swapId, return the extended source skin if this device recorded an
 * extended-route flow for it (e.g. Hyperliquid → backend via Base). The returned
 * `network`/`token` are the REAL route wearing the extended source's display name
 * and logo, so every consumer (explorer links, status queries, summaries) stays
 * blind to the extended/real split. Returns undefined when no record exists (other
 * device, or non-extended swap), or when either side can't be resolved from
 * settings — callers fall back to the swap's real source unchanged.
 */
export function useExtendedSwapDisplay(swapId: string | undefined): ExtendedSwapDisplay | undefined {
    const { networks } = useSettingsState()
    const record = useExtendedRoutesStore(s => swapId ? s.records[swapId] : undefined)
    return useMemo(() => {
        if (!record) return undefined
        const skin = buildExtendedSourceSkin(record, networks)
        if (!skin) return undefined
        return { network: skin.network, token: skin.token, record }
    }, [record, networks])
}

export type ExtendedSwapData = {
    /** Swap basic data with the source side re-pointed at the extended network/token
     * and `requested_amount` set to A (the amount that leaves the extended source). */
    swapBasicData: SwapBasicData & { refuel: boolean }
    /** Backend quote re-denominated to the extended source (requested_amount = A,
     * fee += flat fee, completion += extra time), or the backend quote unchanged
     * when no mapping resolves. */
    quote: SwapQuote | undefined
}

/**
 * Apply the extended-route (e.g. Hyperliquid) display transforms to a loaded
 * swap's basic data and quote, keeping that provider-specific field remapping out
 * of `SwapDataProvider`. Returns undefined when this swap isn't an extended route
 * on this device — the caller then uses the real (backend) values unchanged.
 */
export function useExtendedSwapData(
    swapId: string | undefined,
    base: (SwapBasicData & { refuel: boolean }) | undefined,
    backendQuote: SwapQuote | undefined,
): ExtendedSwapData | undefined {
    const display = useExtendedSwapDisplay(swapId)
    const { sourceRoutes } = useSettingsState()
    return useMemo(() => {
        if (!display || !base) return undefined
        const { network, token, record } = display

        const swapBasicData = {
            ...base,
            source_network: network,
            source_token: token,
            requested_amount: record.sourceAmount,
            use_deposit_address: false,
        }

        // Re-denominate the backend quote to the extended source. Use the swap's
        // actual destination so the restored mapping resolves to the same
        // destination candidate the original flow used.
        let quote = backendQuote
        if (backendQuote) {
            const plan = resolveExtendedRoutePlan({
                sourceNetworkName: record.extendedNetwork,
                sourceTokenSymbol: record.extendedToken,
                destinationNetworkName: base.destination_network?.name,
                destinationTokenSymbol: base.destination_token?.symbol,
                sourceAmount: record.sourceAmount,
                availableRoutes: sourceRoutes,
            })
            const mapping = plan?.mapping
            if (mapping) {
                quote = transformQuoteForExtendedRoute({ quote: backendQuote }, mapping, network, token, record.sourceAmount)?.quote
            }
        }

        return { swapBasicData, quote }
    }, [display, base, backendQuote, sourceRoutes])
}
