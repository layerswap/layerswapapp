import { useCallback, useRef, useState } from 'react'
import useSWR, { useSWRConfig } from 'swr'
import type { ApiResponse } from '@/Models/ApiResponse'
import LayerSwapApiClient, { type DepositAction, type GaslessAuthorizationResult } from '@/lib/apiClients/layerSwapApiClient'
import { getActionableDepositAction, isDepositWorkflowComplete } from '@/helpers/depositActions'
import { isGaslessAuthorizationSubmitted, isGaslessDepositWorkflow } from '@/helpers/gasless'
import { useClientLayoutEffect } from './useClientLayoutEffect'

const client = new LayerSwapApiClient()
const TRANSITION_TIMEOUT_MS = 140_000
export const depositActionsKey = (swapId: string, sourceAddress: string) =>
    `/swaps/${swapId}/deposit_actions?source_address=${sourceAddress}`

export type DepositActionTransition = {
    actions: DepositAction[]
    authorization?: GaslessAuthorizationResult
}

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
    // A sign-only payload cannot distinguish self-paid from gasless execution.
    // Observe the authorization endpoint until publication is known, sharing its
    // SWR key with processing rather than starting a separate request loop.
    const [authorizationWaitKey, setAuthorizationWaitKey] = useState<string | null>(null)
    const authorizationKey = executing && swapId && key === authorizationWaitKey
        && data?.data?.some(action => action.step === 'sign' || action.type === 'sign')
        && isGaslessDepositWorkflow(data.data) !== false
        ? `/swaps/${swapId}/authorize` : null
    const { data: authorization, error: authorizationError } = useSWR<ApiResponse<GaslessAuthorizationResult>>(authorizationKey, client.fetcher, {
        refreshInterval: 2000,
        dedupingInterval: 1000,
        refreshWhenHidden: true,
        keepPreviousData: false,
    })
    const snapshot = useRef<{
        key: string | null; data?: ApiResponse<DepositAction[]>; error?: unknown
        authorizationKey?: string | null; authorization?: ApiResponse<GaslessAuthorizationResult>; authorizationError?: unknown
    }>({ key: null })
    const listeners = useRef(new Set<() => void>())
    useClientLayoutEffect(() => {
        snapshot.current = { key, data, error, authorizationKey, authorization, authorizationError }
        listeners.current.forEach(notify => notify())
    }, [key, data, error, authorizationKey, authorization, authorizationError])

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
    }): Promise<DepositActionTransition> => {
        signal.throwIfAborted()
        const expectedKey = depositActionsKey(activeSwapId, address)
        if (previousAction.step === 'sign' || previousAction.type === 'sign') setAuthorizationWaitKey(expectedKey)
        return new Promise((resolve, reject) => {
            const cleanup = () => {
                clearTimeout(timeout)
                listeners.current.delete(check)
                if (listeners.current.size === 0) setAuthorizationWaitKey(null)
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
                if (isDepositWorkflowComplete(actions) || (next && (next.step !== previousAction.step
                    || (previousAction.status && previousAction.status !== 'action_required')))) {
                    cleanup()
                    resolve({ actions })
                    return
                }
                if (latest.authorizationKey !== `/swaps/${activeSwapId}/authorize`
                    || isGaslessDepositWorkflow(actions) === false) return
                // This lookup is optional for self-paid swaps. A transient failure
                // must not stop deposit-action polling from revealing publication.
                if (latest.authorizationError || latest.authorization?.error) return
                const result = latest.authorization?.data
                if (isGaslessAuthorizationSubmitted(result)) {
                    cleanup()
                    resolve({ actions, authorization: result })
                } else if (result && (['expired', 'insufficient', 'rejected'].includes(result.status)
                    || result.transaction?.status === 'failed')) {
                    fail(new Error(`The swap authorization failed: ${result.status}`))
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
