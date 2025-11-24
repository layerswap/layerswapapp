import { NetworkBalance } from "@/Models/Balance";
import { NetworkWithTokens, NetworkRoute } from "@/Models/Network";

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
    return networkBalance.balances.reduce((total, tokenBalance) => {
        const token = network.tokens.find(t => t?.symbol === tokenBalance.token);

        // Only include balances for tokens that are present in the route
        if (!token) {
            return total;
        }

        const tokenPriceInUsd = token.price_in_usd || 0;
        const amount = tokenBalance.amount || 0;
        return total + (amount * tokenPriceInUsd);
    }, 0);
}
