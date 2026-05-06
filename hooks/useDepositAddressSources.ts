import { useMemo } from 'react'
import useSWR from 'swr'
import { ApiResponse } from '@/Models/ApiResponse'
import { NetworkRoute } from '@/Models/Network'
import LayerSwapApiClient from '@/lib/apiClients/layerSwapApiClient'

type Args = {
    destinationNetwork: string | undefined
    destinationToken: string | undefined
    enabled?: boolean
}

/**
 * Fetches source routes available for a deposit-address flow to a given destination.
 * Single SWR key shared by the form auto-selector and the manual-withdraw picker
 * so navigations between the two reuse the cache instead of refetching.
 */
export default function useDepositAddressSources({ destinationNetwork, destinationToken, enabled = true }: Args) {
    const apiClient = useMemo(() => new LayerSwapApiClient(), [])

    const url = useMemo(() => {
        if (!enabled || !destinationNetwork || !destinationToken) return null
        const params = new URLSearchParams({
            destination_network: destinationNetwork,
            destination_token: destinationToken,
            include_unmatched: 'false',
            include_unavailable: 'false',
            has_deposit_address: 'true',
            include_swaps_via_deposit_address: 'true',
        })
        return `/sources?${params.toString()}`
    }, [enabled, destinationNetwork, destinationToken])

    const { data, isLoading } = useSWR<ApiResponse<NetworkRoute[]>>(
        url,
        apiClient.fetcher,
        { dedupingInterval: 10000, keepPreviousData: true }
    )

    return { data, isLoading }
}
