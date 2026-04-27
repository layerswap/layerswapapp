import { SwapResponse, TransactionType } from '@/lib/apiClients/layerSwapApiClient'
import { SwapStatus } from '@/Models/SwapStatus'

const INCOMPLETE_STATUSES: string[] = [
    SwapStatus.Created,
    SwapStatus.UserTransferPending,
    SwapStatus.UserTransferDelayed,
    SwapStatus.LsTransferPending,
    SwapStatus.Failed,
    SwapStatus.Expired,
    SwapStatus.Cancelled,
    SwapStatus.PendingRefund,
]

const hasUserActivity = (
    sr: SwapResponse,
    storeTransactions: Record<string, unknown>
): boolean => {
    const hasInputTx = !!sr.swap?.transactions?.some(
        (t: { type: TransactionType }) => t.type === TransactionType.Input
    )
    const swapId = sr.swap?.id
    const hasStoreTx = !!(swapId && storeTransactions[swapId])
    return hasInputTx || hasStoreTx
}

export const isIncomplete = (
    sr: SwapResponse,
    storeTransactions: Record<string, unknown>
): boolean => {
    const status = sr.swap?.status as string | undefined
    if (!status || !INCOMPLETE_STATUSES.includes(status)) return false
    return hasUserActivity(sr, storeTransactions)
}

export const shouldDisplay = (
    sr: SwapResponse,
    storeTransactions: Record<string, unknown>
): boolean => {
    const status = sr.swap?.status as string | undefined
    if (!status || !INCOMPLETE_STATUSES.includes(status)) return true
    return hasUserActivity(sr, storeTransactions)
}
