import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from "react";
import { useInitialSettings, useSettingsState } from "@/context/settings";
import { generateSwapInitialValues } from "@/lib/generateSwapInitialValues";
import { SwapFormValues } from "@/components/Pages/Swap/Form/SwapFormValues";
import { NetworkRoute, NetworkRouteToken } from "@/Models/Network";
import useWallet from "@/hooks/useWallet";
import { ResolvedDestination, SupportedDestination, useResolvedDestinations } from "./DestinationTokenPicker";

type DepositSelectionContextValue = {
    /** Integrator-provided destination pairs resolved against settings. */
    resolved: ResolvedDestination[];
    /** Selected destination network (Formik `to`). */
    destination?: NetworkRoute;
    /** Selected destination token (Formik `toAsset`). */
    destinationToken?: NetworkRouteToken;
    /** Recipient address on the destination network — fixed for the whole flow. */
    destinationAddress: string;
    setSelection: (network: NetworkRoute, token: NetworkRouteToken) => void;
};

const DepositSelectionContext = createContext<DepositSelectionContextValue | null>(null);

/**
 * Holds the destination token selection (and the fixed recipient address) for
 * the deposit widget. It lives ABOVE the per-method providers so the choice
 * made in the method-picker survives the hand-off into TransferCrypto /
 * WalletFlow, each of which now owns its own Formik + SwapDataProvider.
 */
export function DepositSelectionProvider({
    destination,
    destinationAddress,
    children,
}: {
    destination: SupportedDestination;
    destinationAddress: string;
    children: ReactNode;
}) {
    const resolved = useResolvedDestinations(destination);
    const settings = useSettingsState();
    const initialSettings = useInitialSettings();
    const { wallets } = useWallet();
    const [selected, setSelected] = useState<ResolvedDestination | undefined>(undefined);

    const setSelection = useCallback((network: NetworkRoute, token: NetworkRouteToken) => {
        setSelected({ network, token });
    }, []);

    const connectedAutofillNetworks = useMemo(() => {
        const set = new Set<string>();
        wallets.forEach(w => {
            w.autofillSupportedNetworks?.forEach(n => set.add(n.toLowerCase()));
        });
        return set;
    }, [wallets]);

    // Sensible default destination for when the integrator's pairs don't resolve
    // against current settings (e.g. a testnet route is missing). The
    // deposit-address generator picks the top-ranked destination, matching the
    // pre-split behavior where the form's initial `to`/`toAsset` fell back here.
    const fallback = useMemo<ResolvedDestination | undefined>(() => {
        const base = generateSwapInitialValues(settings, initialSettings, "deposit-address", connectedAutofillNetworks);
        return base.to && base.toAsset ? { network: base.to, token: base.toAsset } : undefined;
    }, [settings, initialSettings, connectedAutofillNetworks]);

    // Default to the first supported destination when nothing is picked yet, or
    // when the current pick is no longer in the supported list (e.g. the
    // integrator changed the list at runtime).
    const active = useMemo(() => {
        if (selected && resolved.some(r => r.network.name === selected.network.name && r.token.symbol === selected.token.symbol)) {
            return selected;
        }
        if (resolved.length > 0) return resolved[0];
        return fallback;
    }, [resolved, selected, fallback]);

    const value = useMemo<DepositSelectionContextValue>(() => ({
        resolved,
        destination: active?.network,
        destinationToken: active?.token,
        destinationAddress,
        setSelection,
    }), [resolved, active, destinationAddress, setSelection]);

    return (
        <DepositSelectionContext.Provider value={value}>
            {children}
        </DepositSelectionContext.Provider>
    );
}

export function useDepositSelection() {
    const ctx = useContext(DepositSelectionContext);
    if (!ctx) throw new Error("useDepositSelection must be used within DepositSelectionProvider");
    return ctx;
}

/**
 * Builds the initial Formik values for a deposit sub-flow, seeded from the
 * shared destination selection. Formik snapshots these at its own mount, so the
 * flow captures whichever selection is resolved by then (mirrors the per-tab
 * initial-values behavior in the main swap flow).
 */
export function useDepositInitialValues(
    depositMethod: NonNullable<SwapFormValues["depositMethod"]>,
    /** Pre-resolved source pick (e.g. from the deposit prefetcher). Seeding it
     * here lets Formik mount with a complete form, so a prefetched swap matches
     * the values immediately instead of waiting for the auto-source effect. */
    source?: { network: NetworkRoute; token: NetworkRouteToken },
): SwapFormValues {
    const settings = useSettingsState();
    const initialSettings = useInitialSettings();
    const { wallets } = useWallet();
    const { destination, destinationToken, destinationAddress } = useDepositSelection();

    const connectedAutofillNetworks = useMemo(() => {
        const set = new Set<string>();
        wallets.forEach(w => {
            w.autofillSupportedNetworks?.forEach(n => set.add(n.toLowerCase()));
        });
        return set;
    }, [wallets]);

    return useMemo<SwapFormValues>(() => {
        const base = generateSwapInitialValues(settings, initialSettings, "deposit-address", connectedAutofillNetworks);
        return {
            ...base,
            from: source?.network ?? base.from,
            fromAsset: source?.token ?? base.fromAsset,
            to: destination ?? base.to,
            toAsset: destinationToken ?? base.toAsset,
            destination_address: destinationAddress,
            depositMethod,
        };
        // Keep deps correct so that if settings/destination resolve AFTER mount
        // (SSR fallback → SWR revalidation), the value reflects the latest
        // selection on the render Formik mounts with — otherwise the flow opens
        // with a blank destination and can never recover. Formik only reads
        // initialValues at mount, so recomputing here is harmless.
    }, [settings, initialSettings, connectedAutofillNetworks, destination, destinationToken, destinationAddress, depositMethod, source]);
}
