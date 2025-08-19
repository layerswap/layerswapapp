import { ExchangeToken } from "../Models/Exchange"
import { SwapDirection, SwapFormValues } from "../components/DTOs/SwapFormValues"

export const resolveExchangesURLForSelectedToken = (direction: SwapDirection, values: SwapFormValues) => {

    const include_unmatched = 'true'
    const include_swaps = 'false'
    const include_unavailable = 'true'

    const { from, to, fromAsset: fromCurrency, toAsset: toCurrency } = values

    const network = direction === "from" ? to?.name : from?.name
    const token = direction === "from" ? toCurrency?.symbol : fromCurrency?.symbol

    const params = new URLSearchParams({
        include_unmatched,
        include_swaps,
        include_unavailable,
        ...(network && token ?
            {
                [direction === 'to' ? 'source_network' : 'destination_network']: network,
                [direction === 'to' ? 'source_token' : 'destination_token']: token,
            }
            : {}
        )
    });

    const sourcesURL = `/source_exchanges?${params.toString()}`
    const destinationsURL = `/destination_exchanges?${params.toString()}`
    const result = direction === "from" ? sourcesURL : destinationsURL

    return result

}

export const resolveExchangeHistoricalNetworksURL = (direction: SwapDirection, { fromExchange, currencyGroup, to, toAsset }: { fromExchange?: string | undefined; currencyGroup?: string | undefined; to?: string | undefined; toAsset?: string | undefined }) => {
    if (direction === "from" && fromExchange && to && toAsset && currencyGroup) {
        const params = new URLSearchParams({
            source_exchange: fromExchange,
            source_token_group: currencyGroup,
            destination_network: to,
            destination_token: toAsset,
        })
        return `/exchange_withdrawal_networks?${params.toString()}`
    }

    return null
}

export const resolveNetworkRoutesURL = (direction: SwapDirection, values: SwapFormValues, networkTypes?: string[]) => {

    const { from, to, fromAsset: fromCurrency, toAsset: toCurrency, fromExchange, toExchange } = values

    const selectednetwork = direction === "from" ? to : from
    const selectedToken = direction === "from" ? toCurrency?.symbol : fromCurrency?.symbol
    
    const includeSwaps = !(fromExchange || toExchange)
    
    return resolveRoutesURLForSelectedToken({ direction, network: selectednetwork?.name, token: selectedToken, includes: { unmatched: true, unavailable: true }, networkTypes, includeSwaps })
}

export const resolveRoutesURLForSelectedToken = ({ direction, network, token, includes, networkTypes, includeSwaps = true }: { direction: SwapDirection, network: string | undefined, token: string | undefined, includes: { unavailable: boolean, unmatched: boolean }, networkTypes?: string[], includeSwaps?: boolean }) => {

    const include_unmatched = includes.unmatched ? 'true' : 'false'
    const include_swaps = includeSwaps ? 'true' : 'false'
    const include_unavailable = includes.unavailable ? 'true' : 'false'

    const params = new URLSearchParams({
        include_unmatched,
        include_swaps,
        include_unavailable,
        ...(networkTypes ? { network_types: networkTypes?.join(',') } : {}),
        ...(network ?
            {
                [direction === 'to' ? 'source_network' : 'destination_network']: network,
            }
            : {}
        ),
        ...(network && token ?
            {
                [direction === 'to' ? 'source_network' : 'destination_network']: network,
                [direction === 'to' ? 'source_token' : 'destination_token']: token,
            }
            : {}
        )
    });

    const sourceRoutesURL = `/sources?${params.toString()}`
    const destinationRoutesURL = `/destinations?${params.toString()}`
    const result = direction === "from" ? sourceRoutesURL : destinationRoutesURL

    return result

}

export const resolveRoutesURLForSelectedAssetGroup = (direction: SwapDirection, currencyGroup: ExchangeToken, networkTypes?: string[]) => {
    const include_unmatched = 'true'
    const include_swaps = 'true'
    const include_unavailable = 'true'

    const parrams = new URLSearchParams({
        include_unmatched,
        include_swaps,
        include_unavailable,
        ...(networkTypes ? { network_types: networkTypes?.join(',') } : {}),
        [direction === 'to' ? 'source_token_group' : 'destination_token_group']: currencyGroup.symbol
    });
    const endpoint = direction === "to" ? '/exchange_destination_networks' : '/exchange_source_networks'
    return `${endpoint}?${parrams.toString()}`
}