import { useEffect, useMemo, useRef, useState } from 'react'
import { useSwrSwaps } from './useSwrSwaps'
import LayerSwapApiClient, { SwapResponse } from '@/lib/apiClients/layerSwapApiClient'
import { ApiResponse } from '@/Models/ApiResponse'
import { SwapStatus } from '@/Models/SwapStatus'
import { useSwapTransactionStore } from '@/stores/swapTransactionStore'

export function useSwapHistoryData(addresses?: string[]) {
    const [revalidateAll, setRevalidateAll] = useState(false)
    const [localStorageSwaps, setLocalStorageSwaps] = useState<SwapResponse[]>([])
    const [isLoadingLocalSwaps, setIsLoadingLocalSwaps] = useState(false)
    const { swapTransactions } = useSwapTransactionStore()
    const fetchedIdsRef = useRef<Set<string>>(new Set())

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

    // Stable key for swapTransactions (only include non-completed swaps from the last 30 minutes)
    const storeSwapIds = useMemo(() => {
        const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000
        return Object.entries(swapTransactions || {})
            .filter(([, tx]) => tx.timestamp >= thirtyMinutesAgo)
            .map(([id]) => id)
            .sort()
            .join(',')
    }, [swapTransactions])

    // Fetch swaps from store that are not in the backend results
    useEffect(() => {
        const fetchLocalStorageSwaps = async () => {
            try {
                const localSwapIds = storeSwapIds ? storeSwapIds.split(',').filter(Boolean) : []

                if (localSwapIds.length === 0) {
                    // Clear fetched IDs when local storage is empty
                    fetchedIdsRef.current.clear()
                    setLocalStorageSwaps([])
                    return
                }

                // Get all swap IDs from backend results
                const backendSwapIds = new Set([
                    ...pendingDeposit.swaps.map(s => s.swap.id),
                    ...completed.swaps.map(s => s.swap.id)
                ])

                // Clean up fetchedIdsRef - remove IDs that are no longer in local storage
                const localSwapIdSet = new Set(localSwapIds)
                for (const id of Array.from(fetchedIdsRef.current)) {
                    if (!localSwapIdSet.has(id)) {
                        fetchedIdsRef.current.delete(id)
                    }
                }

                // Find swap IDs that exist in store but not in backend results and not already fetched
                const missingSwapIds = localSwapIds.filter(id =>
                    !backendSwapIds.has(id) && !fetchedIdsRef.current.has(id)
                )

                if (missingSwapIds.length === 0) {
                    return
                }

                setIsLoadingLocalSwaps(true)
                const apiClient = new LayerSwapApiClient()

                // Mark as fetched to prevent re-fetching
                missingSwapIds.forEach(id => fetchedIdsRef.current.add(id))

                // Fetch missing swaps from backend
                const fetchedSwaps = await Promise.all(
                    missingSwapIds.map(async (swapId) => {
                        try {
                            const response = await apiClient.GetSwapAsync(swapId)
                            return response?.data || null
                        } catch {
                            return null
                        }
                    })
                )

                setLocalStorageSwaps(prev => {
                    const existingIds = new Set(prev.map(s => s.swap.id))
                    const newSwaps = fetchedSwaps.filter((s): s is SwapResponse =>
                        s !== null && !existingIds.has(s.swap.id)
                    )
                    return [...prev, ...newSwaps]
                })
            } catch (error) {
                console.error('Error fetching localStorage swaps:', error)
            } finally {
                setIsLoadingLocalSwaps(false)
            }
        }

        // Only fetch once backend data is loaded
        if (!pendingDeposit.isLoading && !completed.isLoading) {
            fetchLocalStorageSwaps()
        }
    }, [storeSwapIds, pendingDeposit.isLoading, completed.isLoading, pendingDeposit.swaps, completed.swaps])

    // Merge localStorage swaps with completed swaps
    const mergedCompleted = useMemo(() => {
        const allCompletedSwaps = [...completed.swaps]

        // Add localStorage swaps that aren't already in the list
        const completedIds = new Set(allCompletedSwaps.map(s => s.swap.id))
        const pendingIds = new Set(pendingDeposit.swaps.map(s => s.swap.id))

        for (const swap of localStorageSwaps) {
            if (!completedIds.has(swap.swap.id) && !pendingIds.has(swap.swap.id)) {
                allCompletedSwaps.push(swap)
            }
        }

        // Sort by created_date descending
        allCompletedSwaps.sort((a, b) =>
            new Date(b.swap.created_date).getTime() - new Date(a.swap.created_date).getTime()
        )

        return {
            ...completed,
            swaps: allCompletedSwaps,
        }
    }, [completed, localStorageSwaps, pendingDeposit.swaps])

    return {
        pendingDeposit,
        completed: mergedCompleted,
        isLoadingAny: pendingDeposit.isLoading || completed.isLoading || isLoadingLocalSwaps,
        isValidatingAny: pendingDeposit.isValidating || completed.isValidating,
    }
}


