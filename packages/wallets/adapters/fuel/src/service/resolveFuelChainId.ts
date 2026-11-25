export type KnownFuelNetwork = {
    chainId: string | number | null | undefined
    rpcUrls: readonly string[]
}

function normalizeRpcUrl(url: string | undefined): string | undefined {
    if (!url) {
        return undefined
    }
    try {
        const endpoint = new URL(url)
        endpoint.pathname = endpoint.pathname.replace(/\/+$/, '') || '/'
        return endpoint.href
    } catch {
        return undefined
    }
}

/** Resolve wallet metadata without issuing RPC requests or guessing from hostnames. */
export function resolveFuelChainId(
    network: { chainId?: number; url?: string },
    knownNetworks: readonly KnownFuelNetwork[] = [],
): number | undefined {
    if (network.chainId != null) {
        return network.chainId
    }

    const url = normalizeRpcUrl(network.url)
    if (!url) {
        return undefined
    }
    const match = knownNetworks.find(known => known.rpcUrls.some(rpcUrl => normalizeRpcUrl(rpcUrl) === url))
    if (match?.chainId == null || match.chainId === '') {
        return undefined
    }
    return Number(match.chainId)
}
