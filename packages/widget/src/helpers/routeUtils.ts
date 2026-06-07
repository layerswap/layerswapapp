import { NetworkRoute } from "../Models/Network";
import { NetworkBalance } from "../Models/Balance";
import { NetworkTokenElement } from "../Models/Route";
import { RoutesHistory } from "@/stores/recentRoutesStore";
import { SwapDirection } from "@/components/Pages/Swap/Form/SwapFormValues";

/**
 * Pure route-sorting utilities shared by `useFormRoutes` and the flat
 * RoutePicker list. Kept out of the hook module so they don't widen the hook's
 * public surface and can be reused without importing the hook.
 */

export const extractTokenElementsAsSuggested = (routes: NetworkRoute[]): NetworkTokenElement[] =>
    routes.flatMap(route => (route.tokens || []).map(token => ({ type: 'suggested_token', route: { token, route } })))

export const sortSuggestedTokenElements = (direction: SwapDirection, balances: Record<string, NetworkBalance> | null, routesHistory: RoutesHistory) => (a: NetworkTokenElement, b: NetworkTokenElement) => {
    if (direction === "from" && balances) {
        const a_balance = getNetworkTokenElementBalance(a, balances)
        const b_balance = getNetworkTokenElementBalance(b, balances)
        if (a_balance !== b_balance) {
            return b_balance - a_balance
        }
    }
    if (routesHistory) {
        const a_used = getUsedCount(a, routesHistory, direction)
        const b_used = getUsedCount(b, routesHistory, direction)
        if (a_used !== b_used) {
            return b_used - a_used
        }
    }

    const a_rank = getRank(a, direction)
    const b_rank = getRank(b, direction)
    return a_rank - b_rank
}

const getNetworkTokenElementBalance = (item: NetworkTokenElement, balances: Record<string, NetworkBalance>) => {
    return (balances[item.route.route.name]?.balances?.find(b => b.token === item.route.token.symbol)?.amount || 0) * item.route.token.price_in_usd
}
const getUsedCount = (item: NetworkTokenElement, history: RoutesHistory, direction: SwapDirection) => {
    return direction === "from" ? history.sourceRoutes?.[item.route.route.name]?.[item.route.token.symbol] || 0 : history.destinationRoutes?.[item.route.route.name]?.[item.route.token.symbol] || 0
}
const getRank = (item: NetworkTokenElement, direction: SwapDirection) => {
    switch (direction) {
        case "from":
            return item.route.token.source_rank || 0;
        case "to":
            return item.route.token.destination_rank || 0
    }
}
