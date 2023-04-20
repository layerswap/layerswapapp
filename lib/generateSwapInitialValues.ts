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
import { FilterDestinationLayers, FilterSourceLayers } from "../helpers/settingsHelper";
import { GenerateCurrencyMenuItems, GenerateDestLayerMenuItems, GenerateSourceLayerMenuItems } from "../components/utils/generateMenuItems";

export function generateSwapInitialValues(settings: LayerSwapSettings, queryParams: QueryParams): SwapFormValues {
    const { destNetwork, destAddress, sourceExchangeName, amount, asset, from, to } = queryParams

    const { currencies, discovery: { resource_storage_url }, layers } = settings || {}

    const sourceLayer = layers.find(l => l.internal_name.toUpperCase() === from?.toUpperCase()
        || l.internal_name.toUpperCase() === sourceExchangeName?.toUpperCase())

    const destinationLayer = layers.find(l => l.internal_name.toUpperCase() === to?.toUpperCase()
        || l.internal_name.toUpperCase() === destNetwork?.toUpperCase())

    const sourceItems = GenerateSourceLayerMenuItems({ layers, destination: destinationLayer, resource_storage_url })
    const destinationItems = GenerateDestLayerMenuItems({ layers, source: sourceLayer, resource_storage_url })
    const sourceValue = sourceLayer ? sourceItems.find(i => i.baseObject?.internal_name === sourceLayer?.internal_name) : null
    const destinationValue = destinationLayer ? destinationItems.find(i => i.baseObject?.internal_name === destinationLayer?.internal_name) : null

    const currencyItems = GenerateCurrencyMenuItems({
        currencies,
        source: sourceLayer,
        destination: destinationLayer,
        resource_storage_url
    })

    let initialAddress =
        destAddress && destinationValue && isValidAddress(destAddress, destinationLayer) ? destAddress : "";

    let initialCurrency =
        amount && currencyItems.find(c => c.baseObject.asset == asset)

    const result: SwapFormValues = {
        from: sourceValue,
        to: destinationValue,
        amount: initialCurrency ? amount : '',
        currency: initialCurrency,
        destination_address: (!destinationLayer?.isExchange && initialAddress) ? initialAddress : '',
    }

    return result
}

