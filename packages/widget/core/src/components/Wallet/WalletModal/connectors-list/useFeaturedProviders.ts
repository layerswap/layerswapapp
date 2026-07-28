import { useCallback, useMemo, useState } from "react";
import type { WalletConnectionProvider } from "@/types/wallet";
import type { ModalWalletProvider } from "../index";

type UseFeaturedProvidersParams = {
    providers: WalletConnectionProvider[];
    selectedProvider: ModalWalletProvider | undefined;
    setSelectedProvider: (provider: ModalWalletProvider | undefined) => void;
}

export function useFeaturedProviders({
    providers,
    selectedProvider,
    setSelectedProvider,
}: UseFeaturedProvidersParams) {
    const [selectedProviderNames, setSelectedProviderNames] = useState<string[]>([])

    // These lists feed `useConnectors`' memo deps, so their identity must stay
    // stable across unrelated renders such as search and pagination updates.
    const filteredProviders = useMemo(
        () => providers.filter(provider => !provider.hideFromList),
        [providers]
    )

    // A selected provider is a snapshot taken when connect() opens the modal.
    // Resolve it against the live list, including hidden providers used by
    // scoped connection flows.
    const resolvedSelectedProvider = useMemo(() => (
        selectedProvider && !selectedProvider.isSelectedFromFilter
            ? providers.find(provider => provider.name === selectedProvider.name) || selectedProvider
            : selectedProvider
    ), [providers, selectedProvider])

    const featuredProviders = useMemo(() => {
        if (selectedProviderNames.length > 0) {
            const selectedNames = new Set(selectedProviderNames)
            return filteredProviders.filter(provider => selectedNames.has(provider.name))
        }

        return resolvedSelectedProvider ? [resolvedSelectedProvider] : filteredProviders
    }, [filteredProviders, resolvedSelectedProvider, selectedProviderNames])

    const selectProviders = useCallback((providerNames: string[]) => {
        setSelectedProviderNames(providerNames)

        if (providerNames.length === 0) {
            setSelectedProvider(undefined)
            return
        }

        const provider = filteredProviders.find(item => item.name === providerNames[0])
        if (provider) {
            setSelectedProvider({ ...provider, isSelectedFromFilter: true })
        }
    }, [filteredProviders, setSelectedProvider])

    return {
        featuredProviders,
        filteredProviders,
        selectedProviderNames,
        selectProviders,
    }
}
