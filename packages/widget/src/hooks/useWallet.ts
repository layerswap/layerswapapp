import { Network } from "@/Models/Network"
import { Wallet, WalletConnectionProvider } from "@/types/wallet";
import { useCallback, useMemo, useRef, useSyncExternalStore } from "react";
import { isMobile } from "@/lib/wallets/utils/isMobile";
import { useSettingsState } from "@/context/settings";
import { useWalletProvidersRegistry } from "@/context/walletProviders";

export type WalletPurpose = "autofill" | "withdrawal" | "asSource"

// Stable reference for SSR — `useSyncExternalStore` requires `getServerSnapshot`
// to return the same value across calls, otherwise it triggers infinite renders.
// Wallet providers aren't populated on the server, so an empty list is correct.
const SSR_SNAPSHOT: WalletConnectionProvider[] = []
const getServerSnapshot = () => SSR_SNAPSHOT

/**
 * Subscribes to the registry plus every contained store via a single
 * `useSyncExternalStore` call. The registry already fans-out inner store
 * notifications, so one subscribe is enough. The cached array keeps the
 * snapshot reference stable when nothing changed, so downstream `useMemo`s
 * stay cache-effective.
 */
function useAllProviderSnapshots(): WalletConnectionProvider[] {
    const walletProvidersRegistry = useWalletProvidersRegistry()
    const cache = useRef<WalletConnectionProvider[]>([])

    const getSnapshot = useCallback(() => {
        const entries = walletProvidersRegistry.getEntries()
        const current = entries.map(e => e.store.getState())
        const prev = cache.current
        if (prev.length === current.length && prev.every((v, i) => v === current[i])) {
            return prev
        }
        cache.current = current
        return current
    }, [walletProvidersRegistry])

    return useSyncExternalStore(walletProvidersRegistry.subscribe, getSnapshot, getServerSnapshot)
}

export default function useWallet(network?: Network | undefined, purpose?: WalletPurpose) {
    const allSnapshots = useAllProviderSnapshots()
    const { networks } = useSettingsState()
    const isMobilePlatform = isMobile()

    const walletProviders = useMemo(() => allSnapshots.filter(provider =>
        (isMobilePlatform ? !provider.unsupportedPlatforms?.includes('mobile') : !provider.unsupportedPlatforms?.includes('desktop')) &&
        networks.some(net =>
            provider.autofillSupportedNetworks?.includes(net.name) ||
            provider.withdrawalSupportedNetworks?.includes(net.name) ||
            provider.asSourceSupportedNetworks?.includes(net.name)
        )
    ), [allSnapshots, networks, isMobilePlatform])

    const provider = useMemo(() => network && resolveProvider(network, walletProviders, purpose), [network, purpose, walletProviders])

    const wallets = useMemo(() => {
        let connectedWallets: Wallet[] = [];
        walletProviders.forEach((provider) => {

            const w = provider.connectedWallets?.map(wallet => {
                return resolveWallet(wallet, network, provider, purpose)
            });
            connectedWallets = w ? [...connectedWallets, ...w] : [...connectedWallets];
        });
        return connectedWallets;
    }, [walletProviders, network]);

    const unAvailableWallets = useMemo(() => {
        return wallets.filter(wallet => wallet.isNotAvailable)
    }, [wallets])

    const availableWallets = useMemo(() => {
        return wallets.filter(wallet => !wallet.isNotAvailable)
    }, [wallets])

    const getProvider = useCallback((network: Network, purpose: WalletPurpose) => {
        return network && resolveProvider(network, walletProviders, purpose)
    }, [walletProviders]);

    const res = useMemo(() => ({
        wallets: availableWallets,
        unAvailableWallets,
        provider,
        providers: walletProviders,
        getProvider
    }), [availableWallets, unAvailableWallets, provider, walletProviders, getProvider])

    return res
}

const resolveProvider = (network: Network | undefined, walletProviders: WalletConnectionProvider[], purpose?: WalletPurpose) => {
    if (!purpose || !network) return

    let provider: WalletConnectionProvider | undefined = undefined
    switch (purpose) {
        case "withdrawal":
            provider = walletProviders.find(provider => provider.withdrawalSupportedNetworks?.includes(network.name))
            break;
        case "autofill":
            provider = walletProviders.find(provider => provider.autofillSupportedNetworks?.includes(network.name))
            break;
        case "asSource":
            provider = walletProviders.find(provider => provider.asSourceSupportedNetworks?.includes(network.name))
            break;
    }

    if (provider?.isNotAvailableCondition && purpose) {
        const availableConnectors = provider.availableConnectors?.filter(connector => (provider.isNotAvailableCondition && network?.name) ? !provider.isNotAvailableCondition(connector.id, network?.name, purpose) : true)
        const additionalConnectors = provider.additionalConnectors?.filter(connector => (provider.isNotAvailableCondition && network?.name) ? !provider.isNotAvailableCondition(connector.id, network?.name, purpose) : true)
        const requestAdditionalConnectors = provider.requestAdditionalConnectors
            ? async (params) => {
                const result = await provider.requestAdditionalConnectors?.(params)
                if (!result) {
                    return { connectors: [], nextPage: null, totalCount: 0 }
                }

                return {
                    ...result,
                    connectors: result.connectors.filter(connector => (provider.isNotAvailableCondition && network?.name) ? !provider.isNotAvailableCondition(connector.id, network?.name, purpose) : true)
                }
            }
            : undefined
        const resolvedProvider = {
            ...provider,
            connectedWallets: provider.connectedWallets?.map(wallet => {
                return {
                    ...wallet,
                    isNotAvailable: (provider.isNotAvailableCondition && network?.name && wallet.internalId) ? provider.isNotAvailableCondition(wallet.internalId, network?.name, purpose) : false,
                }
            }),
            activeWallet: provider.activeWallet ? {
                ...provider.activeWallet,
                isNotAvailable: (network?.name) ? provider.isNotAvailableCondition(provider.activeWallet.id, network?.name, purpose) : false,
            } : undefined,
            availableConnectors: availableConnectors,
            additionalConnectors,
            requestAdditionalConnectors,
        }
        return resolvedProvider
    }

    return provider
}

const resolveWallet = (wallet: Wallet, network: Network | undefined, provider: WalletConnectionProvider, purpose?: WalletPurpose) => {

    if (provider.isNotAvailableCondition && network?.name && wallet.internalId && !purpose) {
        return {
            ...wallet,
            isNotAvailable: provider.isNotAvailableCondition(wallet.internalId, network?.name),
        }
    }

    if (purpose === "autofill") {
        return {
            ...wallet,
            isNotAvailable: !wallet.autofillSupportedNetworks?.some(n => n.toLowerCase() === network?.name.toLowerCase()),
        }
    } else if (purpose === "withdrawal") {
        return {
            ...wallet,
            isNotAvailable: !wallet.withdrawalSupportedNetworks?.some(n => n.toLowerCase() === network?.name.toLowerCase()),
        }
    } else if (purpose === "asSource") {
        return {
            ...wallet,
            isNotAvailable: !wallet.asSourceSupportedNetworks?.some(n => n.toLowerCase() === network?.name.toLowerCase()),
        }
    }

    return {
        ...wallet,
        isNotAvailable: false,
    }
}
