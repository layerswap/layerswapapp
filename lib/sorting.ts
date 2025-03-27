import { Exchange, ExchangeToken } from "../Models/Exchange";
import { NetworkRoute, NetworkRouteToken } from "../Models/Network";
import { SwapDirection } from "../components/DTOs/SwapFormValues";
import CurrencySettings from "./CurrencySettings";
import ExchangeSettings from "./ExchangeSettings";
import NetworkSettings from "./NetworkSettings";

export const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;

export const SortAscending = (x: { order: number }, y: { order: number }) => x.order - y.order;

export const SortNetworks = (
    a: { order: number; name: string },
    b: { order: number; name: string }
) => {
    if (a.order !== b.order) {
        return b.order - a.order;
    }

    return a.name.localeCompare(b.name);
};

export const SortNetworkRoutes = (
    a: NetworkRoute,
    b: NetworkRoute
) => {
    const aIsNew = a?.tokens?.every(t => new Date(t?.listing_date)?.getTime() >= new Date().getTime() - ONE_WEEK);
    const bIsNew = b?.tokens?.every(t => new Date(t?.listing_date)?.getTime() >= new Date().getTime() - ONE_WEEK);

    const a_order = ResolveNetworkOrder(a, aIsNew);
    const b_order = ResolveNetworkOrder(b, bIsNew);

    if (a_order !== b_order) {
        return b_order - a_order;
    }

    return a.name.localeCompare(b.name);
};

export function ResolveNetworkOrder(
    network: NetworkRoute,
    is_new: boolean
) {
    const is_inactive = network.tokens?.every(r => r.status === 'inactive');

    if (is_inactive) {
        return -1;
    }

    if (is_new) {
        return 100;
    }

    return 50;
}

export function ResolveExchangeOrder(exchange: Exchange, direction: SwapDirection) {

    let orderProp: keyof NetworkSettings = direction == 'from' ? 'OrderInSource' : 'OrderInDestination';

    const initial_order = resolveInitialWeightedOrder(ExchangeSettings.KnownSettings[exchange.name]?.[orderProp], 1)
    return initial_order;
}
export function ResolveCEXCurrencyOrder(token: ExchangeToken) {

    const initial_order = resolveInitialWeightedOrder(CurrencySettings.KnownSettings[token.symbol]?.Order, 1)

    return initial_order;
}
export function ResolveCurrencyOrder(currency: NetworkRouteToken) {

    const initial_order = resolveInitialWeightedOrder(CurrencySettings.KnownSettings[currency.symbol]?.Order, 1)
    const is_active = currency.status === 'active'
    const is_inactive = currency.status === 'inactive'

    return initial_order + resolveConditionWeight(!is_inactive, 4) + resolveConditionWeight(is_active, 2)

}

const resolveInitialWeightedOrder = (settingsOrder: number | undefined, initialOrderWeight: number) => {
    // Add 1 to distinguish between 0 and undefined
    const settings_order = (Number(settingsOrder) + 1)
    const hasSettings = settings_order > 0
    return settings_order || resolveConditionWeight(hasSettings, initialOrderWeight)
}

const resolveConditionWeight = (value: boolean, priority: number) => value ? 0 : 10 ** (priority + 1)