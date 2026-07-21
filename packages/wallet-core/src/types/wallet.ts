import type { NetworkWithTokens } from '@layerswap/utils';
import type { StoreApi } from 'zustand/vanilla';
import type { TransferProps } from './transfer';
import type { WalletProvider, WalletWrapper } from './provider';

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
    component: import('react').ComponentType<any>,
    supportedNetworks: string[]
}

export type SelectAccountProps = {
    walletId: string;
    address: string;
    providerName: string;
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
