import { useMemo } from 'react'
import useSWR from 'swr'
import { ApiResponse } from '@/Models/ApiResponse'
import { NetworkRoute } from '@/Models/Network'
import LayerSwapApiClient from '@/lib/apiClients/layerSwapApiClient'
import { resolveRoutesURLForSelectedToken } from '@/helpers/routes'

type Args = {
    enabled?: boolean
}

/**
 * Fetches destination routes available for the deposit-address flow.
 * Mirrors the flags used by `useDepositAddressSources` so both pickers
 * see the same has_deposit_address / include_swaps_via_deposit_address set.
 */
export default function useDepositAddressDestinations({ enabled = true }: Args = {}) {
    const apiClient = useMemo(() => new LayerSwapApiClient(), [])

    const url = useMemo(() => {
        if (!enabled) return null
        return resolveRoutesURLForSelectedToken({
            direction: 'to',
            network: undefined,
            token: undefined,
            includes: { unmatched: false, unavailable: false, swaps: true },
            hasDepositAddress: true,
            useDepositAddressSwaps: true,
        })
    }, [enabled])

    const { data, isLoading } = useSWR<ApiResponse<NetworkRoute[]>>(
        url,
        apiClient.fetcher,
        { dedupingInterval: 10000, keepPreviousData: true }
    )

    return { data, isLoading }
}
