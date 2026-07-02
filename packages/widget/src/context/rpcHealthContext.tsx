'use client'
import { Network } from '@/Models/Network'
import type { RpcHealthCheckResult } from '@/types/rpcHealth'
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

    // If no provider for this network, return null
    if (!provider) {
        return null
    }

    // Call the hook from the provider
    return provider.useRpcHealthCheck()
}
