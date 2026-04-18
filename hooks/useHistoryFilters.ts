import { useCallback, useMemo, useState } from 'react'
import { Network } from '@/Models/Network'
import { Wallet } from '@/Models/WalletProvider'
import { Address } from '@/lib/address'
import { FilterOpts } from '@/components/SwapHistory/Filters'

type Args = {
    wallets: Wallet[]
    networks: Network[]
}

export function useHistoryFilters({ wallets, networks }: Args) {
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
            const w = wallets.find(x => (x.internalId ?? x.address) === id)
            if (!w) continue
            const net = networks.find(n => n.chain_id == w.chainId)
            addrs.push(new Address(w.address, net || null, w.providerName).normalized)
        }
        return addrs.length > 0 ? addrs : null
    }, [walletInternalIds, wallets, networks])

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
