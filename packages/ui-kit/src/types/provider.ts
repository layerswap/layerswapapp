import { TransferProvider } from '@layerswap/utils';
import { BalanceProvider } from '@layerswap/utils';
import { GasProvider } from '@layerswap/utils';
import { NftProvider } from '@layerswap/utils';
import { ContractAddressCheckerProvider } from '@layerswap/utils';
import { RpcHealthCheckProvider } from '@layerswap/utils';
import { ExtendedRouteProvider } from '@layerswap/utils';
import { GaslessProvider } from '@layerswap/utils';
import type { NetworkWithTokens } from '@layerswap/utils';
import type { WalletConnectionProviderProps, WalletConnectionStore, MultiStepHandler } from './wallet';
import type { InternalConnector } from '@layerswap/utils';

export type WalletModalConnector = InternalConnector & {
    qr?: ({
        state: 'loading',
        value: undefined,
        deepLink?: undefined
    } | {
        state: 'fetched',
        value: string,
        deepLink?: string
    });
    showQrCode?: boolean
    variants?: InternalConnector[]
    isRecent?: boolean
}

export type WalletWrapperProps = {
    children?: import('react').ReactNode
    appName?: string
}

export type WalletInitContext = {
    appName?: string
}

export type WalletWrapper = {
    id: string,
    /**
     * Optional React-tree wrapper. Use this only when the wallet integrates
     * with an upstream React-only library that needs to live in the tree
     * (e.g. `<TonConnectUIProvider>`, `<StarknetConfig>`). Packages with no
     * such dependency should use `init` instead.
     */
    wrapper?: React.ComponentType<WalletWrapperProps>,
    /**
     * Optional one-shot lifecycle. Called once when LayerswapProvider mounts.
     * Return a dispose function to run on unmount. Use this in place of
     * `wrapper` whenever the package does not need to inject React context
     * for its children.
     */
    init?: (ctx: WalletInitContext) => (() => void) | void,
}

export type WalletProvider<Network = NetworkWithTokens> = WalletWrapper & {
    /**
     * Vanilla external-store factory for connection state. Replaces the old
     * `walletConnectionProvider` hook field. Called once per provider, NOT
     * during render.
     */
    createConnection: (props: WalletConnectionProviderProps<Network>) => WalletConnectionStore<Network>,
    nftProvider?: NftProvider | NftProvider[],
    gasProvider?: GasProvider | GasProvider[],
    balanceProvider?: BalanceProvider | BalanceProvider[],
    transferProvider?: (() => TransferProvider) | (() => TransferProvider)[],
    gaslessProvider?: (() => GaslessProvider) | (() => GaslessProvider)[],
    contractAddressProvider?: ContractAddressCheckerProvider | ContractAddressCheckerProvider[],
    rpcHealthCheckProvider?: RpcHealthCheckProvider | RpcHealthCheckProvider[],
    extendedRouteProvider?: ExtendedRouteProvider | ExtendedRouteProvider[],
}

export type WalletProviderModule = {
    id: string,
    balanceProvider?: BalanceProvider,
    gasProvider?: GasProvider,
    multiStepHandler?: MultiStepHandler,
}

export type BaseWalletProviderConfig<Network = NetworkWithTokens> = {
    /**
     * Optional custom connection-store factory. Replaces the previous
     * hook-shaped `customHook` field. Implementations build their own
     * external store (typically via `createConnectionStore` from the widget).
     */
    customConnection?: (props: WalletConnectionProviderProps<Network>) => WalletConnectionStore<Network>
    balanceProviders?: BalanceProvider | BalanceProvider[]
    gasProviders?: GasProvider | GasProvider[]
    transferProviders?: (() => TransferProvider) | (() => TransferProvider)[]
    gaslessProviders?: (() => GaslessProvider) | (() => GaslessProvider)[]
    contractAddressProviders?: ContractAddressCheckerProvider | ContractAddressCheckerProvider[]
    rpcHealthCheckProviders?: RpcHealthCheckProvider | RpcHealthCheckProvider[]
}
