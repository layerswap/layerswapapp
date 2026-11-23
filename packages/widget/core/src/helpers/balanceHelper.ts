import { NetworkBalance } from "@layerswap/widget-types";
import { NetworkWithTokens, NetworkRoute } from "@layerswap/widget-types";

/**
 * Calculates the total USD value of balances for a network
 * Only includes balances for tokens that are present in the route's token list
 * @param networkBalance - NetworkBalance object containing token balances
 * @param network - NetworkWithTokens or NetworkRoute object containing token price information
 * @returns Total USD value of all token balances that exist in the route
 */
export function getTotalBalanceInUSD(networkBalance: NetworkBalance, network: NetworkWithTokens | NetworkRoute): number | null {
    if (!networkBalance.balances || networkBalance.balances.length === 0) {
        return null;
    }
    const prices = new Map<string, number>();
    for (const token of network.tokens) {
        if (token && !prices.has(token.symbol)) prices.set(token.symbol, token.price_in_usd || 0);
    }

    return networkBalance.balances.reduce((total, tokenBalance) => {
        const tokenPriceInUsd = prices.get(tokenBalance.token);

        // Only include balances for tokens that are present in the route
        if (tokenPriceInUsd === undefined) {
            return total;
        }

        const amount = tokenBalance.amount || 0;
        return total + (amount * tokenPriceInUsd);
    }, 0);
}
