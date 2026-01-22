import { SwapFormValues } from "../components/DTOs/SwapFormValues";
import { QueryParams } from "../Models/QueryParams";
import { Address } from "./address";
import { LayerSwapAppSettings } from "../Models/LayerSwapAppSettings";
import { SwapBasicData } from "./apiClients/layerSwapApiClient";

export function generateSwapInitialValues(settings: LayerSwapAppSettings, queryParams: QueryParams, type: 'cross-chain' | 'exchange'): SwapFormValues {
    const { destination_address, amount, fromAsset, toAsset, from, to, lockFromAsset, lockToAsset, depositMethod, fromExchange } = queryParams
    const { sourceExchanges, sourceRoutes, destinationRoutes } = settings || {}

    const lockedSourceCurrency = lockFromAsset ?
        sourceRoutes.find(l => l.name === to)
            ?.tokens?.find(c => c?.symbol?.toUpperCase() === fromAsset?.toUpperCase())
        : undefined
    const lockedDestinationCurrency = lockToAsset ?
        destinationRoutes.find(l => l.name === to)
            ?.tokens?.find(c => c?.symbol?.toUpperCase() === toAsset?.toUpperCase())
        : undefined

    const sourceNetwork = sourceRoutes.find(l => l.name.toUpperCase() === from?.toUpperCase())
    const destinationNetwork = destinationRoutes.find(l => l.name.toUpperCase() === to?.toUpperCase())

    const initialSourceExchange = sourceExchanges.find(e => e.name.toLowerCase() === from?.toLowerCase())

    const initialSource = sourceNetwork ?? undefined
    const initialDestination = destinationNetwork ?? undefined

    const filteredSourceCurrencies = lockedSourceCurrency ?
        [lockedSourceCurrency]
        : sourceNetwork?.tokens

    const filteredDestinationCurrencies = lockedDestinationCurrency ?
        [lockedDestinationCurrency]
        : destinationNetwork?.tokens

    let initialAddress =
        destination_address && initialDestination && Address.isValid(destination_address, destinationNetwork) ? destination_address : "";

    let initialSourceCurrency = filteredSourceCurrencies?.find(c => c.symbol?.toUpperCase() == fromAsset?.toUpperCase())
    if (!initialSourceCurrency && !fromAsset && sourceNetwork) {
        initialSourceCurrency = filteredSourceCurrencies?.sort((a, b) => a.symbol.localeCompare(b.symbol))?.find(c => c.status === "active")
    }

    let initialDestinationCurrency = filteredDestinationCurrencies?.find(c => c.symbol?.toUpperCase() == toAsset?.toUpperCase())
    if (!initialDestinationCurrency && !toAsset && destinationNetwork) {
        initialDestinationCurrency = filteredDestinationCurrencies?.sort((a, b) => a.symbol.localeCompare(b.symbol))?.find(c => c.status === "active")
    }

    //TODO this looks wrong
    let initialAmount =
        (lockedDestinationCurrency && amount) || (initialDestinationCurrency ? amount : '')

    const result: SwapFormValues = {
        fromExchange: type === 'exchange' ? initialSourceExchange : undefined,
        from: type === 'cross-chain' ? initialSource : undefined,
        to: initialDestination,
        amount: initialAmount,
        fromAsset: type === 'cross-chain' ? initialSourceCurrency : undefined,
        toAsset: initialDestinationCurrency,
        destination_address: initialAddress ? initialAddress : '',
        depositMethod: (depositMethod === "wallet" || depositMethod === "deposit_address") ? depositMethod : undefined,
    }

    return result
}


export function generateSwapInitialValuesFromSwap(swapResponse: SwapBasicData, refuel: boolean, settings: LayerSwapAppSettings, type: 'cross-chain' | 'exchange'): SwapFormValues {
    const {
        destination_address,
        requested_amount,
        source_network,
        destination_network,
        source_token,
        destination_token,
        source_exchange,
        use_deposit_address
    } = swapResponse

    const { sourceRoutes, destinationRoutes } = settings || {}

    const from = sourceRoutes.find(l => l.name === source_network.name);
    const to = destinationRoutes.find(l => l.name === destination_network.name);

    const fromCurrency = from?.tokens.find(c => c.symbol === source_token.symbol);
    const toCurrency = to?.tokens.find(c => c.symbol === destination_token.symbol);

    const result: SwapFormValues = {
        from,
        to,
        amount: requested_amount?.toString(),
        fromAsset: fromCurrency,
        toAsset: toCurrency,
        destination_address,
        refuel: !!refuel,
        fromExchange: type === "exchange" ? source_exchange : undefined,
        depositMethod: use_deposit_address ? 'deposit_address' : 'wallet',
    }

    return result
}