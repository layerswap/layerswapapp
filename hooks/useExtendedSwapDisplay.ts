import { useMemo } from "react"
import { Token, NetworkWithTokens } from "@/Models/Network"
import { useSettingsState } from "@/context/settings"
import { ExtendedRouteRecord, useExtendedRoutesStore } from "@/stores/extendedRoutesStore"

export type ExtendedSwapDisplay = {
    /** Display-side source (e.g. Hyperliquid) that should replace the swap's
     * real source_network in any user-facing summary. */
    network: NetworkWithTokens
    /** Display-side source token. */
    token: Token
    /** Persisted record for this swap. */
    record: ExtendedRouteRecord
}

/**
 * For a given swapId, return the extended (display) source if this device
 * recorded an extended-route flow for it (e.g. Hyperliquid → backend via Base).
 * Returns undefined when no record exists (other device, or non-extended swap) —
 * callers should fall back to the swap's real source in that case.
 */
export function useExtendedSwapDisplay(swapId: string | undefined): ExtendedSwapDisplay | undefined {
    const { networks } = useSettingsState()
    const record = useExtendedRoutesStore(s => swapId ? s.records[swapId] : undefined)
    return useMemo(() => {
        if (!record) return undefined
        const network = networks.find(n => n.name === record.extendedNetwork)
        const token = network?.tokens.find(t => t.symbol === record.extendedToken)
        if (!network || !token) return undefined
        return { network, token, record }
    }, [record, networks])
}
