import React, { createContext, useContext, useMemo } from "react";
import { WalletProvider, NftProvider, BalanceProvider, GasProvider, AddressUtilsProvider, TransferProvider, ContractAddressCheckerProvider, RpcHealthCheckProvider } from "@/types";
import { resolverService } from "@/lib/resolvers/resolverService";

type ResolverContextType = {
    isInitialized: boolean;
};

const ResolverContext = createContext<ResolverContextType | null>(null);

export const ResolverProviders: React.FC<React.PropsWithChildren<{ walletProviders: WalletProvider[] }>> = ({
    children,
    walletProviders
}) => {

    const transferProviders = walletProviders
        .map(provider => provider.transferProvider)
        .flat()
        .filter((provider): provider is (() => TransferProvider) => Boolean(provider))
        .map(provider => provider())

    const contractAddressProviders: ContractAddressCheckerProvider[] = walletProviders
        .map(provider => provider.contractAddressProvider)
        .flat()
        .filter((provider): provider is ContractAddressCheckerProvider => Boolean(provider));

    const rpcHealthCheckProviders: RpcHealthCheckProvider[] = walletProviders
        .map(provider => provider.rpcHealthCheckProvider)
        .flat()
        .filter((provider): provider is RpcHealthCheckProvider => Boolean(provider));

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

        resolverService.setProviders(balanceProviders, gasProviders, addressUtilsProviders, nftProviders, transferProviders, contractAddressProviders, rpcHealthCheckProviders)

        return true;
    }, [walletProviders, transferProviders, contractAddressProviders, rpcHealthCheckProviders]);

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
