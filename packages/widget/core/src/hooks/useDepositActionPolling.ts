import { useCallback, useRef } from 'react'
import useSWR, { useSWRConfig } from 'swr'
import type { ApiResponse } from '@/Models/ApiResponse'
import LayerSwapApiClient, { type DepositAction } from '@/lib/apiClients/layerSwapApiClient'
import { getActionableDepositAction } from '@/helpers/depositActions'
import { useClientLayoutEffect } from './useClientLayoutEffect'

const client = new LayerSwapApiClient()
const TRANSITION_TIMEOUT_MS = 140_000
export const depositActionsKey = (swapId: string, sourceAddress: string) =>
    `/swaps/${swapId}/deposit_actions?source_address=${sourceAddress}`

/** SWR owns the requests; execution only observes the same snapshots the UI renders. */
export function useDepositActionPolling(swapId: string | undefined, sourceAddress: string | undefined, executing: boolean) {
    const key = swapId && sourceAddress ? depositActionsKey(swapId, sourceAddress) : null
    const { mutate, cache } = useSWRConfig()
    const { data, error } = useSWR<ApiResponse<DepositAction[]>>(key, client.fetcher, {
        refreshInterval: executing ? 2000 : 5000,
        dedupingInterval: 1000,
        refreshWhenHidden: executing,
        keepPreviousData: false,
    })
    const snapshot = useRef<{ key: string | null; data?: ApiResponse<DepositAction[]>; error?: unknown }>({ key: null })
    const listeners = useRef(new Set<() => void>())
    useClientLayoutEffect(() => {
        snapshot.current = { key, data, error }
        listeners.current.forEach(notify => notify())
    }, [key, data, error])

    const refresh = useCallback(async (activeSwapId: string, address: string) => {
        // Revalidate through the registered SWR subscription, never a parallel API loop.
        const refreshKey = depositActionsKey(activeSwapId, address)
        const response = await mutate<ApiResponse<DepositAction[]>>(refreshKey)
        // SWR retains cached data when revalidation fails. A wallet retry must not
        // treat that old payload as a successfully refreshed authorization.
        const refreshError = cache.get(refreshKey)?.error
        if (refreshError) throw refreshError
        if (response?.error) throw response.error
        if (!response?.data?.length) throw new Error('No deposit actions')
        return response.data
    }, [cache, mutate])

    const waitForTransition = useCallback(({ swapId: activeSwapId, sourceAddress: address, previousAction, signal }: {
        swapId: string
        sourceAddress: string
        previousAction: DepositAction
        signal: AbortSignal
    }): Promise<DepositAction[]> => {
        signal.throwIfAborted()
        const expectedKey = depositActionsKey(activeSwapId, address)
        return new Promise((resolve, reject) => {
            const cleanup = () => {
                clearTimeout(timeout)
                listeners.current.delete(check)
                signal.removeEventListener('abort', abort)
            }
            const fail = (reason: unknown) => { cleanup(); reject(reason) }
            const abort = () => fail(signal.reason)
            const check = () => {
                const latest = snapshot.current
                if (latest.key !== expectedKey) return
                if (latest.error || latest.data?.error) return fail(latest.error || latest.data?.error)
                const actions = latest.data?.data
                if (!actions?.length) return
                const failed = actions.find(action => action.status === 'failed')
                if (failed) return fail(new Error(failed.detail || 'The swap action failed'))
                const next = getActionableDepositAction(actions)
                if (actions.every(action => action.status === 'completed') || (next && next.step !== previousAction.step)) {
                    cleanup()
                    resolve(actions)
                }
            }
            const timeout = setTimeout(() => fail(new Error('The transaction is still confirming. Please wait a moment and try again.')), TRANSITION_TIMEOUT_MS)
            signal.addEventListener('abort', abort, { once: true })
            listeners.current.add(check)
            check()
        })
    }, [])

    return { data: data?.data, refresh, waitForTransition }
}
