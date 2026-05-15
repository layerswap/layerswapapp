import useStarknetConnection from "./useStarknetConnection";
import { StarknetBalanceProvider } from "./starknetBalanceProvider";
import { WalletProvider, BaseWalletProviderConfig, NftProvider, LazyGasProvider } from "@layerswap/widget/types";
import { AppSettings, KnownInternalNames } from "@layerswap/widget/internal";
import { StarknetAddressUtilsProvider } from "./starknetAddressUtilsProvider";
import { StarknetNftProvider } from "./starknetNftProvider";
import React, { ComponentProps, lazy, Suspense } from "react";
let StarknetProviderImpl: typeof import("./StarknetProvider")["default"] | null = null

const loadStarknetProviderModule = async () => {
    const m = await import("./StarknetProvider")
    StarknetProviderImpl = m.default
}

const StarknetProviderWrapperLazy = /*#__PURE__*/ lazy(async () => {
    const m = await import("./StarknetProvider")
    StarknetProviderImpl = m.default
    return m
});

const StarknetProviderWrapper = (props: ComponentProps<typeof StarknetProviderWrapperLazy>) => {
    if (StarknetProviderImpl) {
        const Impl = StarknetProviderImpl
        return <Impl {...props} />
    }
    return <StarknetProviderWrapperLazy {...props} />
}

export const preloadStarknetProvider = loadStarknetProviderModule
import { useStarknetTransfer } from "./useStarknetTransfer";

const isStarknetNetwork = (name: string) =>
    KnownInternalNames.Networks.StarkNetMainnet.includes(name) ||
    KnownInternalNames.Networks.StarkNetGoerli.includes(name) ||
    KnownInternalNames.Networks.StarkNetSepolia.includes(name);

export type StarknetProviderConfig = BaseWalletProviderConfig & {
    nftProviders?: NftProvider | NftProvider[]
}

export { default as useStarknetConnection } from "./useStarknetConnection";

export function createStarknetProvider(config: StarknetProviderConfig = {}): WalletProvider {
    const {
        customHook,
        balanceProviders,
        gasProviders,
        addressUtilsProviders,
        nftProviders,
        transferProviders
    } = config;

    // Use custom hook if provided, otherwise use default
    const walletConnectionProvider = customHook || useStarknetConnection;

    // Use custom providers if provided, otherwise use defaults
    const defaultBalanceProviders = [new StarknetBalanceProvider()];
    const finalBalanceProviders = balanceProviders !== undefined
        ? (Array.isArray(balanceProviders) ? balanceProviders : [balanceProviders])
        : defaultBalanceProviders;

    const defaultGasProviders = [
        new LazyGasProvider(
            (n) => isStarknetNetwork(n.name),
            () => import("./starknetGasProvider").then(m => new m.StarknetGasProvider())
        )
    ];
    const finalGasProviders = gasProviders !== undefined
        ? (Array.isArray(gasProviders) ? gasProviders : [gasProviders])
        : defaultGasProviders;

    const defaultAddressUtilsProviders = [new StarknetAddressUtilsProvider()];
    const finalAddressUtilsProviders = addressUtilsProviders !== undefined
        ? (Array.isArray(addressUtilsProviders) ? addressUtilsProviders : [addressUtilsProviders])
        : defaultAddressUtilsProviders;

    const defaultNftProviders = [new StarknetNftProvider()];
    const finalNftProviders = nftProviders !== undefined
        ? (Array.isArray(nftProviders) ? nftProviders : [nftProviders])
        : defaultNftProviders;

    const defaultTransferProviders = [useStarknetTransfer];
    const finalTransferProviders = transferProviders !== undefined
        ? (Array.isArray(transferProviders) ? transferProviders : [transferProviders])
        : defaultTransferProviders;

    const WrapperComponent = ({ children }: { children: React.ReactNode }) => (
        <Suspense fallback={null}>
            <StarknetProviderWrapper>{children}</StarknetProviderWrapper>
        </Suspense>
    );

    return {
        id: "starknet",
        wrapper: WrapperComponent,
        walletConnectionProvider,
        addressUtilsProvider: finalAddressUtilsProviders,
        gasProvider: finalGasProviders,
        balanceProvider: finalBalanceProviders,
        nftProvider: finalNftProviders,
        transferProvider: finalTransferProviders,
    };
}

/**
 * @deprecated Use createStarknetProvider() instead. This export will be removed in a future version.
 * Note: This uses default WalletConnect configuration provided to LayerswapProvider.
 */
export const StarknetProvider: WalletProvider = {
    id: "starknet",
    wrapper: ({ children }: { children: React.ReactNode }) => {
        return (
            <Suspense fallback={null}>
                <StarknetProviderWrapper walletConnectConfigs={AppSettings.WalletConnectConfig}>
                    {children}
                </StarknetProviderWrapper>
            </Suspense>
        );
    },
    walletConnectionProvider: useStarknetConnection,
    addressUtilsProvider: [new StarknetAddressUtilsProvider()],
    gasProvider: [
        new LazyGasProvider(
            (n) => isStarknetNetwork(n.name),
            () => import("./starknetGasProvider").then(m => new m.StarknetGasProvider())
        )
    ],
    balanceProvider: [new StarknetBalanceProvider()],
    nftProvider: [new StarknetNftProvider()],
    transferProvider: [useStarknetTransfer],
};
// Shell entry — see defineWalletProvider docs in @layerswap/widget. The
// inner provider definition is unchanged; the shell just wraps it so the
// chain composes as JSX (<StarknetShell>…</StarknetShell>) rather than via
// a runtime-built walletProviders array.
import { defineWalletProvider, type WalletProviderShell } from "@layerswap/widget/internal";

export function createStarknetShell(config: StarknetProviderConfig & { order?: number } = {}): WalletProviderShell {
    const { order = 200, ...rest } = config
    const provider = createStarknetProvider(rest)
    return defineWalletProvider({
        id: provider.id,
        order,
        wrapper: provider.wrapper as React.ComponentType<{ children: React.ReactNode }>,
        walletConnectionProvider: provider.walletConnectionProvider,
        transferProvider: provider.transferProvider,
        balanceProvider: provider.balanceProvider,
        gasProvider: provider.gasProvider,
        addressUtilsProvider: provider.addressUtilsProvider,
        nftProvider: provider.nftProvider,
        contractAddressProvider: provider.contractAddressProvider,
        rpcHealthCheckProvider: provider.rpcHealthCheckProvider,
    })
}
