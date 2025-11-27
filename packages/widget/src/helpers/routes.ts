import { SwapDirection, SwapFormValues } from "@/components/Pages/Swap/Form/SwapFormValues"
import AppSettings from "@/lib/AppSettings"

export const resolveExchangesURLForSelectedToken = (values: SwapFormValues) => {

    const include_unmatched = 'true'
    const include_swaps = 'false'
    const include_unavailable = 'true'

    const { from, fromAsset: fromCurrency } = values


    const params = new URLSearchParams({
        include_unmatched,
        include_swaps,
        include_unavailable,
        ...(from?.name && fromCurrency?.symbol ?
            {
                ['source_network']: from?.name,
                ['source_token']: fromCurrency?.symbol,
            }
            : {}
        )
    });

    const sourcesURL = `/source_exchanges?${params.toString()}`

    return sourcesURL

}

export const resolveExchangeHistoricalNetworksURL = (direction: SwapDirection, { fromExchange, to, toAsset }: { fromExchange?: string | undefined; to?: string | undefined; toAsset?: string | undefined }) => {
    if (direction === "from" && fromExchange && to && toAsset) {
        const params = new URLSearchParams({
            source_exchange: fromExchange,
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

    const isCEX = fromExchange || toExchange

    return resolveRoutesURLForSelectedToken({
        direction,
        network: isCEX ? undefined : selectednetwork?.name,
        token: isCEX ? undefined : selectedToken,
        includes: { unmatched: true, unavailable: true, swaps: !isCEX },
        networkTypes
    })
}

type IncludeOptions = {
    unavailable: boolean,
    unmatched: boolean,
    swaps: boolean
}
type ResolveRoutesURLForSelectedTokenProps = {
    direction: SwapDirection,
    network: string | undefined,
    token: string | undefined,
    includes: IncludeOptions,
    networkTypes?: string[]
}
export const resolveRoutesURLForSelectedToken = ({ direction, network, token, includes, networkTypes }: ResolveRoutesURLForSelectedTokenProps) => {

    const include_unmatched = includes.unmatched ? 'true' : 'false'
    const include_swaps = includes.swaps ? 'true' : 'false'
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

    const availableNetworkTypes = AppSettings.AvailableSourceNetworkTypes;
    const networkTypesQuery = availableNetworkTypes?.all ? '' : availableNetworkTypes?.networks?.map(type => `network_types=${type}`).join('&') || '';
    const sourceRoutesURL = `/sources?${params.toString()}${networkTypesQuery ? `&${networkTypesQuery}` : ''}`
    const destinationRoutesURL = `/destinations?${params.toString()}`
    const result = direction === "from" ? sourceRoutesURL : destinationRoutesURL

    return result
}