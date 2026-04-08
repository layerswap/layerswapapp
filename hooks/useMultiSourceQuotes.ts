import useSWR from 'swr'
import { useMemo } from 'react'
import LayerSwapApiClient from '@/lib/apiClients/layerSwapApiClient'
import { ApiResponse } from '@/Models/ApiResponse'
import { Network, NetworkRoute, NetworkType, Token } from '@/Models/Network'
import { DetailedQuoteModel } from './useDetailedQuote'

export type SourceQuote = {
    network: Network
    token: Token
    quote: DetailedQuoteModel
    /** All fee tiers sorted by min_amount (ascending) */
    allTiers: DetailedQuoteModel[]
}

type MultiSourceQuoteArgs = {
    destinationNetwork: string | undefined
    destinationToken: string | undefined
    destinationAddress: string | undefined
    refuel?: boolean
}

function buildMultiQuoteUrl(
    source: { network: string; token: string },
    args: MultiSourceQuoteArgs
): string | null {
    if (!args.destinationNetwork || !args.destinationToken || !args.destinationAddress) return null

    const params = new URLSearchParams({
        source_network: source.network,
        source_token: source.token,
        destination_network: args.destinationNetwork,
        destination_token: args.destinationToken,
        destination_address: args.destinationAddress,
        refuel: String(!!args.refuel),
        use_deposit_address: 'true',
    })

    return `/detailed_quote?${params.toString()}`
}

/**
 * Fetches detailed quotes for multiple source networks simultaneously.
 * Groups sources by network type so we can show EVM sources together.
 */
export function useMultiSourceQuotes(
    networkOptions: { network: Network; token: Token }[],
    args: MultiSourceQuoteArgs
) {
    const apiClient = useMemo(() => new LayerSwapApiClient(), [])

    // Build a combined SWR key from all source networks
    const urls = useMemo(() => {
        if (!args.destinationNetwork || !args.destinationToken || !args.destinationAddress) return null
        if (!networkOptions.length) return null

        return networkOptions.map(opt => ({
            network: opt.network,
            token: opt.token,
            url: buildMultiQuoteUrl(
                { network: opt.network.name, token: opt.token.symbol },
                args
            ),
        }))
    }, [networkOptions, args.destinationNetwork, args.destinationToken, args.destinationAddress, args.refuel])

    // Use a single SWR key that represents all sources
    const cacheKey = useMemo(() => {
        if (!urls) return null
        return `multi_quote:${urls.map(u => u.url).join('|')}`
    }, [urls])

    const { data, isLoading, error } = useSWR<SourceQuote[]>(
        cacheKey,
        async () => {
            if (!urls) return []

            const results = await Promise.allSettled(
                urls.map(async ({ network, token, url }) => {
                    if (!url) return null
                    const response = await apiClient.fetcher(url) as ApiResponse<DetailedQuoteModel[]>
                    const allTiers = response?.data
                    const quote = allTiers?.[0]
                    if (!quote || !allTiers) return null
                    const sortedTiers = [...allTiers].sort((a, b) => a.min_amount - b.min_amount)
                    return { network, token, quote, allTiers: sortedTiers } as SourceQuote
                })
            )

            return results
                .filter((r): r is PromiseFulfilledResult<SourceQuote | null> => r.status === 'fulfilled')
                .map(r => r.value)
                .filter((r): r is SourceQuote => r !== null)
        },
        {
            refreshInterval: 30000,
            dedupingInterval: 5000,
            keepPreviousData: true,
        }
    )

    // Group by network type
    const grouped = useMemo(() => {
        if (!data) return { evm: [], other: [], byType: new Map<NetworkType, SourceQuote[]>() }

        const evm: SourceQuote[] = []
        const other: SourceQuote[] = []
        const byType = new Map<NetworkType, SourceQuote[]>()

        for (const item of data) {
            if (item.network.type === NetworkType.EVM) {
                evm.push(item)
            } else {
                other.push(item)
            }

            const existing = byType.get(item.network.type) ?? []
            existing.push(item)
            byType.set(item.network.type, existing)
        }

        const sortByFee = (a: SourceQuote, b: SourceQuote) => {
            const feeA = a.quote.total_percentage_fee + a.quote.total_fixed_fee_in_usd
            const feeB = b.quote.total_percentage_fee + b.quote.total_fixed_fee_in_usd
            return feeA - feeB
        }

        evm.sort(sortByFee)
        other.sort(sortByFee)
        for (const [, quotes] of byType) {
            quotes.sort(sortByFee)
        }

        return { evm, other, byType }
    }, [data])

    return {
        allQuotes: data ?? [],
        evmQuotes: grouped.evm,
        otherQuotes: grouped.other,
        quotesByType: grouped.byType,
        isLoading,
        error,
    }
}
