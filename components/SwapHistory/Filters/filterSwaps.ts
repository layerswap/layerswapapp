import { SwapResponse, TransactionType } from '@/lib/apiClients/layerSwapApiClient'
import { SwapStatus } from '@/Models/SwapStatus'
import type { FilterOpts } from './types'

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

export const isIncomplete = (sr: SwapResponse) =>
    INCOMPLETE_STATUSES.includes(sr.swap?.status as string)

export const matchesFilters = (sr: SwapResponse, opts: FilterOpts): boolean => {
    const { swap } = sr
    if (!swap) return false

    if (opts.networks) {
        const srcName = swap.source_network?.name
        const dstName = swap.destination_network?.name
        if (!opts.networks.some(n => n === srcName || n === dstName)) return false
    }

    if (opts.walletAddrs) {
        const dest = swap.destination_address?.toLowerCase?.() ?? ''
        const inputTx = swap.transactions?.find?.(
            (t: { type: TransactionType }) => t.type === TransactionType.Input
        )
        const src = inputTx?.from?.toLowerCase?.() ?? ''
        const match = opts.walletAddrs.some(a => {
            const lower = a.toLowerCase()
            return lower === dest || (src !== '' && lower === src)
        })
        if (!match) return false
    }

    return true
}
