import { useRef } from "react";
import type { WalletConnectionProvider } from "@/types/wallet";
import { useBrowseConnectors } from "./useBrowseConnectors";
import { useLoadMoreObserver } from "./useLoadMoreObserver";
import { useSearchConnectors } from "./useSearchConnectors";

type UseAdditionalConnectorsParams = {
    featuredProviders: WalletConnectionProvider[];
    searchValue: string | undefined;
    isListVisible: boolean;
}

export function useAdditionalConnectors({
    featuredProviders,
    searchValue,
    isListVisible,
}: UseAdditionalConnectorsParams) {
    const currentSearchValue = searchValue?.trim() ?? ""
    const isSearching = currentSearchValue.length >= 2
    const loadMoreTriggerRef = useRef<HTMLDivElement>(null)

    const browse = useBrowseConnectors(featuredProviders, !isSearching)
    const search = useSearchConnectors(
        featuredProviders,
        currentSearchValue,
        isSearching
    )
    const activePagination = isSearching ? search : browse

    useLoadMoreObserver({
        cursorKey: activePagination.cursorKey,
        enabled: activePagination.hasMore && !activePagination.isLoading,
        isListVisible,
        loadMore: activePagination.loadMore,
        triggerRef: loadMoreTriggerRef,
    })

    return {
        anyProviderHasMore: activePagination.hasMore,
        anyProviderLoadingMore: activePagination.isLoading,
        isSearching,
        loadMoreTriggerRef,
        searchResults: search.results,
    }
}
