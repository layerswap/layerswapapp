import { useCallback, useMemo, useState } from "react";
import type { WalletConnectionProvider } from "@/types/wallet";
import { useConnectModal } from "..";

export function useConnectorProviders(providers: WalletConnectionProvider[]) {
    const { selectedProvider, setSelectedProvider } = useConnectModal();
    const [selectedProviderNames, setSelectedProviderNames] = useState<
        string[]
    >([]);

    // Keep these arrays stable across unrelated modal renders. They feed the
    // connector resolution pipeline, which is intentionally memoized.
    const filteredProviders = useMemo(
        () => providers.filter((provider) => !provider.hideFromList),
        [providers],
    );

    // A selected provider is a snapshot captured when connect() opens the
    // modal. Re-resolve it against the live list so late connector updates are
    // visible. Hidden scoped providers (for example Paradex) must remain valid.
    const resolvedSelectedProvider = useMemo(
        () =>
            selectedProvider && !selectedProvider.isSelectedFromFilter
                ? providers.find(
                      (provider) => provider.name === selectedProvider.name,
                  ) || selectedProvider
                : selectedProvider,
        [providers, selectedProvider],
    );

    const featuredProviders = useMemo(() => {
        if (selectedProviderNames.length > 0) {
            return filteredProviders.filter((provider) =>
                selectedProviderNames.includes(provider.name),
            );
        }
        return resolvedSelectedProvider
            ? [resolvedSelectedProvider]
            : filteredProviders;
    }, [filteredProviders, resolvedSelectedProvider, selectedProviderNames]);

    const selectProviders = useCallback(
        (providerNames: string[]) => {
            setSelectedProviderNames(providerNames);

            if (providerNames.length === 0) {
                setSelectedProvider(undefined);
                return;
            }

            const provider = filteredProviders.find(
                (candidate) => candidate.name === providerNames[0],
            );
            if (provider) {
                setSelectedProvider({
                    ...provider,
                    isSelectedFromFilter: true,
                });
            }
        },
        [filteredProviders, setSelectedProvider],
    );

    return {
        featuredProviders,
        filteredProviders,
        selectedProvider,
        selectedProviderNames,
        selectProviders,
    };
}
