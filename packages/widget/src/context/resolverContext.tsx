import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
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

        // Derive all six provider arrays in a single memo so they share one
        // stable identity. When `realProviders` changes (e.g. a lazy descriptor
        // resolves), this produces exactly one new object and the effect below
        // fires once — instead of six independent memos each queuing the effect.
        const providerArrays = useMemo(() => ({
            balance: realProviders
                .map(provider => provider.balanceProvider)
                .flat()
                .filter((provider): provider is BalanceProvider => Boolean(provider)),
            gas: realProviders
                .map(provider => provider.gasProvider)
                .flat()
                .filter((provider): provider is GasProvider => Boolean(provider)),
            nft: realProviders
                .map(provider => provider.nftProvider)
                .flat()
                .filter((provider): provider is NftProvider => Boolean(provider)),
            transfer: realProviders
                .map(provider => provider.transferProvider)
                .flat()
                .filter((provider): provider is (() => TransferProvider) => Boolean(provider))
                .map(provider => provider()),
            contractAddress: realProviders
                .map(provider => provider.contractAddressProvider)
                .flat()
                .filter((provider): provider is ContractAddressCheckerProvider => Boolean(provider)),
            rpcHealthCheck: realProviders
                .map(provider => provider.rpcHealthCheckProvider)
                .flat()
                .filter((provider): provider is RpcHealthCheckProvider => Boolean(provider)),
        }), [realProviders]);

        // Tracks whether the resolver registry has been wired up at least once.
        // Flipped from inside the effect so consumers gate on a real post-commit
        // signal rather than a synchronous always-true constant.
        const [isInitialized, setIsInitialized] = useState(false);

        useEffect(() => {
            resolverService.setProviders(
                providerArrays.balance,
                providerArrays.gas,
                providerArrays.nft,
                providerArrays.transfer,
                providerArrays.contractAddress,
                providerArrays.rpcHealthCheck,
            )

            setExtendedRouteProviders(walletProviders.flatMap((p: WalletProvider) => p.extendedRouteProvider ?? []).filter(Boolean))

            setIsInitialized(true);
        }, [walletProviders, providerArrays]);

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
