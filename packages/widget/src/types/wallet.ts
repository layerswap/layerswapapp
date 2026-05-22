import { TransferProps, TransferProvider } from './transfer';
import { NetworkWithTokens } from '@/Models/Network';
import { BalanceProvider } from './balance';
import { GasProvider } from './gas';
import { AddressUtilsProvider } from './addressUtils';
import { NftProvider } from './nft';
import { ContractAddressCheckerProvider } from './contract';
import { RpcHealthCheckProvider } from './rpcHealth';
import type { ThemeData } from '@/Models/Theme';
export { type WalletModalConnector } from '@/components/Wallet/WalletModal'

export type InternalConnector = {
    name: string,
    id: string,
    icon?: string | undefined,
    order?: number,
    type?: 'injected' | 'walletConnect' | 'other' | string,
    isMultiChain?: boolean,
    providerName: string,
    installUrl?: string,
    isMobileSupported?: boolean,
    hasBrowserExtension?: boolean,
    extensionNotFound?: boolean,
    isLoadable?: boolean,
}

export type Wallet = {
    id: string;
    internalId?: string;
    displayName?: string;
    isActive: boolean;
    address: string | `0x${string}`;
    addresses: string[];
    providerName: string
    /** Icon as a URL or data: URI. When undefined, the UI falls back to a generic wallet icon. */
    icon?: string;
    metadata?: {
        starknetAccount?: any,
        wallet?: any,
        l1Address?: string,
        deepLink?: string
    }
    chainId?: string | number,
    isLoading?: boolean,
    disconnect?: () => Promise<void> | undefined | void;
    connect?: () => Promise<Wallet | undefined>;
    isNotAvailable?: boolean;
    withdrawalSupportedNetworks?: string[],
    asSourceSupportedNetworks?: string[],
    autofillSupportedNetworks?: string[],
    networkIcon?: string,
}

/**
 * External store contract for a wallet's connection state. Replaces the old
 * `walletConnectionProvider` hook. Implementations expose a vanilla
 * subscribe/getSnapshot pair the widget bridges via `useSyncExternalStore`.
 */
export type WalletConnectionStore = {
    subscribe(listener: () => void): () => void
    getSnapshot(): WalletConnectionProvider
    /** Called when host inputs change (e.g. settings refreshed and networks shifted). */
    updateProps?(props: WalletConnectionProviderProps): void
    /** Called when the store is no longer needed. */
    destroy?(): void
}

export type WalletProvider = WalletWrapper & {
    /**
     * Vanilla external-store factory for connection state. Replaces the old
     * `walletConnectionProvider` hook field. Called once per provider, NOT
     * during render.
     */
    createConnection: (props: WalletConnectionProviderProps) => WalletConnectionStore,
    addressUtilsProvider?: AddressUtilsProvider | AddressUtilsProvider[],
    nftProvider?: NftProvider | NftProvider[],
    gasProvider?: GasProvider | GasProvider[],
    balanceProvider?: BalanceProvider | BalanceProvider[],
    transferProvider?: (() => TransferProvider) | (() => TransferProvider)[],
    contractAddressProvider?: ContractAddressCheckerProvider | ContractAddressCheckerProvider[],
    rpcHealthCheckProvider?: RpcHealthCheckProvider | RpcHealthCheckProvider[],
}

export type WalletWrapperProps = {
    children?: import('react').ReactNode
    themeData?: ThemeData
    appName?: string
}

export type WalletInitContext = {
    themeData?: ThemeData
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

export type WalletProviderModule = {
    id: string,
    balanceProvider?: BalanceProvider,
    gasProvider?: GasProvider,
    multiStepHandler?: MultiStepHandler,
}

export type WalletConnectionProviderProps = {
    networks: NetworkWithTokens[]
}

export type WalletConnectionProvider = {
    connectWallet: (props?: { connector?: InternalConnector }) => Promise<Wallet | undefined> | undefined,
    disconnectWallets?: () => Promise<void> | undefined | void,
    switchAccount?: (connector: Wallet, address: string) => Promise<void>,
    switchChain?: (connector: Wallet, chainId: string | number) => Promise<void>
    isNotAvailableCondition?: (connector: string, network: string, purpose?: "withdrawal" | "autofill" | "asSource") => boolean,
    requestAdditionalConnectors?: (params?: RequestAdditionalConnectorsParams) => Promise<RequestAdditionalConnectorsResult>,

    /**
     * @deprecated Use TransferResolver from useTransfer() hook instead. This will be removed in a future version.
     * Transfer providers should now be configured via WalletProvider.transferProvider.
     */
    transfer?: (params: TransferProps, wallet?: Wallet) => Promise<string | undefined>,

    availableConnectors?: InternalConnector[],
    additionalConnectors?: InternalConnector[],
    connectedWallets: Wallet[] | undefined,
    activeWallet: Wallet | undefined,
    autofillSupportedNetworks?: string[],
    withdrawalSupportedNetworks: string[],
    asSourceSupportedNetworks?: string[],
    name: string,
    id: string,
    providerIcon?: string,
    unsupportedPlatforms?: string[],
    hideFromList?: boolean,
    ready: boolean,

    multiStepHandlers?: MultiStepHandler[],
}

export type MultiStepHandler = {
    component: React.ComponentType<any>,
    supportedNetworks: string[]
}

export type SelectAccountProps = {
    walletId: string;
    address: string;
    providerName: string;
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
    addressUtilsProviders?: AddressUtilsProvider | AddressUtilsProvider[]
    transferProviders?: (() => TransferProvider) | (() => TransferProvider)[]
    contractAddressProviders?: ContractAddressCheckerProvider | ContractAddressCheckerProvider[]
    rpcHealthCheckProviders?: RpcHealthCheckProvider | RpcHealthCheckProvider[]
} 

export type RequestAdditionalConnectorsParams = {
    page?: number,
    pageSize?: number,
    query?: string,
}

export type RequestAdditionalConnectorsResult = {
    connectors: InternalConnector[],
    nextPage: number | null,
    totalCount: number,
}