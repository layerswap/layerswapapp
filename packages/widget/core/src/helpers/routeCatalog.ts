import type { NetworkRoute, NetworkRouteToken, NetworkWithTokens, Token } from '@layerswap/widget-types'

function hasText(value: unknown): value is string {
    return typeof value === 'string' && value.trim().length > 0
}

function validDecimals(value: number): boolean {
    return Number.isInteger(value) && value >= 0
}

export function catalogNetworks(networks: NetworkWithTokens[]): NetworkWithTokens[] {
    if (!Array.isArray(networks)) return []
    return networks.filter(network => hasText(network?.name)).map(network => ({
        ...network,
        display_name: hasText(network.display_name) ? network.display_name : network.name,
        tokens: Array.isArray(network.tokens) ? network.tokens.filter(token =>
            hasText(token?.symbol) && hasText(token.asset) && validDecimals(token.decimals)
        ) : [],
    }))
}

export function indexRouteCatalog(networks: NetworkWithTokens[]) {
    return new Map(networks.map(network => [network.name, {
        network,
        tokens: new Map(network.tokens.map(token => [token.symbol, token])),
    }]))
}

type RouteEntry = Pick<NetworkRoute, 'name'> & Partial<Omit<NetworkRoute, 'tokens'>> & {
    tokens: (Pick<Token, 'symbol'> & Partial<NetworkRouteToken>)[]
}

// The route endpoints and network catalog can come from different cache snapshots.
// A route needs the catalog's token identity and contract metadata to be selectable.
export function resolveCatalogRoutes(routes: RouteEntry[] | undefined, catalog: ReturnType<typeof indexRouteCatalog>): NetworkRoute[] {
    const result: NetworkRoute[] = []
    if (!Array.isArray(routes)) return result

    for (const route of routes) {
        const entry = catalog.get(route?.name)
        if (!entry || !Array.isArray(route.tokens)) continue

        const tokens: NetworkRouteToken[] = []
        for (const token of route.tokens) {
            const base = entry.tokens.get(token?.symbol)
            if (!base || (token.decimals !== undefined && !validDecimals(token.decimals))) continue
            tokens.push({
                ...base,
                ...token,
                asset: hasText(token.asset) ? token.asset : base.asset,
                decimals: token.decimals ?? base.decimals,
                price_in_usd: token.price_in_usd ?? base.price_in_usd,
                status: token.status ?? base.status,
                source_rank: token.source_rank ?? base.source_rank,
                destination_rank: token.destination_rank ?? base.destination_rank,
                supports_gasless_deposit: token.supports_gasless_deposit ?? base.supports_gasless_deposit,
                gasless_standard: token.gasless_standard === undefined ? base.gasless_standard : token.gasless_standard,
            })
        }
        if (tokens.length > 0) {
            result.push({
                ...entry.network,
                ...route,
                display_name: hasText(route.display_name) ? route.display_name : entry.network.display_name,
                deposit_methods: route.deposit_methods ?? entry.network.deposit_methods,
                source_rank: route.source_rank ?? entry.network.source_rank,
                destination_rank: route.destination_rank ?? entry.network.destination_rank,
                tokens,
            })
        }
    }
    return result
}
