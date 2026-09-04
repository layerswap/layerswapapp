export {
    connectModalStore,
    buildDeepLink,
    createRegistryConnector,
    createReactHookConnectionAdapter,
    findRegistryWalletByName,
    subscribeDisplayUri,
    isWalletConnectRegistryConnector,
    chainsToNetworkTypes,
    getProvidersForWalletConnectNetworkType,
    mapConnectError,
    getDynamicWcMetadata,
    getPendingDynamicWcMetadata,
    clearPendingDynamicWcMetadata,
    createMemoizedConnectionStore,
    setDynamicWcMetadata,
    setPendingMetadataForRegistry,
    foregroundWalletApp,
    isSafeDeepLink,
    getAdditionalConnectorsStore,
    getInstantiatedAdditionalConnectorsStores,
    subscribeAdditionalConnectorsStores,
    ensureRegistryBrowseLoaded,
    useRegistryBrowseStatuses,
    useWalletDescriptorLoader,
    WalletDescriptorLoaderContext,
} from "@/lib/walletConnect";
export { isProviderConnectReady, isProviderHydrated, PROVIDER_HYDRATION_TIMEOUT_MS } from "@/lib/providerReadiness";
export { useProvidersConnectReady, useConnectorSourcesStatus, useWalletProviderReadiness } from "@/hooks/useProviderReadiness";
export type { DisplayUriSource, WalletConnectRegistryConnector, WalletConnectWalletBase, WalletConnectLink } from "@/lib/walletConnect";
export { useConnectors, connectorKey, resolveChainConnectors } from "@/hooks/useConnectors";
export { useWalletProviderSnapshots } from "@/hooks/useWalletProviderSnapshots";
export { usePersistedState } from "@/hooks/usePersistedState";
export { checkStorageIsAvailable } from "@/lib/storageAvailable";
export type { storageType } from "@/lib/storageAvailable";
export { WalletProvidersRegistryProvider, DescriptorHydrationBoundary, useHasConfiguredWalletProviders, useWalletProvidersRegistry, useWalletProvidersReady } from "@/context/WalletProvidersRegistryProvider";
export { walletKey } from "@/lib/walletKey";
export type { WalletConnectWallet } from "@/types/WalletConnectWallet";
export { DEFAULT_WALLETCONNECT_PROJECT_ID, UNMERGEABLE_WALLETS, NAME_OVERRIDES, SLUGS_TO_FILTER, FEATURED_WALLETS_IDS } from "@/constants";
export { WALLET_REGISTRY_BATCH_LIMIT, fetchRegistrySnapshot, matchRegistrySnapshot, normalizeRegistryNames } from "@/lib/walletConnect/registrySnapshot";
export type { Web3ModalWallet, WalletRegistryBatchResponse } from "@/lib/walletConnect/registrySnapshot";

export * from "@/icons/knownConnectorIcons";
export * from "@/icons/resolveWalletIcon";

export { getEip6963Providers, subscribeEip6963Providers } from "@/lib/eip6963Providers";
export type { Eip6963Provider } from "@/lib/eip6963Providers";
export { defineNetworkAdapter } from "@/types/network";
export type { AppNetworkAdapter } from "@/types/network";