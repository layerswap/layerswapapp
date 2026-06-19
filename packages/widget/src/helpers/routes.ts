import { SwapDirection, SwapFormValues } from "@/components/Pages/Swap/Form/SwapFormValues"
import AppSettings from "@/lib/AppSettings"
import { resolveExtendedRoutePlan } from "@/lib/extendedRoutes/registry"

export const resolveExchangesURLForSelectedToken = (values: SwapFormValues) => {

    const include_unmatched = 'true'
    const include_swaps = 'false'
    const include_unavailable = 'true'

    const { from, fromAsset: fromCurrency } = values

    // Extended sources are unknown to the backend, so query exchanges against
    // the real source selected by the route plan.
    const extendedPlan = resolveExtendedRoutePlan({
        sourceNetworkName: from?.name,
        sourceTokenSymbol: fromCurrency?.symbol,
    })
    const sourceNetworkName = extendedPlan?.mapping.real.networkName ?? from?.name
    const sourceTokenSymbol = extendedPlan?.mapping.real.tokenSymbol ?? fromCurrency?.symbol

    const params = new URLSearchParams({
        include_unmatched,
        include_swaps,
        include_unavailable,
        ...(sourceNetworkName && sourceTokenSymbol ?
            {
                ['source_network']: sourceNetworkName,
                ['source_token']: sourceTokenSymbol,
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

    const { from, to, fromAsset: fromCurrency, toAsset: toCurrency, fromExchange, toExchange, depositMethod } = values

    const selectednetwork = direction === "from" ? to : from
    const selectedToken = direction === "from" ? toCurrency?.symbol : fromCurrency?.symbol

    const isCEX = fromExchange || toExchange
    const hasDepositAddress = depositMethod === 'deposit_address'

    const unboundDestination = hasDepositAddress && direction === 'to'

    // For source picking in the deposit-address flow we want the API to return
    // only sources that can actually route to the destination via a deposit-address
    // swap. `include_swaps` returns the broader set (incl. unreachable ones), which
    // makes the picker disagree with the auto-picker.
    const useDepositAddressSwaps = hasDepositAddress && direction === 'from'

    // Listing destinations for an extended source: substitute the real source
    // selected by the route plan and force the deposit-address swap set.
    const extendedPlan = direction === 'to' ? resolveExtendedRoutePlan({
        sourceNetworkName: from?.name,
        sourceTokenSymbol: fromCurrency?.symbol,
    }) : undefined

    let networkName = isCEX || unboundDestination ? undefined : selectednetwork?.name
    let tokenName = isCEX || unboundDestination ? undefined : selectedToken
    if (extendedPlan && !isCEX) {
        networkName = extendedPlan.mapping.real.networkName
        tokenName = extendedPlan.mapping.real.tokenSymbol
    }

    return resolveRoutesURLForSelectedToken({
        direction,
        network: networkName,
        token: tokenName,
        includes: { unmatched: !hasDepositAddress, unavailable: !hasDepositAddress, swaps: !isCEX },
        networkTypes,
        hasDepositAddress,
        useDepositAddressSwaps: useDepositAddressSwaps || !!extendedPlan,
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
    networkTypes?: string[],
    hasDepositAddress?: boolean,
    useDepositAddressSwaps?: boolean,
}
export const resolveRoutesURLForSelectedToken = ({ direction, network, token, includes, networkTypes, hasDepositAddress, useDepositAddressSwaps }: ResolveRoutesURLForSelectedTokenProps) => {

    const include_unmatched = includes.unmatched ? 'true' : 'false'
    const include_unavailable = includes.unavailable ? 'true' : 'false'

    const params = new URLSearchParams({
        include_unmatched,
        include_unavailable,
        ...(useDepositAddressSwaps
            ? { include_swaps_via_deposit_address: 'true' }
            : { include_swaps: includes.swaps ? 'true' : 'false' }),
        ...(networkTypes ? { network_types: networkTypes?.join(',') } : {}),
        ...(hasDepositAddress ? { has_deposit_address: 'true' } : {}),
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
