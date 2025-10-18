import React, { createContext, useContext, useMemo } from "react";
import { NftProvider, WalletProvider } from "@/types";
import { resolverService } from "@/lib/resolvers/resolverService";
import { AddressUtilsProvider, GasProvider, BalanceProvider } from "@/types";

type ResolverContextType = {
    isInitialized: boolean;
};

const ResolverContext = createContext<ResolverContextType | null>(null);

export const ResolverProviders: React.FC<React.PropsWithChildren<{ walletProviders: WalletProvider[] }>> = ({
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

        // Extract address utils providers from wallet providers
        const addressUtilsProviders: AddressUtilsProvider[] = walletProviders
            .map(provider => provider.addressUtilsProvider)
            .flat()
            .filter((provider): provider is AddressUtilsProvider => Boolean(provider));

        const nftProviders: NftProvider[] = walletProviders
            .map(provider => provider.nftProvider)
            .flat()
            .filter((provider): provider is NftProvider => Boolean(provider));

        resolverService.setProviders(balanceProviders, gasProviders, addressUtilsProviders, nftProviders)

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
