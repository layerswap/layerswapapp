import { SwapFormValues, SwapType } from "../components/DTOs/SwapFormValues";
import { SelectMenuItem } from "../components/Select/selectMenuItem";
import { CryptoNetwork } from "../Models/CryptoNetwork";
import { Exchange } from "../Models/Exchange";
import { LayerSwapSettings } from "../Models/LayerSwapSettings";
import { QueryParams } from "../Models/QueryParams";
import { isValidAddress } from "./addressValidator";

export function generateSwapInitialValues(swapType: SwapType, settings: LayerSwapSettings, queryParams: QueryParams): SwapFormValues {
    const { data: { networks } } = settings
    const { destNetwork, destAddress, sourceExchangeName } = queryParams

    const availableNetworks = networks
        .map(c => new SelectMenuItem<CryptoNetwork>(c, c.code, c.name, c.order, c.logo_url, c.is_enabled, c.is_default))

    let availableExchanges = settings.data.exchanges
        .map(c => new SelectMenuItem<Exchange>(c, c.internal_name, c.name, c.order, c.logo_url, c.is_enabled, c.is_default))

    const initialNetwork =
        availableNetworks.find(x => x.baseObject.code.toUpperCase() === destNetwork?.toUpperCase() && x.isAvailable
            && (swapType === "onramp" || settings?.data?.currencies?.some(c => c.network_id === x.id && c.exchanges.some(ce => ce.is_off_ramp_enabled))))

    let initialAddress =
        destAddress && initialNetwork && isValidAddress(destAddress, initialNetwork?.baseObject) ? destAddress : "";
    let initialExchange =
        availableExchanges.find(x => x.baseObject.internal_name === sourceExchangeName?.toLowerCase() && (swapType === "onramp" || settings.data.currencies.some(c => c.exchanges?.some(ce => ce.exchange_id === x.baseObject.id && ce.is_off_ramp_enabled))));

    return { amount: "", destination_address: swapType === "onramp" && initialAddress, swapType: swapType || "onramp", network: swapType === "onramp" ? initialNetwork : null, exchange: initialExchange }
}