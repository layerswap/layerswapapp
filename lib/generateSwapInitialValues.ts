import { SwapFormValues } from "../components/DTOs/SwapFormValues";
import { QueryParams } from "../Models/QueryParams";
import { isValidAddress } from "./addressValidator";
import { LayerSwapAppSettings } from "../Models/LayerSwapAppSettings";
import { SwapResponse } from "./layerSwapApiClient";

export function generateSwapInitialValues(settings: LayerSwapAppSettings, queryParams: QueryParams): SwapFormValues {
    const { destAddress, amount, fromAsset, toAsset, from, to, lockFromAsset, lockToAsset } = queryParams
    const { networks, exchanges, sourceRoutes, destinationRoutes } = settings || {}

    const lockedSourceCurrency = lockFromAsset ?
        networks.find(l => l.name === to)
            ?.tokens?.find(c => c?.symbol?.toUpperCase() === fromAsset?.toUpperCase())
        : undefined
    const lockedDestinationCurrency = lockToAsset ?
        networks.find(l => l.name === to)
            ?.tokens?.find(c => c?.symbol?.toUpperCase() === toAsset?.toUpperCase())
        : undefined

    const sourceLayer = networks.find(l => l.name.toUpperCase() === from?.toUpperCase())
    const destinationLayer = networks.find(l => l.name.toUpperCase() === to?.toUpperCase())

    const sourceItems = networks.filter(l => sourceRoutes?.some(r => r.name === l.name))
    const destinationItems = networks.filter(l => destinationRoutes?.some(r => r.name === l.name))

    const initialSourceExchange = exchanges.find(e => e.name.toLowerCase() === from?.toLowerCase())
    const initialDestinationExchange = exchanges.find(e => e.name.toLowerCase() === to?.toLowerCase())

    const initialSource = sourceLayer ?
        sourceItems.find(i => i == sourceLayer)
        : undefined
    const initialDestination = destinationLayer
        ? destinationItems.find(i => i === destinationLayer)
        : undefined

    const filteredSourceCurrencies = lockedSourceCurrency ?
        [lockedSourceCurrency]
        : networks.find(l => l.name === from)?.tokens

    const filteredDestinationCurrencies = lockedDestinationCurrency ?
        [lockedDestinationCurrency]
        : networks.find(l => l.name === to)?.tokens

    let initialAddress =
        destAddress && initialDestination && isValidAddress(destAddress, destinationLayer) ? destAddress : "";

    let initialSourceCurrency = filteredSourceCurrencies?.find(c => c.symbol?.toUpperCase() == fromAsset?.toUpperCase())

    let initialDestinationCurrency = filteredDestinationCurrencies?.find(c => c.symbol?.toUpperCase() == toAsset?.toUpperCase())

    //TODO this looks wrong
    let initialAmount =
        (lockedDestinationCurrency && amount) || (initialDestinationCurrency ? amount : '')

    const result: SwapFormValues = {
        fromExchange: initialSourceExchange,
        toExchange: initialDestinationExchange,
        from: initialSource,
        to: initialDestination,
        amount: initialAmount,
        fromCurrency: initialSourceCurrency,
        toCurrency: initialDestinationCurrency,
        destination_address: initialAddress ? initialAddress : '',
    }

    return result
}


export function generateSwapInitialValuesFromSwap(swapResponse: SwapResponse, settings: LayerSwapAppSettings): SwapFormValues {
    const { swap, refuel } = swapResponse || ''
    const {
        destination_address,
        requested_amount,
        source_network,
        destination_network,
        source_token,
        destination_token,
        source_exchange,
        destination_exchange,
    } = swap

    const { networks: layers, exchanges } = settings || {}

    const from = layers.find(l => l.name === source_network.name);
    const to = layers.find(l => l.name === destination_network.name);

    const fromExchange = exchanges.find(e => e.name === source_exchange?.name);
    const toExchange = exchanges.find(e => e.name === destination_exchange?.name);

    const direction = fromExchange ? 'from' : 'to';
    const availableAssetGroups = direction === 'from' ? fromExchange?.token_groups : toExchange?.token_groups;
    const currencyGroup = availableAssetGroups?.find(a => a.symbol === (direction === 'from' ? source_token.symbol : destination_token.symbol))

    const fromCurrency = from?.tokens.find(c => c.symbol === source_token.symbol);
    const toCurrency = to?.tokens.find(c => c.symbol === destination_token.symbol);

    const result: SwapFormValues = {
        from,
        to,
        amount: requested_amount?.toString(),
        fromCurrency,
        toCurrency,
        destination_address,
        refuel: !!refuel,
        fromExchange,
        toExchange,
        currencyGroup
    }

    return result
}