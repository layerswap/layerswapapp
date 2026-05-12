import { FC, useCallback, useEffect, useRef, useState } from "react";
import useWallet from "../../hooks/useWallet";
import { useConnectModal, WalletModalConnector } from ".";
import { InternalConnector, Wallet, WalletProvider } from "../../Models/WalletProvider";
import clsx from "clsx";
import Connector from "./Connector";
import { usePersistedState } from "../../hooks/usePersistedState";
import { useConnectors } from "../../hooks/useConnectors";
import { SearchComponent } from "../Input/Search";
import CircularLoader from "../icons/CircularLoader";
import { MultichainConnectorPicker } from "./MultichainConnectorPicker";
import { ProviderPicker } from "./ProviderPicker";
import { InstalledExtensionNotFound } from "./InstalledExtensionNotFound";
import { WalletQrCode } from "./WalletQrCode";
import { LoadingConnect } from "./LoadingConnect";
import { isMobile } from "@/lib/wallets/connectors/utils/isMobile";

type ProviderPaginationState = {
    loaded: boolean;
    nextPage: number | null;
    totalCount: number;
    pageSize: number;
    isLoading: boolean;
}

type RequestCapableWalletProvider = WalletProvider & {
    requestAdditionalConnectors: NonNullable<WalletProvider["requestAdditionalConnectors"]>;
}

const DEFAULT_BROWSE_PAGE_SIZE = 40
const SEARCH_PAGE_SIZE = 100

const upsertPaginationState = (
    previous: Record<string, ProviderPaginationState>,
    providerNames: string[],
    pageSize: number
) => {
    const next = { ...previous }

    for (const providerName of providerNames) {
        next[providerName] = {
            loaded: previous[providerName]?.loaded ?? false,
            nextPage: previous[providerName]?.nextPage ?? null,
            totalCount: previous[providerName]?.totalCount ?? 0,
            pageSize: previous[providerName]?.pageSize ?? pageSize,
            isLoading: true,
        }
    }

    return next
}

const withProviderName = (providerName: string, connectors: InternalConnector[]) => {
    return connectors.map(connector => ({ ...connector, providerName }))
}

const clearSearchResultsIfNeeded = (previous: InternalConnector[]) => {
    return previous.length === 0 ? previous : []
}

const clearPaginationIfNeeded = (previous: Record<string, ProviderPaginationState>) => {
    return Object.keys(previous).length === 0 ? previous : {}
}

const canRequestAdditionalConnectors = (provider: WalletProvider): provider is RequestCapableWalletProvider => {
    return typeof provider.requestAdditionalConnectors === "function"
}

const ConnectorsList: FC<{ onFinish: (result: Wallet | undefined) => void }> = ({ onFinish }) => {
    const { providers } = useWallet();
    const { setSelectedConnector, selectedProvider, setSelectedProvider, selectedConnector, selectedMultiChainConnector, setSelectedMultiChainConnector } = useConnectModal()
    let [recentConnectors, setRecentConnectors] = usePersistedState<({ providerName?: string, connectorName?: string }[])>([], 'recentConnectors', 'localStorage');
    const [connectionError, setConnectionError] = useState<string | undefined>(undefined);
    const [searchValue, setSearchValue] = useState<string | undefined>(undefined)
    const [isScrolling, setIsScrolling] = useState(false);
    const [searchResults, setSearchResults] = useState<InternalConnector[]>([]);
    const [browsePaginationByProvider, setBrowsePaginationByProvider] = useState<Record<string, ProviderPaginationState>>({});
    const [searchPaginationByProvider, setSearchPaginationByProvider] = useState<Record<string, ProviderPaginationState>>({});
    const scrollTimeout = useRef<any>(null);
    const searchDebounceRef = useRef<any>(null);
    const searchRequestSequenceRef = useRef(0);
    const isMobilePlatfrom = isMobile();
    const loadMoreTriggerRef = useRef<HTMLDivElement>(null);

    const filteredProviders = providers.filter(p => !p.hideFromList)
    const [selectedProviderNames, setSelectedProviderNames] = useState<string[]>([])

    const resolvedSelectedProvider = selectedProvider && !selectedProvider.isSelectedFromFilter
        ? filteredProviders.find(p => p.name === selectedProvider.name) || selectedProvider
        : selectedProvider;
    const featuredProviders = selectedProviderNames.length > 0 ? filteredProviders.filter(p => selectedProviderNames.includes(p.name)) : (resolvedSelectedProvider ? [resolvedSelectedProvider] : filteredProviders)
    const requestCapableFeaturedProviderNamesKey = featuredProviders
        .filter(canRequestAdditionalConnectors)
        .map(provider => provider.name)
        .join("|")

    const featuredProvidersRef = useRef(featuredProviders)
    const browsePaginationRef = useRef(browsePaginationByProvider)
    const searchPaginationRef = useRef(searchPaginationByProvider)
    const currentSearchValue = searchValue?.trim() ?? ""
    const currentSearchValueRef = useRef(currentSearchValue)
    const isSearching = currentSearchValue.length >= 2

    const isSearchingRef = useRef(isSearching)
    featuredProvidersRef.current = featuredProviders
    browsePaginationRef.current = browsePaginationByProvider
    searchPaginationRef.current = searchPaginationByProvider
    currentSearchValueRef.current = currentSearchValue
    isSearchingRef.current = isSearching

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

    const connect = async (connector: WalletModalConnector, provider: WalletProvider) => {
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
                setSelectedConnector(undefined)
            } else {
                setConnectionError("Connection didn't complete. Please try again.")
            }
        } catch (e) {
            console.log(e)
            const message = (e?.message || e?.details || '').toLowerCase()
            if (e?.name === 'WalletWindowClosedError' || message.includes('rejected') || message.includes('denied')) {
                setConnectionError("You've declined the wallet connection request")
            } else {
                setConnectionError(e.message || e.details || 'Something went wrong')
            }
        }
    }

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

    useEffect(() => {
        if (isSearching) return

        let cancelled = false
        const providersToLoad = featuredProvidersRef.current.filter(provider =>
            provider.requestAdditionalConnectors
            && !browsePaginationRef.current[provider.name]?.loaded
            && !browsePaginationRef.current[provider.name]?.isLoading
        )

        if (providersToLoad.length === 0) return

        setBrowsePaginationByProvider(previous => upsertPaginationState(previous, providersToLoad.map(provider => provider.name), DEFAULT_BROWSE_PAGE_SIZE))

        Promise.all(providersToLoad.map(async (provider) => {
            try {
                const result = await provider.requestAdditionalConnectors?.({ page: 1, pageSize: DEFAULT_BROWSE_PAGE_SIZE })
                return { providerName: provider.name, result }
            } catch {
                return { providerName: provider.name, result: undefined }
            }
        })).then(results => {
            if (cancelled) return

            setBrowsePaginationByProvider(previous => {
                const next = { ...previous }

                for (const { providerName, result } of results) {
                    next[providerName] = {
                        loaded: true,
                        nextPage: result?.nextPage ?? null,
                        totalCount: result?.totalCount ?? 0,
                        pageSize: previous[providerName]?.pageSize ?? DEFAULT_BROWSE_PAGE_SIZE,
                        isLoading: false,
                    }
                }

                return next
            })
        })

        return () => {
            cancelled = true
        }
    }, [isSearching, requestCapableFeaturedProviderNamesKey])

    useEffect(() => {
        if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)

        if (!isSearching) {
            searchRequestSequenceRef.current += 1
            setSearchResults(clearSearchResultsIfNeeded)
            setSearchPaginationByProvider(clearPaginationIfNeeded)
            return
        }

        const requestId = searchRequestSequenceRef.current + 1
        searchRequestSequenceRef.current = requestId
        const searchableProviders = featuredProvidersRef.current.filter(canRequestAdditionalConnectors)

        if (searchableProviders.length === 0) {
            setSearchResults(clearSearchResultsIfNeeded)
            setSearchPaginationByProvider(clearPaginationIfNeeded)
            return
        }

        setSearchPaginationByProvider(previous => upsertPaginationState(previous, searchableProviders.map(provider => provider.name), SEARCH_PAGE_SIZE))

        searchDebounceRef.current = setTimeout(async () => {
            const query = currentSearchValueRef.current
            const results = await Promise.all(searchableProviders.map(async (provider) => {
                try {
                    const result = await provider.requestAdditionalConnectors({ page: 1, pageSize: SEARCH_PAGE_SIZE, query })
                    return { providerName: provider.name, result }
                } catch {
                    return { providerName: provider.name, result: undefined }
                }
            }))

            if (requestId !== searchRequestSequenceRef.current || query !== currentSearchValueRef.current) {
                return
            }

            setSearchResults(results.flatMap(({ providerName, result }) => withProviderName(providerName, result?.connectors ?? [])))
            setSearchPaginationByProvider(previous => {
                const next = { ...previous }

                for (const { providerName, result } of results) {
                    next[providerName] = {
                        loaded: true,
                        nextPage: result?.nextPage ?? null,
                        totalCount: result?.totalCount ?? 0,
                        pageSize: SEARCH_PAGE_SIZE,
                        isLoading: false,
                    }
                }

                return next
            })
        }, 300)

        return () => {
            if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
        }
    }, [currentSearchValue, isSearching, requestCapableFeaturedProviderNamesKey])

    const {
        featuredConnectors,
        additionalConnectors,
        initialConnectors,
    } = useConnectors({
        featuredProviders,
        filteredProviders,
        searchValue,
        recentConnectors,
        searchResults: isSearching ? searchResults : [],
    });

    const activePaginationByProvider = isSearching ? searchPaginationByProvider : browsePaginationByProvider
    const anyProviderHasMore = featuredProviders.some(provider => activePaginationByProvider[provider.name]?.nextPage != null)
    const anyProviderLoadingMore = featuredProviders.some(provider => activePaginationByProvider[provider.name]?.isLoading)

    const loadMoreInFlightRef = useRef(false)

    const loadMore = useCallback(async () => {
        if (loadMoreInFlightRef.current) return
        loadMoreInFlightRef.current = true
        try {
            if (isSearchingRef.current) {
                const query = currentSearchValueRef.current
                const requestId = searchRequestSequenceRef.current
                const providersToLoad = featuredProvidersRef.current.filter(provider => {
                    const state = searchPaginationRef.current[provider.name]
                    return provider.requestAdditionalConnectors && state?.nextPage != null && !state.isLoading
                })

                if (providersToLoad.length === 0) return

                setSearchPaginationByProvider(previous => upsertPaginationState(previous, providersToLoad.map(provider => provider.name), SEARCH_PAGE_SIZE))

                const results = await Promise.all(providersToLoad.map(async (provider) => {
                    const state = searchPaginationRef.current[provider.name]
                    try {
                        const result = await provider.requestAdditionalConnectors?.({
                            page: state?.nextPage ?? 1,
                            pageSize: state?.pageSize ?? SEARCH_PAGE_SIZE,
                            query,
                        })
                        return { providerName: provider.name, result }
                    } catch {
                        return { providerName: provider.name, result: undefined }
                    }
                }))

                if (requestId !== searchRequestSequenceRef.current || query !== currentSearchValueRef.current) {
                    return
                }

                setSearchResults(previous => [
                    ...previous,
                    ...results.flatMap(({ providerName, result }) => withProviderName(providerName, result?.connectors ?? []))
                ])
                setSearchPaginationByProvider(previous => {
                    const next = { ...previous }

                    for (const { providerName, result } of results) {
                        next[providerName] = {
                            loaded: true,
                            nextPage: result?.nextPage ?? null,
                            totalCount: result?.totalCount ?? previous[providerName]?.totalCount ?? 0,
                            pageSize: previous[providerName]?.pageSize ?? SEARCH_PAGE_SIZE,
                            isLoading: false,
                        }
                    }

                    return next
                })

                return
            }

            const providersToLoad = featuredProvidersRef.current.filter(provider => {
                const state = browsePaginationRef.current[provider.name]
                return provider.requestAdditionalConnectors && state?.nextPage != null && !state.isLoading
            })

            if (providersToLoad.length === 0) return

            setBrowsePaginationByProvider(previous => upsertPaginationState(previous, providersToLoad.map(provider => provider.name), DEFAULT_BROWSE_PAGE_SIZE))

            const results = await Promise.all(providersToLoad.map(async (provider) => {
                const state = browsePaginationRef.current[provider.name]
                try {
                    const result = await provider.requestAdditionalConnectors?.({
                        page: state?.nextPage ?? 1,
                        pageSize: state?.pageSize ?? DEFAULT_BROWSE_PAGE_SIZE,
                    })
                    return { providerName: provider.name, result }
                } catch {
                    return { providerName: provider.name, result: undefined }
                }
            }))

            setBrowsePaginationByProvider(previous => {
                const next = { ...previous }

                for (const { providerName, result } of results) {
                    next[providerName] = {
                        loaded: true,
                        nextPage: result?.nextPage ?? null,
                        totalCount: result?.totalCount ?? previous[providerName]?.totalCount ?? 0,
                        pageSize: previous[providerName]?.pageSize ?? DEFAULT_BROWSE_PAGE_SIZE,
                        isLoading: false,
                    }
                }

                return next
            })
        } finally {
            loadMoreInFlightRef.current = false
        }
    }, [])

    useEffect(() => {
        if (!loadMoreTriggerRef.current) return;
        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && anyProviderHasMore && !anyProviderLoadingMore) {
                void loadMore()
            }
        }, { threshold: 0.1, rootMargin: '100px' });
        observer.observe(loadMoreTriggerRef.current);
        return () => observer.disconnect();
    }, [anyProviderHasMore, anyProviderLoadingMore, loadMore, selectedConnector, selectedMultiChainConnector]);

    if (selectedConnector?.extensionNotFound && !selectedConnector?.showQrCode && !isMobilePlatfrom) {
        const provider = featuredProviders.find(p => p.name === selectedConnector?.providerName)
        if (!provider) return null
        return <InstalledExtensionNotFound selectedConnector={selectedConnector} onConnect={(connector) => { connect(connector, provider) }} />
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
            allConnectors={[...featuredConnectors, ...additionalConnectors] as InternalConnector[]}
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
                        placeholder="Search through 500+ wallets..."
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
                    className={clsx('overflow-y-scroll max-sm:h-[calc(100svh-160px)] -mr-4 pr-2 scrollbar:w-1.5! scrollbar:h-1.5! overflow-x-hidden scrollbar-thumb:bg-transparent', {
                        'styled-scroll': isScrolling
                    })}
                >
                    <div className='grid grid-cols-2 gap-2'>
                        {
                            initialConnectors.map(item => {
                                const provider = featuredProviders.find(p => p.name === item.providerName)
                                const isRecent = recentConnectors?.some(v => v.connectorName === item.name)
                                return (
                                    <Connector
                                        key={item.id}
                                        connector={item}
                                        onClick={() => provider && connect(item, provider)}
                                        connectingConnector={selectedConnector}
                                        isRecent={isRecent}
                                        isProviderReady={provider?.ready}
                                    />
                                )
                            })
                        }
                    </div>
                    {(anyProviderHasMore || anyProviderLoadingMore) && (
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
