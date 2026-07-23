import { useCallback, useEffect, useRef, useState } from "react";
import clsx from "clsx";
import type {
    WalletConnectionProvider,
    WalletModalConnector,
} from "@/types/wallet";
import AppSettings from "@/lib/AppSettings";
import useWindowDimensions from "@/hooks/useWindowDimensions";
import { isProviderConnectReady } from "@/hooks/useProvidersConnectReady";
import { SearchComponent } from "@/components/Input/Search";
import CircularLoader from "@/components/Icons/CircularLoader";
import Connector from "./Connector";
import { ProviderPicker } from "./ProviderPicker";
import type { ModalWalletProvider } from ".";

type ConnectorsGridProps = {
    connectors: WalletModalConnector[];
    featuredProviders: WalletConnectionProvider[];
    filteredProviders: WalletConnectionProvider[];
    hasMore: boolean;
    isLoadingMore: boolean;
    loadMore: () => Promise<void>;
    onConnect: (
        connector: WalletModalConnector,
        provider: WalletConnectionProvider,
    ) => void;
    onSelectProviders: (providerNames: string[]) => void;
    searchValue: string | undefined;
    selectedConnector: WalletModalConnector | undefined;
    selectedProvider: ModalWalletProvider | undefined;
    selectedProviderNames: string[];
    setSearchValue: (value: string) => void;
};

function useScrollActivity() {
    const [isScrolling, setIsScrolling] = useState(false);
    const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleScroll = useCallback(() => {
        setIsScrolling(true);
        if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = setTimeout(
            () => setIsScrolling(false),
            1000,
        );
    }, []);

    useEffect(
        () => () => {
            if (scrollTimeoutRef.current)
                clearTimeout(scrollTimeoutRef.current);
        },
        [],
    );

    return { handleScroll, isScrolling };
}

function useLoadMoreTrigger(
    hasMore: boolean,
    isLoadingMore: boolean,
    loadMore: () => Promise<void>,
) {
    const triggerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const trigger = triggerRef.current;
        if (!trigger) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
                    void loadMore();
                }
            },
            { threshold: 0.1, rootMargin: "100px" },
        );

        observer.observe(trigger);
        return () => observer.disconnect();
    }, [hasMore, isLoadingMore, loadMore]);

    return triggerRef;
}

export function ConnectorsGrid({
    connectors,
    featuredProviders,
    filteredProviders,
    hasMore,
    isLoadingMore,
    loadMore,
    onConnect,
    onSelectProviders,
    searchValue,
    selectedConnector,
    selectedProvider,
    selectedProviderNames,
    setSearchValue,
}: ConnectorsGridProps) {
    const { isMobile } = useWindowDimensions();
    const { handleScroll, isScrolling } = useScrollActivity();
    const loadMoreTriggerRef = useLoadMoreTrigger(
        hasMore,
        isLoadingMore,
        loadMore,
    );

    return (
        <div className="text-primary-text space-y-3 flex flex-col w-full styled-scroll relative h-full">
            <div className="flex items-center gap-3 pt-1">
                <SearchComponent
                    searchQuery={searchValue || ""}
                    setSearchQuery={setSearchValue}
                    placeholder="Search through 500+ wallets..."
                    containerClassName="w-full mb-0!"
                />
                {(!selectedProvider ||
                    selectedProvider.isSelectedFromFilter) && (
                    <ProviderPicker
                        providers={filteredProviders}
                        selectedProviderNames={selectedProviderNames}
                        setSelectedProviderNames={onSelectProviders}
                    />
                )}
            </div>
            <div
                onScroll={handleScroll}
                className={clsx(
                    "overflow-y-scroll -mr-4 pr-2 scrollbar:!w-1.5 scrollbar:!h-1.5 overflow-x-hidden scrollbar-thumb:bg-transparent",
                    {
                        "h-[calc(100svh-160px)]":
                            isMobile && AppSettings.ThemeData?.enablePortal,
                        "styled-scroll": isScrolling,
                    },
                )}
            >
                <div className="grid grid-cols-2 gap-2">
                    {connectors.map((connector) => {
                        const provider = featuredProviders.find(
                            (candidate) =>
                                candidate.name === connector.providerName,
                        );
                        return (
                            <Connector
                                key={connector.id}
                                connector={connector}
                                onClick={() =>
                                    provider && onConnect(connector, provider)
                                }
                                connectingConnector={selectedConnector}
                                isRecent={connector.isRecent}
                                isProviderReady={isProviderConnectReady(
                                    provider,
                                )}
                            />
                        );
                    })}
                </div>
                {(hasMore || isLoadingMore) && (
                    <div
                        ref={loadMoreTriggerRef}
                        className="col-span-2 flex justify-center items-center pt-2.5"
                    >
                        <CircularLoader className="w-8 h-8 animate-spin" />
                    </div>
                )}
            </div>
        </div>
    );
}
