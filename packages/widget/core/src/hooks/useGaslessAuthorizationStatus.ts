import useSWR from 'swr'
import { useEffect } from 'react'
import LayerSwapApiClient, { DepositAction, GaslessAuthorizationStatus } from '@/lib/apiClients/layerSwapApiClient'
import { useGaslessAuthorizationStore } from '@/stores/swapTransactionStore'
import { isGaslessAuthorizationForWorkflow } from '@/helpers/gasless'

const apiClient = new LayerSwapApiClient()
const POLL_INTERVAL_MS = 4000

const TERMINAL_STATUSES: ReadonlySet<GaslessAuthorizationStatus> = new Set([
    'completed',
    'expired',
    'insufficient',
    'rejected',
])

export function isTerminalGaslessStatus(status: GaslessAuthorizationStatus | undefined): boolean {
    return !!status && TERMINAL_STATUSES.has(status)
}

// Polls GET /swaps/{id}/authorize (~4s) and mirrors status/transaction into the gasless store.
export function useGaslessAuthorizationStatus(swapId: string | undefined, depositActions?: DepositAction[]): void {
    const authorization = useGaslessAuthorizationStore(
        state => swapId ? state.authorizations[swapId] : undefined,
    )
    const setStatus = useGaslessAuthorizationStore(state => state.setGaslessAuthorizationStatus)

    const active = !!swapId && isGaslessAuthorizationForWorkflow(authorization, depositActions)
        && !isTerminalGaslessStatus(authorization?.status)

    const { data } = useSWR(
        active ? `/swaps/${swapId}/authorize` : null,
        () => apiClient.GetGaslessAuthorizationAsync(swapId!),
        { refreshInterval: POLL_INTERVAL_MS, errorRetryCount: 5, revalidateOnFocus: false },
    )

    useEffect(() => {
        const result = data?.data
        if (active && swapId && result?.status) {
            // Skip responses that arrive after the authorization was removed
            // (e.g. retry cleanup while this poll was in flight); the store
            // also refuses to recreate a removed entry.
            const current = useGaslessAuthorizationStore.getState().authorizations[swapId]
            if (!current) return
            setStatus(swapId, result.status, result.transaction)
        }
    }, [active, swapId, data, setStatus])
}
