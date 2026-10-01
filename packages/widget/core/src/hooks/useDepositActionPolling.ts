import { useCallback, useRef, useState } from 'react'
import useSWR, { useSWRConfig } from 'swr'
import type { ApiResponse } from '@/Models/ApiResponse'
import LayerSwapApiClient, { type DepositAction, type GaslessAuthorizationResult } from '@/lib/apiClients/layerSwapApiClient'
import { getActionableDepositAction, isDepositWorkflowComplete } from '@/helpers/depositActions'
import { isGaslessAuthorizationSubmitted, isGaslessDepositWorkflow } from '@/helpers/gasless'
import { useDepositSignatureStore, useGaslessAuthorizationStore } from '@/stores/swapTransactionStore'
import { useSwapDataState, useSwapDataUpdate, type ApprovalTransaction } from '@/context/swap'
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
    const { approvalTransaction } = useSwapDataState()
    const { watchApprovalTransaction } = useSwapDataUpdate()
    const activeApproval = executing && approvalTransaction?.swapId === swapId
        && approvalTransaction?.sourceAddress === sourceAddress ? approvalTransaction : undefined
    const approvalHash = activeApproval?.hash
    const approvalNetwork = activeApproval?.network
    const approvalStatus = activeApproval?.status
    const snapshot = useRef<DepositPollingSnapshot>({ key: null })
    const listeners = useRef(new Set<() => void>())
    useClientLayoutEffect(() => {
        snapshot.current = { key, data, error, authorizationKey, authorization, authorizationError, approvalHash, approvalNetwork, approvalStatus }
        listeners.current.forEach(notify => notify())
    }, [key, data, error, authorizationKey, authorization, authorizationError, approvalHash, approvalNetwork, approvalStatus])

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

    // Own the subscription lifetime: completion, cancellation, timeout and cleanup.
    const observeTransition = useCallback((expectedKey: string, signal: AbortSignal, checkTransition: TransitionCheck) => {
        return new Promise<DepositActionTransition>((resolve, reject) => {
            let settled = false
            const isCurrent = () => !settled && !signal.aborted && snapshot.current.key === expectedKey
            const cleanup = () => {
                settled = true
                clearTimeout(timeout)
                listeners.current.delete(check)
                if (listeners.current.size === 0) {
                    setAuthorizationWaitKey(null)
                }
                signal.removeEventListener('abort', abort)
            }
            const fail = (reason: unknown) => {
                if (settled) return
                cleanup()
                reject(reason)
            }
            const complete = (transition: DepositActionTransition) => {
                if (!isCurrent()) return
                try {
                    throwIfActionFailed(transition.actions)
                    cleanup()
                    resolve(transition)
                } catch (error) {
                    fail(error)
                }
            }
            const abort = () => fail(signal.reason)
            const check = () => {
                if (!isCurrent()) return
                try {
                    const transition = checkTransition(snapshot.current)
                    if (transition instanceof Promise) {
                        void transition.then(complete, fail)
                    } else if (transition) {
                        complete(transition)
                    }
                } catch (error) {
                    fail(error)
                }
            }
            const timeout = setTimeout(() => fail(new Error('The transaction is still confirming. Please wait a moment and try again.')), TRANSITION_TIMEOUT_MS)
            signal.addEventListener('abort', abort, { once: true })
            listeners.current.add(check)
            check()
        })
    }, [])

    const waitForTransition = useCallback((options: WaitForTransitionOptions): Promise<DepositActionTransition> => {
        const { swapId: activeSwapId, sourceAddress: address, previousAction, approvalTransaction, signal } = options
        signal.throwIfAborted()
        const expectedKey = depositActionsKey(activeSwapId, address)

        const stopApprovalPolling = previousAction.step === 'approve_permit2' && approvalTransaction
            ? watchApprovalTransaction({ ...approvalTransaction, swapId: activeSwapId, sourceAddress: address })
            : undefined
        if (previousAction.step === 'sign' || previousAction.type === 'sign') {
            setAuthorizationWaitKey(expectedKey)
        }

        const checkTransition = createTransitionCheck(options, () => refresh(activeSwapId, address))
        return observeTransition(expectedKey, signal, checkTransition).finally(() => stopApprovalPolling?.())
    }, [observeTransition, refresh, watchApprovalTransaction])

    return { data: data?.data, refresh, waitForTransition }
}

function createTransitionCheck(
    { swapId, previousAction, approvalTransaction }: WaitForTransitionOptions,
    refreshActions: () => Promise<DepositAction[]>,
): TransitionCheck {
    const submittedApproval = previousAction.step === 'approve_permit2' ? approvalTransaction : undefined
    let refreshingApproval = false

    return latest => {
        if (submittedApproval && latest.approvalHash === submittedApproval.hash
            && latest.approvalNetwork === submittedApproval.network) {
            if (latest.approvalStatus === 'failed') {
                throw new Error('The token approval transaction failed. Please try again.')
            }
            if (latest.approvalStatus === 'completed') {
                if (refreshingApproval) return
                refreshingApproval = true
                // A wallet edit can leave the allowance too low even for identical
                // calldata. Refresh once after confirmation to find the next action.
                return refreshActions().then(actions => ({ actions }))
            }
        }

        return getDepositActionTransition(latest, swapId, previousAction)
    }
}

function getDepositActionTransition(
    latest: DepositPollingSnapshot,
    swapId: string,
    previousAction: DepositAction,
): DepositActionTransition | undefined {
    if (latest.error || latest.data?.error) throw latest.error || latest.data?.error
    const actions = latest.data?.data
    if (!actions?.length) return
    throwIfActionFailed(actions)

    if (hasNextDepositAction(actions, previousAction)) return { actions }
    return getAuthorizationTransition(latest, swapId, actions)
}

function hasNextDepositAction(actions: DepositAction[], previousAction: DepositAction): boolean {
    if (isDepositWorkflowComplete(actions)) return true
    const next = getActionableDepositAction(actions)
    if (!next) return false

    const stepChanged = (next.step ?? next.type) !== (previousAction.step ?? previousAction.type)
    const wasWaiting = !!previousAction.status && previousAction.status !== 'action_required'
    return stepChanged || wasWaiting
}

function throwIfActionFailed(actions: DepositAction[]): void {
    const failed = actions.find(action => action.status === 'failed')
    if (failed) throw new Error(failed.detail || 'The swap action failed')
}

function getAuthorizationTransition(
    latest: DepositPollingSnapshot,
    swapId: string,
    actions: DepositAction[],
): DepositActionTransition | undefined {
    if (latest.authorizationKey !== `/swaps/${swapId}/authorize`) return
    if (isGaslessDepositWorkflow(actions) === false) return
    // This lookup is optional for self-paid swaps. A transient failure must
    // not stop deposit-action polling from revealing publication.
    if (latest.authorizationError || latest.authorization?.error) return

    const result = latest.authorization?.data
    if (isGaslessAuthorizationSubmitted(result)) return { actions, authorization: result }
    if (!result) return

    const authorizationFailed = ['expired', 'insufficient', 'rejected'].includes(result.status)
    if (authorizationFailed) recordAuthorizationFailure(swapId, result)
    if (authorizationFailed || result.transaction?.status === 'failed') {
        throw new Error(`The swap authorization failed: ${result.status}`)
    }
}

function recordAuthorizationFailure(swapId: string, result: GaslessAuthorizationResult): void {
    const signatures = useDepositSignatureStore.getState()
    const signature = signatures.signatures[swapId]
    // Classify the accepted signature before clearing it so the resolved
    // status and retry guard see the same terminal result.
    useGaslessAuthorizationStore.setState(state => {
        const current = state.authorizations[swapId]
        return {
            authorizations: {
                ...state.authorizations,
                [swapId]: {
                    ...current,
                    kind: 'gasless',
                    validBefore: current?.validBefore ?? signature?.validBefore ?? Math.floor(Date.now() / 1000),
                    status: result.status,
                    // Omitted transaction data cannot erase a known submission.
                    transaction: result.transaction ?? current?.transaction ?? null,
                },
            },
        }
    })
    signatures.removeDepositSignature(swapId)
}

export type DepositActionTransition = {
    actions: DepositAction[]
    authorization?: GaslessAuthorizationResult
}

type WaitForTransitionOptions = {
    swapId: string
    sourceAddress: string
    previousAction: DepositAction
    approvalTransaction?: Pick<ApprovalTransaction, 'network' | 'hash'>
    signal: AbortSignal
}

type DepositPollingSnapshot = {
    key: string | null
    data?: ApiResponse<DepositAction[]>
    error?: unknown
    authorizationKey?: string | null
    authorization?: ApiResponse<GaslessAuthorizationResult>
    authorizationError?: unknown
    approvalHash?: string
    approvalNetwork?: string
    approvalStatus?: string
}

type TransitionCheck = (snapshot: DepositPollingSnapshot) =>
    DepositActionTransition | Promise<DepositActionTransition> | undefined
