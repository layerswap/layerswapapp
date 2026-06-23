import React, { createContext, useContext, useMemo } from "react";
import { WalletProvider, WalletProviderDescriptor, WalletWrapper, isWalletProviderDescriptor, NftProvider, BalanceProvider, GasProvider, TransferProvider, ContractAddressCheckerProvider, RpcHealthCheckProvider } from "@/types";
import { resolverService } from "@/lib/resolvers/resolverService";
import { setExtendedRouteProviders } from "@/lib/extendedRoutes/registry";

type ResolverContextType = {
    isInitialized: boolean;
};

const ResolverContext = createContext<ResolverContextType | null>(null);

const isWalletProviderWithResolvers = (
    p: WalletProvider | WalletWrapper | WalletProviderDescriptor
): p is WalletProvider =>
    !isWalletProviderDescriptor(p) && 'createConnection' in p

export const ResolverProviders: React.FC<React.PropsWithChildren<{
    walletProviders: (WalletProvider | WalletWrapper | WalletProviderDescriptor)[]
}>> = ({
    children,
    walletProviders
}) => {

        // Descriptors carry no resolvers; they re-enter this list as real
        // providers after `loadProvider()` resolves and `LayerswapProvider`
        // swaps them in.
        const realProviders = useMemo(
            () => walletProviders.filter(isWalletProviderWithResolvers),
            [walletProviders],
        );

        const transferProviders = realProviders
            .map(provider => provider.transferProvider)
            .flat()
            .filter((provider): provider is (() => TransferProvider) => Boolean(provider))
            .map(provider => provider())

        const contractAddressProviders: ContractAddressCheckerProvider[] = realProviders
            .map(provider => provider.contractAddressProvider)
            .flat()
            .filter((provider): provider is ContractAddressCheckerProvider => Boolean(provider));

        const rpcHealthCheckProviders: RpcHealthCheckProvider[] = realProviders
            .map(provider => provider.rpcHealthCheckProvider)
            .flat()
            .filter((provider): provider is RpcHealthCheckProvider => Boolean(provider));

        const isInitialized = useMemo(() => {
            // Extract balance providers from wallet providers
            const balanceProviders: BalanceProvider[] = realProviders
                .map(provider => provider.balanceProvider)
                .flat()
                .filter((provider): provider is BalanceProvider => Boolean(provider));

            // Extract gas providers from wallet providers
            const gasProviders: GasProvider[] = realProviders
                .map(provider => provider.gasProvider)
                .flat()
                .filter((provider): provider is GasProvider => Boolean(provider));

            const nftProviders: NftProvider[] = realProviders
                .map(provider => provider.nftProvider)
                .flat()
                .filter((provider): provider is NftProvider => Boolean(provider));

            resolverService.setProviders(balanceProviders, gasProviders, nftProviders, transferProviders, contractAddressProviders, rpcHealthCheckProviders)

            setExtendedRouteProviders(walletProviders.flatMap((p: WalletProvider) => p.extendedRouteProvider ?? []).filter(Boolean))

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
