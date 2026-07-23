import { useCallback, useEffect, useMemo, useState } from 'react'
import { MAX_HISTORY_ADDRESSES } from '@/lib/historyWalletAddresses'

type Args = {
    addresses: string[]
}

export function useHistoryFilters({ addresses }: Args) {
    const [searchQuery, setSearchQuery] = useState('')
    const [customWalletAddresses, setCustomWalletAddresses] = useState<string[] | null>(null)
    const [networkNames, setNetworkNames] = useState<string[]>([])

    const defaultWalletAddresses = useMemo(
        () => addresses.slice(0, MAX_HISTORY_ADDRESSES),
        [addresses]
    )
    const hasAddressLimit = addresses.length > MAX_HISTORY_ADDRESSES

    const knownAddresses = useMemo(() => new Set(addresses), [addresses])

    useEffect(() => {
        setCustomWalletAddresses(current => {
            if (current === null) return null

            const next = current.filter(address => knownAddresses.has(address))
            if (next.length === 0) return null
            return next.length === current.length ? current : next
        })
    }, [knownAddresses])

    const selectedWalletAddrs = useMemo<string[] | null>(() => {
        if (customWalletAddresses !== null)
            return customWalletAddresses.filter(address => knownAddresses.has(address))

        return hasAddressLimit ? defaultWalletAddresses : null
    }, [customWalletAddresses, defaultWalletAddresses, hasAddressLimit, knownAddresses])

    const walletAddresses = selectedWalletAddrs ?? []

    const toggleWalletAddress = useCallback((address: string) => {
        if (!knownAddresses.has(address)) return

        setCustomWalletAddresses(current => {
            const selected = (current ?? (hasAddressLimit ? defaultWalletAddresses : []))
                .filter(item => knownAddresses.has(item))

            if (selected.includes(address)) {
                if (hasAddressLimit && selected.length === 1) return selected
                const next = selected.filter(item => item !== address)
                return next.length > 0 ? next : null
            }

            if (selected.length >= MAX_HISTORY_ADDRESSES) return selected
            return [...selected, address]
        })
    }, [defaultWalletAddresses, hasAddressLimit, knownAddresses])

    const toggleNetworkName = useCallback((name: string) => {
        setNetworkNames(prev =>
            prev.includes(name) ? prev.filter(x => x !== name) : [...prev, name]
        )
    }, [])

    const clearFilters = useCallback(() => {
        setSearchQuery('')
        setCustomWalletAddresses(null)
        setNetworkNames([])
    }, [])

    const filtersActive =
        customWalletAddresses !== null ||
        networkNames.length > 0

    return {
        searchQuery,
        setSearchQuery,
        walletAddresses,
        selectedWalletAddrs,
        walletSelectionCustomized: customWalletAddresses !== null,
        toggleWalletAddress,
        networkNames,
        toggleNetworkName,
        clearFilters,
        filtersActive,
    }
}
