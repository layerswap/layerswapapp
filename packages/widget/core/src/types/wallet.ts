import { TransferProps, TransferProvider } from './transfer';
import { GaslessProvider } from './gasless';
import { NetworkWithTokens } from '@/Models/Network';
import { BalanceProvider } from './balance';
import { GasProvider } from './gas';
import { NftProvider } from './nft';
import { ContractAddressCheckerProvider } from './contract';
import { RpcHealthCheckProvider } from './rpcHealth';
import type { ThemeData } from '@/Models/Theme';
import type { StoreApi } from 'zustand/vanilla';
import { ExtendedRouteProvider } from '../lib/extendedRoutes/types';
import { WalletConnectWalletBase } from '@/lib/walletConnect';

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
    gaslessProvider?: (() => GaslessProvider) | (() => GaslessProvider)[],
    contractAddressProvider?: ContractAddressCheckerProvider | ContractAddressCheckerProvider[],
    rpcHealthCheckProvider?: RpcHealthCheckProvider | RpcHealthCheckProvider[],
    extendedRouteProvider?: ExtendedRouteProvider | ExtendedRouteProvider[],
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
    /**
     * Cheap, dependency-free probe: does this chain's SDK have a persisted
     * session marker (e.g. a localStorage key) suggesting a wallet could be
     * silently restored? When true, the descriptor is hydrated right after
     * mount so the restored session surfaces without the user opening the
     * connect modal. MUST NOT import the chain SDK to answer — inline the
     * storage key literal, like the network-id lists above.
     */
    hasPersistedSession?: () => boolean,
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
    /**
     * Stub-only: the descriptor's `hasPersistedSession` probe matched, so this
     * provider is auto-hydrated right after mount and a wallet is likely about
     * to be restored. Connect gates should treat such a stub as still
     * initializing (like a live provider with `ready: false`), not as
     * ready-to-click — otherwise the connect button flashes enabled in the
     * window between registry publish and hydration.
     */
    pendingSessionRestore?: boolean,

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
    gaslessProviders?: (() => GaslessProvider) | (() => GaslessProvider)[]
    contractAddressProviders?: ContractAddressCheckerProvider | ContractAddressCheckerProvider[]
    rpcHealthCheckProviders?: RpcHealthCheckProvider | RpcHealthCheckProvider[]
}

/** WalletConnect project metadata shared by the chain packages that open WalletConnect sessions (EVM, SVM). */
export type WalletConnectConfig = {
    projectId: string
    name: string
    description: string
    url: string
    icons: string[]
}

/**
 * Contract every per-chain `*ConnectionService` class must satisfy so a
 * missing/renamed method fails at compile time instead of breaking its
 * `create*Connection` factory at runtime. Members beyond this core
 * (`buildProvider`, `getConnectedWallets`, chain-specific getters) vary per
 * chain and stay on the concrete class.
 *
 * `TDeps` is the shape accepted by `configure` for services that receive
 * runtime dependencies (peer-provider registry, connect-modal setters).
 */
export interface WalletConnectionService<TDeps = unknown> {
    /** Cache the settings-provided network list; must no-op when the list is unchanged. */
    setNetworks(networks: NetworkWithTokens[]): void
    /** Inject runtime dependencies that aren't known at construction time. */
    configure?(deps: TDeps): void
    /** Connect one of the service's connectors, resolving to the connected wallet. */
    connectWallet(props: { connector: InternalConnector }): Promise<Wallet | undefined>
    disconnectWallets?(): Promise<void>
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
    showQrCode?: boolean,
    variants?: InternalConnector[],
    isRecent?: boolean,
}
