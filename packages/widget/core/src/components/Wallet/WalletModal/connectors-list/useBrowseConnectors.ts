import { useCallback, useEffect, useRef, useState } from "react";
import type { WalletConnectionProvider } from "@/types/wallet";
import {
    applyPageResults,
    canRequestAdditionalConnectors,
    DEFAULT_BROWSE_PAGE_SIZE,
    paginationCursorKey,
    requestCapableProviderNamesKey,
    requestProviderPages,
    setProvidersLoading,
} from "./connectorPagination";
import type {
    PaginationByProvider,
    RequestCapableWalletProvider,
} from "./connectorPagination";

export function useBrowseConnectors(
    featuredProviders: WalletConnectionProvider[],
    enabled: boolean
) {
    const [pagination, setPagination] = useState<PaginationByProvider>({})
    const providersRef = useRef(featuredProviders)
    const paginationRef = useRef(pagination)
    const loadMoreInFlightRef = useRef(false)
    const isMountedRef = useRef(false)
    const providerNamesKey = requestCapableProviderNamesKey(featuredProviders)

    providersRef.current = featuredProviders
    paginationRef.current = pagination

    useEffect(() => {
        isMountedRef.current = true
        return () => {
            isMountedRef.current = false
        }
    }, [])

    useEffect(() => {
        if (!enabled) return

        const providersToLoad = providersRef.current.filter(
            (provider): provider is RequestCapableWalletProvider => (
                canRequestAdditionalConnectors(provider)
                && !paginationRef.current[provider.name]?.loaded
                && !paginationRef.current[provider.name]?.isLoading
            )
        )
        if (providersToLoad.length === 0) return

        setPagination(previous => setProvidersLoading(
            previous,
            providersToLoad.map(provider => provider.name),
            DEFAULT_BROWSE_PAGE_SIZE
        ))

        void requestProviderPages(
            providersToLoad,
            () => ({ page: 1, pageSize: DEFAULT_BROWSE_PAGE_SIZE })
        ).then(results => {
            // Browse pages are provider-scoped and remain valid if the visible
            // provider filter changes while the request is in flight. Always
            // settle their loading state so returning to that scope cannot
            // leave a provider permanently marked as loading.
            if (!isMountedRef.current) return
            setPagination(previous => applyPageResults(
                previous,
                results,
                DEFAULT_BROWSE_PAGE_SIZE
            ))
        })
    }, [enabled, providerNamesKey])

    const loadMore = useCallback(async () => {
        if (loadMoreInFlightRef.current) return

        loadMoreInFlightRef.current = true
        try {
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
                DEFAULT_BROWSE_PAGE_SIZE
            ))

            const results = await requestProviderPages(providersToLoad, provider => {
                const state = paginationRef.current[provider.name]
                return {
                    page: state?.nextPage ?? 1,
                    pageSize: state?.pageSize ?? DEFAULT_BROWSE_PAGE_SIZE,
                }
            })

            setPagination(previous => applyPageResults(
                previous,
                results,
                DEFAULT_BROWSE_PAGE_SIZE
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
    }
}
