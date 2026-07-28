import { useState, type FC } from "react";
import useWallet from "@/hooks/useWallet";
import { useConnectors } from "@/hooks/useConnectors";
import type { Wallet } from "@/types/wallet";
import { useConnectModal } from ".";
import { InstalledExtensionNotFound } from "./InstalledExtensionNotFound";
import { LoadingConnect } from "./LoadingConnect";
import { MultichainConnectorPicker } from "./MultichainConnectorPicker";
import { WalletQrCode } from "./WalletQrCode";
import { ConnectorsBrowser } from "./connectors-list/ConnectorsBrowser";
import { useAdditionalConnectors } from "./connectors-list/useAdditionalConnectors";
import { useConnectorSourcesStatus } from "./connectors-list/useConnectorSourcesStatus";
import { useFeaturedProviders } from "./connectors-list/useFeaturedProviders";
import { useWalletConnection } from "./connectors-list/useWalletConnection";

const ConnectorsList: FC<{
    onFinish: (result: Wallet | undefined) => void;
}> = ({ onFinish }) => {
    const { providers } = useWallet()
    const {
        selectedConnector,
        selectedMultiChainConnector,
        selectedProvider,
        setSelectedProvider,
    } = useConnectModal()
    const [searchValue, setSearchValue] = useState<string | undefined>()

    const {
        featuredProviders,
        filteredProviders,
        selectedProviderNames,
        selectProviders,
    } = useFeaturedProviders({
        providers,
        selectedProvider,
        setSelectedProvider,
    })

    const {
        connect,
        connectionError,
        getLiveVariants,
        isMobilePlatform,
        recentConnectors,
    } = useWalletConnection({
        featuredProviders,
        onFinish,
    })

    const {
        blockListWhileLoading,
        registryError,
        retryRegistry,
        showSourcesLoadingTail,
    } = useConnectorSourcesStatus(featuredProviders)

    // While the skeleton gate blocks the browser, the load-more sentinel isn't
    // mounted — folding the gate into `isListVisible` makes the observer
    // re-attach when the gate lifts.
    const isListVisible = !selectedConnector && !selectedMultiChainConnector && !blockListWhileLoading
    const {
        anyProviderHasMore,
        anyProviderLoadingMore,
        isSearching,
        loadMoreTriggerRef,
        searchResults,
    } = useAdditionalConnectors({
        featuredProviders,
        searchValue,
        isListVisible,
    })

    const { initialConnectors } = useConnectors({
        featuredProviders,
        filteredProviders,
        searchValue,
        recentConnectors,
        // Avoid invalidating useConnectors' memoized pipeline with a new idle
        // array identity.
        searchResults: isSearching ? searchResults : undefined,
    })

    if (
        selectedConnector?.extensionNotFound
        && !selectedConnector.showQrCode
        && !isMobilePlatform
    ) {
        const provider = featuredProviders.find(
            item => item.name === selectedConnector.providerName
        )
        if (!provider) return null

        return (
            <InstalledExtensionNotFound
                selectedConnector={selectedConnector}
                onConnect={connector => {
                    void connect(connector, provider)
                }}
            />
        )
    }

    if (
        selectedConnector?.qr?.state
        && (
            !selectedConnector.hasBrowserExtension
            || selectedConnector.showQrCode
        )
    ) {
        return <WalletQrCode selectedConnector={selectedConnector} />
    }

    if (selectedConnector) {
        const provider = featuredProviders.find(
            item => item.name === selectedConnector.providerName
        )
        return (
            <LoadingConnect
                onRetry={() => {
                    if (provider) void connect(selectedConnector, provider)
                }}
                selectedConnector={selectedConnector}
                connectionError={connectionError}
            />
        )
    }

    if (selectedMultiChainConnector) {
        // A click-time snapshot can miss variants published by late providers.
        // Prefer the live connector when it knows about more ecosystems.
        const liveVariants = getLiveVariants(selectedMultiChainConnector)
        const pickerConnector = (
            liveVariants.length
            > (selectedMultiChainConnector.variants?.length ?? 0)
        )
            ? { ...selectedMultiChainConnector, variants: liveVariants }
            : selectedMultiChainConnector

        return (
            <MultichainConnectorPicker
                selectedConnector={pickerConnector}
                providers={featuredProviders}
                connect={connect}
                isLoadingMore={showSourcesLoadingTail}
            />
        )
    }

    return (
        <ConnectorsBrowser
            anyProviderHasMore={anyProviderHasMore}
            anyProviderLoadingMore={anyProviderLoadingMore}
            blockListWhileLoading={blockListWhileLoading}
            connect={connect}
            connectors={initialConnectors}
            featuredProviders={featuredProviders}
            filteredProviders={filteredProviders}
            loadMoreTriggerRef={loadMoreTriggerRef}
            registryError={registryError}
            retryRegistry={retryRegistry}
            searchValue={searchValue}
            selectProviders={selectProviders}
            selectedProviderNames={selectedProviderNames}
            setSearchValue={setSearchValue}
            showProviderPicker={
                !selectedProvider || selectedProvider.isSelectedFromFilter === true
            }
            showSourcesLoadingTail={showSourcesLoadingTail}
        />
    )
}

export default ConnectorsList
