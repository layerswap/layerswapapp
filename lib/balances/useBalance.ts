import { useEffect, useMemo } from 'react'
import { getKey, useBalanceStore } from '../../stores/balanceStore'
import { NetworkWithTokens } from '../../Models/Network'
import useIsWindowVisible from '../../hooks/useIsWindowVisible'

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
        refreshInterval = 60000,
        refreshWhenHidden = false,
        refreshWhenOffline = false,
        dedupeInterval = 60000,
    } = opts ?? {}

    const entry = useBalanceStore((s) => s.balances[key])
    const fetchBalance = useBalanceStore((s) => s.fetchBalance)

    const tick = (interval: number = refreshInterval) => {
        if (!address || !network) return
        if (!refreshWhenHidden && document.hidden) return
        if (!refreshWhenOffline && navigator.onLine === false) return
        fetchBalance(address, network, { dedupeInterval: interval })
    }

    useEffect(() => {
        tick()
    }, [address, network, entry?.status, fetchBalance])

    useEffect(() => {
        if (refreshInterval <= 0) return
        if (!address || !network) return
        tick(refreshInterval)
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

    const mutate = () => {
        if (!address || !network) return
        fetchBalance(address, network, { ignoreCache: true })
    }

    return {
        balances: entry?.data?.balances,
        error: entry?.error,
        isLoading: entry?.status === 'loading',
        mutate,
    }
}
