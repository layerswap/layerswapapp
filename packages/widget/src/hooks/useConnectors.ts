import { useMemo } from "react";
import { InternalConnector, WalletConnectionProvider } from "@/types/wallet";

type UseConnectorsParams = {
    searchValue?: string;
    recentConnectors: { providerName?: string; connectorName?: string }[];
    featuredProviders: WalletConnectionProvider[];
    filteredProviders: WalletConnectionProvider[];
};

export function useConnectors({
    featuredProviders,
    filteredProviders,
    searchValue,
    recentConnectors,
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
        return removeDuplicatesWithKey(
            ([...featuredConnectors, ...hiddenConnectors] as InternalConnector[])
                .sort((a, b) => sortRecentConnectors(a, b, recentConnectors)),
            'name'
        );
    }, [featuredConnectors, hiddenConnectors, searchValue?.length, recentConnectors]);

    return {
        featuredConnectors,
        hiddenConnectors,
        initialConnectors,
        featuredProviders,
        filteredProviders,
    };
}

const featuredWalletsIds = [
    'metamask',
    'argent',
    'rainbow',
    'bitkeep',
    'okx-wallet',
]

function removeDuplicatesWithKey(arr: any[], key: string) {
    const countMap = {};
    const providerMap = {};

    // First pass: Count occurrences of each unique key and track unique providers.
    arr.forEach(item => {
        const identifier = item[key];
        countMap[identifier] = (countMap[identifier] || 0) + 1;

        // Track unique provider names for this connector
        if (!providerMap[identifier]) {
            providerMap[identifier] = new Set();
        }
        if (item.providerName) {
            providerMap[identifier].add(item.providerName);
        }
    });

    // Second pass: Create a new array with one instance of each object.
    const unique: any[] = [];
    const seen = new Set();

    arr.forEach(item => {
        const identifier = item[key];
        if (!seen.has(identifier)) {
            seen.add(identifier);
            // Only mark as multichain if there are duplicates across different providers
            const uniqueProviders = providerMap[identifier]?.size || 0;
            unique.push({
                ...item,
                isMultiChain: countMap[identifier] > 1 && uniqueProviders > 1
            });
        }
    });
    return unique;
}

export function sortRecentConnectors(a: { name: string, type?: string }, b: { name: string, type?: string }, recentConnectors: { connectorName?: string }[]) {
    function getIndex(c: { name: string }) {
        const idx = recentConnectors?.findIndex(v => v.connectorName === c.name);
        return idx === -1 ? Infinity : idx;
    }
    const indexA = getIndex(a);
    const indexB = getIndex(b);
    if (indexA !== indexB) {
        return indexA - indexB;
    }
    if (a.type && b.type) {
        return a.type.localeCompare(b.type);
    }
    return 0;
}
