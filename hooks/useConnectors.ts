import { useMemo } from "react";
import { InternalConnector, WalletProvider } from "../Models/WalletProvider";
import { removeDuplicatesWithKey, sortRecentConnectors } from "../components/WalletModal/utils";
import { featuredWalletsIds } from "@/context/evmConnectorsContext";

type UseConnectorsParams = {
    searchValue?: string;
    recentConnectors: { providerName?: string; connectorName?: string }[];
    featuredProviders: WalletProvider[];
    filteredProviders: WalletProvider[];
    apiSearchResults?: InternalConnector[];
};

export function useConnectors({
    featuredProviders,
    filteredProviders,
    searchValue,
    recentConnectors,
    apiSearchResults,
}: UseConnectorsParams) {

    const featuredConnectors = useMemo(() =>
        featuredProviders
            .filter(g => g.availableWalletsForConnect && g.availableWalletsForConnect?.length > 0)
            .map((provider) =>
                provider.availableWalletsForConnect
                    ?.filter(v => searchValue ? v.name.toLowerCase().includes(searchValue.toLowerCase()) : true)
                    .map((connector) => ({ ...connector, providerName: provider.name }))
            )
            .flat() as InternalConnector[],
        [featuredProviders, searchValue]
    );

    const hiddenConnectors = useMemo(() =>
        featuredProviders
            .filter(g => g.availableHiddenWalletsForConnect && g.availableHiddenWalletsForConnect?.length > 0)
            .map((provider) =>
                provider.availableHiddenWalletsForConnect
                    ?.filter(v =>
                        (searchValue ? v.name.toLowerCase().includes(searchValue.toLowerCase()) : true) &&
                        !featuredWalletsIds.includes(v.id.toLowerCase())
                    )
                    .map((connector) => ({ ...connector, providerName: provider.name, isHidden: true }))
            )
            .flat() as InternalConnector[],
        [featuredProviders, searchValue]
    );


    const initialConnectors: InternalConnector[] = useMemo(() => {
        const base = [...featuredConnectors, ...hiddenConnectors] as InternalConnector[]
        // Merge API search results, deduplicating against already-loaded wallets
        if (apiSearchResults?.length) {
            const existingNames = new Set(base.map(c => c.name.toLowerCase()))
            const newResults = apiSearchResults.filter(c => !existingNames.has(c.name.toLowerCase()))
            base.push(...newResults)
        }
        return removeDuplicatesWithKey(
            base.sort((a, b) => sortRecentConnectors(a, b, recentConnectors)),
            'name'
        );
    }, [featuredConnectors, hiddenConnectors, searchValue?.length, recentConnectors, apiSearchResults]);

    return {
        featuredConnectors,
        hiddenConnectors,
        initialConnectors,
        featuredProviders,
        filteredProviders,
    };
}

