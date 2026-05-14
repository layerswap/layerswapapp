import { WalletProvider, BaseWalletProviderConfig, LazyBalanceProvider } from "@layerswap/widget/types";
import { TronGasProvider } from "./tronGasProvider";
import useTronConnection from "./useTronConnection";
import { TronAddressUtilsProvider } from "./tronAddressUtilsProvider";
import React, { ComponentProps, lazy, Suspense } from "react";
let TronProviderImpl: typeof import("./TronProvider")["default"] | null = null

const loadTronProviderModule = async () => {
    const m = await import("./TronProvider")
    TronProviderImpl = m.default
}

const TronProviderWrapperLazy = /*#__PURE__*/ lazy(async () => {
    const m = await import("./TronProvider")
    TronProviderImpl = m.default
    return m
});

const TronProviderWrapper = (props: ComponentProps<typeof TronProviderWrapperLazy>) => {
    if (TronProviderImpl) {
        const Impl = TronProviderImpl
        return <Impl {...props} />
    }
    return <TronProviderWrapperLazy {...props} />
}

export const preloadTronProvider = loadTronProviderModule
import { useTronTransfer } from "./transferProvider/useTronTransfer";
import { KnownInternalNames } from "@layerswap/widget/internal";

export type TronProviderConfig = BaseWalletProviderConfig

export function createTronProvider(config: TronProviderConfig = {}): WalletProvider {
    const {
        customHook,
        balanceProviders,
        gasProviders,
        addressUtilsProviders,
        transferProviders
    } = config;

    const WrapperComponent = ({ children }: { children: React.ReactNode }) => {
        return (
            <Suspense fallback={null}>
                <TronProviderWrapper>
                    {children}
                </TronProviderWrapper>
            </Suspense>
        );
    };

    const walletConnectionProvider = customHook || useTronConnection;

    const defaultBalanceProviders = [
        new LazyBalanceProvider(
            (n) => KnownInternalNames.Networks.TronMainnet.includes(n.name),
            () => import("./tronBalanceProvider").then(m => new m.TronBalanceProvider())
        )
    ];
    const finalBalanceProviders = balanceProviders !== undefined
        ? (Array.isArray(balanceProviders) ? balanceProviders : [balanceProviders])
        : defaultBalanceProviders;

    const defaultGasProviders = [new TronGasProvider()];
    const finalGasProviders = gasProviders !== undefined
        ? (Array.isArray(gasProviders) ? gasProviders : [gasProviders])
        : defaultGasProviders;

    const defaultAddressUtilsProviders = [new TronAddressUtilsProvider()];
    const finalAddressUtilsProviders = addressUtilsProviders !== undefined
        ? (Array.isArray(addressUtilsProviders) ? addressUtilsProviders : [addressUtilsProviders])
        : defaultAddressUtilsProviders;

    const defaultTransferProviders = [useTronTransfer];
    const finalTransferProviders = transferProviders !== undefined
        ? (Array.isArray(transferProviders) ? transferProviders : [transferProviders])
        : defaultTransferProviders;

    return {
        id: "tron",
        wrapper: WrapperComponent,
        walletConnectionProvider,
        addressUtilsProvider: finalAddressUtilsProviders,
        gasProvider: finalGasProviders,
        balanceProvider: finalBalanceProviders,
        transferProvider: finalTransferProviders,
    };
}

/**
 * @deprecated Use createTronProvider() instead. This export will be removed in a future version.
 */
const TronProviderLazyWrapper = ({ children }: { children: React.ReactNode }) => (
    <Suspense fallback={null}>
        <TronProviderWrapper>{children}</TronProviderWrapper>
    </Suspense>
);

export const TronProvider: WalletProvider = {
    id: "tron",
    wrapper: TronProviderLazyWrapper,
    walletConnectionProvider: useTronConnection,
    addressUtilsProvider: [new TronAddressUtilsProvider()],
    gasProvider: [new TronGasProvider()],
    balanceProvider: [
        new LazyBalanceProvider(
            (n) => KnownInternalNames.Networks.TronMainnet.includes(n.name),
            () => import("./tronBalanceProvider").then(m => new m.TronBalanceProvider())
        )
    ],
    transferProvider: [useTronTransfer],
};