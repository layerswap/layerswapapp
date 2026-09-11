import { Horizon, rpc } from '@stellar/stellar-sdk'
import type { Network } from '@layerswap/widget-types'

type StellarServer = Horizon.Server | rpc.Server

const horizonServers = new Map<string, Promise<Horizon.Server>>()
const rpcServers = new Map<string, Promise<rpc.Server>>()

function getCandidateUrls(network: Network): string[] {
    return [...new Set([network.node_url, ...(network.nodes ?? [])].filter(Boolean))]
}

async function findServer<T extends StellarServer>(
    network: Network,
    networkPassphrase: string,
    kind: 'Horizon' | 'RPC',
    createAndVerify: (url: string) => Promise<T>,
): Promise<T> {
    const candidates = getCandidateUrls(network)
    if (candidates.length === 0) {
        throw new Error(`No Stellar ${kind} endpoints are configured for ${network.name}`)
    }

    const results = await Promise.allSettled(candidates.map(createAndVerify))
    const match = results.find(result => result.status === 'fulfilled')
    if (match?.status === 'fulfilled') return match.value as T

    const cause = results.find((result): result is PromiseRejectedResult => result.status === 'rejected')?.reason
    throw new Error(`No Stellar ${kind} endpoint for ${network.name} matches ${networkPassphrase}`, { cause })
}

function cachedServer<T>(cache: Map<string, Promise<T>>, key: string, load: () => Promise<T>): Promise<T> {
    const existing = cache.get(key)
    if (existing) return existing

    const pending = load().catch(error => {
        cache.delete(key)
        throw error
    })
    cache.set(key, pending)
    return pending
}

export function getStellarHorizonServer(network: Network, networkPassphrase: string): Promise<Horizon.Server> {
    const key = `${network.name}:${networkPassphrase}:${getCandidateUrls(network).join('|')}`
    return cachedServer(horizonServers, key, () => findServer(
        network,
        networkPassphrase,
        'Horizon',
        async url => {
            const server = new Horizon.Server(url)
            const root = await server.root()
            if (root.network_passphrase !== networkPassphrase) {
                throw new Error(`Horizon endpoint ${url} is connected to a different Stellar network`)
            }
            return server
        },
    ))
}

export function getStellarRpcServer(network: Network, networkPassphrase: string): Promise<rpc.Server> {
    const key = `${network.name}:${networkPassphrase}:${getCandidateUrls(network).join('|')}`
    return cachedServer(rpcServers, key, () => findServer(
        network,
        networkPassphrase,
        'RPC',
        async url => {
            const server = new rpc.Server(url)
            const rpcNetwork = await server.getNetwork()
            if (rpcNetwork.passphrase !== networkPassphrase) {
                throw new Error(`RPC endpoint ${url} is connected to a different Stellar network`)
            }
            return server
        },
    ))
}
