import { createContext, ReactNode, useContext, useMemo, useState } from "react";
import { NetworkType } from "@/Models/Network";
import { WalletConnectionProvider } from "@/types/wallet";

type DepositWalletContextValue = {
    /** The ecosystem chosen via the "More Wallets" flow. When set, the source
     * step filters its network list to this NetworkType. Undefined for the
     * default "Wallet transfer" path (shows all source networks). */
    sourceEcosystem?: NetworkType;
    setSourceEcosystem: (type?: NetworkType) => void;
    /** The wallet provider the connect step should connect against. Set by the
     * EcosystemStep ("More wallets" → pick an ecosystem); undefined for the
     * "Wallet transfer" path, where the connect step offers all wallets. */
    connectProvider?: WalletConnectionProvider;
    setConnectProvider: (provider?: WalletConnectionProvider) => void;
};

const DepositWalletContext = createContext<DepositWalletContextValue | null>(null);

/**
 * Carries the chosen source ecosystem from the EcosystemStep (the "More
 * Wallets" entry point) into SourceStep. Mounted inside WalletFlow so the value
 * survives the wallet-* steps and resets when the wallet flow unmounts (i.e.
 * when the user goes back to the method picker).
 */
export function DepositWalletProvider({ children }: { children: ReactNode }) {
    const [sourceEcosystem, setSourceEcosystem] = useState<NetworkType | undefined>(undefined);
    const [connectProvider, setConnectProvider] = useState<WalletConnectionProvider | undefined>(undefined);

    const value = useMemo<DepositWalletContextValue>(() => ({
        sourceEcosystem,
        setSourceEcosystem,
        connectProvider,
        setConnectProvider,
    }), [sourceEcosystem, connectProvider]);

    return (
        <DepositWalletContext.Provider value={value}>
            {children}
        </DepositWalletContext.Provider>
    );
}

export function useDepositWallet() {
    const ctx = useContext(DepositWalletContext);
    if (!ctx) throw new Error("useDepositWallet must be used within DepositWalletProvider");
    return ctx;
}
