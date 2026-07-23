import type { FC } from "react";
import useWallet from "@/hooks/useWallet";
import { useConnectors } from "@/hooks/useConnectors";
import { useWalletProvidersSettled } from "@/context/walletProviders";
import type { Wallet } from "@/types/wallet";
import { isMobile } from "@/lib/wallets/utils/isMobile";
import { ConnectorsGrid } from "./ConnectorsGrid";
import { InstalledExtensionNotFound } from "./InstalledExtensionNotFound";
import { LoadingConnect } from "./LoadingConnect";
import { MultichainConnectorPicker } from "./MultichainConnectorPicker";
import { WalletQrCode } from "./WalletQrCode";
import { useConnectorConnection } from "./hooks/useConnectorConnection";
import { useConnectorPagination } from "./hooks/useConnectorPagination";
import { useConnectorProviders } from "./hooks/useConnectorProviders";
import { useProviderLoadingGate } from "./hooks/useProviderLoadingGate";
import { useRecentConnectors } from "./hooks/useRecentConnectors";

const ConnectorsList: FC<{
    onFinish: (result: Wallet | undefined) => void;
}> = ({ onFinish }) => {
    const { providers } = useWallet();
    const providersSettled = useWalletProvidersSettled();
    const showProvidersLoading = useProviderLoadingGate(providersSettled);
    const isMobilePlatform = isMobile();

    const {
        featuredProviders,
        filteredProviders,
        selectedProvider,
        selectedProviderNames,
        selectProviders,
    } = useConnectorProviders(providers);

    const {
        hasMore,
        isLoadingMore,
        loadMore,
        searchResults,
        searchValue,
        setSearchValue,
    } = useConnectorPagination(featuredProviders);

    const { recentConnectors, rememberConnector } = useRecentConnectors();
    const { initialConnectors } = useConnectors({
        featuredProviders,
        filteredProviders,
        searchValue,
        recentConnectors,
        searchResults,
    });

    const {
        connect,
        connectionError,
        currentMultiChainConnector,
        selectedConnector,
    } = useConnectorConnection({
        featuredProviders,
        initialConnectors,
        onFinish,
        rememberConnector,
    });

    if (showProvidersLoading) {
        return (
            <div className="flex h-full min-h-80 w-full items-center justify-center py-10">
                <div className="loader text-[3px]!" />
            </div>
        );
    }

    if (
        selectedConnector?.extensionNotFound &&
        !selectedConnector.showQrCode &&
        !isMobilePlatform
    ) {
        const provider = featuredProviders.find(
            (candidate) => candidate.name === selectedConnector.providerName,
        );
        if (!provider) return null;
        return (
            <InstalledExtensionNotFound
                selectedConnector={selectedConnector}
                onConnect={(connector) => {
                    void connect(connector, provider);
                }}
            />
        );
    }

    if (
        selectedConnector?.qr?.state &&
        (!selectedConnector.hasBrowserExtension || selectedConnector.showQrCode)
    ) {
        return <WalletQrCode selectedConnector={selectedConnector} />;
    }

    if (selectedConnector) {
        const provider = featuredProviders.find(
            (candidate) => candidate.name === selectedConnector.providerName,
        );
        return (
            <LoadingConnect
                onRetry={() => {
                    if (provider) void connect(selectedConnector, provider);
                }}
                selectedConnector={selectedConnector}
                connectionError={connectionError}
            />
        );
    }

    if (currentMultiChainConnector) {
        return (
            <MultichainConnectorPicker
                selectedConnector={currentMultiChainConnector}
                providers={featuredProviders}
                connect={connect}
            />
        );
    }

    return (
        <ConnectorsGrid
            connectors={initialConnectors}
            featuredProviders={featuredProviders}
            filteredProviders={filteredProviders}
            hasMore={hasMore}
            isLoadingMore={isLoadingMore}
            loadMore={loadMore}
            onConnect={(connector, provider) => {
                void connect(connector, provider);
            }}
            onSelectProviders={selectProviders}
            searchValue={searchValue}
            selectedConnector={selectedConnector}
            selectedProvider={selectedProvider}
            selectedProviderNames={selectedProviderNames}
            setSearchValue={setSearchValue}
        />
    );
};

export default ConnectorsList;
