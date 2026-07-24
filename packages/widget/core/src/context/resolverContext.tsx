import React, { useEffect, useMemo } from "react";
import { NftProvider, BalanceProvider, GasProvider, TransferProvider, ContractAddressCheckerProvider, RpcHealthCheckProvider, GaslessProvider } from "@/types"
import type { WalletProvider, WalletProviderDescriptor, WalletWrapper } from "@layerswap/wallet-core/types"
import { isWalletProviderDescriptor } from "@layerswap/wallet-core/types"
import { resolverService } from "@/lib/resolvers/resolverService";
import { setExtendedRouteProviders } from "@/lib/extendedRoutes";
import { ExtendedRouteProvider } from "@/lib/extendedRoutes/types";

export const isWalletProviderWithResolvers = (
    p: WalletProvider | WalletWrapper | WalletProviderDescriptor
): p is WalletProvider =>
    !isWalletProviderDescriptor(p) && 'createConnection' in p

export const extractExtendedRouteProviders = (
    providers: (WalletProvider | WalletWrapper | WalletProviderDescriptor)[]
): ExtendedRouteProvider[] =>
    providers
        .filter(isWalletProviderWithResolvers)
        .flatMap(p => p.extendedRouteProvider ?? [])

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

        const gaslessProviders = useMemo(() => realProviders
            .map(provider => provider.gaslessProvider)
            .flat()
            .filter((provider): provider is (() => GaslessProvider) => Boolean(provider))
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

        // No ready-signal here: components gating on provider availability use
        // `useWalletProvidersReady()`, which tracks the wallet-connection
        // registry they actually read (see `WalletProvidersProvider`).
        useEffect(() => {
            resolverService.setProviders(balanceProviders, gasProviders, nftProviders, transferProviders, contractAddressProviders, rpcHealthCheckProviders, gaslessProviders)

            setExtendedRouteProviders(extractExtendedRouteProviders(walletProviders))
        }, [walletProviders, balanceProviders, gasProviders, nftProviders, transferProviders, contractAddressProviders, rpcHealthCheckProviders, gaslessProviders]);

        return <>{children}</>;
    };
