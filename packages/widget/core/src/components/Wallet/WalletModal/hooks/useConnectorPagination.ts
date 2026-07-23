import type { WalletConnectionProvider } from "@/types/wallet";
import { useBrowseConnectors } from "./useBrowseConnectors";
import { useConnectorSearch } from "./useConnectorSearch";

export function useConnectorPagination(
    featuredProviders: WalletConnectionProvider[],
) {
    const search = useConnectorSearch(featuredProviders);
    const browse = useBrowseConnectors(featuredProviders, search.isSearching);
    const activePagination = search.isSearching ? search : browse;

    return {
        hasMore: activePagination.hasMore,
        isLoadingMore: activePagination.isLoading,
        loadMore: activePagination.loadMore,
        searchResults: search.searchResults,
        searchValue: search.searchValue,
        setSearchValue: search.setSearchValue,
    };
}
