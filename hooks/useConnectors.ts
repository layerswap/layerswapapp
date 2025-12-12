import { useMemo } from "react";
import { InternalConnector, WalletProvider } from "../Models/WalletProvider";
import { removeDuplicatesWithKey, sortRecentConnectors } from "../components/WalletModal/utils";
import { isMobile } from "@/lib/wallets/connectors/utils/isMobile";
import { featuredWalletsIds } from "@/context/evmConnectorsContext";

type UseConnectorsParams = {
    searchValue?: string;
    recentConnectors: { providerName?: string; connectorName?: string }[];
    featuredProviders: WalletProvider[];
    filteredProviders: WalletProvider[];
};

export function useConnectors({
    featuredProviders,
    filteredProviders,
    searchValue,
    recentConnectors,
}: UseConnectorsParams) {

    const featuredConnectors = useMemo(() => {
        const connectors = featuredProviders
            .filter(g => g.availableWalletsForConnect && g.availableWalletsForConnect?.length > 0)
            .map((provider) =>
                provider.availableWalletsForConnect
                    ?.filter(v => searchValue ? (v.name.toLowerCase().includes(searchValue?.toLowerCase())) : true)
                    .map((connector) => ({ ...connector, providerName: provider.name }))
            ).flat();
        return removeDuplicatesWithKey(connectors.filter(c => c).sort((a, b) => sortRecentConnectors(a!, b!, recentConnectors)), 'name') as InternalConnector[];
    }, [featuredProviders, searchValue, recentConnectors]);

    const hiddenConnectors = useMemo(() => {
        const connectors = featuredProviders
            .filter(g => g.availableHiddenWalletsForConnect && g.availableHiddenWalletsForConnect?.length > 0)
            .map((provider) =>
                provider.availableHiddenWalletsForConnect
                    ?.filter(v => (searchValue ? (v.name.toLowerCase().includes(searchValue?.toLowerCase())) : true) && !featuredWalletsIds.includes(v.id.toLowerCase()))
                    .map((connector) => ({ ...connector, providerName: provider.name, isHidden: true })))
            .flat();
        return removeDuplicatesWithKey(connectors.filter(c => c).sort((a, b) => sortRecentConnectors(a!, b!, recentConnectors)), 'name') as InternalConnector[];
    }, [featuredProviders, searchValue, recentConnectors]);


    const initialConnectors: InternalConnector[] = useMemo(() => {
        const isMobilePlatform = isMobile();
        return removeDuplicatesWithKey(
            ([...featuredConnectors, ...hiddenConnectors] as InternalConnector[])
                .filter(c =>
                    (isMobilePlatform ? c.isMobileSupported !== false : true)
                )
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

