import { useCallback, useEffect, useRef } from 'react'
import useSWR from 'swr'
import LayerSwapApiClient, { type SwapResponse } from '@/lib/apiClients/layerSwapApiClient'
import type { ApiResponse } from '@/Models/ApiResponse'
import { resolveSwapPollingInterval, SWAP_POLL_DEDUPE_MS } from '@/lib/swapPollingPolicy'

const client = new LayerSwapApiClient()

/** Backend observation lifetime is independent of presentation and wallet failure state. */
export function useSwapPolling(swapId: string | undefined, initialSwapData?: SwapResponse | null, txSubmittedAt?: number) {
    const lastChange = useRef<{ fingerprint?: string; at: number }>({ at: Date.now() })
    const refreshInterval = useCallback((latest?: ApiResponse<SwapResponse>) => resolveSwapPollingInterval({
        swap: latest?.data?.swap,
        refuelRequired: !!latest?.data?.refuel,
        hasError: !!latest?.error,
        now: Date.now(),
        lastChangeAt: lastChange.current.at,
        txSubmittedAt,
        avgCompletionTime: latest?.data?.quote?.avg_completion_time,
    }), [txSubmittedAt])
    const result = useSWR<ApiResponse<SwapResponse>>(swapId ? `/swaps/${swapId}?exclude_deposit_actions=true` : null, client.fetcher, {
        refreshInterval,
        dedupingInterval: SWAP_POLL_DEDUPE_MS,
        fallbackData: swapId && swapId === initialSwapData?.swap.id ? { data: initialSwapData } : undefined,
        keepPreviousData: false,
    })
    const { data, mutate } = result
    useEffect(() => {
        const swap = data?.data?.swap
        const fingerprint = swap && [swap.id, swap.status,
            ...(swap.transactions?.map(t => `${t.type}:${t.status}:${t.confirmations >= t.max_confirmations}:${t.transaction_hash}:${t.amount}`) ?? []),
        ].join('|')
        if (fingerprint !== lastChange.current.fingerprint) lastChange.current = { fingerprint, at: Date.now() }
    }, [data])

    const mountedAt = useRef(Date.now())
    useEffect(() => {
        if (swapId && txSubmittedAt != null && txSubmittedAt >= mountedAt.current) void mutate()
    }, [swapId, txSubmittedAt, mutate])
    useEffect(() => {
        if (!swapId) return
        const visible = () => { if (document.visibilityState === 'visible') void mutate() }
        document.addEventListener('visibilitychange', visible)
        return () => document.removeEventListener('visibilitychange', visible)
    }, [swapId, mutate])
    return result
}
