import { InitialSettings } from "../Models/InitialSettings";
import { LayerSwapAppSettings } from "../Models/LayerSwapAppSettings";
import { Address } from "./address/Address";
import { SwapBasicData } from "./apiClients/layerSwapApiClient";
import { SwapFormValues } from "@/components/Pages/Swap/Form/SwapFormValues";
import { mergeExtendedSourceRoutes } from "./extendedRoutes/registry";

export function generateSwapInitialValues(settings: LayerSwapAppSettings, queryParams: InitialSettings, type: 'cross-chain' | 'exchange' | 'deposit-address', connectedAutofillNetworks?: Set<string>): SwapFormValues {
    const { destination_address, amount, fromAsset, toAsset, from, to, lockFromAsset, lockToAsset, depositMethod, fromExchange } = queryParams
    const { sourceExchanges, sourceRoutes: backendSourceRoutes, destinationRoutes, networks, extendedRouteFlags } = settings || {}

    // Resolve the raw query params to canonical settings names before the merge:
    // provider resolvers (e.g. the self-swap exclusion in pickPolymarketDestination)
    // compare exact-case, so passing `?to=polygon_mainnet` through unresolved would
    // keep an extended source available for its own intermediate.
    let destinationNetwork = destinationRoutes.find(l => l.name.toUpperCase() === to?.toUpperCase())
    const canonicalToAsset = destinationNetwork?.tokens?.find(c => c?.symbol?.toUpperCase() === toAsset?.toUpperCase())

    const sourceRoutes = mergeExtendedSourceRoutes(backendSourceRoutes, networks, destinationNetwork?.name, canonicalToAsset?.symbol, extendedRouteFlags)

    const lockedSourceCurrency = lockFromAsset ?
        sourceRoutes.find(l => l.name === from)
            ?.tokens?.find(c => c?.symbol?.toUpperCase() === fromAsset?.toUpperCase())
        : undefined
    const lockedDestinationCurrency = lockToAsset ?
        destinationRoutes.find(l => l.name === to)
            ?.tokens?.find(c => c?.symbol?.toUpperCase() === toAsset?.toUpperCase())
        : undefined

    const sourceNetwork = sourceRoutes.find(l => l.name.toUpperCase() === from?.toUpperCase())

    // Deposit-address flow defaults to the top-ranked destination so the user
    // lands on a populated form — but only when a wallet is already connected.
    // Without a wallet there's no way to autofill the destination address, so
    // landing on a pre-picked destination would force the user to manually
    // enter an address before doing anything useful. We'd rather start blank
    // and prompt for a wallet connection first; `DepositAddressForm` applies
    // these defaults once the wallet connects.
    const hasAutofillWallet = !!connectedAutofillNetworks && connectedAutofillNetworks.size > 0
    if (!destinationNetwork && type === 'deposit-address' && hasAutofillWallet) {
        const rank = (r: { destination_rank?: number }) => r.destination_rank ?? Number.POSITIVE_INFINITY;
        const hasWallet = (r: { name: string }) =>
            !!connectedAutofillNetworks?.has(r.name.toLowerCase());
        destinationNetwork = [...destinationRoutes]
            .filter(r => r.tokens?.some(t => t.status === 'active'))
            .sort((a, b) => {
                const walletDiff = Number(hasWallet(b)) - Number(hasWallet(a));
                if (walletDiff !== 0) return walletDiff;
                return rank(a) - rank(b);
            })[0];
    }

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
        if (type === 'deposit-address') {
            const rank = (t: { destination_rank?: number }) => t.destination_rank ?? Number.POSITIVE_INFINITY;
            initialDestinationCurrency = filteredDestinationCurrencies
                ?.filter(c => c.status === "active")
                ?.sort((a, b) => rank(a) - rank(b))[0];
        } else {
            initialDestinationCurrency = filteredDestinationCurrencies?.sort((a, b) => a.symbol.localeCompare(b.symbol))?.find(c => c.status === "active")
        }
    }

    //TODO this looks wrong
    let initialAmount =
        (lockedDestinationCurrency && amount) || (initialDestinationCurrency ? amount : '')

    const isNetworkSourceType = type === 'cross-chain' || type === 'deposit-address'

    const result: SwapFormValues = {
        fromExchange: undefined,
        from: isNetworkSourceType ? initialSource : undefined,
        to: initialDestination,
        amount: type === 'cross-chain' ? initialAmount : undefined,
        fromAsset: isNetworkSourceType ? initialSourceCurrency : undefined,
        toAsset: initialDestinationCurrency,
        destination_address: initialAddress ? initialAddress : '',
        depositMethod: (type === 'exchange' || type === 'deposit-address')
            ? 'deposit_address'
            : ((depositMethod === "wallet" || depositMethod === "deposit_address") ? depositMethod : undefined),
    }

    return result
}


export function generateSwapInitialValuesFromSwap(swapResponse: SwapBasicData, refuel: boolean, settings: LayerSwapAppSettings, type: 'cross-chain' | 'exchange' | 'deposit-address'): SwapFormValues {
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