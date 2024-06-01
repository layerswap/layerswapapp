import { Exchange, ExchangeToken } from "../Models/Exchange";
import { RouteNetwork, RouteToken } from "../Models/Network";
import { SwapDirection } from "../components/DTOs/SwapFormValues";
import { ONE_WEEK } from "../components/Input/NetworkFormField";
import { SelectMenuItem } from "../components/Select/Shared/Props/selectMenuItem";
import CurrencySettings from "./CurrencySettings";
import ExchangeSettings from "./ExchangeSettings";
import NetworkSettings from "./NetworkSettings";

export function SortingByOrder<T>(x: SelectMenuItem<T>, y: SelectMenuItem<T>) {
    if (!y.isAvailable.value) {
        y.order += 100;
    } else if (!x.isAvailable.value) {
        x.order += 100;
    };
    return Number(y.isAvailable.value || 0) - Number(x.isAvailable.value || 0) + (y.order - x.order)
}

export const SortByAscending = (x: { order: number }, y: { order: number }) => x.order - y.order;

export function ResolveNetworkOrder(network: RouteNetwork, direction: SwapDirection, is_new: boolean) {


    let orderProp: keyof NetworkSettings = direction == 'from' ? 'OrderInSource' : 'OrderInDestination';
    const initial_order = resolveInitialWeightedOrder(NetworkSettings.KnownSettings[network.name]?.[orderProp], 1)
    
    const is_active = network.tokens?.some(r => r.status === 'active')

    return initial_order + resolveConditionWeight(is_active, 3) + resolveConditionWeight(is_new, 2);
}
export function ResolveExchangeOrder(exchange: Exchange, direction: SwapDirection) {

    let orderProp: keyof NetworkSettings = direction == 'from' ? 'OrderInSource' : 'OrderInDestination';

    const initial_order = resolveInitialWeightedOrder(ExchangeSettings.KnownSettings[exchange.name]?.[orderProp], 1)
    return initial_order;
}
export function ResolveCEXCurrencyOrder(token: ExchangeToken, direction: SwapDirection) {

    const initial_order = resolveInitialWeightedOrder(CurrencySettings.KnownSettings[token.symbol]?.Order, 1)

    return initial_order;
}
export function ResolveCurrencyOrder(currency: RouteToken, is_new: boolean) {

    const initial_order = resolveInitialWeightedOrder(CurrencySettings.KnownSettings[currency.symbol]?.Order, 2)
    const is_active = currency.status === 'active'

    return initial_order + resolveConditionWeight(is_active, 3) + resolveConditionWeight(is_new, 1)

}

const resolveInitialWeightedOrder = (settingsOrder: number | undefined, initialOrderWeight: number) => {
    // Add 1 to distinguish between 0 and undefined
    const settings_order = (Number(settingsOrder) + 1)
    const hasSettings = settings_order > 0
    return settings_order || resolveConditionWeight(hasSettings, initialOrderWeight)
}

const resolveConditionWeight = (value: boolean, priority: number) => value ? 0 : 10 ** (priority + 1)
