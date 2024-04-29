import { ExchangeToken } from "../Models/Exchange"
import { SwapDirection, SwapFormValues } from "../components/DTOs/SwapFormValues"

export const resolveExchangesURLForSelectedToken = (direction: SwapDirection, values: SwapFormValues) => {

    const include_unmatched = 'true'
    const { from, to, fromCurrency, toCurrency } = values

    const network = direction === "from" ? to?.name : from?.name
    const token = direction === "from" ? toCurrency?.symbol : fromCurrency?.symbol

    const params = new URLSearchParams({
        include_unmatched,
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

export const resolveNetworkRoutesURL = (direction: SwapDirection, values: SwapFormValues) => {

    const { from, to, fromCurrency, toCurrency, fromExchange, toExchange, currencyGroup } = values

    const selectedExchange = direction === 'from' ? toExchange : fromExchange

    if (selectedExchange) {
        return currencyGroup ?
            resolveRoutesURLForSelectedAssetGroup(direction, currencyGroup)
            :
            resolveRoutesURLForSelectedToken(direction, undefined, undefined)
    }
    else if (!selectedExchange) {
        const selectednetwork = direction === "from" ? to : from
        const selectedToken = direction === "from" ? toCurrency?.symbol : fromCurrency?.symbol
        return resolveRoutesURLForSelectedToken(direction, selectednetwork?.name, selectedToken)
    }
}

export const resolveRoutesURLForSelectedToken = (direction: SwapDirection, network: string | undefined, token: string | undefined) => {

    const include_unmatched = 'true'
    const include_swaps = 'true'

    const params = new URLSearchParams({
        include_unmatched,
        include_swaps,
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

export const resolveRoutesURLForSelectedAssetGroup = (direction: SwapDirection, currencyGroup: ExchangeToken) => {
    const include_unmatched = 'true'
    const parrams = new URLSearchParams({
        include_unmatched,
        [direction === 'to' ? 'source_token_group' : 'destination_token_group']: currencyGroup.symbol
    });
    const endpoint = direction === "to" ? '/exchange_destination_networks' : '/exchange_source_networks'
    return `${endpoint}?${parrams.toString()}`
}