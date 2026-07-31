export {
    connectModalStore,
    buildDeepLink,
    createRegistryConnector,
    createReactHookConnectionAdapter,
    findRegistryWalletByName,
    subscribeDisplayUri,
    getRegistryEntry,
    mapConnectError,
    getDynamicWcMetadata,
    getPendingDynamicWcMetadata,
    clearPendingDynamicWcMetadata,
    createMemoizedConnectionStore,
    setDynamicWcMetadata,
    setPendingMetadataForRegistry,
    getAdditionalConnectorsStore,
    getInstantiatedAdditionalConnectorsStores,
    subscribeAdditionalConnectorsStores,
    ensureRegistryBrowseLoaded,
    useRegistryBrowseStatuses,
    useWalletDescriptorLoader,
    WalletDescriptorLoaderContext,
} from "@/lib/walletConnect";
export type { DisplayUriSource, RegistryConnector, WalletConnectWalletBase } from "@/lib/walletConnect";
export { useConnectors, connectorKey, resolveChainConnectors } from "@/hooks/useConnectors";
export { WalletProvidersRegistryProvider, useHasConfiguredWalletProviders, useWalletProvidersRegistry, useWalletProvidersReady } from "@/context/WalletProvidersRegistryProvider";
export { walletKey } from "@/walletKey";
export type { WalletConnectWallet } from "@/types/WalletConnectWallet";

export * from "@/icons/knownConnectorIcons";
export * from "@/icons/resolveWalletIcon";

export { getEip6963Providers, subscribeEip6963Providers } from "@/lib/eip6963Providers";
export type { Eip6963Provider } from "@/lib/eip6963Providers";
export { defineNetworkAdapter } from "@/types/network";
export type { AppNetworkAdapter } from "@/types/network";
