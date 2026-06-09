import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type DepositStep =
    | "method-picker"
    | "wallet-connecting"
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
    /** Whether the header's close button should be locked (hidden) because a
     * transfer is mid-flight. Each flow computes its own condition and reports
     * it via `useReportCloseLock` from inside its SwapDataProvider, so steps
     * rendered above that provider (e.g. the header) can react to it. */
    closeLocked: boolean;
    setCloseLocked: (locked: boolean) => void;
};

const DepositStepContext = createContext<DepositStepContextValue | null>(null);

export function DepositStepProvider({ children }: { children: ReactNode }) {
    const [stack, setStack] = useState<DepositStep[]>(["method-picker"]);
    const [closeLocked, setCloseLocked] = useState(false);

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
        setStack(["method-picker"]);
        setCloseLocked(false);
    }, []);

    const value = useMemo<DepositStepContextValue>(() => ({
        step: stack[stack.length - 1],
        push,
        replace,
        back,
        reset,
        canGoBack: stack.length > 1,
        closeLocked,
        setCloseLocked,
    }), [stack, push, replace, back, reset, closeLocked]);

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
