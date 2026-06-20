import { useMemo } from "react";
import { useSettingsState } from "@/context/settings";
import useFormRoutes from "@/hooks/useFormRoutes";
import useWallet from "@/hooks/useWallet";
import { isExtendedSourceNetwork, mergeExtendedSourceRoutes } from "@/lib/extendedRoutes/registry";
import { NetworkRoute, NetworkRouteToken } from "@/Models/Network";
import { SwapFormValues } from "@/components/Pages/Swap/Form/SwapFormValues";
import { Wallet } from "@/types/wallet";
import { useDepositSelection } from "../depositSelectionContext";

/** The only token Hyperliquid is mapped for today. */
const HYPERLIQUID_USDC_SYMBOL = "USDC";

const pickToken = (route?: NetworkRoute): NetworkRouteToken | undefined =>
    route?.tokens?.find(t => t.symbol === HYPERLIQUID_USDC_SYMBOL) ?? route?.tokens?.[0];

/**
 * Source routes with the client-side extended sources (e.g. Hyperliquid) merged
 * in. Merged here at render time rather than read off `settings.sourceRoutes`:
 * `LayerSwapAppSettings` merges at construction, but the extended-route registry
 * is only populated later (in `ResolverProviders`), so the settings copy can miss
 * them. Re-merging here — like `useFormRoutes` does — is synchronous (no fetch)
 * and stable on first paint.
 */
function useMergedSourceRoutes(): NetworkRoute[] {
    const { sourceRoutes, networks } = useSettingsState();
    return useMemo(() => mergeExtendedSourceRoutes(sourceRoutes ?? [], networks), [sourceRoutes, networks]);
}

/**
 * Resolve an extended source network name (e.g. HYPERLIQUID_MAINNET) into the
 * `NetworkRoute` + token to pre-select as the source. Synchronous and stable on
 * first paint. Used to seed the wallet flow's Formik values.
 */
export function useSourceRoute(
    networkName?: string,
): { network: NetworkRoute; token: NetworkRouteToken } | undefined {
    const routes = useMergedSourceRoutes();
    return useMemo(() => {
        if (!networkName) return undefined;
        const network = routes.find(r => r.name === networkName);
        const token = pickToken(network);
        return network && token ? { network, token } : undefined;
    }, [networkName, routes]);
}

type HyperliquidDepositOption = {
    /** Hyperliquid is configured as a source at all — resolved synchronously, so
     * the card can render in a stable state on first paint (no show-then-hide). */
    present: boolean;
    /** Destination-scoped reachability is still resolving — the card shows a
     * loading state until this clears. */
    loading: boolean;
    /** Hyperliquid can actually route to the current destination. Only meaningful
     * once `loading` is false; the card is enabled only when true. */
    available: boolean;
    network?: NetworkRoute;
    token?: NetworkRouteToken;
    /** The configured HL network name (mainnet or testnet, per settings). */
    hlNetworkName?: string;
    /** An already-connected wallet that can sign Hyperliquid withdrawals (EVM),
     * if any — lets the picker skip the connect step. */
    compatibleWallet?: Wallet;
};

/**
 * What the method picker needs to offer the "Deposit from Hyperliquid" shortcut.
 *
 * `present`/route/token come synchronously from settings (Hyperliquid is merged
 * into `sourceRoutes` at load), so the card is stable from first paint. Whether
 * it can route to the fixed destination is only knowable from the async
 * destination-scoped source fetch, so `loading`/`available` come from the shared
 * `useFormRoutes` (gated by `filterUsableExtendedSources`). The picker renders the
 * card whenever `present` — showing a loading state, then enabling or disabling
 * it — so it is never hidden by reachability.
 */
export function useHyperliquidDepositOption(): HyperliquidDepositOption {
    const mergedSources = useMergedSourceRoutes();
    const { destination, destinationToken } = useDepositSelection();
    const { wallets } = useWallet();

    const values = useMemo<SwapFormValues>(
        () => ({ to: destination, toAsset: destinationToken, depositMethod: "wallet" }),
        [destination, destinationToken],
    );
    const { allRoutes, isLoading } = useFormRoutes({ direction: "from", values });

    return useMemo(() => {
        // Synchronous presence + route/token from the merged source list.
        const network = mergedSources.find(r => isExtendedSourceNetwork(r.name));
        const token = pickToken(network);
        const present = !!network && !!token;

        // Reachability for this destination, from the gated (scoped) route list.
        const available = !isLoading && allRoutes.some(r => isExtendedSourceNetwork(r.name));

        const compatibleWallet = network
            ? wallets.find(w => w.withdrawalSupportedNetworks?.includes(network.name))
            : undefined;

        return {
            present,
            loading: present && isLoading,
            available,
            network,
            token,
            hlNetworkName: network?.name,
            compatibleWallet,
        };
    }, [mergedSources, allRoutes, isLoading, wallets]);
}
