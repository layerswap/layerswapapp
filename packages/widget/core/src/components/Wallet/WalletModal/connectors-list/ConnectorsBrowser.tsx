import { useMemo } from "react";
import type {
    Dispatch,
    RefObject,
    SetStateAction,
} from "react";
import clsx from "clsx";
import CircularLoader from "@/components/Icons/CircularLoader";
import { SearchComponent } from "@/components/Input/Search";
import useWindowDimensions from "@/hooks/useWindowDimensions";
import { isProviderConnectReady } from "@/hooks/useProvidersConnectReady";
import AppSettings from "@/lib/AppSettings";
import type {
    WalletConnectionProvider,
    WalletModalConnector,
} from "@/types/wallet";
import Connector from "../Connector";
import { ProviderPicker } from "../ProviderPicker";
import { useScrollActivity } from "./useScrollActivity";

type ConnectorsBrowserProps = {
    anyProviderHasMore: boolean;
    anyProviderLoadingMore: boolean;
    connect: (
        connector: WalletModalConnector,
        provider: WalletConnectionProvider
    ) => Promise<void>;
    connectors: WalletModalConnector[];
    featuredProviders: WalletConnectionProvider[];
    filteredProviders: WalletConnectionProvider[];
    loadMoreTriggerRef: RefObject<HTMLDivElement | null>;
    registryError: boolean;
    retryRegistry: () => void;
    searchValue: string | undefined;
    selectProviders: (providerNames: string[]) => void;
    selectedProviderNames: string[];
    setSearchValue: Dispatch<SetStateAction<string | undefined>>;
    showProviderPicker: boolean;
    showSourcesLoadingTail: boolean;
}

export function ConnectorsBrowser({
    anyProviderHasMore,
    anyProviderLoadingMore,
    connect,
    connectors,
    featuredProviders,
    filteredProviders,
    loadMoreTriggerRef,
    registryError,
    retryRegistry,
    searchValue,
    selectProviders,
    selectedProviderNames,
    setSearchValue,
    showProviderPicker,
    showSourcesLoadingTail,
}: ConnectorsBrowserProps) {
    const { isMobile } = useWindowDimensions()
    const { isScrolling, handleScroll } = useScrollActivity()
    const providerByName = useMemo(
        () => new Map(featuredProviders.map(provider => [provider.name, provider])),
        [featuredProviders]
    )
    const showLoadingTail = (
        anyProviderHasMore
        || anyProviderLoadingMore
        || showSourcesLoadingTail
    )

    return (
        <div className="text-primary-text space-y-3 flex flex-col w-full styled-scroll relative h-full">
            <div className="flex items-center gap-3 pt-1">
                <SearchComponent
                    searchQuery={searchValue || ""}
                    setSearchQuery={setSearchValue}
                    placeholder="Search through 500+ wallets..."
                    containerClassName="w-full mb-0!"
                />
                {showProviderPicker && (
                    <ProviderPicker
                        providers={filteredProviders}
                        selectedProviderNames={selectedProviderNames}
                        setSelectedProviderNames={selectProviders}
                    />
                )}
            </div>
            <div
                onScroll={handleScroll}
                className={clsx(
                    "overflow-y-scroll -mr-4 pr-2 scrollbar:!w-1.5 scrollbar:!h-1.5 overflow-x-hidden scrollbar-thumb:bg-transparent",
                    {
                        "h-[calc(100svh-160px)]": isMobile && AppSettings.ThemeData?.enablePortal,
                        "styled-scroll": isScrolling,
                    }
                )}
            >
                <div className="grid grid-cols-2 gap-2">
                    {connectors.map(connector => {
                        const provider = providerByName.get(connector.providerName)
                        return (
                            <Connector
                                key={connector.id}
                                connector={connector}
                                onClick={() => {
                                    if (provider) void connect(connector, provider)
                                }}
                                isRecent={connector.isRecent}
                                isProviderReady={isProviderConnectReady(provider)}
                            />
                        )
                    })}
                </div>
                {showLoadingTail && (
                    <div
                        ref={loadMoreTriggerRef}
                        className="col-span-2 flex justify-center items-center pt-2.5"
                    >
                        <CircularLoader className="w-8 h-8 animate-spin" />
                    </div>
                )}
                {registryError && !showSourcesLoadingTail && (
                    <div className="col-span-2 flex justify-center items-center gap-1.5 pt-2.5 pb-1">
                        <p className="text-sm text-secondary-text">
                            Some wallets couldn&apos;t be loaded.
                        </p>
                        <button
                            type="button"
                            onClick={retryRegistry}
                            className="text-sm text-primary-text underline hover:no-underline"
                        >
                            Retry
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
