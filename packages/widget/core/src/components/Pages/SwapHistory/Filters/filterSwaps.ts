import { SwapStatus } from '@layerswap/widget-types';
import type { SwapTransaction } from '@/stores/swapTransactionStore'
import { SwapResponse, TransactionType } from '@/lib/apiClients/layerSwapApiClient'

const INCOMPLETE_STATUSES: string[] = [
    SwapStatus.Created,
    SwapStatus.UserTransferPending,
    SwapStatus.LsTransferPending,
    SwapStatus.Failed,
    SwapStatus.Expired,
    SwapStatus.PendingRefund,
]

const hasUserActivity = (
    sr: SwapResponse,
    storeTransactions: Record<string, SwapTransaction>,
    pendingSubmissions: Record<string, true>,
): boolean => {
    const hasInputTx = !!sr.swap?.transactions?.some(
        (t: { type: TransactionType }) => t.type === TransactionType.Input
    )
    const swapId = sr.swap?.id
    const transaction = swapId ? storeTransactions[swapId] : undefined
    const hasStoreTx = !!transaction?.hash || !!transaction?.providerSubmissionAccepted
    return hasInputTx || hasStoreTx || !!(swapId && pendingSubmissions[swapId])
}

export const shouldDisplay = (
    sr: SwapResponse,
    storeTransactions: Record<string, SwapTransaction>,
    pendingSubmissions: Record<string, true> = {},
): boolean => {
    const status = sr.swap?.status as string | undefined
    if (!status || !INCOMPLETE_STATUSES.includes(status)) return true
    return hasUserActivity(sr, storeTransactions, pendingSubmissions)
}
