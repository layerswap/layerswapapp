import useSWR from 'swr'
import type { ApiResponse } from '@layerswap/widget-types'
import LayerSwapApiClient, { DepositAction, GaslessAuthorizationResult, GaslessAuthorizationStatus } from '@/lib/apiClients/layerSwapApiClient'
import { useGaslessAuthorizationStore } from '@/stores/swapTransactionStore'
import { gaslessAuthorizationKey, isGaslessAuthorizationForWorkflow } from '@/helpers/gasless'

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

// Share the fetched response with execution and processing; never persist its outcome.
export function useGaslessAuthorizationStatus(swapId: string | undefined, depositActions?: DepositAction[]): GaslessAuthorizationResult | undefined {
    const authorization = useGaslessAuthorizationStore(
        state => swapId ? state.authorizations[swapId] : undefined,
    )
    const active = !!swapId && isGaslessAuthorizationForWorkflow(authorization, depositActions)

    const { data } = useSWR<ApiResponse<GaslessAuthorizationResult>>(
        active ? gaslessAuthorizationKey(swapId) : null,
        () => apiClient.GetGaslessAuthorizationAsync(swapId!),
        {
            refreshInterval: response => isTerminalGaslessStatus(response?.data?.status) ? 0 : POLL_INTERVAL_MS,
            errorRetryCount: 5,
            revalidateOnFocus: false,
            revalidateOnMount: true,
            keepPreviousData: false,
        },
    )

    return active ? data?.data : undefined
}
