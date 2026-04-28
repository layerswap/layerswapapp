import { useCallback, useMemo, useState } from 'react'
import { Wallet } from '@/Models/WalletProvider'
import type { ManualDestAddress } from '@/stores/manualDestAddressesStore'

type Args = {
    wallets: Wallet[]
    manualAddresses: ManualDestAddress[]
}

export function useHistoryFilters({ wallets, manualAddresses }: Args) {
    const [searchQuery, setSearchQuery] = useState('')
    const [walletAddresses, setWalletAddresses] = useState<string[]>([])
    const [networkNames, setNetworkNames] = useState<string[]>([])

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
    }, [])

    const knownAddresses = useMemo(() => {
        const s = new Set<string>()
        for (const w of wallets) for (const a of w.addresses) s.add(a)
        for (const m of manualAddresses) s.add(m.address)
        return s
    }, [wallets, manualAddresses])

    const selectedWalletAddrs = useMemo<string[] | null>(() => {
        const addrs = walletAddresses.filter(a => knownAddresses.has(a))
        return addrs.length > 0 ? addrs : null
    }, [walletAddresses, knownAddresses])

    const filtersActive =
        (selectedWalletAddrs?.length ?? 0) > 0 ||
        networkNames.length > 0

    return {
        searchQuery,
        setSearchQuery,
        walletAddresses,
        selectedWalletAddrs,
        toggleWalletAddress,
        networkNames,
        toggleNetworkName,
        clearFilters,
        filtersActive,
    }
}
