import { NetworkRoute } from "@/Models/Network";
import { AccountIdentityWithSupportedNetworks } from "@/context/swapAccounts";

/**
 * Restrict source routes to the networks a single connected source account can
 * send from.
 *
 * The account (from the swapAccounts store) lists the networks it supports for
 * sending — on the wallet (`walletWithdrawalSupportedNetworks` /
 * `walletAsSourceSupportedNetworks`) and on its provider
 * (`withdrawalSupportedNetworks` / `asSourceSupportedNetworks`). The union is
 * what the user can actually send from, so an EVM wallet sees EVM routes, a
 * Bitcoin wallet only Bitcoin routes, etc.
 *
 * Falls back to the full list when there's no account or no supported-network
 * info to filter by.
 */
export function filterRoutesByAccount(
    routes: NetworkRoute[],
    account: AccountIdentityWithSupportedNetworks | undefined,
): NetworkRoute[] {
    if (!account) return routes;

    const supported = new Set<string>([
        ...(account.walletWithdrawalSupportedNetworks ?? []),
        ...(account.walletAsSourceSupportedNetworks ?? []),
        ...(account.provider?.withdrawalSupportedNetworks ?? []),
        ...(account.provider?.asSourceSupportedNetworks ?? []),
    ]);

    if (supported.size === 0) return routes;
    return routes.filter(route => supported.has(route.name));
}
