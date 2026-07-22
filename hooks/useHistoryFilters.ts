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

    const knownAddresses = useMemo(() => new Set(addresses), [addresses])

    useEffect(() => {
        setCustomWalletAddresses(current => {
            if (current === null) return null

            const next = current.filter(address => knownAddresses.has(address))
            if (next.length === 0) return null
            return next.length === current.length ? current : next
        })
    }, [knownAddresses])

    const walletAddresses = useMemo(() => {
        if (customWalletAddresses === null) return defaultWalletAddresses
        return customWalletAddresses.filter(address => knownAddresses.has(address))
    }, [customWalletAddresses, defaultWalletAddresses, knownAddresses])

    const toggleWalletAddress = useCallback((address: string) => {
        if (!knownAddresses.has(address)) return

        setCustomWalletAddresses(current => {
            const selected = (current ?? defaultWalletAddresses)
                .filter(item => knownAddresses.has(item))

            if (selected.includes(address)) {
                const next = selected.filter(item => item !== address)
                return next.length > 0 ? next : null
            }

            if (selected.length >= MAX_HISTORY_ADDRESSES) return selected
            return [...selected, address]
        })
    }, [defaultWalletAddresses, knownAddresses])

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
        walletSelectionCustomized: customWalletAddresses !== null,
        toggleWalletAddress,
        networkNames,
        toggleNetworkName,
        clearFilters,
        filtersActive,
    }
}
