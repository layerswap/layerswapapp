import { useCallback, useEffect, useRef, useState } from "react";
import type {
    InternalConnector,
    WalletConnectionProvider,
} from "@/types/wallet";
import {
    applyPageResults,
    canRequestAdditionalConnectors,
    paginationCursorKey,
    requestCapableProviderNamesKey,
    requestProviderPages,
    SEARCH_PAGE_SIZE,
    setProvidersLoading,
    withProviderName,
} from "./connectorPagination";
import type {
    PaginationByProvider,
    RequestCapableWalletProvider,
} from "./connectorPagination";

const SEARCH_DEBOUNCE_MS = 300

const clearResultsIfNeeded = (previous: InternalConnector[]) => (
    previous.length === 0 ? previous : []
)

const clearPaginationIfNeeded = (previous: PaginationByProvider) => (
    Object.keys(previous).length === 0 ? previous : {}
)

export function useSearchConnectors(
    featuredProviders: WalletConnectionProvider[],
    query: string,
    enabled: boolean
) {
    const [results, setResults] = useState<InternalConnector[]>([])
    const [pagination, setPagination] = useState<PaginationByProvider>({})
    const providersRef = useRef(featuredProviders)
    const paginationRef = useRef(pagination)
    const queryRef = useRef(query)
    const requestSequenceRef = useRef(0)
    const loadMoreInFlightRef = useRef(false)
    const providerNamesKey = requestCapableProviderNamesKey(featuredProviders)

    providersRef.current = featuredProviders
    paginationRef.current = pagination
    queryRef.current = query

    useEffect(() => {
        if (!enabled) {
            requestSequenceRef.current += 1
            setResults(clearResultsIfNeeded)
            setPagination(clearPaginationIfNeeded)
            return
        }

        const requestId = requestSequenceRef.current + 1
        requestSequenceRef.current = requestId
        const searchableProviders = providersRef.current.filter(
            canRequestAdditionalConnectors
        )

        if (searchableProviders.length === 0) {
            setResults(clearResultsIfNeeded)
            setPagination(clearPaginationIfNeeded)
            return
        }

        setPagination(previous => setProvidersLoading(
            previous,
            searchableProviders.map(provider => provider.name),
            SEARCH_PAGE_SIZE
        ))

        const timer = setTimeout(async () => {
            const currentQuery = queryRef.current
            const pageResults = await requestProviderPages(
                searchableProviders,
                () => ({
                    page: 1,
                    pageSize: SEARCH_PAGE_SIZE,
                    query: currentQuery,
                })
            )

            if (
                requestId !== requestSequenceRef.current
                || currentQuery !== queryRef.current
            ) {
                return
            }

            setResults(pageResults.flatMap(({ providerName, result }) => (
                withProviderName(providerName, result?.connectors ?? [])
            )))
            setPagination(previous => applyPageResults(
                previous,
                pageResults,
                SEARCH_PAGE_SIZE
            ))
        }, SEARCH_DEBOUNCE_MS)

        return () => clearTimeout(timer)
    }, [enabled, providerNamesKey, query])

    const loadMore = useCallback(async () => {
        if (loadMoreInFlightRef.current) return

        loadMoreInFlightRef.current = true
        try {
            const currentQuery = queryRef.current
            const requestId = requestSequenceRef.current
            const providersToLoad = providersRef.current.filter(
                (provider): provider is RequestCapableWalletProvider => {
                    const state = paginationRef.current[provider.name]
                    return canRequestAdditionalConnectors(provider)
                        && state?.nextPage != null
                        && !state.isLoading
                }
            )
            if (providersToLoad.length === 0) return

            setPagination(previous => setProvidersLoading(
                previous,
                providersToLoad.map(provider => provider.name),
                SEARCH_PAGE_SIZE
            ))

            const pageResults = await requestProviderPages(
                providersToLoad,
                provider => {
                    const state = paginationRef.current[provider.name]
                    return {
                        page: state?.nextPage ?? 1,
                        pageSize: state?.pageSize ?? SEARCH_PAGE_SIZE,
                        query: currentQuery,
                    }
                }
            )

            if (
                requestId !== requestSequenceRef.current
                || currentQuery !== queryRef.current
            ) {
                return
            }

            setResults(previous => [
                ...previous,
                ...pageResults.flatMap(({ providerName, result }) => (
                    withProviderName(providerName, result?.connectors ?? [])
                )),
            ])
            setPagination(previous => applyPageResults(
                previous,
                pageResults,
                SEARCH_PAGE_SIZE
            ))
        } finally {
            loadMoreInFlightRef.current = false
        }
    }, [])

    return {
        cursorKey: paginationCursorKey(featuredProviders, pagination),
        hasMore: featuredProviders.some(
            provider => pagination[provider.name]?.nextPage != null
        ),
        isLoading: featuredProviders.some(
            provider => pagination[provider.name]?.isLoading
        ),
        loadMore,
        results,
    }
}
