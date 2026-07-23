import { useCallback, useMemo, useRef, useState } from "react";
import type {
    Wallet,
    WalletConnectionProvider,
    WalletModalConnector,
} from "@/types/wallet";
import { connectorKey } from "@/hooks/useConnectors";
import { isMobile } from "@/lib/wallets/utils/isMobile";
import { useConnectModal } from "..";
import { useWalletProviderResolution } from "./useWalletProviderResolution";

type UseConnectorConnectionParams = {
    featuredProviders: WalletConnectionProvider[];
    initialConnectors: WalletModalConnector[];
    onFinish: (result: Wallet | undefined) => void;
    rememberConnector: (providerName: string, connectorName: string) => void;
};

export function useConnectorConnection({
    featuredProviders,
    initialConnectors,
    onFinish,
    rememberConnector,
}: UseConnectorConnectionParams) {
    const {
        selectedConnector,
        selectedMultiChainConnector,
        setSelectedConnector,
        setSelectedMultiChainConnector,
    } = useConnectModal();
    const {
        awaitLiveProvider,
        awaitProvidersSettled,
        liveVariantCount,
        providersAreSettled,
    } = useWalletProviderResolution(featuredProviders);
    const [connectionError, setConnectionError] = useState<string>();
    const initialConnectorsRef = useRef(initialConnectors);
    const isMobilePlatform = isMobile();

    initialConnectorsRef.current = initialConnectors;

    const connect = useCallback(
        async (
            connector: WalletModalConnector,
            provider: WalletConnectionProvider,
        ) => {
            try {
                setConnectionError(undefined);

                // The ecosystem picker passes a concrete variant. Resolving that
                // variant back to the top-level tile would reopen the picker.
                const isEcosystemSelection =
                    selectedMultiChainConnector !== undefined;
                const providersStillLoading = !providersAreSettled();
                const shouldWaitForVariants =
                    !isEcosystemSelection &&
                    providersStillLoading &&
                    (connector.type === "injected" || connector.isMultiChain);

                if (shouldWaitForVariants && !(await awaitProvidersSettled())) {
                    setConnectionError(
                        "Wallet providers are still initializing. Please wait a moment and try again.",
                    );
                    return;
                }

                const latestConnector = isEcosystemSelection
                    ? connector
                    : (initialConnectorsRef.current.find(
                          (current) =>
                              connectorKey(current.name) ===
                              connectorKey(connector.name),
                      ) ?? connector);

                if (
                    !isEcosystemSelection &&
                    (latestConnector.isMultiChain ||
                        liveVariantCount(connector.name) > 1)
                ) {
                    setSelectedConnector(undefined);
                    setSelectedMultiChainConnector(latestConnector);
                    return;
                }

                setSelectedConnector(latestConnector);
                if (
                    latestConnector.hasBrowserExtension !== false &&
                    latestConnector.extensionNotFound &&
                    !latestConnector.showQrCode &&
                    !isMobilePlatform
                ) {
                    return;
                }

                let liveProvider = provider;
                if (provider.isStub) {
                    liveProvider =
                        (await awaitLiveProvider(provider.id)) ?? provider;
                }
                if (liveProvider.isStub || !liveProvider.ready) {
                    setConnectionError(
                        "Wallet provider is still initializing. Please wait a moment and try again.",
                    );
                    return;
                }

                const result = await liveProvider.connectWallet?.({
                    connector: latestConnector,
                });
                if (!result) {
                    setConnectionError(
                        "Connection didn't complete. Please try again.",
                    );
                    return;
                }

                rememberConnector(provider.name, latestConnector.name);
                onFinish(result);
                setSelectedConnector(undefined);
            } catch (error) {
                console.log(error);
                const walletError = error as {
                    name?: string;
                    message?: string;
                    details?: string;
                };
                const message = (
                    walletError.message ||
                    walletError.details ||
                    ""
                ).toLowerCase();
                if (
                    walletError.name === "WalletWindowClosedError" ||
                    message.includes("rejected") ||
                    message.includes("denied")
                ) {
                    setConnectionError(
                        "You've declined the wallet connection request",
                    );
                } else {
                    setConnectionError(
                        walletError.message ||
                            walletError.details ||
                            "Something went wrong",
                    );
                }
            }
        },
        [
            awaitLiveProvider,
            awaitProvidersSettled,
            isMobilePlatform,
            liveVariantCount,
            onFinish,
            providersAreSettled,
            rememberConnector,
            selectedMultiChainConnector,
            setSelectedConnector,
            setSelectedMultiChainConnector,
        ],
    );

    // Always resolve the selected wallet against the latest derived list so
    // variants published after the click replace the old connector snapshot.
    const currentMultiChainConnector = useMemo(() => {
        if (!selectedMultiChainConnector) return undefined;
        return (
            initialConnectors.find(
                (connector) =>
                    connectorKey(connector.name) ===
                    connectorKey(selectedMultiChainConnector.name),
            ) ?? selectedMultiChainConnector
        );
    }, [initialConnectors, selectedMultiChainConnector]);

    return {
        connect,
        connectionError,
        currentMultiChainConnector,
        selectedConnector,
    };
}
