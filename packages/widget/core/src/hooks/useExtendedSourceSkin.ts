import { useCallback } from 'react'
import { SwapResponse } from '@/lib/apiClients/layerSwapApiClient'
import { useSettingsState } from '@/context/settings'
import { useExtendedRoutesStore } from '@/stores/extendedRoutesStore'
import { buildExtendedSourceSkin } from '@/lib/extendedRoutes/skin'

/**
 * Returns a transform that skins a fetched swap's source to the extended source
 * (e.g. Hyperliquid) it was created from — display identity (name/logo) from the
 * extended network, blockchain data (chain_id/explorer/node) from the real route,
 * and the sent amount the user actually moved.
 *
 * Applied at the swap-fetching layer (history list, hash search) so every history
 * consumer reads `swap.source_network` directly and stays blind to extended routes.
 * Swaps without a local record (other device / non-extended) pass through unchanged.
 */
export function useExtendedSourceSkin() {
    const { networks } = useSettingsState()
    // Read the record from the store snapshot at call time rather than subscribing
    // to the whole `records` map: skinSwap is always invoked downstream of an SWR
    // data change, so the snapshot is current, and the callback identity only
    // changes with `networks` instead of on every unrelated record write.
    return useCallback((swapResponse: SwapResponse): SwapResponse => {
        const record = useExtendedRoutesStore.getState().records[swapResponse.swap.id]
        if (!record) return swapResponse
        const skin = buildExtendedSourceSkin(record, networks)
        if (!skin) return swapResponse
        return {
            ...swapResponse,
            swap: {
                ...swapResponse.swap,
                source_network: skin.network,
                source_token: skin.token,
                requested_amount: Number(record.sourceAmount),
            },
        }
    }, [networks])
}
