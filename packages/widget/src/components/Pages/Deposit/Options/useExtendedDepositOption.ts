import { useMemo } from "react";
import useFormRoutes from "@/hooks/useFormRoutes";
import useWallet from "@/hooks/useWallet";
import { useQuoteData } from "@/hooks/useFee";
import { getExtendedProviderForNetwork, getSourceProviders, resolveExtendedRoutePlan } from "@/lib/extendedRoutes/registry";
import { depositMethodForFunding } from "@/lib/extendedRoutes/types";
import { getKey, useBalanceStore } from "@/stores/balanceStore";
import { NetworkRoute, NetworkRouteToken } from "@/Models/Network";
import { SwapFormValues } from "@/components/Pages/Swap/Form/SwapFormValues";
import { Wallet } from "@/types/wallet";
import { useDepositSelection } from "../depositSelectionContext";
import { useDepositSettings } from "@/context/depositSettings";
import { DepositMethodId } from "../depositMethods";
import { pickSourceToken, useMergedSourceRoutes } from "./useSourceRoute";

type ExtendedDepositOption = {
    /** The provider is configured as a source at all — resolved synchronously, so
     * the card can render in a stable state on first paint (no show-then-hide). */
    present: boolean;
    /** Destination-scoped reachability is still resolving — the card shows a
     * loading state until this clears. */
    loading: boolean;
    /** The extended source can actually route to the current destination. Only
     * meaningful once `loading` is false; the card is enabled only when true. */
    available: boolean;
    network?: NetworkRoute;
    token?: NetworkRouteToken;
    /** The configured extended network name. */
    networkName?: string;
    /** An already-connected wallet that can sign this source's withdrawals (EVM),
     * if any — lets the picker skip the connect step. */
    compatibleWallet?: Wallet;
    /** The `compatibleWallet`'s withdrawable balance on this source, in the source
     * token. `undefined` until the balance resolves. */
    compatibleWalletBalance?: number;
    /** True only when we positively know the `compatibleWallet` can't cover the
     * minimum deposit. Stays false while balance/limit is unknown so the picker
     * keeps the auto-select shortcut. */
    compatibleWalletBelowMinimum: boolean;
};

/**
 * What the method picker needs to offer a "Deposit from <extended source>"
 * shortcut, scoped to a single extended-route provider (e.g. Hyperliquid,
 * Polymarket).
 *
 * `present`/route/token come synchronously from settings (the extended source is
 * merged into `sourceRoutes` at load), so the card is stable from first paint.
 * Whether it can route to the fixed destination is only knowable from the async
 * destination-scoped source fetch, so `loading`/`available` come from the shared
 * `useFormRoutes` (gated by `filterUsableExtendedSources`). The picker renders the
 * card whenever `present` — showing a loading state, then enabling or disabling
 * it — so it is never hidden by reachability.
 */
export function useExtendedDepositOption(providerId: DepositMethodId): ExtendedDepositOption {
    const mergedSources = useMergedSourceRoutes();
    const { destination, destinationToken } = useDepositSelection();
    const { wallets } = useWallet();
    const { methods } = useDepositSettings();
    const enabled = methods.includes(providerId);

    // The deposit method of the real backend route this provider funds through:
    // 'deposit_address' for CCTP-style sources, 'wallet' for depository sources.
    const provider = useMemo(() => getSourceProviders().find(p => p.id === providerId), [providerId]);
    const depositMethod = depositMethodForFunding(provider?.funding);

    // Synchronous presence + route/token from the merged source list, scoped to
    // this provider, so the card is stable from first paint.
    const network = useMemo(
        () => mergedSources.find(r => getExtendedProviderForNetwork(r.name)?.id === providerId),
        [mergedSources, providerId],
    );
    const token = useMemo(() => pickSourceToken(network), [network]);
    const present = !!network && !!token;

    // An already-connected wallet that can sign this source's withdrawals (EVM), if any.
    const compatibleWallet = useMemo(
        () => (network ? wallets.find(w => w.withdrawalSupportedNetworks?.includes(network.name)) : undefined),
        [network, wallets],
    );

    // Reachability for the fixed destination, from the gated (scoped) route list.
    const reachValues = useMemo<SwapFormValues>(
        () => ({ to: destination, toAsset: destinationToken, depositMethod }),
        [destination, destinationToken, depositMethod],
    );
    const { allRoutes, isLoading } = useFormRoutes({ direction: "from", values: reachValues });
    // Available only when the real network the extended source maps to has a
    // usable route to this destination. We check the mapped real network — not the
    // extended source's own presence in the list, which says nothing about whether
    // the underlying hop is actually reachable.
    const available = useMemo(() => {
        if (isLoading || !network || !token) return false;
        return resolveExtendedRoutePlan({
            sourceNetworkName: network.name,
            sourceTokenSymbol: token.symbol,
            destinationNetworkName: destination?.name,
            destinationTokenSymbol: destinationToken?.symbol,
            availableRoutes: allRoutes,
        }) !== undefined;
    }, [isLoading, network, token, destination, destinationToken, allRoutes]);

    // The connected wallet's withdrawable balance on this source. Prefetched into
    // the balance store by `useAllWithdrawalBalances` (mounted in the deposit form),
    // so here we only read it; `undefined` until it resolves (or on error).
    const balanceKey = compatibleWallet && network ? getKey(compatibleWallet.address, network.name) : undefined;
    const balanceEntry = useBalanceStore(s => (balanceKey ? s.balances[balanceKey] : undefined));
    const compatibleWalletBalance = useMemo(() => {
        if (balanceEntry?.status !== "success") return undefined;
        const balances = balanceEntry.data?.balances;
        if (!balances?.length) return undefined;
        // Match the source token exactly — never fall back to another token's
        // amount, which the picker would mislabel with the source symbol.
        const match = token ? balances.find(b => b.token === token.symbol) : undefined;
        return match?.amount;
    }, [balanceEntry, token]);

    // The route's minimum deposit (source-token units). With no amount this fires
    // only the lightweight `/limits` call — and warms the cache for the amount step.
    // Gated on the method being enabled, so a hidden card costs no request.
    const { minAllowedAmount } = useQuoteData(
        enabled && present && destination && destinationToken
            ? {
                from: network!.name,
                to: destination.name,
                fromCurrency: token!.symbol,
                toCurrency: destinationToken.symbol,
                amount: undefined,
                refuel: false,
                depositMethod,
            }
            : undefined,
    );

    // Only "true" when we positively know the wallet can't cover the minimum, so an
    // unknown/loading balance or limit keeps the auto-select shortcut.
    const compatibleWalletBelowMinimum =
        compatibleWalletBalance != null && minAllowedAmount != null && compatibleWalletBalance < minAllowedAmount;

    return useMemo(
        () => ({
            present,
            loading: present && isLoading,
            available,
            network,
            token,
            networkName: network?.name,
            compatibleWallet,
            compatibleWalletBalance,
            compatibleWalletBelowMinimum,
        }),
        [present, isLoading, available, network, token, compatibleWallet, compatibleWalletBalance, minAllowedAmount, compatibleWalletBelowMinimum],
    );
}
