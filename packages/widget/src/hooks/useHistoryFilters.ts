import { useCallback, useMemo, useState } from 'react'
import { Wallet } from '@/types/wallet'
import { FilterOpts } from '@/components/Pages/SwapHistory/Filters/types'

type Args = {
    wallets: Wallet[]
}

export function useHistoryFilters({ wallets }: Args) {
    const [searchQuery, setSearchQuery] = useState('')
    const [walletAddresses, setWalletAddresses] = useState<string[]>([])
    const [networkNames, setNetworkNames] = useState<string[]>([])
    const [hideIncomplete, setHideIncomplete] = useState(false)

    const toggleWalletAddress = useCallback((address: string) => {
        setWalletAddresses(prev =>
            prev.includes(address) ? prev.filter(x => x !== address) : [...prev, address]
        )
    }, [])

    const toggleNetworkName = useCallback((name: string) => {
        setNetworkNames(prev =>
            prev.includes(name) ? prev.filter(x => x !== name) : [...prev, name]
        )
    }, [])

    const clearFilters = useCallback(() => {
        setSearchQuery('')
        setWalletAddresses([])
        setNetworkNames([])
        setHideIncomplete(false)
    }, [])

    const knownAddresses = useMemo(() => {
        const s = new Set<string>()
        for (const w of wallets) for (const a of w.addresses) s.add(a)
        return s
    }, [wallets])

    const selectedWalletAddrs = useMemo<string[] | null>(() => {
        const addrs = walletAddresses.filter(a => knownAddresses.has(a))
        return addrs.length > 0 ? addrs : null
    }, [walletAddresses, knownAddresses])

    const filterOpts = useMemo<FilterOpts>(() => ({
        walletAddrs: selectedWalletAddrs,
    }), [selectedWalletAddrs])

    const filtersActive =
        (selectedWalletAddrs?.length ?? 0) > 0 ||
        networkNames.length > 0 ||
        hideIncomplete

    return {
        searchQuery,
        setSearchQuery,
        walletAddresses,
        toggleWalletAddress,
        networkNames,
        toggleNetworkName,
        hideIncomplete,
        setHideIncomplete,
        clearFilters,
        filterOpts,
        filtersActive,
    }
}
