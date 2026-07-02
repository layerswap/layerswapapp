import useSWR from 'swr'
import { useEffect } from 'react'
import LayerSwapApiClient, { GaslessAuthorizationStatus } from '@/lib/apiClients/layerSwapApiClient'
import { useGaslessAuthorizationStore } from '@/stores/swapTransactionStore'

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
export function useGaslessAuthorizationStatus(swapId: string | undefined): void {
    const authorization = useGaslessAuthorizationStore(
        state => swapId ? state.authorizations[swapId] : undefined,
    )
    const setStatus = useGaslessAuthorizationStore(state => state.setGaslessAuthorizationStatus)

    const active = !!swapId && !!authorization && !isTerminalGaslessStatus(authorization.status)

    const { data } = useSWR(
        active ? `/swaps/${swapId}/authorize` : null,
        () => apiClient.GetGaslessAuthorizationAsync(swapId!),
        { refreshInterval: POLL_INTERVAL_MS, errorRetryCount: 5, revalidateOnFocus: false },
    )

    useEffect(() => {
        const result = data?.data
        if (swapId && result?.status) {
            setStatus(swapId, result.status, result.transaction)
        }
    }, [swapId, data, setStatus])
}
