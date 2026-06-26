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

        const transferProviders = useMemo(() => realProviders
            .map(provider => provider.transferProvider)
            .flat()
            .filter((provider): provider is (() => TransferProvider) => Boolean(provider))
            .map(provider => provider()),
            [realProviders]);

        const contractAddressProviders: ContractAddressCheckerProvider[] = useMemo(() => realProviders
            .map(provider => provider.contractAddressProvider)
            .flat()
            .filter((provider): provider is ContractAddressCheckerProvider => Boolean(provider)),
            [realProviders]);

        const rpcHealthCheckProviders: RpcHealthCheckProvider[] = useMemo(() => realProviders
            .map(provider => provider.rpcHealthCheckProvider)
            .flat()
            .filter((provider): provider is RpcHealthCheckProvider => Boolean(provider)),
            [realProviders]);

        const balanceProviders: BalanceProvider[] = useMemo(() => realProviders
            .map(provider => provider.balanceProvider)
            .flat()
            .filter((provider): provider is BalanceProvider => Boolean(provider)),
            [realProviders]);

        const gasProviders: GasProvider[] = useMemo(() => realProviders
            .map(provider => provider.gasProvider)
            .flat()
            .filter((provider): provider is GasProvider => Boolean(provider)),
            [realProviders]);

        const nftProviders: NftProvider[] = useMemo(() => realProviders
            .map(provider => provider.nftProvider)
            .flat()
            .filter((provider): provider is NftProvider => Boolean(provider)),
            [realProviders]);

        // Tracks whether the resolver registry has been wired up at least once.
        // Flipped from inside the effect so consumers gate on a real post-commit
        // signal rather than a synchronous always-true constant.
        const [isInitialized, setIsInitialized] = useState(false);

        useEffect(() => {
            resolverService.setProviders(balanceProviders, gasProviders, nftProviders, transferProviders, contractAddressProviders, rpcHealthCheckProviders)

            setExtendedRouteProviders(walletProviders.flatMap((p: WalletProvider) => p.extendedRouteProvider ?? []).filter(Boolean))

            setIsInitialized(true);
        }, [walletProviders, balanceProviders, gasProviders, nftProviders, transferProviders, contractAddressProviders, rpcHealthCheckProviders]);

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
