'use client'
import { useEffect, useMemo, useSyncExternalStore } from 'react'
import { Network } from '@/Models/Network'
import type { RpcHealthCheckResult, RpcHealthCheckStore } from '@/types/rpcHealth'
import { resolverService } from '@/lib/resolvers/resolverService'

/**
 * Hook to access RPC health check functionality for a specific network.
 * Returns null if no RPC health check provider is available for the network.
 *
 * @param network - The network to check RPC health for
 */
export function useRpcHealth(network: Network): RpcHealthCheckResult | null {
    const resolver = resolverService.getRpcHealthCheckResolver()
    const provider = resolver?.getProviderForNetwork(network)

    const store: RpcHealthCheckStore | null = useMemo(
        () => provider?.createStore() ?? null,
        [provider],
    )

    useEffect(() => () => store?.destroy?.(), [store])

    const snapshot = useSyncExternalStore(
        store?.subscribe ?? noopSubscribe,
        store?.getSnapshot ?? getEmptySnapshot,
        store?.getSnapshot ?? getEmptySnapshot,
    )

    if (!store) return null

    return {
        ...snapshot,
        checkManually: store.checkManually,
        suggestRpc: store.suggestRpc,
        suggestRpcForCurrentChain: store.suggestRpcForCurrentChain,
    }
}

const noopSubscribe = () => () => {}
const EMPTY_SNAPSHOT = { health: { status: undefined }, isSuggestingRpc: false } as const
const getEmptySnapshot = () => EMPTY_SNAPSHOT as { health: { status: undefined }, isSuggestingRpc: boolean }
