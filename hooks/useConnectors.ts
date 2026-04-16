import { useMemo } from "react";
import { InternalConnector, WalletProvider } from "../Models/WalletProvider";
import { removeDuplicatesWithKey } from "../components/WalletModal/utils";

type UseConnectorsParams = {
    searchValue?: string;
    recentConnectors: { providerName?: string; connectorName?: string }[];
    featuredProviders: WalletProvider[];
    filteredProviders: WalletProvider[];
    searchResults?: InternalConnector[];
};

export function useConnectors({
    featuredProviders,
    filteredProviders,
    searchValue,
    recentConnectors,
    searchResults,
}: UseConnectorsParams) {

    const featuredConnectors = useMemo(() =>
        featuredProviders
            .filter(g => g.availableConnectors && g.availableConnectors?.length > 0)
            .map((provider) =>
                provider.availableConnectors
                    ?.filter(v => searchValue ? v.name.toLowerCase().includes(searchValue.toLowerCase()) : true)
                    .map((connector) => ({ ...connector, providerName: provider.name }))
            )
            .flat() as InternalConnector[],
        [featuredProviders, searchValue]
    );

    const additionalConnectors = useMemo(() =>
        featuredProviders
            .filter(g => g.additionalConnectors && g.additionalConnectors?.length > 0)
            .map((provider) =>
                provider.additionalConnectors
                    ?.filter(v => searchValue ? v.name.toLowerCase().includes(searchValue.toLowerCase()) : true)
                    .map((connector) => ({ ...connector, providerName: provider.name }))
            )
            .flat() as InternalConnector[],
        [featuredProviders, searchValue]
    );


    const initialConnectors: InternalConnector[] = useMemo(() => {
        const recentNames = new Set(recentConnectors?.map(r => r.connectorName?.toLowerCase()).filter(Boolean))
        const isRecent = (c: InternalConnector) => recentNames.has(c.name.toLowerCase())
        const isInstalled = (c: InternalConnector) => c.type === 'injected'

        // Only the provider's initial connector set should be prioritized.
        const recent = featuredConnectors.filter(c => isRecent(c))
        const installed = featuredConnectors.filter(c => !isRecent(c) && isInstalled(c))
        const rest = featuredConnectors.filter(c => !isRecent(c) && !isInstalled(c))
        const orderedConnectors = [...recent, ...installed, ...rest, ...additionalConnectors] as InternalConnector[]

        if (searchResults?.length) {
            const existingNames = new Set(orderedConnectors.map(c => c.name.toLowerCase()))
            const newResults = searchResults.filter(c => !existingNames.has(c.name.toLowerCase()))
            orderedConnectors.push(...newResults)
        }

        return removeDuplicatesWithKey(orderedConnectors, 'name');
    }, [featuredConnectors, additionalConnectors, recentConnectors, searchResults]);

    return {
        featuredConnectors,
        additionalConnectors,
        initialConnectors,
        featuredProviders,
        filteredProviders,
    };
}
