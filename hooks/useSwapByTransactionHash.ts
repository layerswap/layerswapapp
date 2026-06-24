import { useEffect, useState } from 'react'
import useSWR from 'swr'
import LayerSwapApiClient, { SwapResponse } from '@/lib/apiClients/layerSwapApiClient'
import { ApiResponse } from '@/Models/ApiResponse'
import { useExtendedSourceSkin } from './useExtendedSourceSkin'

export function useSwapByTransactionHash(hash: string, delayMs = 400) {
    const trimmed = hash.trim()
    const [debounced, setDebounced] = useState(trimmed)

    useEffect(() => {
        if (trimmed === debounced) return
        const t = setTimeout(() => setDebounced(trimmed), delayMs)
        return () => clearTimeout(t)
    }, [trimmed, debounced, delayMs])

    const apiClient = new LayerSwapApiClient()
    const key = debounced ? `/swaps/by_transaction_hash/${encodeURIComponent(debounced)}` : null

    const { data, error, isLoading, isValidating } = useSWR<ApiResponse<SwapResponse>>(
        key,
        apiClient.fetcher,
        { revalidateOnFocus: false, shouldRetryOnError: false }
    )

    const pendingDebounce = trimmed !== debounced

    const skinSwap = useExtendedSourceSkin()

    return {
        isActive: trimmed.length > 0,
        swap: data?.data ? skinSwap(data.data) : null,
        isLoading: !!key && (isLoading || isValidating) || pendingDebounce,
        error,
    }
}
