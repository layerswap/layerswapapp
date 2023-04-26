import { FilterCurrencies, FilterDestinationLayers, FilterSourceLayers, GetNetworkCurrency } from "../../helpers/settingsHelper"
import CurrencySettings from "../../lib/CurrencySettings"
import ExchangeSettings from "../../lib/ExchangeSettings"
import NetworkSettings from "../../lib/NetworkSettings"
import { SortingByOrder } from "../../lib/sorting"
import { Currency } from "../../Models/Currency"
import { Layer } from "../../Models/Layer"
import { SelectMenuItem } from "../Select/selectMenuItem"


type SourceLayerMenuGeneratorArgs = {
    layers: Layer[],
    resource_storage_url: string
    destination: Layer,
}

export const GenerateSourceLayerMenuItems = ({
    layers,
    destination,
    resource_storage_url
}: SourceLayerMenuGeneratorArgs): SelectMenuItem<Layer>[] => {

    const filteredLayers = FilterSourceLayers({ layers, destination })

    const menuItems: SelectMenuItem<Layer>[] = filteredLayers.map(l => {
        const menuItem: SelectMenuItem<Layer> = {
            baseObject: l,
            id: l.internal_name,
            name: l.display_name,
            //TODO network/exchange
            order: ExchangeSettings.KnownSettings[l.internal_name]?.Order,
            imgSrc: `${resource_storage_url}/layerswap/networks/${l.internal_name.toLowerCase()}.png`,
            isAvailable: { value: true, disabledReason: null },
            isDefault: false
        }
        return menuItem
    }).sort(SortingByOrder);

    return menuItems
}

type DestLayerMenuGeneratorArgs = {
    layers: Layer[],
    resource_storage_url: string
    source: Layer,
}
export const GenerateDestLayerMenuItems = ({
    layers,
    source,
    resource_storage_url
}: DestLayerMenuGeneratorArgs): SelectMenuItem<Layer>[] => {

    const filteredLayers = FilterDestinationLayers({ layers, source })

    const menuItems: SelectMenuItem<Layer>[] = filteredLayers.map(l => {
        const menuItem: SelectMenuItem<Layer> = {
            baseObject: l,
            id: l.internal_name,
            name: l.display_name,
            //TODO network/exchange
            order: l.isExchange ?
                ExchangeSettings.KnownSettings[l.internal_name]?.Order
                : NetworkSettings.KnownSettings[l.internal_name]?.Order,
            imgSrc: `${resource_storage_url}/layerswap/networks/${l.internal_name.toLowerCase()}.png`,
            isAvailable: { value: true, disabledReason: null },
            isDefault: false
        }
        return menuItem
    }).sort(SortingByOrder);

    return menuItems
}


type CurrencyMenuGeneratorArgs = {
    currencies: Currency[],
    source?: Layer,
    destination?: Layer,
    resource_storage_url: string
}
export const GenerateCurrencyMenuItems = ({
    currencies,
    source,
    destination,
    resource_storage_url
}: CurrencyMenuGeneratorArgs): SelectMenuItem<Currency>[] => {

    //TODO implement
    // const currencyDisabledReason = (currency: Currency) => {
    //     if (!(from && to && from?.baseObject.currencies.find(fc => fc.asset === currency.asset).is_deposit_enabled && to.baseObject.currencies.find(tc => tc.asset === currency.asset).is_withdrawal_enabled)) return { value: false, disabledReason: DisabledReason.InsufficientLiquidity }
    //     else return { value: true, disabledReason: null }
    // }

    const filteredCurrencies = FilterCurrencies({ currencies, source, destination })

    const menuItems: SelectMenuItem<Currency>[] = filteredCurrencies.map(c => {
        const sourceCurrency = GetNetworkCurrency(source, c.asset)
        const displayName = source?.isExchange ? sourceCurrency?.asset : sourceCurrency?.name
        return {
            baseObject: c,
            id: c.asset,
            //TODO implement getter
            name: displayName,
            order: CurrencySettings.KnownSettings[c.asset]?.Order ?? 5,
            imgSrc: `${resource_storage_url}/layerswap/currencies/${displayName.toLowerCase()}.png`,
            isAvailable: { value: true, disabledReason: null },
            isDefault: false,
        }
    }).sort(SortingByOrder);

    return menuItems
}