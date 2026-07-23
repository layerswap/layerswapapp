import { useEffect, useMemo, useRef, useState } from 'react'
import { useSwrSwaps } from './useSwrSwaps'
import LayerSwapApiClient, { SwapResponse } from '@/lib/apiClients/layerSwapApiClient'
import { ApiResponse } from '@/Models/ApiResponse'
import { SwapStatus } from '@/Models/SwapStatus'
import { useSwapTransactionStore } from '@/stores/swapTransactionStore'
import { useExtendedSourceSkin } from './useExtendedSourceSkin'
import { Address } from '@/lib/address'

export function useSwapHistoryData(addresses?: string[], networks?: string[]) {
    const [revalidateAll, setRevalidateAll] = useState(false)
    const [localStorageSwaps, setLocalStorageSwaps] = useState<SwapResponse[]>([])
    const [isLoadingLocalSwaps, setIsLoadingLocalSwaps] = useState(false)
    const { swapTransactions } = useSwapTransactionStore()
    const fetchedIdsRef = useRef<Set<string>>(new Set())
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
        statuses: ['Completed', 'Refunded', 'PendingWithdrawal', 'PendingRefund'],
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
                    setLocalStorageSwaps(prev => prev.length === 0 ? prev : [])
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
                    if (newSwaps.length === 0) return prev
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

        const networkSet = networks && networks.length > 0 ? new Set(networks) : null
        const selectedAddressSet = addresses ? new Set(addresses) : null

        for (const swap of localStorageSwaps) {
            if (completedIds.has(swap.swap.id) || pendingIds.has(swap.swap.id)) continue
            if (selectedAddressSet && !matchesSelectedAddress(swap, selectedAddressSet)) continue
            if (
                networkSet &&
                !networkSet.has(swap.swap.source_network.name) &&
                !networkSet.has(swap.swap.destination_network.name)
            ) continue
            allCompletedSwaps.push(swap)
        }

        // Sort by created_date descending
        allCompletedSwaps.sort((a, b) =>
            new Date(b.swap.created_date).getTime() - new Date(a.swap.created_date).getTime()
        )

        return {
            ...completed,
            swaps: allCompletedSwaps,
        }
    }, [completed, localStorageSwaps, pendingDeposit.swaps, networks, addresses])

    // Apply the extended-source skin only at the output boundary — the internal
    // id-sets and network filtering above operate on the raw backend identity.
    // Map the swaps arrays separately so the per-swap skin only re-runs when the
    // arrays actually change — not on every SWR poll where only the wrapper's
    // loading/validating flags flip (the wrapper re-spread below is cheap).
    const skinnedPendingSwaps = useMemo(() => pendingDeposit.swaps.map(skinSwap), [pendingDeposit.swaps, skinSwap])
    const skinnedPendingDeposit = useMemo(
        () => ({ ...pendingDeposit, swaps: skinnedPendingSwaps }),
        [pendingDeposit, skinnedPendingSwaps],
    )
    const skinnedCompletedSwaps = useMemo(() => mergedCompleted.swaps.map(skinSwap), [mergedCompleted.swaps, skinSwap])
    const skinnedCompleted = useMemo(
        () => ({ ...mergedCompleted, swaps: skinnedCompletedSwaps }),
        [mergedCompleted, skinnedCompletedSwaps],
    )

    return {
        pendingDeposit: skinnedPendingDeposit,
        completed: skinnedCompleted,
        isLoadingAny: pendingDeposit.isLoading || completed.isLoading || isLoadingLocalSwaps,
        isValidatingAny: pendingDeposit.isValidating || completed.isValidating,
    }
}

function matchesSelectedAddress(swapResponse: SwapResponse, selectedAddresses: Set<string>) {
    const { source_address, source_network, destination_address, destination_network } = swapResponse.swap

    const sourceAddress = source_address
        ? new Address(source_address, source_network).normalized
        : null
    const destinationAddress = new Address(destination_address, destination_network).normalized

    return selectedAddresses.has(sourceAddress ?? '') || selectedAddresses.has(destinationAddress)
}
