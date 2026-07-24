import { useMemo } from 'react'
import useSWR from 'swr'
import { ApiResponse } from '@/Models/ApiResponse'
import { NetworkRoute } from '@/Models/Network'
import LayerSwapApiClient from '@/lib/apiClients/layerSwapApiClient'
import { resolveRoutesURLForSelectedToken } from '@/helpers/routes'

type Args = {
    destinationNetwork: string | undefined
    destinationToken: string | undefined
    enabled?: boolean
}

/**
 * Fetches source routes available for a deposit-address flow to a given destination.
 * Uses the same URL builder as the form picker so the two share an SWR cache.
 */
export default function useDepositAddressSources({ destinationNetwork, destinationToken, enabled = true }: Args) {
    const apiClient = useMemo(() => new LayerSwapApiClient(), [])

    const url = useMemo(() => {
        if (!enabled || !destinationNetwork || !destinationToken) return null
        return resolveRoutesURLForSelectedToken({
            direction: 'from',
            network: destinationNetwork,
            token: destinationToken,
            includes: { unmatched: false, unavailable: false, swaps: true },
            hasDepositAddress: true,
            useDepositAddressSwaps: true,
        })
    }, [enabled, destinationNetwork, destinationToken])

    const { data, isLoading } = useSWR<ApiResponse<NetworkRoute[]>>(
        url,
        apiClient.fetcher,
        { dedupingInterval: 10000, keepPreviousData: true }
    )

    return { data, isLoading }
}
