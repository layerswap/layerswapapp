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

export function generateSwapInitialValues(swapType: SwapType, settings: LayerSwapSettings, queryParams: QueryParams, account: string, chainId: number): SwapFormValues {
    const { destNetwork, destAddress: queryParamAddress, sourceExchangeName, products, amount, asset } = queryParams

    const { data: { exchanges, networks, discovery: { resource_storage_url } } } = settings || {}
    const destAddress = queryParamAddress || account

    let initialSwapType = swapType ?? SwapType.OnRamp;
    if (!swapType && products && products != '') {
        let lowerCasedProducts = products.toLowerCase();
        if (lowerCasedProducts == SwapType.OffRamp) {
            initialSwapType = SwapType.OffRamp;
        }
        else if (lowerCasedProducts.includes(SwapType.OnRamp)) {
            initialSwapType = SwapType.OnRamp
        }
    }

    const networkIsAvailable = (n: CryptoNetwork) => {
        return initialSwapType === SwapType.OffRamp ?
            n.currencies.some(nc => nc.status === "active" && nc.is_deposit_enabled && (exchanges.some(e => {
                return e.currencies.some(ec => ec.asset === nc.asset && ec.status === "active" && ec.is_withdrawal_enabled)
            })))
            : n.currencies.some(nc => nc.status === "active" && nc.is_withdrawal_enabled && (exchanges.some(e => e.currencies.some(ec => ec.asset === nc.asset && ec.status === "active" && ec.is_deposit_enabled))))
    }

    const availableNetworks = networks.filter(networkIsAvailable)
        .map(c => new SelectMenuItem<CryptoNetwork>(c, c.internal_name, c.display_name, c.order, `${resource_storage_url}${c.logo}`, c.status === "active", c.is_default))

    let availableExchanges = settings.data.exchanges
        .map(c => new SelectMenuItem<Exchange>(c, c.internal_name, c.display_name, c.order, `${resource_storage_url}${c.logo}`, c.status === "active", c.is_default))

    const availableCurrencies = settings.data.currencies
        .map(c => new SelectMenuItem<Currency>(c, c.id, c.asset, initialExchange?.baseObject?.currencies?.find(ec => ec.asset === c.asset)?.order || 0, `${resource_storage_url}${c.logo}`))

    const initialNetwork =
        availableNetworks.find(x => (x.baseObject.internal_name.toUpperCase() === destNetwork?.toUpperCase() || (chainId && NetworkSettings.KnownSettings[x.baseObject.internal_name]?.ChainId === chainId)) && x.isAvailable)

    let initialAddress =
        destAddress && initialNetwork && isValidAddress(destAddress, initialNetwork?.baseObject) ? destAddress : "";

    let initialExchange =
        availableExchanges.find(x => x.baseObject.internal_name.toUpperCase() === sourceExchangeName?.toUpperCase() && (initialSwapType === SwapType.OffRamp ? x.baseObject.currencies.some(ce => ce.status === "active" && ce.is_withdrawal_enabled) : x.baseObject.currencies.some(ce => ce.status === "active" && ce.is_deposit_enabled)));

    let initialCurrency =
        amount && availableCurrencies.find(c => c.baseObject.asset == asset)

    return { amount: initialCurrency ? amount : '', currency: initialCurrency, destination_address: initialSwapType == SwapType.OnRamp && (initialAddress || account), swapType: initialSwapType, network: initialNetwork, exchange: initialExchange }
}