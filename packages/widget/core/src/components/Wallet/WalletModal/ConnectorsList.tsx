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
import { connectorKey, useConnectors } from "@/hooks/useConnectors";
import { areWalletProvidersSettled, useWalletProvidersRegistry, useWalletProvidersSettled } from "@/context/walletProviders";
import { useWalletDescriptorLoader } from "@/lib/walletConnect/walletDescriptorLoader";
import { isProviderConnectReady } from "@/hooks/useProvidersConnectReady";

type ProviderPaginationState = {
    loaded: boolean;
    nextPage: number | null;
    totalCount: number;
    pageSize: number;
    isLoading: boolean;
}

type RequestCapableWalletProvider = WalletConnectionProvider & {
    requestAdditionalConnectors: NonNullable<WalletConnectionProvider["requestAdditionalConnectors"]>;
}

const DEFAULT_BROWSE_PAGE_SIZE = 40
const SEARCH_PAGE_SIZE = 100
const PROVIDER_SETTLE_TIMEOUT_MS = 5000

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

const canRequestAdditionalConnectors = (provider: WalletConnectionProvider): provider is RequestCapableWalletProvider => {
    return typeof provider.requestAdditionalConnectors === "function"
}


const ConnectorsList: FC<{ onFinish: (result: Wallet | undefined) => void }> = ({ onFinish }) => {
    const { providers } = useWallet();
    const registry = useWalletProvidersRegistry()
    const providersSettled = useWalletProvidersSettled()
    const { loadAll, loadById } = useWalletDescriptorLoader()
    const { setSelectedConnector, selectedProvider, setSelectedProvider, selectedConnector, selectedMultiChainConnector, setSelectedMultiChainConnector } = useConnectModal()
    let [recentConnectors, setRecentConnectors] = usePersistedState<({ providerName?: string, connectorName?: string }[])>([], 'recentConnectors', 'localStorage');
    const [connectionError, setConnectionError] = useState<string | undefined>(undefined);
    const [settleTimedOut, setSettleTimedOut] = useState(false);
    const [searchValue, setSearchValue] = useState<string | undefined>(undefined)
    const [isScrolling, setIsScrolling] = useState(false);
    const [searchResults, setSearchResults] = useState<InternalConnector[]>([]);
    const [browsePaginationByProvider, setBrowsePaginationByProvider] = useState<Record<string, ProviderPaginationState>>({});
    const [searchPaginationByProvider, setSearchPaginationByProvider] = useState<Record<string, ProviderPaginationState>>({});
    const scrollTimeout = useRef<any>(null);
    const searchDebounceRef = useRef<any>(null);
    const searchRequestSequenceRef = useRef(0);
    const initialConnectorsRef = useRef<WalletModalConnector[]>([]);
    const isMobilePlatfrom = isMobile();
    const loadMoreTriggerRef = useRef<HTMLDivElement>(null);
    const { isMobile: isMobileSize } = useWindowDimensions()

    const [selectedProviderNames, setSelectedProviderNames] = useState<string[]>([])

    // These lists feed `useConnectors`' memo deps — keep their identity stable
    // across unrelated local-state renders (search keystrokes, scroll flags,
    // pagination), otherwise the full connector resolve/dedupe/sort pipeline
    // reruns on every render while the modal is open.
    const filteredProviders = useMemo(() => providers.filter(p => !p.hideFromList), [providers])
    // `selectedProvider` is a snapshot frozen at connect() time, so it must be
    // re-resolved against the LIVE provider list — and against `providers`,
    // not `filteredProviders`: scoped connects can target hidden-from-list
    // providers (e.g. Paradex), which `filteredProviders` never contains. When
    // such a modal opened before the provider (or its peers) published their
    // connectors, the frozen snapshot would keep the list empty until the
    // modal was closed and reopened.
    const resolvedSelectedProvider = useMemo(() => (
        selectedProvider && !selectedProvider.isSelectedFromFilter
            ? providers.find(p => p.name === selectedProvider.name) || selectedProvider
            : selectedProvider
    ), [selectedProvider, providers])
    const featuredProviders = useMemo(() => (
        selectedProviderNames.length > 0
            ? filteredProviders.filter(p => selectedProviderNames.includes(p.name))
            : (resolvedSelectedProvider ? [resolvedSelectedProvider] : filteredProviders)
    ), [selectedProviderNames, filteredProviders, resolvedSelectedProvider])
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

    // Reads CURRENT store state (not a render snapshot) to decide how many of
    // the providers in the active modal scope expose this wallet.
    const liveVariantCount = useCallback((name: string) => {
        const key = connectorKey(name)
        const featuredProviderIds = new Set(featuredProvidersRef.current.map(provider => provider.id))
        return registry.getEntries().filter(entry => {
            if (!featuredProviderIds.has(entry.id)) return false
            const state = entry.store.getState()
            return [...(state.availableConnectors ?? []), ...(state.additionalConnectors ?? [])]
                .some(candidate => connectorKey(candidate.name) === key)
        }).length
    }, [registry])

    // Async waiter: resolves once every provider has finished loading (no stubs
    // left, all real providers `ready`), bounded by `timeoutMs` so a never-ready
    // ecosystem can't hang the connect. `loadAll()` only imports lazy descriptor
    // modules; we then wait for the stores to actually publish their connectors.
    const awaitProvidersSettled = useCallback(async (timeoutMs = PROVIDER_SETTLE_TIMEOUT_MS): Promise<boolean> => {
        await loadAll()
        const settled = () => areWalletProvidersSettled(registry)
        if (settled()) return true
        return new Promise<boolean>(resolve => {
            let unsub = () => { }
            const finish = (didSettle: boolean) => { clearTimeout(timer); unsub(); resolve(didSettle) }
            const timer = setTimeout(() => finish(false), timeoutMs)
            unsub = registry.subscribe(() => { if (settled()) finish(true) })
        })
    }, [loadAll, registry])

    // A tile can point at a provider that is still a descriptor stub (e.g. a
    // multichain variant synthesized from registry metadata before its
    // ecosystem chunk loaded). The stub's `connectWallet` is a no-op, so
    // trigger the descriptor load and wait — bounded, so a failed chunk
    // import can't hang the connect flow — for the live store to replace the
    // stub in the registry and report `ready`.
    const awaitLiveProvider = useCallback(async (providerId: string, timeoutMs = PROVIDER_SETTLE_TIMEOUT_MS): Promise<WalletConnectionProvider | undefined> => {
        void loadById(providerId)
        const live = () => {
            const state = registry.getEntries().find(e => e.id === providerId)?.store.getState()
            return state && !state.isStub && state.ready ? state : undefined
        }
        const current = live()
        if (current) return current
        return new Promise(resolve => {
            let unsub = () => { }
            const finish = () => { clearTimeout(timer); unsub(); resolve(live()) }
            const timer = setTimeout(finish, timeoutMs)
            unsub = registry.subscribe(() => { if (live()) finish() })
        })
    }, [loadById, registry])

    const connect = async (connector: WalletModalConnector, provider: WalletConnectionProvider) => {
        try {
            setConnectionError(undefined)
            // When the ecosystem picker calls back, its connector is already a
            // concrete variant. Do not resolve it back to the top-level wallet
            // tile or we would reopen the same picker instead of connecting.
            const isEcosystemSelection = selectedMultiChainConnector !== undefined
            // Multi-ecosystem wallets (e.g. MetaMask: EVM + Solana + Tron) surface
            // their non-EVM connectors only after late-loading providers settle.
            // Wait BEFORE honoring an existing `isMultiChain` flag: two early
            // variants already make that flag true, but more variants may still
            // be loading. Otherwise the early return would freeze an incomplete
            // connector snapshot in the ecosystem picker.
            const providersStillLoading = !areWalletProvidersSettled(registry)
            const shouldWaitForVariants = !isEcosystemSelection
                && providersStillLoading
                && (connector?.type === 'injected' || connector?.isMultiChain)
            let didProvidersSettle = true
            if (shouldWaitForVariants) {
                didProvidersSettle = await awaitProvidersSettled()
            }

            if (!didProvidersSettle) {
                setConnectionError("Wallet providers are still initializing. Please wait a moment and try again.")
                return
            }

            const latestConnector = isEcosystemSelection
                ? connector
                : initialConnectorsRef.current.find(
                    current => connectorKey(current.name) === connectorKey(connector.name)
                ) ?? connector
            if (!isEcosystemSelection && (latestConnector.isMultiChain || liveVariantCount(connector.name) > 1)) {
                setSelectedConnector(undefined)
                setSelectedMultiChainConnector(latestConnector)
                return
            }
            setSelectedConnector(latestConnector)
            if (latestConnector?.hasBrowserExtension !== false && latestConnector.extensionNotFound && !latestConnector?.showQrCode && !isMobilePlatfrom) return
            // Never call `connectWallet` on a stub — it's a metadata-only
            // no-op that would surface as "Connection didn't complete".
            // Hydrate the real provider first and connect through it.
            let liveProvider = provider
            if (provider.isStub) {
                liveProvider = await awaitLiveProvider(provider.id) ?? provider
            }
            if (liveProvider.isStub || !liveProvider.ready) {
                setConnectionError("Wallet provider is still initializing. Please wait a moment and try again.")
                return
            }

            const result = liveProvider.connectWallet && await liveProvider.connectWallet({ connector: latestConnector })

            if (result && latestConnector && provider) {
                setRecentConnectors((prev) => {
                    const next = [{ providerName: provider.name, connectorName: latestConnector.name }];
                    const counts = new Map<string, number>();
                    counts.set(provider.name, 1);

                    (prev || []).forEach(item => {
                        if (
                            item.providerName &&
                            item.connectorName &&
                            !(item.providerName === provider.name && item.connectorName === latestConnector.name)
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
        initialConnectors,
    } = useConnectors({
        featuredProviders,
        filteredProviders,
        searchValue,
        recentConnectors,
        // `undefined` (not a fresh `[]`) while idle — a new array identity
        // every render would invalidate useConnectors' memos even though
        // nothing changed.
        searchResults: isSearching ? searchResults : undefined,
    });
    initialConnectorsRef.current = initialConnectors

    // The modal context stores the connector object that was clicked. Keep the
    // picker pointed at the current derived connector so variants published
    // after that click replace the stale snapshot instead of being ignored.
    const currentMultiChainConnector = useMemo(() => {
        if (!selectedMultiChainConnector) return undefined
        return initialConnectors.find(
            connector => connectorKey(connector.name) === connectorKey(selectedMultiChainConnector.name)
        ) ?? selectedMultiChainConnector
    }, [initialConnectors, selectedMultiChainConnector])

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

    useEffect(() => {
        if (providersSettled) return
        const timer = setTimeout(() => setSettleTimedOut(true), PROVIDER_SETTLE_TIMEOUT_MS)
        return () => clearTimeout(timer)
    }, [providersSettled])

    if (!providersSettled && !settleTimedOut) {
        return (
            <div className="flex h-full min-h-80 w-full items-center justify-center py-10">
                <div className="loader text-[3px]!" />
            </div>
        )
    }

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

    if (currentMultiChainConnector) {
        return <MultichainConnectorPicker
            selectedConnector={currentMultiChainConnector}
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
                    className={clsx('overflow-y-scroll -mr-4 pr-2 scrollbar:!w-1.5 scrollbar:!h-1.5 overflow-x-hidden scrollbar-thumb:bg-transparent', {
                        'h-[calc(100svh-160px)]': isMobileSize && AppSettings.ThemeData?.enablePortal,
                        'styled-scroll': isScrolling
                    })}
                >
                    <div className='grid grid-cols-2 gap-2'>
                        {
                            initialConnectors.map(item => {
                                const provider = featuredProviders.find(p => p.name === item.providerName)
                                const isRecent = item.isRecent
                                return (
                                    <Connector
                                        key={item.id}
                                        connector={item}
                                        onClick={() => provider && connect(item, provider)}
                                        connectingConnector={selectedConnector}
                                        isRecent={isRecent}
                                        isProviderReady={isProviderConnectReady(provider)}
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
