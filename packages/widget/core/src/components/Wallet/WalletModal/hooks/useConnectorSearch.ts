import { useCallback, useEffect, useRef, useState } from "react";
import type {
    InternalConnector,
    WalletConnectionProvider,
} from "@/types/wallet";
import {
    canRequestAdditionalConnectors,
    type ProviderPaginationState,
    requestCapableProviderNamesKey,
    SEARCH_PAGE_SIZE,
    upsertLoadingState,
    withProviderName,
} from "./connectorPagination";

const SEARCH_DEBOUNCE_MS = 300;

const clearResultsIfNeeded = (previous: InternalConnector[]) =>
    previous.length === 0 ? previous : [];

const clearPaginationIfNeeded = (
    previous: Record<string, ProviderPaginationState>,
) => (Object.keys(previous).length === 0 ? previous : {});

export function useConnectorSearch(
    featuredProviders: WalletConnectionProvider[],
) {
    const [searchValue, setSearchValue] = useState<string | undefined>();
    const [results, setResults] = useState<InternalConnector[]>([]);
    const [pagination, setPagination] = useState<
        Record<string, ProviderPaginationState>
    >({});
    const featuredProvidersRef = useRef(featuredProviders);
    const paginationRef = useRef(pagination);
    const currentSearchValue = searchValue?.trim() ?? "";
    const currentSearchValueRef = useRef(currentSearchValue);
    const requestSequenceRef = useRef(0);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const loadMoreInFlightRef = useRef(false);
    const isSearching = currentSearchValue.length >= 2;

    featuredProvidersRef.current = featuredProviders;
    paginationRef.current = pagination;
    currentSearchValueRef.current = currentSearchValue;

    const providerNamesKey = requestCapableProviderNamesKey(featuredProviders);

    // Debounce remote wallet-registry search and discard stale responses.
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);

        if (!isSearching) {
            requestSequenceRef.current += 1;
            setResults(clearResultsIfNeeded);
            setPagination(clearPaginationIfNeeded);
            return;
        }

        const requestId = requestSequenceRef.current + 1;
        requestSequenceRef.current = requestId;
        const searchableProviders = featuredProvidersRef.current.filter(
            canRequestAdditionalConnectors,
        );

        if (searchableProviders.length === 0) {
            setResults(clearResultsIfNeeded);
            setPagination(clearPaginationIfNeeded);
            return;
        }

        setPagination((previous) =>
            upsertLoadingState(
                previous,
                searchableProviders.map((provider) => provider.name),
                SEARCH_PAGE_SIZE,
            ),
        );

        debounceRef.current = setTimeout(async () => {
            const query = currentSearchValueRef.current;
            const searchResults = await Promise.all(
                searchableProviders.map(async (provider) => {
                    try {
                        const result =
                            await provider.requestAdditionalConnectors({
                                page: 1,
                                pageSize: SEARCH_PAGE_SIZE,
                                query,
                            });
                        return { providerName: provider.name, result };
                    } catch {
                        return {
                            providerName: provider.name,
                            result: undefined,
                        };
                    }
                }),
            );

            if (
                requestId !== requestSequenceRef.current ||
                query !== currentSearchValueRef.current
            ) {
                return;
            }

            setResults(
                searchResults.flatMap(({ providerName, result }) =>
                    withProviderName(providerName, result?.connectors ?? []),
                ),
            );
            setPagination((previous) => {
                const next = { ...previous };
                for (const { providerName, result } of searchResults) {
                    next[providerName] = {
                        loaded: true,
                        nextPage: result?.nextPage ?? null,
                        totalCount: result?.totalCount ?? 0,
                        pageSize: SEARCH_PAGE_SIZE,
                        isLoading: false,
                    };
                }
                return next;
            });
        }, SEARCH_DEBOUNCE_MS);

        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [currentSearchValue, isSearching, providerNamesKey]);

    const loadMore = useCallback(async () => {
        if (loadMoreInFlightRef.current) return;
        loadMoreInFlightRef.current = true;

        try {
            const query = currentSearchValueRef.current;
            const requestId = requestSequenceRef.current;
            const providersToLoad = featuredProvidersRef.current.filter(
                (provider) => {
                    const state = paginationRef.current[provider.name];
                    return (
                        provider.requestAdditionalConnectors &&
                        state?.nextPage != null &&
                        !state.isLoading
                    );
                },
            );

            if (providersToLoad.length === 0) return;

            setPagination((previous) =>
                upsertLoadingState(
                    previous,
                    providersToLoad.map((provider) => provider.name),
                    SEARCH_PAGE_SIZE,
                ),
            );

            const searchResults = await Promise.all(
                providersToLoad.map(async (provider) => {
                    const state = paginationRef.current[provider.name];
                    try {
                        const result =
                            await provider.requestAdditionalConnectors?.({
                                page: state?.nextPage ?? 1,
                                pageSize: state?.pageSize ?? SEARCH_PAGE_SIZE,
                                query,
                            });
                        return { providerName: provider.name, result };
                    } catch {
                        return {
                            providerName: provider.name,
                            result: undefined,
                        };
                    }
                }),
            );

            if (
                requestId !== requestSequenceRef.current ||
                query !== currentSearchValueRef.current
            ) {
                return;
            }

            setResults((previous) => [
                ...previous,
                ...searchResults.flatMap(({ providerName, result }) =>
                    withProviderName(providerName, result?.connectors ?? []),
                ),
            ]);
            setPagination((previous) => {
                const next = { ...previous };
                for (const { providerName, result } of searchResults) {
                    next[providerName] = {
                        loaded: true,
                        nextPage: result?.nextPage ?? null,
                        totalCount:
                            result?.totalCount ??
                            previous[providerName]?.totalCount ??
                            0,
                        pageSize:
                            previous[providerName]?.pageSize ??
                            SEARCH_PAGE_SIZE,
                        isLoading: false,
                    };
                }
                return next;
            });
        } finally {
            loadMoreInFlightRef.current = false;
        }
    }, []);

    return {
        hasMore: featuredProviders.some(
            (provider) => pagination[provider.name]?.nextPage != null,
        ),
        isLoading: featuredProviders.some(
            (provider) => pagination[provider.name]?.isLoading,
        ),
        isSearching,
        loadMore,
        searchResults: isSearching ? results : undefined,
        searchValue,
        setSearchValue,
    };
}
