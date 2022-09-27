import { SwapFormValues } from "../components/DTOs/SwapFormValues";
import { SelectMenuItem } from "../components/Select/selectMenuItem";
import { useSwapDataState } from "../context/swap";
import { CryptoNetwork } from "../Models/CryptoNetwork";
import { Exchange } from "../Models/Exchange";
import { LayerSwapSettings } from "../Models/LayerSwapSettings";
import { QueryParams } from "../Models/QueryParams";
import { isValidAddress } from "./addressValidator";
import { SwapType } from "./layerSwapApiClient";

export function generateSwapInitialValues(swapType: SwapType, settings: LayerSwapSettings, queryParams: QueryParams, account?: string, chainId?: number): SwapFormValues {
    const { destNetwork, destAddress: queryParamAddress, sourceExchangeName } = queryParams

    const { data: { exchanges, networks, discovery: { resource_storage_url } } } = settings || {}
    const destAddress = queryParamAddress || account

    const networkIsAvailable = (n: CryptoNetwork) => {
        return swapType === SwapType.OffRamp ?
            n.currencies.some(nc => nc.status === "active" && nc.is_deposit_enabled && (exchanges.some(e => {
                return e.currencies.some(ec => ec.asset === nc.asset && ec.status === "active" && ec.is_withdrawal_enabled)
            })))
            : n.currencies.some(nc => nc.status === "active" && nc.is_withdrawal_enabled && (exchanges.some(e => e.currencies.some(ec => ec.asset === nc.asset && ec.status === "active" && ec.is_deposit_enabled))))
    }

    const availableNetworks = networks.filter(networkIsAvailable)
        .map(c => new SelectMenuItem<CryptoNetwork>(c, c.internal_name, c.display_name, c.order, `${resource_storage_url}${c.logo}`, c.status === "active", c.is_default))

    let availableExchanges = settings.data.exchanges
        .map(c => new SelectMenuItem<Exchange>(c, c.internal_name, c.display_name, c.order, `${resource_storage_url}${c.logo}`, c.status === "active", c.is_default))

    const initialNetwork =
        availableNetworks.find(x => (x.baseObject.internal_name.toUpperCase() === destNetwork?.toUpperCase() || (chainId && x.baseObject.chain_id === chainId)) && x.isAvailable)

    let initialAddress =
        destAddress && initialNetwork && isValidAddress(destAddress, initialNetwork?.baseObject) ? destAddress : "";

    let initialExchange =
        availableExchanges.find(x => x.baseObject.internal_name === sourceExchangeName?.toLowerCase() && (swapType === SwapType.OffRamp ? x.baseObject.currencies.some(ce => ce.status === "active" && ce.is_withdrawal_enabled) : x.baseObject.currencies.some(ce => ce.status === "active" && ce.is_deposit_enabled)));

    return { amount: "", destination_address: swapType === SwapType.OnRamp && (initialAddress || account), swapType: swapType || SwapType.OnRamp, network: swapType === SwapType.OnRamp ? initialNetwork : null, exchange: initialExchange }
}