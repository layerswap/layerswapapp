import type { NetworkType, NetworkWithTokens } from '@layerswap/widget-types';
import type { StoreApi } from 'zustand/vanilla';
import type { TransferProps } from '@layerswap/widget-types';
import type { WalletProvider, WalletWrapper } from './provider';
import type { AppNetworkAdapter } from '@layerswap/utils';

import type { InternalConnector, Wallet } from '@layerswap/widget-types';

/**
 * External store contract for a wallet's connection state. Each package
 * exposes a vanilla zustand store (`store`); React consumers subscribe via
 * `useStore(store, selector)`, non-React peers read `store.getState()`.
 */
export type WalletConnectionStore<Network = NetworkWithTokens> = {
    store: StoreApi<WalletConnectionProvider>
    /** Called when host inputs change (e.g. settings refreshed and networks shifted). */
    updateProps?(props: WalletConnectionProviderProps<Network>): void
    /** Called when the store is no longer needed. */
    destroy?(): void
}

export type WalletProviderStoreRegistry = {
    getById(id: string): WalletConnectionProvider | undefined
    subscribe(listener: () => void): () => void
}

/**
 * Lightweight, statically-importable stand-in for a provider. Carries only the
 * metadata the host needs to render route gating and a wallet chip before the
 * chain SDK is loaded. The real provider is fetched on demand via
 * `loadProvider()` (typically when the user opens the connect modal).
 *
 * Descriptors MUST be tree-shake-safe: their module graph must not statically
 * reference the chain SDK. Use `import type` for any type references and a
 * dynamic `import()` inside `loadProvider`.
 */
export type WalletProviderCapabilities = {
    /**
     * WalletConnect registry ecosystems this provider can execute. This is
     * intentionally separate from concrete route/transfer network support.
     */
    walletConnectRegistry?: {
        networkTypes: readonly NetworkType[]
    }
}

export type WalletProviderDescriptor<Network = NetworkWithTokens> = {
    id: string,
    name?: string,
    capabilities?: WalletProviderCapabilities,
    providerIcon?: string,
    autofillSupportedNetworks?: string[],
    withdrawalSupportedNetworks?: string[],
    asSourceSupportedNetworks?: string[],
    unsupportedPlatforms?: string[],
    hideFromList?: boolean,
    /** Cheap persisted-session probe used to hydrate a descriptor on mount. */
    hasPersistedSession?: () => boolean,
    loadProvider: () => Promise<WalletProvider<Network> | WalletWrapper>,
}

export function isWalletProviderDescriptor<Network>(
    p: WalletProvider<Network> | WalletWrapper | WalletProviderDescriptor<Network>
): p is WalletProviderDescriptor<Network> {
    return typeof (p as WalletProviderDescriptor).loadProvider === 'function'
}

export type WalletConnectionProviderProps<Network = NetworkWithTokens> = {
    networks: Network[]
    networkAdapter: AppNetworkAdapter<Network>
    /** Access to peer wallet providers scoped to the current widget instance. */
    walletProvidersRegistry?: WalletProviderStoreRegistry
}

/**
 * Contract shared by the per-chain connection services. Concrete services can
 * expose additional chain-specific methods, but every connection factory can
 * rely on this core lifecycle and connect surface.
 */
export interface WalletConnectionService<TDeps = never, Network = NetworkWithTokens> {
    setNetworks(networks: Network[], networkAdapter: AppNetworkAdapter<Network>): void
    configure?(deps: TDeps): void
    connectWallet(props: { connector: InternalConnector }): Promise<Wallet | undefined>
    disconnectWallets?(): Promise<void>
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
    capabilities?: WalletProviderCapabilities,
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
    /** A stub with a persisted session that is being hydrated automatically. */
    pendingSessionRestore?: boolean,

    multiStepHandlers?: MultiStepHandler[],
}

export type MultiStepHandler = {
    component: import('react').ComponentType<any>,
    supportedNetworks: string[]
}

export type SelectAccountProps = {
    walletId: string;
    address: string;
    providerName: string;
}

export type AccountIdentity = {
    address: string;
    providerName: string;
    id: string;
    displayName: string;
    addresses: string[];
    provider: WalletConnectionProvider;
    icon?: string;
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

/** Shared WalletConnect project metadata for EVM and Solana packages. */
