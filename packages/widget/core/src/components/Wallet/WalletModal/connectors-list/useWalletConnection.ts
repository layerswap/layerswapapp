import { useCallback, useState } from "react";
import { usePersistedState } from "@/hooks/usePersistedState";
import { isMobile } from "@/lib/wallets/utils/isMobile";
import type {
    Wallet,
    WalletConnectionProvider,
    WalletModalConnector,
} from "@/types/wallet";
import { useConnectModal } from "../index";
import { useWalletProviderReadiness } from "./useWalletProviderReadiness";
import { getConnectionError, rememberConnector } from "./walletConnectionHelpers";
import type {
    RecentConnector,
} from "./walletConnectionHelpers";

type UseWalletConnectionParams = {
    featuredProviders: WalletConnectionProvider[];
    onFinish: (result: Wallet | undefined) => void;
}

export function useWalletConnection({
    featuredProviders,
    onFinish,
}: UseWalletConnectionParams) {
    const {
        setSelectedConnector,
        setSelectedMultiChainConnector,
    } = useConnectModal()
    const {
        areSourcesStillLoading,
        awaitLiveProvider,
        awaitProvidersSettled,
        getLiveVariants,
    } = useWalletProviderReadiness(featuredProviders)
    const [recentConnectors, setRecentConnectors] = usePersistedState<RecentConnector[]>(
        [],
        "recentConnectors",
        "localStorage"
    )
    const [connectionError, setConnectionError] = useState<string | undefined>()
    const isMobilePlatform = isMobile()

    const connect = useCallback(async (
        connector: WalletModalConnector,
        provider: WalletConnectionProvider
    ) => {
        try {
            setConnectionError(undefined)

            if (connector.isMultiChain) {
                setSelectedMultiChainConnector(connector)
                return
            }

            // Injected wallets may gain variants while lazy providers and
            // registry metadata load. Wait once and re-check before committing
            // to a single-ecosystem connection.
            if (
                connector.type === "injected"
                && areSourcesStillLoading()
                && getLiveVariants(connector).length < 2
            ) {
                setSelectedConnector(connector)
                await awaitProvidersSettled()

                const settledVariants = getLiveVariants(connector)
                if (settledVariants.length > 1) {
                    setSelectedConnector(undefined)
                    setSelectedMultiChainConnector({
                        ...connector,
                        variants: settledVariants,
                        isMultiChain: true,
                    })
                    return
                }
            }

            setSelectedConnector(connector)
            if (
                connector.hasBrowserExtension !== false
                && connector.extensionNotFound
                && !connector.showQrCode
                && !isMobilePlatform
            ) {
                return
            }

            const liveProvider = provider.isStub
                ? await awaitLiveProvider(provider.id) ?? provider
                : provider

            if (liveProvider.isStub || !liveProvider.ready) {
                setConnectionError(
                    "Wallet provider is still initializing. Please wait a moment and try again."
                )
                return
            }

            const result = liveProvider.connectWallet
                && await liveProvider.connectWallet({ connector })

            if (!result) {
                setConnectionError("Connection didn't complete. Please try again.")
                return
            }

            setRecentConnectors(previous => rememberConnector(previous, provider, connector))
            onFinish(result)
            setSelectedConnector(undefined)
        } catch (error) {
            console.log(error)
            setConnectionError(getConnectionError(error))
        }
    }, [
        areSourcesStillLoading,
        awaitLiveProvider,
        awaitProvidersSettled,
        getLiveVariants,
        isMobilePlatform,
        onFinish,
        setRecentConnectors,
        setSelectedConnector,
        setSelectedMultiChainConnector,
    ])

    return {
        connect,
        connectionError,
        getLiveVariants,
        isMobilePlatform,
        recentConnectors,
    }
}
