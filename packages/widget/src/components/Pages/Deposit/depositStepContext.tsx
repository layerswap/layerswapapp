import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from "react";

export type DepositStep =
    | "method-picker"
    | "wallet-ecosystem"
    | "wallet-connect"
    | "wallet-source"
    | "wallet-amount"
    | "wallet-processing"
    | "transfer-crypto";

type DepositStepContextValue = {
    step: DepositStep;
    push: (next: DepositStep) => void;
    back: () => void;
    reset: () => void;
    canGoBack: boolean;
};

const DepositStepContext = createContext<DepositStepContextValue | null>(null);

export function DepositStepProvider({ children }: { children: ReactNode }) {
    const [stack, setStack] = useState<DepositStep[]>(["method-picker"]);

    const push = useCallback((next: DepositStep) => {
        setStack(prev => prev[prev.length - 1] === next ? prev : [...prev, next]);
    }, []);

    const back = useCallback(() => {
        setStack(prev => prev.length > 1 ? prev.slice(0, -1) : prev);
    }, []);

    const reset = useCallback(() => {
        setStack(["method-picker"]);
    }, []);

    const value = useMemo<DepositStepContextValue>(() => ({
        step: stack[stack.length - 1],
        push,
        back,
        reset,
        canGoBack: stack.length > 1,
    }), [stack, push, back, reset]);

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
