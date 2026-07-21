import { TransferProvider } from './transfer';
import { BalanceProvider } from './balance';
import { GasProvider } from './gas';
import { NftProvider } from './nft';
import { ContractAddressCheckerProvider } from './contract';
import { RpcHealthCheckProvider } from './rpcHealth';
import { ExtendedRouteProvider } from './extendedRoutes';
import type {
    InternalConnector,
    WalletConnectionProviderProps,
    WalletConnectionStore,
    MultiStepHandler,
} from './wallet';

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

export type WalletProvider = WalletWrapper & {
    /**
     * Vanilla external-store factory for connection state. Replaces the old
     * `walletConnectionProvider` hook field. Called once per provider, NOT
     * during render.
     */
    createConnection: (props: WalletConnectionProviderProps) => WalletConnectionStore,
    nftProvider?: NftProvider | NftProvider[],
    gasProvider?: GasProvider | GasProvider[],
    balanceProvider?: BalanceProvider | BalanceProvider[],
    transferProvider?: (() => TransferProvider) | (() => TransferProvider)[],
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

export type BaseWalletProviderConfig = {
    /**
     * Optional custom connection-store factory. Replaces the previous
     * hook-shaped `customHook` field. Implementations build their own
     * external store (typically via `createConnectionStore` from the widget).
     */
    customConnection?: (props: WalletConnectionProviderProps) => WalletConnectionStore
    balanceProviders?: BalanceProvider | BalanceProvider[]
    gasProviders?: GasProvider | GasProvider[]
    transferProviders?: (() => TransferProvider) | (() => TransferProvider)[]
    contractAddressProviders?: ContractAddressCheckerProvider | ContractAddressCheckerProvider[]
    rpcHealthCheckProviders?: RpcHealthCheckProvider | RpcHealthCheckProvider[]
}
