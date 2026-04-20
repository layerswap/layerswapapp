import { useCallback, useMemo, useState } from 'react'
import { Wallet } from '@/Models/WalletProvider'
import { walletIdOf, type FilterOpts } from '@/components/SwapHistory/Filters/types'

type Args = {
    wallets: Wallet[]
}

export function useHistoryFilters({ wallets }: Args) {
    const [searchQuery, setSearchQuery] = useState('')
    const [walletInternalIds, setWalletInternalIds] = useState<string[]>([])
    const [networkNames, setNetworkNames] = useState<string[]>([])
    const [hideIncomplete, setHideIncomplete] = useState(false)

    const toggleWalletInternalId = useCallback((id: string) => {
        setWalletInternalIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        )
    }, [])

    const toggleNetworkName = useCallback((name: string) => {
        setNetworkNames(prev =>
            prev.includes(name) ? prev.filter(x => x !== name) : [...prev, name]
        )
    }, [])

    const clearFilters = useCallback(() => {
        setSearchQuery('')
        setWalletInternalIds([])
        setNetworkNames([])
        setHideIncomplete(false)
    }, [])

    const selectedWalletAddrs = useMemo<string[] | null>(() => {
        if (walletInternalIds.length === 0) return null
        const addrs: string[] = []
        for (const id of walletInternalIds) {
            const w = wallets.find(x => walletIdOf(x) === id)
            if (!w) continue
            addrs.push(w.address)
        }
        return addrs.length > 0 ? addrs : null
    }, [walletInternalIds, wallets])

    const filterOpts = useMemo<FilterOpts>(() => ({
        walletAddrs: selectedWalletAddrs,
        networks: networkNames.length > 0 ? networkNames : null,
    }), [selectedWalletAddrs, networkNames])

    const filtersActive =
        walletInternalIds.length > 0 ||
        networkNames.length > 0 ||
        hideIncomplete

    return {
        searchQuery,
        setSearchQuery,
        walletInternalIds,
        toggleWalletInternalId,
        networkNames,
        toggleNetworkName,
        hideIncomplete,
        setHideIncomplete,
        clearFilters,
        filterOpts,
        filtersActive,
    }
}
