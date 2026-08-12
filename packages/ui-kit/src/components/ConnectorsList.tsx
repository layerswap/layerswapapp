import { type Wallet } from '@layerswap/widget-types';
import { useRef, useState, type FC, type ReactNode } from "react"
import { useConnectors } from "@layerswap/wallet-core"
import type { WalletConnectionProvider } from "@layerswap/wallet-core/types";
import { useConnectModal } from "./WalletModalProvider"
import { InstalledExtensionNotFound } from "./InstalledExtensionNotFound"
import { LoadingConnect } from "./LoadingConnect"
import { MultichainConnectorPicker } from "./MultichainConnectorPicker"
import { WalletQrCode } from "./WalletQrCode"
import { ConnectorsBrowser } from "./connectors-list/ConnectorsBrowser"
import { useAdditionalConnectors } from "./connectors-list/useAdditionalConnectors"
import { useConnectorSourcesStatus } from "./connectors-list/useConnectorSourcesStatus"
import { useFeaturedProviders } from "./connectors-list/useFeaturedProviders"
import { useWalletConnection } from "./connectors-list/useWalletConnection"

export type ConnectorsListProps = {
    providers: WalletConnectionProvider[]
    onFinish: (result: Wallet | undefined) => void
    brandMark?: ReactNode
    enablePortal?: boolean
}

export const ConnectorsList: FC<ConnectorsListProps> = ({
    providers,
    onFinish,
    brandMark,
    enablePortal,
}) => {
    const rootRef = useRef<HTMLDivElement>(null)
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
        retry,
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
        searchResults: isSearching ? searchResults : undefined,
    })

    let content: ReactNode

    if (
        selectedConnector?.extensionNotFound
        && !selectedConnector.showQrCode
        && !isMobilePlatform
    ) {
        const provider = featuredProviders.find(
            item => item.name === selectedConnector.providerName
        )
        content = provider ? (
            <InstalledExtensionNotFound
                selectedConnector={selectedConnector}
                brandMark={brandMark}
                onConnect={connector => {
                    void connect(connector, provider)
                }}
            />
        ) : null
    } else if (
        selectedConnector?.qr?.state
        && !connectionError
        && (
            !selectedConnector.hasBrowserExtension
            || selectedConnector.showQrCode
        )
    ) {
        content = <WalletQrCode selectedConnector={selectedConnector} portalContainerRef={rootRef} />
    } else if (selectedConnector) {
        content = (
            <LoadingConnect
                onRetry={retry}
                selectedConnector={selectedConnector}
                connectionError={connectionError}
                brandMark={brandMark}
            />
        )
    } else if (selectedMultiChainConnector) {
        const liveVariants = getLiveVariants(selectedMultiChainConnector)
        const pickerConnector = (
            liveVariants.length
            > (selectedMultiChainConnector.variants?.length ?? 0)
        )
            ? { ...selectedMultiChainConnector, variants: liveVariants }
            : selectedMultiChainConnector

        content = (
            <MultichainConnectorPicker
                selectedConnector={pickerConnector}
                providers={featuredProviders}
                connect={connect}
                isLoadingMore={showSourcesLoadingTail}
            />
        )
    } else {
        content = (
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
                enablePortal={enablePortal}
            />
        )
    }

    return (
        <div ref={rootRef} className="h-full">
            {content}
        </div>
    )
}
