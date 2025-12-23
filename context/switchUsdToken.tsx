import { createContext, useCallback, useContext, useState, ReactNode } from "react";

type SwitchUsdTokenContextValue = {
    isUsdPrimary: boolean;
    toggleUsdPrimary: () => void;
};

const SwitchUsdTokenContext = createContext<SwitchUsdTokenContextValue | null>(
    null
);

export const SwitchUsdTokenProvider = ({ children }: { children: ReactNode }) => {
    const [isUsdPrimary, setIsUsdPrimary] = useState(false);

    const toggleUsdPrimary = useCallback(
        () => setIsUsdPrimary((prev) => !prev),
        []
    );

    return (
        <SwitchUsdTokenContext.Provider value={{ isUsdPrimary, toggleUsdPrimary }}>
            {children}
        </SwitchUsdTokenContext.Provider>
    );
};

export const useSwitchUsdToken = () => {
    const ctx = useContext(SwitchUsdTokenContext);
    if (!ctx) {
        throw new Error("useSwitchUsdToken must be used within SwitchUsdTokenProvider");
    }
    return ctx;
};