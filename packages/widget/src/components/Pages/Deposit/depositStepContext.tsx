import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useWalletProviders } from "@/context/walletProviders";

export type DepositStep =
    | "method-picker"
    | "wallet-connect"
    | "wallet-source"
    | "wallet-amount"
    | "wallet-processing"
    | "transfer-crypto";

type DepositStepContextValue = {
    step: DepositStep;
    push: (next: DepositStep) => void;
    /** Swap the current step for another without growing the stack, so `back`
     * skips the replaced step. Used by the connecting step to hand off to
     * wallet-source once a wallet is connected. */
    replace: (next: DepositStep) => void;
    back: () => void;
    reset: () => void;
    canGoBack: boolean;
    /** Whether any wallet-connection method is available. When false, the deposit
     * address is the only funding method, so the flow opens straight on it and
     * the method picker is never shown. */
    hasWalletMethods: boolean;
    /** Whether the header's close button should be locked (hidden) because a
     * transfer is mid-flight. Each flow computes its own condition and reports
     * it via `useReportCloseLock` from inside its SwapDataProvider, so steps
     * rendered above that provider (e.g. the header) can react to it. */
    closeLocked: boolean;
    setCloseLocked: (locked: boolean) => void;
    /** Extended source network (e.g. HYPERLIQUID_MAINNET) the wallet flow should
     * pre-select as the source, skipping the source picker. Set by the method
     * picker; consumed by the wallet flow (seeds Formik `from`/`fromAsset`) and
     * the connect step (routes straight to the amount step). `undefined` for the
     * normal "pick any source" wallet flow. A network name (not the route) keeps
     * this lightweight and generalizes to future extended sources. */
    presetSourceNetwork: string | undefined;
    setPresetSourceNetwork: (network: string | undefined) => void;
};

const DepositStepContext = createContext<DepositStepContextValue | null>(null);

export function DepositStepProvider({ children }: { children: ReactNode }) {
    // With no wallet-connection providers there is no "Wallet transfer" method,
    // so the method picker would only ever show the deposit-address card. Skip it
    // entirely: open straight on the deposit address and root the stack there, so
    // there is no step to go back to (the header hides the back button).
    const hasWalletMethods = useWalletProviders().length > 0;
    const rootStep: DepositStep = hasWalletMethods ? "method-picker" : "transfer-crypto";

    const [stack, setStack] = useState<DepositStep[]>([rootStep]);
    const [closeLocked, setCloseLocked] = useState(false);
    const [presetSourceNetwork, setPresetSourceNetwork] = useState<string | undefined>(undefined);

    // If wallet providers load asynchronously (or the prop changes) after mount,
    // `hasWalletMethods` — and therefore `rootStep` — can flip. Re-root the stack so
    // the flow doesn't stay stuck on a step that no longer applies (e.g. left on
    // "method-picker" after the methods disappear, or vice versa). The functional
    // update makes this a no-op on mount and during normal navigation, firing only
    // when the root step actually changes. closeLocked clears itself: the unmounted
    // step's `useReportCloseLock` cleanup resets it.
    useEffect(() => {
        setStack(prev => prev[0] === rootStep ? prev : [rootStep]);
    }, [rootStep]);

    const push = useCallback((next: DepositStep) => {
        setStack(prev => prev[prev.length - 1] === next ? prev : [...prev, next]);
    }, []);

    const replace = useCallback((next: DepositStep) => {
        setStack(prev => prev[prev.length - 1] === next ? prev : [...prev.slice(0, -1), next]);
    }, []);

    const back = useCallback(() => {
        setStack(prev => prev.length > 1 ? prev.slice(0, -1) : prev);
    }, []);

    const reset = useCallback(() => {
        setStack([rootStep]);
        setCloseLocked(false);
        setPresetSourceNetwork(undefined);
    }, [rootStep]);

    const value = useMemo<DepositStepContextValue>(() => ({
        step: stack[stack.length - 1],
        push,
        replace,
        back,
        reset,
        canGoBack: stack.length > 1,
        hasWalletMethods,
        closeLocked,
        setCloseLocked,
        presetSourceNetwork,
        setPresetSourceNetwork,
    }), [stack, push, replace, back, reset, hasWalletMethods, closeLocked, presetSourceNetwork]);

    return (
        <DepositStepContext.Provider value={value}>
            {children}
        </DepositStepContext.Provider>
    );
}

export function useDepositStep() {
    const ctx = useContext(DepositStepContext);
    if (!ctx) throw new Error("useDepositStep must be used within DepositStepProvider");
    return ctx;
}

/**
 * Reports whether the header's close button should be locked (hidden) and
 * clears it on unmount (e.g. when the user steps back out of the flow). Call
 * from a component rendered inside the SwapDataProvider that owns the swap
 * status, with the flow-specific lock condition.
 */
export function useReportCloseLock(locked: boolean) {
    const { setCloseLocked } = useDepositStep();
    useEffect(() => {
        setCloseLocked(locked);
    }, [locked, setCloseLocked]);
    useEffect(() => () => setCloseLocked(false), [setCloseLocked]);
}
