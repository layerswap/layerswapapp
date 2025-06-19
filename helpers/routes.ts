import { ExchangeToken } from "../Models/Exchange"
import { SwapDirection, SwapFormValues } from "../components/DTOs/SwapFormValues"

export const resolveExchangesURLForSelectedToken = (direction: SwapDirection, values: SwapFormValues) => {

    const include_unmatched = 'true'
    const include_swaps = 'true'
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

export const resolveExchangeHistoricalNetworksURL = (direction: SwapDirection, values: SwapFormValues, networkTypes?: string[]) => {

    const { from, to, fromAsset: fromCurrency, toAsset: toCurrency, fromExchange, toExchange, currencyGroup } = values

    if (direction === "from" && fromExchange && to && toCurrency && currencyGroup) {
        const params = new URLSearchParams({
            source_exchange: fromExchange.name,
            source_token_group: currencyGroup?.symbol,
            destination_network: to.name,
            destination_token: toCurrency.symbol,
        })
        return `/exchange_withdrawal_networks?${params.toString()}`
    }
    else if (direction === "to" && toExchange && from && fromCurrency && currencyGroup) {
        const params = new URLSearchParams({
            source_network: from.name,
            source_token: fromCurrency.symbol,
            destination_exchange: toExchange.name,
            destination_token_group: currencyGroup?.symbol
        })
        return `/exchange_deposit_networks?${params.toString()}`
    }

    return null
}

export const resolveNetworkRoutesURL = (direction: SwapDirection, values: SwapFormValues, networkTypes?: string[]) => {

    const { from, to, fromAsset: fromCurrency, toAsset: toCurrency, fromExchange, toExchange, currencyGroup } = values

    const selectedExchange = direction === 'from' ? toExchange : fromExchange

    if (selectedExchange) {
        return currencyGroup ?
            resolveRoutesURLForSelectedAssetGroup(direction, currencyGroup, networkTypes)
            :
            resolveRoutesURLForSelectedToken({ direction, network: undefined, token: undefined, includes: { unavailable: true, unmatched: true }, networkTypes })
    }
    else {
        const selectednetwork = direction === "from" ? to : from
        const selectedToken = direction === "from" ? toCurrency?.symbol : fromCurrency?.symbol
        return resolveRoutesURLForSelectedToken({ direction, network: selectednetwork?.name, token: selectedToken, includes: { unmatched: true, unavailable: true }, networkTypes })
    }
}

export const resolveRoutesURLForSelectedToken = ({ direction, network, token, includes, networkTypes }: { direction: SwapDirection, network: string | undefined, token: string | undefined, includes: { unavailable: boolean, unmatched: boolean }, networkTypes?: string[] }) => {

    const include_unmatched = includes.unmatched ? 'true' : 'false'
    const include_swaps = 'true'
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