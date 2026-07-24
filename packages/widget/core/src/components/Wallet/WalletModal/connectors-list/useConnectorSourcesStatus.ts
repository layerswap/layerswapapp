import { useCallback, useEffect, useState } from "react";
import type { WalletConnectionProvider } from "@/types/wallet";
import {
    ensureRegistryBrowseLoaded,
    useRegistryBrowseStatuses,
} from "@/lib/walletConnect";

const SOURCES_LOADING_TIMEOUT_MS = 8000

export function useConnectorSourcesStatus(featuredProviders: WalletConnectionProvider[]) {
    const { anyLoading: registryLoading, anyError: registryError } = useRegistryBrowseStatuses()
    const providersLoading = featuredProviders.some(
        provider => provider.isStub === true || provider.ready === false
    )
    const sourcesLoading = providersLoading || registryLoading
    const [sourcesLoadingExpired, setSourcesLoadingExpired] = useState(false)

    useEffect(() => {
        if (!sourcesLoading || sourcesLoadingExpired) return

        const timer = setTimeout(
            () => setSourcesLoadingExpired(true),
            SOURCES_LOADING_TIMEOUT_MS
        )
        return () => clearTimeout(timer)
    }, [sourcesLoading, sourcesLoadingExpired])

    const retryRegistry = useCallback(() => {
        setSourcesLoadingExpired(false)
        ensureRegistryBrowseLoaded()
    }, [])

    return {
        registryError,
        retryRegistry,
        showSourcesLoadingTail: sourcesLoading && !sourcesLoadingExpired,
    }
}
