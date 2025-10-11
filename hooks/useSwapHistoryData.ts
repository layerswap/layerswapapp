import { useMemo, useState } from 'react'
import { useSwrSwaps } from './useSwrSwaps'
import { SwapResponse } from '@/lib/apiClients/layerSwapApiClient'
import { ApiResponse } from '@/Models/ApiResponse'
import { SwapStatus } from '@/Models/SwapStatus'

export function useSwapHistoryData(addresses?: string[]) {
    const [revalidateAll, setRevalidateAll] = useState(false)
    const pendingDeposit = useSwrSwaps({
        statuses: ['PendingDeposit'],
        addresses,
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
        statuses: ['Completed', 'Refunded', 'PendingWithdrawal', 'PendingRefund'],
        addresses,
        refreshInterval: (data) => {
            const hasAnyInProgress = !!data?.some((p) => (p?.data?.some(s => s.swap.status === SwapStatus.PendingRefund || s.swap.status === SwapStatus.LsTransferPending)))
            if (!hasAnyInProgress) return 0

            return 2000
        },
        revalidateAll,
        revalidateFirstPage: true,
    })

    return {
        pendingDeposit,
        completed,
        isLoadingAny: pendingDeposit.isLoading || completed.isLoading,
        isValidatingAny: pendingDeposit.isValidating || completed.isValidating,
    }
}


