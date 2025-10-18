import React, { createContext, useContext, useMemo } from "react";
import { WalletProvider } from "@/types";
import { BalanceProvider } from "@/types/balance";
import { GasProvider } from "@/types/gas";
import { resolverService } from "@/lib/resolvers/resolverService";

type ResolverContextType = {
    isInitialized: boolean;
};

const ResolverContext = createContext<ResolverContextType | null>(null);

export const BalanceAndGasResolverProvider: React.FC<React.PropsWithChildren<{ walletProviders: WalletProvider[] }>> = ({
    children,
    walletProviders
}) => {
    const isInitialized = useMemo(() => {
        // Extract balance providers from wallet providers
        const balanceProviders: BalanceProvider[] = walletProviders
            .map(provider => provider.balanceProvider)
            .flat()
            .filter((provider): provider is BalanceProvider => Boolean(provider));

        // Extract gas providers from wallet providers
        const gasProviders: GasProvider[] = walletProviders
            .map(provider => provider.gasProvider)
            .flat()
            .filter((provider): provider is GasProvider => Boolean(provider));

        // Initialize the resolver service with the providers
        resolverService.setProviders(balanceProviders, gasProviders);

        return true;
    }, [walletProviders]);

    return (
        <ResolverContext.Provider value={{ isInitialized }}>
            {children}
        </ResolverContext.Provider>
    );
};

export const useResolvers = () => {
    const context = useContext(ResolverContext);
    if (!context) {
        throw new Error('useResolvers must be used within a ResolverProvider');
    }
    return context;
};
