import { SwapResponse, TransactionType } from '@/lib/apiClients/layerSwapApiClient'
import { SwapStatus } from '@/Models/SwapStatus'
import { Address } from '@/lib/address/Address'
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

    if (opts.walletAddrs) {
        const dest = swap.destination_address ?? ''
        const destNet = swap.destination_network
        const inputTx = swap.transactions?.find(
            (t: { type: TransactionType }) => t.type === TransactionType.Input
        )
        const src = inputTx?.from ?? ''
        const srcNet = swap.source_network
        const match = opts.walletAddrs.some(a =>
            (!!dest && !!destNet && Address.equals(a, dest, destNet)) ||
            (!!src && !!srcNet && Address.equals(a, src, srcNet))
        )
        if (!match) return false
    }

    return true
}
