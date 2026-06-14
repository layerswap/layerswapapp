import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import LayerSwapApiClient, { CreateSwapParams, DepositAction, SwapResponse } from "@/lib/apiClients/layerSwapApiClient";
import { ApiResponse } from "@/Models/ApiResponse";
import { NetworkRoute, NetworkRouteToken } from "@/Models/Network";
import { SwapFormValues } from "@/components/Pages/Swap/Form/SwapFormValues";
import useDepositAddressSources from "@/hooks/useDepositAddressSources";
import { pickAutoSource } from "@/hooks/useAutoSourceRoute";
import { useDetailedQuote } from "@/hooks/useDetailedQuote";
import useWallet from "@/hooks/useWallet";
import { useInitialSettings } from "@/context/settings";
import { useSelectedAccount } from "@/context/swapAccounts";
import { useCallbacks } from "@/context/callbackProvider";
import { WalletIsSupportedForSource } from "@/context/swap";
import { useRecentNetworksStore } from "@/stores/recentRoutesStore";
import { Address } from "@/lib/address/Address";
import { useDepositSelection } from "./depositSelectionContext";
import { useDepositStep } from "./depositStepContext";

export type PrefetchedSource = { network: NetworkRoute; token: NetworkRouteToken };

type DepositPrefetchContextValue = {
    /** Auto-picked source for the current destination — the same pick the
     * form's auto-source effect would make, so seeding Formik with it never
     * diverges from what the flow would land on anyway. */
    prefetchedSource?: PrefetchedSource;
    /** Latest known swap for the current route tuple. Used to seed the
     * deposit-address flow at mount so it renders without a loading state. */
    prefetchedSwap?: SwapResponse;
    /** Returns a pending/ready swap for the given form values, or undefined if
     * none was prefetched (or it was already used — e.g. after "Deposit more",
     * which must create a fresh swap). */
    claimPrefetchedSwap: (values: SwapFormValues) => Promise<SwapResponse> | undefined;
    /** Reports that a swap is now driving the flow. Fires integrator callbacks
     * for prefetched swaps (deferred from creation so they only fire for swaps
     * the user actually sees) and records form-created swaps as the latest for
     * their tuple so re-entering the flow restores them. */
    markSwapUsed: (swap: SwapResponse, values?: SwapFormValues) => void;
};

const DepositPrefetchContext = createContext<DepositPrefetchContextValue | null>(null);

const makeKey = (from: string, fromToken: string, to: { name: string }, toToken: string, address: string) =>
    `${from}|${fromToken}|${to.name}|${toToken}|${new Address(address, to).normalized}`;

const keyFromValues = (values: SwapFormValues): string | null => {
    const { from, fromAsset, to, toAsset, destination_address } = values;
    if (!from || !fromAsset || !to || !toAsset || !destination_address) return null;
    return makeKey(from.name, fromAsset.symbol, to, toAsset.symbol, destination_address);
};

/**
 * Pre-warms everything the "Deposit address" method needs while the user is
 * still on the method picker: source routes, the detailed quote (limits/fees)
 * and — most importantly — the swap itself, whose creation is what normally
 * keeps the flow on a "Generating deposit address" skeleton. All fetches go
 * through the same SWR keys the flow's own hooks use, so by the time
 * TransferCrypto mounts the caches are hot and the created swap is handed over
 * via SwapDataProvider's initialSwapData.
 */
export function DepositPrefetchProvider({ children }: { children: ReactNode }) {
    const { step } = useDepositStep();
    const { destination, destinationToken, destinationAddress } = useDepositSelection();
    const initialSettings = useInitialSettings();
    const { onSwapCreate } = useCallbacks();
    const updateRecentTokens = useRecentNetworksStore(state => state.updateRecentNetworks);

    const apiClient = useMemo(() => new LayerSwapApiClient(), []);

    // Only prefetch while the picker is visible. When the deposit-address step
    // is the flow root the form mounts immediately and runs the same hooks
    // itself, so prefetching would only duplicate the swap creation.
    const active = step === "method-picker";

    const { data: sourcesData } = useDepositAddressSources({
        destinationNetwork: destination?.name,
        destinationToken: destinationToken?.symbol,
        enabled: active,
    });
    const sourceRoutes = useMemo(
        () => sourcesData?.data?.filter(r => r.deposit_methods?.includes("deposit_address")),
        [sourcesData],
    );
    const prefetchedSource = useMemo(() => pickAutoSource(sourceRoutes), [sourceRoutes]);

    // Warms the same SWR key DepositAddressInfo reads for limits and fee tiers.
    useDetailedQuote({
        sourceNetwork: active ? prefetchedSource?.network.name : undefined,
        sourceToken: prefetchedSource?.token.symbol,
        destinationNetwork: destination?.name,
        destinationToken: destinationToken?.symbol,
        destinationAddress,
        refuel: false,
        useDepositAddress: true,
    });

    const [swaps, setSwaps] = useState<Record<string, SwapResponse>>({});
    const inFlight = useRef(new Map<string, Promise<SwapResponse>>());
    const failedKeys = useRef(new Set<string>());
    const createdByPrefetch = useRef(new Set<string>());
    const usedIds = useRef(new Set<string>());

    // Mirror createSwap's source/refund address behavior so the prefetched
    // swap is identical to what the flow would create on submit.
    const selectedSourceAccount = useSelectedAccount("from", prefetchedSource?.network.name);
    const { wallets } = useWallet(prefetchedSource?.network, "asSource");
    const selectedWallet = selectedSourceAccount
        && wallets.find(w => Address.equals(w.address, selectedSourceAccount.address, prefetchedSource?.network));
    const sourceIsSupported = !!selectedWallet && WalletIsSupportedForSource({
        sourceNetwork: prefetchedSource?.network,
        sourceWallet: selectedWallet,
    });

    const currentKey = (prefetchedSource && destination && destinationToken && destinationAddress)
        ? makeKey(prefetchedSource.network.name, prefetchedSource.token.symbol, destination, destinationToken.symbol, destinationAddress)
        : null;

    useEffect(() => {
        if (!active || !currentKey || !prefetchedSource || !destination || !destinationToken || !destinationAddress) return;
        if (swaps[currentKey] || inFlight.current.has(currentKey) || failedKeys.current.has(currentKey)) return;

        const params: CreateSwapParams = {
            source_network: prefetchedSource.network.name,
            source_token: prefetchedSource.token.symbol,
            destination_network: destination.name,
            destination_token: destinationToken.symbol,
            destination_address: destinationAddress,
            reference_id: initialSettings.externalId,
            refuel: false,
            use_deposit_address: true,
            source_address: sourceIsSupported ? selectedSourceAccount?.address : undefined,
            refund_address: sourceIsSupported ? selectedSourceAccount?.address : undefined,
        };

        const key = currentKey;
        const promise = apiClient.CreateSwapAsync(params).then(response => {
            if (response?.error) throw response.error;
            const swap = response?.data;
            if (!swap?.swap.id) throw new Error("Could not create swap");
            createdByPrefetch.current.add(swap.swap.id);
            setSwaps(prev => ({ ...prev, [key]: swap }));
            return swap;
        });
        inFlight.current.set(key, promise);
        // Failed prefetches are not retried — the flow's own submit path
        // recreates the swap and surfaces the error to the user.
        promise.catch(() => { failedKeys.current.add(key); })
            .finally(() => { inFlight.current.delete(key); });
    }, [active, currentKey, prefetchedSource, destination, destinationToken, destinationAddress, swaps, sourceIsSupported, selectedSourceAccount?.address, initialSettings.externalId, apiClient]);

    const prefetchedSwap = currentKey ? swaps[currentKey] : undefined;

    // Warms the SWR key SwapDataProvider reads the deposit address from, in
    // case the create response didn't already include deposit actions.
    useSWR<ApiResponse<DepositAction[]>>(
        active && prefetchedSwap && !prefetchedSwap.deposit_actions?.length
            ? `/swaps/${prefetchedSwap.swap.id}/deposit_actions`
            : null,
        apiClient.fetcher,
    );

    const claimPrefetchedSwap = useCallback((values: SwapFormValues) => {
        const key = keyFromValues(values);
        if (!key) return undefined;
        const ready = swaps[key];
        if (ready && !usedIds.current.has(ready.swap.id)) return Promise.resolve(ready);
        return inFlight.current.get(key);
    }, [swaps]);

    const markSwapUsed = useCallback((swap: SwapResponse, values?: SwapFormValues) => {
        const id = swap.swap.id;
        if (!usedIds.current.has(id)) {
            usedIds.current.add(id);
            // Integrator callbacks for prefetched swaps are deferred to first
            // use; form-created swaps already fired them inside createSwap.
            if (createdByPrefetch.current.has(id)) {
                onSwapCreate(swap);
                updateRecentTokens({
                    from: { network: swap.swap.source_network.name, token: swap.swap.source_token.symbol },
                    to: { network: swap.swap.destination_network.name, token: swap.swap.destination_token.symbol },
                });
            }
        }
        if (values) {
            const key = keyFromValues(values);
            if (key) setSwaps(prev => prev[key]?.swap.id === id ? prev : { ...prev, [key]: swap });
        }
    }, [onSwapCreate, updateRecentTokens]);

    const value = useMemo<DepositPrefetchContextValue>(() => ({
        prefetchedSource,
        prefetchedSwap,
        claimPrefetchedSwap,
        markSwapUsed,
    }), [prefetchedSource, prefetchedSwap, claimPrefetchedSwap, markSwapUsed]);

    return (
        <DepositPrefetchContext.Provider value={value}>
            {children}
        </DepositPrefetchContext.Provider>
    );
}

export function useDepositPrefetch() {
    const ctx = useContext(DepositPrefetchContext);
    if (!ctx) throw new Error("useDepositPrefetch must be used within DepositPrefetchProvider");
    return ctx;
}
