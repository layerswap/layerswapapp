import { useMemo } from "react";
import { InternalConnector, WalletProvider } from "../Models/WalletProvider";
import { removeDuplicatesWithKey } from "../components/WalletModal/utils";
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
        const all = [...featuredConnectors, ...hiddenConnectors] as InternalConnector[]
        if (apiSearchResults?.length) {
            const existingNames = new Set(all.map(c => c.name.toLowerCase()))
            const newResults = apiSearchResults.filter(c => !existingNames.has(c.name.toLowerCase()))
            all.push(...newResults)
        }

        const recentNames = new Set(recentConnectors?.map(r => r.connectorName?.toLowerCase()).filter(Boolean))
        const isRecent = (c: InternalConnector) => recentNames.has(c.name.toLowerCase())
        const isInstalled = (c: InternalConnector) => c.type === 'injected'

        // Recent first, then installed (type=injected), then the rest
        const recent = all.filter(c => isRecent(c))
        const installed = all.filter(c => !isRecent(c) && isInstalled(c))
        const rest = all.filter(c => !isRecent(c) && !isInstalled(c))

        return removeDuplicatesWithKey([...recent, ...installed, ...rest], 'name');
    }, [featuredConnectors, hiddenConnectors, searchValue?.length, recentConnectors, apiSearchResults]);

    return {
        featuredConnectors,
        hiddenConnectors,
        initialConnectors,
        featuredProviders,
        filteredProviders,
    };
}

