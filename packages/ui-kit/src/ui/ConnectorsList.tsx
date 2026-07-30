import { useRef, useState, type FC, type ReactNode } from "react"
import { useConnectors } from "@/hooks/useConnectors"
import type { WalletConnectionProvider } from "@/types";
import type { Wallet } from "@layerswap/utils";
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
import { WalletUiProvider, uiKitThemeStyle, type UiKitTheme } from "./internal/WalletUiContext"

export type ConnectorsListProps = {
    providers: WalletConnectionProvider[]
    onFinish: (result: Wallet | undefined) => void
    theme?: UiKitTheme | null
    brandMark?: ReactNode
}

export const ConnectorsList: FC<ConnectorsListProps> = ({
    providers,
    onFinish,
    theme,
    brandMark,
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
    } = useWalletConnection({
        featuredProviders,
        onFinish,
    })

    const isListVisible = !selectedConnector && !selectedMultiChainConnector
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

    const {
        registryError,
        retryRegistry,
        showSourcesLoadingTail,
    } = useConnectorSourcesStatus(featuredProviders)

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
                onConnect={connector => {
                    void connect(connector, provider)
                }}
            />
        ) : null
    } else if (
        selectedConnector?.qr?.state
        && (
            !selectedConnector.hasBrowserExtension
            || selectedConnector.showQrCode
        )
    ) {
        content = <WalletQrCode selectedConnector={selectedConnector} />
    } else if (selectedConnector) {
        const provider = featuredProviders.find(
            item => item.name === selectedConnector.providerName
        )
        content = (
            <LoadingConnect
                onRetry={() => {
                    if (provider) void connect(selectedConnector, provider)
                }}
                selectedConnector={selectedConnector}
                connectionError={connectionError}
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
            />
        )
    } else {
        content = (
            <ConnectorsBrowser
                anyProviderHasMore={anyProviderHasMore}
                anyProviderLoadingMore={anyProviderLoadingMore}
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

    return (
        <WalletUiProvider brandMark={brandMark} rootRef={rootRef} theme={theme}>
            <div ref={rootRef} data-ui-kit="" style={uiKitThemeStyle(theme)}>
                {content}
            </div>
        </WalletUiProvider>
    )
}
