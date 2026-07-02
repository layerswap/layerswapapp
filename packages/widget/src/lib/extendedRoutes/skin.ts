import { NetworkWithTokens, Token } from "@/Models/Network";
import type { ExtendedRouteRecord } from "@/stores/extendedRoutesStore";

/**
 * Produce the source network a swap shows when it came from an extended source
 * (e.g. Hyperliquid): the extended source's own IDENTITY (name, type, display_name,
 * logo, tokens) — so the user keeps picking/withdrawing-from "Hyperliquid" — but
 * with BLOCKCHAIN-SPECIFIC data taken from the REAL network it bridges through
 * (chain_id, node, explorer templates, metadata, native token).
 *
 * This is what lets every consumer stay blind to extended swaps: an explorer link
 * is just `source_network.transaction_explorer_template` (the real chain where the
 * input tx settles) while the UI still reads "Hyperliquid" — no real-network lookup.
 *
 * Provider-agnostic; returns a NEW object so shared `settings.networks` entries are
 * never mutated.
 */
export function mergeExtendedSourceNetwork(real: NetworkWithTokens, extended: NetworkWithTokens): NetworkWithTokens {
    return {
        ...extended,
        chain_id: real.chain_id,
        node_url: real.node_url,
        nodes: real.nodes,
        transaction_explorer_template: real.transaction_explorer_template,
        account_explorer_template: real.account_explorer_template,
        metadata: real.metadata,
        token: real.token,
    }
}

/**
 * Token counterpart: the extended source's display token (symbol/logo the user
 * picked, e.g. Hyperliquid USDC). For Hyperliquid both sides are USDC today, so
 * this is just the extended token — the real token is only used to confirm the
 * route resolves (see `buildExtendedSourceSkin`).
 */
export function mergeExtendedSourceToken(extended: Token): Token {
    return { ...extended }
}

type NetworkIndex = {
    byName: Map<string, NetworkWithTokens>
    tokensByName: Map<string, Map<string, Token>>
}

/**
 * Per-`networks`-reference lookup index, so repeated skinning (e.g. mapping a
 * whole history list) does O(1) lookups instead of an O(n) `.find()` per swap.
 * Keyed on the settings `networks` array reference (stable until settings
 * revalidate) via a WeakMap, so stale indexes are GC'd when settings change.
 */
const networkIndexCache = new WeakMap<NetworkWithTokens[], NetworkIndex>()
function getNetworkIndex(networks: NetworkWithTokens[]): NetworkIndex {
    let index = networkIndexCache.get(networks)
    if (!index) {
        index = {
            byName: new Map(networks.map(n => [n.name, n])),
            tokensByName: new Map(networks.map(n => [n.name, new Map((n.tokens ?? []).map(t => [t.symbol, t]))])),
        }
        networkIndexCache.set(networks, index)
    }
    return index
}

/**
 * Build the skinned source network/token for an extended-route record, looking up
 * both the extended and real networks in settings. Returns undefined when either
 * side can't be resolved (e.g. settings not loaded) — callers then keep the swap's
 * real source unchanged. Used by the two fetch tops (active swap + history) so the
 * skin is applied once and every consumer reads `swap.source_network` directly.
 */
export function buildExtendedSourceSkin(
    record: ExtendedRouteRecord,
    networks: NetworkWithTokens[],
): { network: NetworkWithTokens; token: Token } | undefined {
    const { byName, tokensByName } = getNetworkIndex(networks)
    const extended = byName.get(record.extendedNetwork)
    const real = byName.get(record.realNetwork)
    const extendedToken = tokensByName.get(record.extendedNetwork)?.get(record.extendedToken)
    const realToken = tokensByName.get(record.realNetwork)?.get(record.realToken)
    if (!extended || !real || !extendedToken || !realToken) return undefined
    return {
        network: mergeExtendedSourceNetwork(real, extended),
        token: mergeExtendedSourceToken(extendedToken),
    }
}
