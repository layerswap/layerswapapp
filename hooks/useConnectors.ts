import { useMemo, useRef } from "react";
import { InternalConnector, WalletProvider } from "../Models/WalletProvider";
import { removeDuplicatesWithKey } from "../components/WalletModal/utils";

type UseConnectorsParams = {
    searchValue?: string;
    recentConnectors: { providerName?: string; connectorName?: string }[];
    featuredProviders: WalletProvider[];
    filteredProviders: WalletProvider[];
    searchResults?: InternalConnector[];
};

type InitialSnapshot = {
    key: string;
    list: InternalConnector[];
    seen: Set<string>;
}

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

    const filterKey = useMemo(() => {
        const providerKey = featuredProviders.map(p => p.name).join('|')
        return `${providerKey}::${(searchValue ?? '').toLowerCase()}`
    }, [featuredProviders, searchValue])

    const initialSortedRef = useRef<InitialSnapshot | null>(null)
    const appendedRef = useRef<InternalConnector[]>([])

    const initialConnectors: InternalConnector[] = useMemo(() => {
        const recentNames = new Set(recentConnectors?.map(r => r.connectorName?.toLowerCase()).filter(Boolean))
        const isRecent = (c: InternalConnector) => recentNames.has(c.name.toLowerCase())
        const isInstalled = (c: InternalConnector) => c.type === 'injected'

        if (initialSortedRef.current?.key !== filterKey) {
            // Filter context changed (providers or search query): resort the current
            // set once and reset the appended bucket.
            const recent = featuredConnectors.filter(c => isRecent(c))
            const installed = featuredConnectors.filter(c => !isRecent(c) && isInstalled(c))
            const rest = featuredConnectors.filter(c => !isRecent(c) && !isInstalled(c))
            const sorted = removeDuplicatesWithKey(
                [...recent, ...installed, ...rest, ...additionalConnectors],
                'name'
            ) as InternalConnector[]

            initialSortedRef.current = {
                key: filterKey,
                list: sorted,
                seen: new Set(sorted.map(c => c.name.toLowerCase())),
            }
            appendedRef.current = []
        } else {
            // Filter unchanged: any connectors arriving via pagination are appended
            // to a separate bucket in insertion order and never re-sorted, so already
            // rendered tiles keep their position on scroll.
            const seen = initialSortedRef.current.seen
            const appendIfNew = (c: InternalConnector) => {
                const key = c.name.toLowerCase()
                if (!seen.has(key)) {
                    seen.add(key)
                    appendedRef.current.push(c)
                }
            }
            for (const c of featuredConnectors) appendIfNew(c)
            for (const c of additionalConnectors) appendIfNew(c)
        }

        const base = [...initialSortedRef.current.list, ...appendedRef.current]

        if (searchResults?.length) {
            const existingNames = new Set(base.map(c => c.name.toLowerCase()))
            const newResults = searchResults.filter(c => !existingNames.has(c.name.toLowerCase()))
            return [...base, ...newResults]
        }

        return base
    }, [featuredConnectors, additionalConnectors, recentConnectors, searchResults, filterKey]);

    return {
        featuredConnectors,
        additionalConnectors,
        initialConnectors,
        featuredProviders,
        filteredProviders,
    };
}
