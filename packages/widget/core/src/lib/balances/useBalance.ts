import { useEffect, useMemo } from 'react'
import { getKey, useBalanceStore } from '@/stores/balanceStore'
import { NetworkWithTokens } from '@layerswap/widget-types';

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
        dedupeInterval = refreshInterval,
    } = opts ?? {}

    const entry = useBalanceStore((s) => s.balances[key])
    const fetchBalance = useBalanceStore((s) => s.fetchBalance)

    useEffect(() => {
        if (!address || !network) return
        let stopped = false
        let timer: number | undefined
        const poll = async () => {
            const visible = refreshWhenHidden || !document.hidden
            const online = refreshWhenOffline || navigator.onLine !== false
            if (visible && online) {
                // The store shares in-flight requests and exposes errors to the UI.
                await fetchBalance(address, network, { dedupeInterval }).catch(() => undefined)
            }
            // Start the next wait after the request settles. Fixed interval ticks
            // otherwise hit the completion-based cache too early and skip a poll.
            if (!stopped && refreshInterval > 0) {
                timer = window.setTimeout(poll, refreshInterval)
            }
        }
        void poll()
        return () => {
            stopped = true
            window.clearTimeout(timer)
        }
    }, [address, network, fetchBalance, refreshInterval, dedupeInterval, refreshWhenHidden, refreshWhenOffline])

    const mutate = () => {
        if (!address || !network) return Promise.resolve(undefined)
        return fetchBalance(address, network, { ignoreCache: true })
    }

    return {
        balances: entry?.data?.balances,
        error: entry?.error,
        isLoading: entry?.status === 'loading',
        mutate,
    }
}