import { SwapFormValues } from "../components/DTOs/SwapFormValues";
import { SelectMenuItem } from "../components/Select/selectMenuItem";
import { CryptoNetwork } from "../Models/CryptoNetwork";
import { Exchange } from "../Models/Exchange";
import { Currency } from "../Models/Currency";
import { LayerSwapSettings } from "../Models/LayerSwapSettings";
import { QueryParams } from "../Models/QueryParams";
import { isValidAddress } from "./addressValidator";
import { SwapType } from "./layerSwapApiClient";
import NetworkSettings from "./NetworkSettings";

export function generateSwapInitialValues(swapType: SwapType, settings: LayerSwapSettings, queryParams: QueryParams): SwapFormValues {
    const { destNetwork, destAddress, sourceExchangeName, products, selectedProduct, amount, asset, from, to } = queryParams

    const { currencies, exchanges, networks, discovery: { resource_storage_url } } = settings || {}

    const swapTypes = Object.values(SwapType);

    const productsArray = products?.split(",")
    const filteredProducts = products ? swapTypes?.filter(st => productsArray.some(p => st?.toLowerCase() === p?.toLowerCase())) : swapTypes
    const selectedSwapType = filteredProducts.find(st => st?.toLowerCase() === selectedProduct?.toLowerCase())

    let initialSwapType = (swapType || selectedSwapType || filteredProducts?.[0]) ?? SwapType.OnRamp;

    const networkIsAvailable = (n: CryptoNetwork) => {
        return initialSwapType === SwapType.OffRamp ?
            n.currencies.some(nc => nc.status === "active" && nc.is_deposit_enabled && (exchanges.some(e => {
                return e.currencies.some(ec => ec.asset === nc.asset)
            })))
            : n.currencies.some(nc => nc.status === "active" && nc.is_withdrawal_enabled && (exchanges.some(e => e.currencies.some(ec => ec.asset === nc.asset))))
    }

    const availableNetworks = networks.filter(networkIsAvailable)
        .map(c => new SelectMenuItem<CryptoNetwork>(c, c.internal_name, c.display_name, 0, `${resource_storage_url}/layerswap/networks/${c.internal_name.toLowerCase()}.png`, c.status === "active", false))

    let availableExchanges = exchanges
        .map(c => new SelectMenuItem<Exchange>(c, c.internal_name, c.display_name, 0, `${resource_storage_url}/layerswap/networks/${c.internal_name.toLowerCase()}.png`, true, false))

    const destination = initialSwapType === SwapType.OffRamp ? availableExchanges.find(x => (x.baseObject.internal_name.toUpperCase() === sourceExchangeName?.toUpperCase() || x.baseObject.internal_name.toUpperCase() === to?.toUpperCase()) && x.baseObject.currencies)
        : availableNetworks.find(x => (x.baseObject.internal_name.toUpperCase() === destNetwork?.toUpperCase() || x.baseObject.internal_name.toUpperCase() === to?.toUpperCase()) && x.isAvailable && !NetworkSettings?.ForceDisable?.[x?.baseObject?.internal_name]?.onramp)

    const source = initialSwapType === SwapType.OnRamp ? availableExchanges.find(x => (x.baseObject.internal_name.toUpperCase() === sourceExchangeName?.toUpperCase() || x.baseObject.internal_name.toUpperCase() == from?.toUpperCase()) && x.baseObject.currencies)
        : availableNetworks.find(x => ((x.baseObject.internal_name.toUpperCase() === destNetwork?.toUpperCase() && destination?.baseObject?.internal_name?.toUpperCase() !== destNetwork.toUpperCase() && x.baseObject.currencies.some(c => c.is_deposit_enabled && (c.status === 'active' || c.status === "insufficient_liquidity"))) || x.baseObject.internal_name.toUpperCase() === from?.toUpperCase()) && x.isAvailable && !NetworkSettings?.ForceDisable?.[x?.baseObject?.internal_name]?.offramp)

    const availableCurrencies = currencies
        .map(c => new SelectMenuItem<Currency>(c, c.asset, c.asset, 0, `${resource_storage_url}/layerswap/currencies/${c.asset.toLowerCase()}.png`))

    let initialAddress =
        destAddress && destination && isValidAddress(destAddress, destination?.baseObject) ? destAddress : "";

    let initialCurrency =
        amount && availableCurrencies.find(c => c.baseObject.asset == asset)

    const result = { amount: initialCurrency ? amount : '', currency: initialCurrency, destination_address: (initialSwapType !== SwapType.OffRamp && initialAddress) ? initialAddress : '' }

    switch (initialSwapType) {
        case SwapType.OnRamp:
            return {
                ...result,
                swapType: SwapType.OnRamp,
                from: source as SelectMenuItem<Exchange>,
                to: destination as SelectMenuItem<CryptoNetwork>
            }
        case SwapType.OffRamp:
            return {
                ...result,
                swapType: SwapType.OffRamp,
                from: source as SelectMenuItem<CryptoNetwork>,
                to: destination as SelectMenuItem<Exchange>,
            }
        case SwapType.CrossChain:
            return {
                ...result,
                swapType: SwapType.CrossChain,
                from: source as SelectMenuItem<CryptoNetwork>,
                to: destination as SelectMenuItem<CryptoNetwork>,
            }
    }
}