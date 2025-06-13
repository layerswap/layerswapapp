import { useEffect, useMemo } from 'react'
import { getKey, useBalanceStore } from '../../../stores/balanceStore'
import { NetworkWithTokens } from '../../../Models/Network'

export interface Opts {
    refreshInterval?: number
    dedupeInterval?: number
    refreshWhenHidden?: boolean
    refreshWhenOffline?: boolean
}

export function useBalance(
    address: string | undefined,
    network: NetworkWithTokens | undefined,
    opts?: Opts
) {
    const key = useMemo(() => (address && network) ? getKey(address, network) : 'unknown', [address, network])
    const {
        refreshInterval = 400000,
        refreshWhenHidden = false,
        refreshWhenOffline = false,
    } = opts ?? {}

    const entry = useBalanceStore((s) => s.balances[key])
    const fetchBalance = useBalanceStore((s) => s.fetchBalance)

    const tick = () => {
        if (!address || !network) return
        if (refreshWhenHidden && document.hidden) return
        if (refreshWhenOffline && !navigator.onLine) return
        fetchBalance(address, network)
    }

    useEffect(() => {
        tick()
    }, [address, network, entry?.status, fetchBalance])

    useEffect(() => {
        if (refreshInterval <= 0) return
        if (!address || !network) return
        tick()
        const id = window.setInterval(tick, refreshInterval)
        return () => window.clearInterval(id)
    }, [
        address,
        network,
        fetchBalance,
        refreshInterval,
        refreshWhenHidden,
        refreshWhenOffline,
    ])

    return {
        balances: entry?.data?.balances,
        totalInUSD: entry?.data?.totalInUSD,
        error: entry?.error,
        isLoading: entry?.status === 'loading',
    }
}
