import { useCallback, useEffect, useRef, useState } from "react";
import type { WalletConnectionProvider } from "@/types/wallet";
import {
    DEFAULT_BROWSE_PAGE_SIZE,
    type ProviderPaginationState,
    requestCapableProviderNamesKey,
    upsertLoadingState,
} from "./connectorPagination";

export function useBrowseConnectors(
    featuredProviders: WalletConnectionProvider[],
    isSearching: boolean,
) {
    const [pagination, setPagination] = useState<
        Record<string, ProviderPaginationState>
    >({});
    const featuredProvidersRef = useRef(featuredProviders);
    const paginationRef = useRef(pagination);
    const loadMoreInFlightRef = useRef(false);

    featuredProvidersRef.current = featuredProviders;
    paginationRef.current = pagination;

    const providerNamesKey = requestCapableProviderNamesKey(featuredProviders);

    // Load the first browse page for each registry-backed provider.
    useEffect(() => {
        if (isSearching) return;

        let cancelled = false;
        const providersToLoad = featuredProvidersRef.current.filter(
            (provider) =>
                provider.requestAdditionalConnectors &&
                !paginationRef.current[provider.name]?.loaded &&
                !paginationRef.current[provider.name]?.isLoading,
        );

        if (providersToLoad.length === 0) return;

        setPagination((previous) =>
            upsertLoadingState(
                previous,
                providersToLoad.map((provider) => provider.name),
                DEFAULT_BROWSE_PAGE_SIZE,
            ),
        );

        Promise.all(
            providersToLoad.map(async (provider) => {
                try {
                    const result = await provider.requestAdditionalConnectors?.(
                        {
                            page: 1,
                            pageSize: DEFAULT_BROWSE_PAGE_SIZE,
                        },
                    );
                    return { providerName: provider.name, result };
                } catch {
                    return { providerName: provider.name, result: undefined };
                }
            }),
        ).then((results) => {
            if (cancelled) return;

            setPagination((previous) => {
                const next = { ...previous };
                for (const { providerName, result } of results) {
                    next[providerName] = {
                        loaded: true,
                        nextPage: result?.nextPage ?? null,
                        totalCount: result?.totalCount ?? 0,
                        pageSize:
                            previous[providerName]?.pageSize ??
                            DEFAULT_BROWSE_PAGE_SIZE,
                        isLoading: false,
                    };
                }
                return next;
            });
        });

        return () => {
            cancelled = true;
        };
    }, [isSearching, providerNamesKey]);

    const loadMore = useCallback(async () => {
        if (loadMoreInFlightRef.current) return;
        loadMoreInFlightRef.current = true;

        try {
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
                    DEFAULT_BROWSE_PAGE_SIZE,
                ),
            );

            const results = await Promise.all(
                providersToLoad.map(async (provider) => {
                    const state = paginationRef.current[provider.name];
                    try {
                        const result =
                            await provider.requestAdditionalConnectors?.({
                                page: state?.nextPage ?? 1,
                                pageSize:
                                    state?.pageSize ?? DEFAULT_BROWSE_PAGE_SIZE,
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

            setPagination((previous) => {
                const next = { ...previous };
                for (const { providerName, result } of results) {
                    next[providerName] = {
                        loaded: true,
                        nextPage: result?.nextPage ?? null,
                        totalCount:
                            result?.totalCount ??
                            previous[providerName]?.totalCount ??
                            0,
                        pageSize:
                            previous[providerName]?.pageSize ??
                            DEFAULT_BROWSE_PAGE_SIZE,
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
        loadMore,
    };
}
