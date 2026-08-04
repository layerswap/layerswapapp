import { useCallback, useEffect, useState } from "react";
import type { WalletConnectionProvider } from "@/types";
import { ensureRegistryBrowseLoaded, useRegistryBrowseStatuses } from "@/lib/walletConnect";

const SOURCES_LOADING_TIMEOUT_MS = 8000
const PROVIDERS_LOADING_TIMEOUT_MS = 5000

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

    // Block the wallet list while ecosystem providers hydrate: a partial list
    // invites clicks that commit to the one loaded ecosystem before a wallet's
    // other ecosystems are known (MetaMask → EVM-only connect). Bounded, so a
    // broken SDK chunk can't lock the modal — past the deadline the list
    // renders progressively with the loading tail below. Registry (WalletConnect
    // API) wallets never block: they only append tiles.
    const [providersLoadingExpired, setProvidersLoadingExpired] = useState(false)

    useEffect(() => {
        if (!providersLoading || providersLoadingExpired) return

        const timer = setTimeout(
            () => setProvidersLoadingExpired(true),
            PROVIDERS_LOADING_TIMEOUT_MS
        )
        return () => clearTimeout(timer)
    }, [providersLoading, providersLoadingExpired])

    const retryRegistry = useCallback(() => {
        setSourcesLoadingExpired(false)
        ensureRegistryBrowseLoaded()
    }, [])

    return {
        blockListWhileLoading: providersLoading && !providersLoadingExpired,
        registryError,
        retryRegistry,
        showSourcesLoadingTail: sourcesLoading && !sourcesLoadingExpired,
    }
}
