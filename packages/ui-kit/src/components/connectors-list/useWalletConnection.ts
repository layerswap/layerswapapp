import { type Wallet } from '@layerswap/widget-types';
import { useCallback, useEffect, useState, useRef } from "react";
import { usePersistedState } from "@layerswap/wallet-core";
import { isMobile } from "@layerswap/utils";
import type { WalletConnectionProvider, WalletModalConnector } from "@layerswap/wallet-core/types";
import { useConnectModal } from "../WalletModalProvider";
import { useWalletProviderReadiness } from "@layerswap/wallet-core";
import { getConnectionError, rememberConnector } from "./walletConnectionHelpers";
import type { RecentConnector, } from "./walletConnectionHelpers";

type UseWalletConnectionParams = {
    featuredProviders: WalletConnectionProvider[];
    onFinish: (result: Wallet | undefined) => void;
}

export function useWalletConnection({ featuredProviders, onFinish, }: UseWalletConnectionParams) {
    const { setSelectedConnector, setSelectedMultiChainConnector, } = useConnectModal()
    const { areSourcesStillLoading, awaitLiveProvider, awaitProvidersSettled, getLiveVariants, } = useWalletProviderReadiness(featuredProviders)
    const [recentConnectors, setRecentConnectors] = usePersistedState<RecentConnector[]>([], "recentConnectors")
    const [connectionError, setConnectionError] = useState<string | undefined>()
    const isMobilePlatform = isMobile()
    const lastAttemptRef = useRef<{ connector: WalletModalConnector, provider: WalletConnectionProvider } | null>(null)
    const providersRef = useRef(featuredProviders)
    providersRef.current = featuredProviders
    const mountedRef = useRef(false)
    const attemptRef = useRef(0)
    useEffect(() => {
        mountedRef.current = true
        return () => {
            mountedRef.current = false
            attemptRef.current++
        }
    }, [])

    const connect = useCallback(async (
        connector: WalletModalConnector,
        provider: WalletConnectionProvider
    ) => {
        if (!mountedRef.current) {
            return
        }
        const attempt = ++attemptRef.current
        const isCurrentAttempt = () => mountedRef.current && attemptRef.current === attempt
        const isProviderAllowed = (id: string) => providersRef.current.some(
            allowed => allowed.id === id && !allowed.connectionDisabled
        )
        try {
            setConnectionError(undefined)

            if (!isProviderAllowed(provider.id)) {
                setConnectionError("This wallet ecosystem is not available.")
                return
            }

            if (connector.isMultiChain) {
                setSelectedMultiChainConnector(connector)
                return
            }

            lastAttemptRef.current = { connector, provider }

            // Injected wallets may gain variants while lazy providers and
            // registry metadata load. Wait once and re-check before committing
            // to a single-ecosystem connection.
            if (
                connector.type === "injected" && areSourcesStillLoading() && getLiveVariants(connector).length < 2
            ) {
                setSelectedConnector(connector)
                await awaitProvidersSettled()
                if (!isCurrentAttempt() || !isProviderAllowed(provider.id)) {
                    return
                }

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
                connector.hasBrowserExtension !== false && connector.extensionNotFound && !connector.showQrCode && !isMobilePlatform
            ) {
                return
            }

            const liveProvider = provider.isStub
                ? await awaitLiveProvider(provider.id) ?? provider
                : provider
            if (!isCurrentAttempt()) {
                return
            }

            if (liveProvider.connectionDisabled || !isProviderAllowed(liveProvider.id)) {
                setConnectionError("This wallet ecosystem is not available.")
                return
            }

            if (liveProvider.isStub || !liveProvider.ready) {
                setConnectionError(
                    "Wallet provider is still initializing. Please wait a moment and try again."
                )
                return
            }

            const result = liveProvider.connectWallet && await liveProvider.connectWallet({ connector })
            // Wallet approval can outlive this screen or its funding policy.
            // Never let that old result select an account or navigate a new flow.
            if (!isCurrentAttempt() || !isProviderAllowed(liveProvider.id)) {
                return
            }

            if (!result) {
                setConnectionError("Connection didn't complete. Please try again.")
                return
            }

            setRecentConnectors(previous => rememberConnector(previous, provider, connector))
            onFinish(result)
            setSelectedConnector(undefined)
        } catch (error) {
            if (!isCurrentAttempt() || !isProviderAllowed(provider.id)) {
                return
            }
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

    const retry = useCallback(() => {
        const last = lastAttemptRef.current
        if (!last) return
        void connect({ ...last.connector, qr: undefined }, last.provider)
    }, [connect])

    return {
        connect,
        connectionError,
        getLiveVariants,
        isMobilePlatform,
        recentConnectors,
        retry,
    }
}
