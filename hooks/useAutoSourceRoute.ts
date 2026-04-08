import { useEffect, useMemo } from 'react'
import useSWR from 'swr'
import { useFormikContext } from 'formik'
import { SwapFormValues } from '@/components/DTOs/SwapFormValues'
import { ApiResponse } from '@/Models/ApiResponse'
import { NetworkRoute } from '@/Models/Network'
import LayerSwapApiClient from '@/lib/apiClients/layerSwapApiClient'

/**
 * Auto-selects a source network and token for the deposit address flow.
 * Fetches available sources for the selected destination and picks the first active one.
 */
export default function useAutoSourceRoute() {
    const { values, setFieldValue } = useFormikContext<SwapFormValues>()
    const { to, toAsset } = values

    const apiClient = new LayerSwapApiClient()
    const url = useMemo(() => {
        if (!to?.name || !toAsset?.symbol) return null
        const params = new URLSearchParams({
            destination_network: to.name,
            destination_token: toAsset.symbol,
            include_unmatched: 'false',
            include_swaps: 'false',
            include_unavailable: 'false',
        })
        return `/sources?${params.toString()}`
    }, [to?.name, toAsset?.symbol])

    const { data, isLoading } = useSWR<ApiResponse<NetworkRoute[]>>(
        url,
        apiClient.fetcher,
        { dedupingInterval: 10000, keepPreviousData: true }
    )

    const sourceRoutes = data?.data?.filter(r => r.deposit_methods?.includes('deposit_address'))

    useEffect(() => {
        if (!sourceRoutes || sourceRoutes.length === 0) return

        const currentFrom = values.from
        const currentFromAsset = values.fromAsset

        // If current source is still valid for this destination, keep it
        if (currentFrom && currentFromAsset) {
            const stillValid = sourceRoutes.some(
                r => r.name === currentFrom.name && r.tokens?.some(t => t.symbol === currentFromAsset.symbol && t.status === 'active')
            )
            if (stillValid) return
        }

        // Pick the first route with an active token
        for (const route of sourceRoutes) {
            const activeToken = route.tokens?.find(t => t.status === 'active')
            if (activeToken) {
                setFieldValue('from', route, true)
                setFieldValue('fromAsset', activeToken, true)
                return
            }
        }
    }, [sourceRoutes])

    return { sourceRoutes, isLoading }
}
