import { FC, useCallback, useEffect, useMemo, useRef, useState } from "react";
import useWallet from "@/hooks/useWallet";
import { useConnectModal, WalletModalConnector } from ".";
import { InternalConnector, Wallet, WalletConnectionProvider } from "@/types/wallet";
import clsx from "clsx";
import useWindowDimensions from "@/hooks/useWindowDimensions";
import Connector from "./Connector";
import { usePersistedState } from "@/hooks/usePersistedState";
import { SearchComponent } from "@/components/Input/Search";
import { isMobile } from "@/lib/wallets/utils/isMobile";
import AppSettings from "@/lib/AppSettings";
import { MultichainConnectorPicker } from "./MultichainConnectorPicker";
import { ProviderPicker } from "./ProviderPicker";
import { InstalledExtensionNotFound } from "./InstalledExtensionNotFound";
import { WalletQrCode } from "./WalletQrCode";
import { LoadingConnect } from "./LoadingConnect";
import CircularLoader from "@/components/Icons/CircularLoader";
import { useConnectors } from "@/hooks/useConnectors";

const LAZY_LOAD_CONFIG = {
    itemsPerLoad: 20,
    enabled: true
};


const ConnectorsList: FC<{ onFinish: (result: Wallet | undefined) => void }> = ({ onFinish }) => {
    const { providers } = useWallet();
    const { setSelectedConnector, selectedProvider, setSelectedProvider, selectedConnector, selectedMultiChainConnector, setSelectedMultiChainConnector } = useConnectModal()
    let [recentConnectors, setRecentConnectors] = usePersistedState<({ providerName?: string, connectorName?: string }[])>([], 'recentConnectors', 'localStorage');
    const [connectionError, setConnectionError] = useState<string | undefined>(undefined);
    const [searchValue, setSearchValue] = useState<string | undefined>(undefined)
    const [isScrolling, setIsScrolling] = useState(false);
    const scrollTimeout = useRef<any>(null);
    const isMobilePlatfrom = isMobile();
    const { isMobile: isMobileSize } = useWindowDimensions()

    const [displayedCount, setDisplayedCount] = useState(LAZY_LOAD_CONFIG.itemsPerLoad);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const loadMoreTriggerRef = useRef<HTMLDivElement>(null);

    const handleScroll = () => {
        setIsScrolling(true);

        if (scrollTimeout.current) clearTimeout(scrollTimeout.current);

        scrollTimeout.current = setTimeout(() => {
            setIsScrolling(false);
        }, 1000);
    };

    useEffect(() => {
        return () => clearTimeout(scrollTimeout.current as any);
    }, []);

    const connect = async (connector: WalletModalConnector, provider: WalletConnectionProvider) => {
        try {
            setConnectionError(undefined)
            if (connector?.isMultiChain) {
                setSelectedMultiChainConnector(connector)
                return;
            }
            setSelectedConnector(connector)
            if (connector?.hasBrowserExtension !== false && connector.extensionNotFound && !connector?.showQrCode && !isMobilePlatfrom) return
            if (!provider.ready) {
                setConnectionError("Wallet provider is still initializing. Please wait a moment and try again.")
                return
            }

            const result = provider?.connectWallet && await provider.connectWallet({ connector })

            if (result && connector && provider) {
                setRecentConnectors((prev) => {
                    const next = [{ providerName: provider.name, connectorName: connector.name }];
                    const counts = new Map<string, number>();
                    counts.set(provider.name, 1);

                    (prev || []).forEach(item => {
                        if (
                            item.providerName &&
                            item.connectorName &&
                            !(item.providerName === provider.name && item.connectorName === connector.name)
                        ) {
                            const count = counts.get(item.providerName) ?? 0;
                            if (count < 3) {
                                next.push({ providerName: item.providerName, connectorName: item.connectorName });
                                counts.set(item.providerName, count + 1);
                            }
                        }
                    });
                    return next;
                })
                onFinish(result)
            }
            setSelectedConnector(undefined)
        } catch (e) {
            console.log(e)
            if (e?.message?.toLowerCase().includes('rejected') || e?.details?.toLowerCase().includes('rejected')) {
                setConnectionError("You've declined the wallet connection request")
            }
            else {
                setConnectionError(e.message || e.details || 'Something went wrong')
            }
        }
    }

    const [selectedProviderNames, setSelectedProviderNames] = useState<string[]>([])
    const isFiltered = selectedProviderNames.length > 0 || !!searchValue;

    const handleSelectProvider = (providerNames: string[]) => {
        setSelectedProviderNames(providerNames)
        if (providerNames.length === 0) {
            setSelectedProvider(undefined)
        } else {
            const provider = filteredProviders.find(p => p.name === providerNames[0])
            if (provider) {
                setSelectedProvider({ ...provider, isSelectedFromFilter: true })
            }
        }
    }

    const filteredProviders = providers.filter(p => !p.hideFromList)
    const featuredProviders = selectedProviderNames.length > 0 ? filteredProviders.filter(p => selectedProviderNames.includes(p.name)) : (selectedProvider ? [selectedProvider] : filteredProviders)

    const {
        featuredConnectors,
        hiddenConnectors,
        initialConnectors,
    } = useConnectors({
        featuredProviders,
        filteredProviders,
        searchValue,
        recentConnectors,
    });

    const displayedConnectors = useMemo(() => {
        if (isFiltered) return initialConnectors.slice(0, displayedCount);
        return initialConnectors.slice(0, Math.max(0, displayedCount - featuredConnectors.length));
    }, [isFiltered, initialConnectors, featuredConnectors, displayedCount]);

    const hasMoreToLoad = displayedCount < initialConnectors.length;

    useEffect(() => setDisplayedCount(isFiltered ? LAZY_LOAD_CONFIG.itemsPerLoad : featuredConnectors.length + LAZY_LOAD_CONFIG.itemsPerLoad), [isFiltered, searchValue, selectedProviderNames, featuredConnectors.length]);

    const loadMore = useCallback(() => {
        if (!hasMoreToLoad || isLoadingMore) return;
        setIsLoadingMore(true);
        setTimeout(() => { setDisplayedCount(prev => prev + LAZY_LOAD_CONFIG.itemsPerLoad); setIsLoadingMore(false); }, 300);
    }, [hasMoreToLoad, isLoadingMore]);

    useEffect(() => {
        if (!loadMoreTriggerRef.current) return;
        const observer = new IntersectionObserver((e) => e[0].isIntersecting && hasMoreToLoad && !isLoadingMore && loadMore(), { threshold: 0.1, rootMargin: '100px' });
        observer.observe(loadMoreTriggerRef.current);
        return () => observer.disconnect();
    }, [hasMoreToLoad, isLoadingMore, loadMore, selectedConnector, selectedMultiChainConnector]);

    if (selectedConnector?.hasBrowserExtension !== false && selectedConnector?.extensionNotFound && !selectedConnector?.showQrCode && !isMobilePlatfrom) {
        const provider = featuredProviders.find(p => p.name === selectedConnector?.providerName)
        return <InstalledExtensionNotFound selectedConnector={selectedConnector} onConnect={(connector) => { connect(connector, provider!) }} />
    }
    if (selectedConnector?.qr?.state && (!selectedConnector?.hasBrowserExtension || selectedConnector?.showQrCode)) {
        return <WalletQrCode selectedConnector={selectedConnector} />
    }

    if (selectedConnector) {
        const provider = featuredProviders.find(p => p.name === selectedConnector?.providerName)
        return <LoadingConnect
            onRetry={() => { (selectedConnector && provider) && connect(selectedConnector, provider) }}
            selectedConnector={selectedConnector}
            connectionError={connectionError}
        />
    }

    if (selectedMultiChainConnector) {
        return <MultichainConnectorPicker
            selectedConnector={selectedMultiChainConnector}
            allConnectors={[...featuredConnectors, ...hiddenConnectors] as InternalConnector[]}
            providers={featuredProviders}
            connect={connect}
        />
    }

    return (
        <>
            <div className="text-primary-text space-y-3 flex flex-col w-full styled-scroll relative h-full">
                <div className="flex items-center gap-3 pt-1">
                    <SearchComponent
                        searchQuery={searchValue || ""}
                        setSearchQuery={setSearchValue}
                        placeholder={hiddenConnectors.length > 300 ? "Search through 400+ wallets..." : "Search wallet"}
                        containerClassName="w-full mb-0!"
                    />
                    {
                        (!selectedProvider || selectedProvider?.isSelectedFromFilter) &&
                        <ProviderPicker
                            providers={filteredProviders}
                            selectedProviderNames={selectedProviderNames}
                            setSelectedProviderNames={handleSelectProvider}
                        />
                    }
                </div>
                <div
                    onScroll={handleScroll}
                    className={clsx('overflow-y-scroll -mr-4 pr-2 scrollbar:!w-1.5 scrollbar:!h-1.5 overflow-x-hidden scrollbar-thumb:bg-transparent', {
                        'max-sm:h-[55svh]': isMobileSize && AppSettings.ThemeData?.enablePortal,
                        'styled-scroll': isScrolling
                    })}
                >
                    <div className='grid grid-cols-2 gap-2'>
                        {
                            displayedConnectors.map(item => {
                                const provider = featuredProviders.find(p => p.name === item.providerName)
                                const isRecent = recentConnectors?.some(v => v.connectorName === item.name)
                                return (
                                    <Connector
                                        key={item.id}
                                        connector={item}
                                        onClick={() => connect(item, provider!)}
                                        connectingConnector={selectedConnector}
                                        isRecent={isRecent}
                                        isProviderReady={typeof provider?.ready === 'boolean' ? provider.ready : true}
                                    />
                                )
                            })
                        }
                    </div>
                    {hasMoreToLoad && (
                        <div ref={loadMoreTriggerRef} className="col-span-2 flex justify-center items-center pt-2.5">
                            <CircularLoader className="w-8 h-8 animate-spin" />
                        </div>
                    )}
                </div>
            </div>
        </>
    )
}


export default ConnectorsList