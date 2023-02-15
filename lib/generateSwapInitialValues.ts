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
    const { destNetwork, destAddress, sourceExchangeName, products, selectedProduct, amount, asset } = queryParams

    const { currencies, exchanges, networks, discovery: { resource_storage_url } } = settings || {}

    const swapTypes = Object.values(SwapType);

    const productsArray = products?.split(",")
    const filteredProducts = products ? swapTypes?.filter(st => productsArray.some(p => st.toLowerCase() === p.toLowerCase())) : swapTypes
    const productExists = filteredProducts.some(st => st.toLowerCase() === selectedProduct.toLowerCase())
    const selectedSwapType = (productExists && selectedProduct) && swapTypes.find(st=>st.toLowerCase() === selectedProduct.toLowerCase())

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

    let initialExchange =
        availableExchanges.find(x => x.baseObject.internal_name.toUpperCase() === sourceExchangeName?.toUpperCase() && x.baseObject.currencies);

    const initialNetwork =
        availableNetworks.find(x => x.baseObject.internal_name.toUpperCase() === destNetwork?.toUpperCase() && x.isAvailable && (initialSwapType === SwapType.OffRamp ? !NetworkSettings?.ForceDisable?.[x?.baseObject?.internal_name]?.offramp : !NetworkSettings?.ForceDisable?.[x?.baseObject?.internal_name]?.onramp))

    const availableCurrencies = currencies
        .map(c => new SelectMenuItem<Currency>(c, c.asset, c.asset, 0, `${resource_storage_url}/layerswap/currencies/${c.asset.toLowerCase()}.png`))

    const to = swapType === SwapType.OffRamp ?
        availableExchanges.find(x => x.baseObject.internal_name.toUpperCase() === sourceExchangeName?.toUpperCase() && x.baseObject.currencies)
        : availableNetworks.find(x => x.baseObject.internal_name.toUpperCase() === destNetwork?.toUpperCase() && x.isAvailable && (initialSwapType === SwapType.OffRamp ? !NetworkSettings?.ForceDisable?.[x?.baseObject?.internal_name]?.offramp : !NetworkSettings?.ForceDisable?.[x?.baseObject?.internal_name]?.onramp));

    let initialAddress =
        destAddress && to && isValidAddress(destAddress, to?.baseObject) ? destAddress : "";


    let initialCurrency =
        amount && availableCurrencies.find(c => c.baseObject.asset == asset)

    const result = { amount: initialCurrency ? amount : '', currency: initialCurrency, destination_address: initialSwapType !== SwapType.OffRamp && initialAddress }

    switch (initialSwapType) {
        case SwapType.OnRamp:
            return {
                ...result,
                swapType: SwapType.OnRamp,
                from: initialExchange,
                to: initialNetwork
            }
        case SwapType.OffRamp:
            return {
                ...result,
                swapType: SwapType.OffRamp,
                from: initialNetwork,
                to: initialExchange
            }
        case SwapType.CrossChain:
            return {
                ...result,
                swapType: SwapType.CrossChain,
                to: initialNetwork
            }
    }
}