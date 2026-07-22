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
    useWalletDescriptorLoader,
    WalletDescriptorLoaderContext,
} from "@/lib/walletConnect";
export type { DisplayUriSource, RegistryConnector, WalletConnectWalletBase } from "@/lib/walletConnect";
export { useConnectors } from "@/hooks/useConnectors";
export { WalletProvidersRegistryProvider, useWalletProvidersRegistry, useWalletProvidersReady } from "@/context/WalletProvidersRegistryProvider";
export { walletKey } from "@/walletKey";
export type { WalletConnectWallet } from "@/Models/WalletConnectWallet";

export * from "@/icons/knownConnectorIcons";
export * from "@/icons/resolveWalletIcon";

export { extractErrorDetails } from "@/balances/errorUtils";
export type { ErrorDetails } from "@/balances/errorUtils";
export { classifyNodeError } from "@/balances/nodeErrorClassifier";
export type { NodeErrorCategory } from "@/balances/nodeErrorClassifier";
