import { TransferProps, TransferProvider } from './transfer';
import { NetworkWithTokens } from '@/Models/Network';
import { BalanceProvider } from './balance';
import { GasProvider } from './gas';
import { NftProvider } from './nft';
import { ContractAddressCheckerProvider } from './contract';
import { RpcHealthCheckProvider } from './rpcHealth';
import type { ThemeData } from '@/Models/Theme';
import type { StoreApi } from 'zustand/vanilla';
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
        l1ProviderName?: string,
        l1ChainId?: string | number,
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
 * External store contract for a wallet's connection state. Each package
 * exposes a vanilla zustand store (`store`); React consumers subscribe via
 * `useStore(store, selector)`, non-React peers read `store.getState()`.
 */
export type WalletConnectionStore = {
    store: StoreApi<WalletConnectionProvider>
    /** Called when host inputs change (e.g. settings refreshed and networks shifted). */
    updateProps?(props: WalletConnectionProviderProps): void
    /** Called when the store is no longer needed. */
    destroy?(): void
}

export type WalletProviderStoreRegistry = {
    getById(id: string): WalletConnectionProvider | undefined
    subscribe(listener: () => void): () => void
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
}

/**
 * Lightweight, statically-importable stand-in for a `WalletProvider`. Carries
 * only the metadata the host needs to render route gating and a wallet chip
 * before the chain SDK is loaded. The real provider is fetched on demand via
 * `loadProvider()` (typically when the user opens the connect modal).
 *
 * Descriptors MUST be tree-shake-safe: their module graph must not statically
 * reference the chain SDK. Use `import type` for any type references and a
 * dynamic `import()` inside `loadProvider`.
 */
export type WalletProviderDescriptor = {
    id: string,
    name?: string,
    providerIcon?: string,
    autofillSupportedNetworks?: string[],
    withdrawalSupportedNetworks?: string[],
    asSourceSupportedNetworks?: string[],
    unsupportedPlatforms?: string[],
    hideFromList?: boolean,
    loadProvider: () => Promise<WalletProvider | WalletWrapper>,
}

export function isWalletProviderDescriptor(
    p: WalletProvider | WalletWrapper | WalletProviderDescriptor
): p is WalletProviderDescriptor {
    return typeof (p as WalletProviderDescriptor).loadProvider === 'function'
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
    /** Access to peer wallet providers scoped to the current widget instance. */
    walletProvidersRegistry?: WalletProviderStoreRegistry
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
    /**
     * True only for the synthetic stub served while a {@link WalletProviderDescriptor}
     * has not loaded its real provider yet. Consumers MUST NOT gate connect/modal
     * affordances on `ready === false` for a stub — opening the modal is what
     * triggers the descriptor load. Use this flag to tell "not loaded yet"
     * (selectable, should trigger a load) apart from "real provider still
     * initializing" (show a spinner, keep disabled).
     */
    isStub?: boolean,

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
