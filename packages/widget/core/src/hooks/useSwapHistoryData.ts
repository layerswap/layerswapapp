import { SwapStatus } from '@layerswap/widget-types';
import { useMemo, useState } from 'react'
import { useSwrSwaps } from './useSwrSwaps'
import { SwapResponse } from '@/lib/apiClients/layerSwapApiClient'
import type { ApiResponse } from '@layerswap/widget-types'
import { useExtendedSourceSkin } from './useExtendedSourceSkin'

export function useSwapHistoryData(addresses?: string[], networks?: string[]) {
    const [revalidateAll, setRevalidateAll] = useState(false)
    const skinSwap = useExtendedSourceSkin()

    const pendingDeposit = useSwrSwaps({
        statuses: ['PendingDeposit'],
        addresses,
        networks,
        refreshInterval: (data?: ApiResponse<SwapResponse[]>[] | undefined) => {
            const hasAny = !!data?.some((p) => (p?.data?.length ?? 0) > 0)
            if (!hasAny) return 30000

            setRevalidateAll(true)
            return 2000
        },
        revalidateAll: true,
        revalidateFirstPage: true,
    })

    const completed = useSwrSwaps({
        statuses: ['Completed', 'Refunded', 'PendingWithdrawal', 'PendingRefund', 'Failed', 'Expired'],
        addresses,
        networks,
        refreshInterval: (data) => {
            const hasAnyInProgress = !!data?.some((p) => (p?.data?.some(s => s.swap.status === SwapStatus.PendingRefund || s.swap.status === SwapStatus.LsTransferPending)))
            if (!hasAnyInProgress) return 0

            return 2000
        },
        revalidateAll,
        revalidateFirstPage: true,
    })

    // Apply the extended-source skin only at the output boundary.
    // Map the swaps arrays separately so the per-swap skin only re-runs when the
    // arrays actually change — not on every SWR poll where only the wrapper's
    // loading/validating flags flip (the wrapper re-spread below is cheap).
    const skinnedPendingSwaps = useMemo(() => pendingDeposit.swaps.map(skinSwap), [pendingDeposit.swaps, skinSwap])
    const skinnedPendingDeposit = useMemo(
        () => ({ ...pendingDeposit, swaps: skinnedPendingSwaps }),
        [pendingDeposit, skinnedPendingSwaps],
    )
    const skinnedCompletedSwaps = useMemo(() => completed.swaps.map(skinSwap), [completed.swaps, skinSwap])
    const skinnedCompleted = useMemo(
        () => ({ ...completed, swaps: skinnedCompletedSwaps }),
        [completed, skinnedCompletedSwaps],
    )

    return {
        pendingDeposit: skinnedPendingDeposit,
        completed: skinnedCompleted,
        isLoadingAny: pendingDeposit.isLoading || completed.isLoading,
        isValidatingAny: pendingDeposit.isValidating || completed.isValidating,
    }
}
