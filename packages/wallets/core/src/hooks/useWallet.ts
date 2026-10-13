"use client"
import { type Wallet } from '@layerswap/widget-types';
import { useCallback, useMemo } from "react";
import { isMobile } from "@layerswap/utils";
import type { WalletConnectionProvider } from "@/types/wallet";
import { useWalletProviderSnapshots } from "@/hooks/useWalletProviderSnapshots";

export type WalletPurpose = "autofill" | "withdrawal" | "asSource"

export type UseWalletOptions<TNetwork> = {
    getNetworkId?: (network: TNetwork) => string
}

export default function useWallet<TNetwork extends { name: string }>(
    networks: TNetwork[],
    network?: TNetwork | undefined,
    purpose?: WalletPurpose,
    options?: UseWalletOptions<TNetwork>
) {
    const allSnapshots = useWalletProviderSnapshots()
    const isMobilePlatform = isMobile()
    const getNetworkId = options?.getNetworkId ?? defaultGetNetworkId
    const networkId = network ? getNetworkId(network) : undefined

    const walletProviders = useMemo(() => allSnapshots.filter(provider =>
        (isMobilePlatform ? !provider.unsupportedPlatforms?.includes('mobile') : !provider.unsupportedPlatforms?.includes('desktop')) &&
        networks.some(net => {
            const id = getNetworkId(net)
            return provider.autofillSupportedNetworks?.includes(id) ||
                provider.withdrawalSupportedNetworks?.includes(id) ||
                provider.asSourceSupportedNetworks?.includes(id)
        })
    ), [allSnapshots, networks, isMobilePlatform, getNetworkId])

    const provider = useMemo(() => networkId ? resolveProvider(networkId, walletProviders, purpose) : undefined, [networkId, purpose, walletProviders])

    const wallets = useMemo(() => {
        let connectedWallets: Wallet[] = [];
        walletProviders.forEach((provider) => {

            const w = provider.connectedWallets?.map(wallet => {
                return resolveWallet(wallet, networkId, provider, purpose)
            });
            connectedWallets = w ? [...connectedWallets, ...w] : [...connectedWallets];
        });
        return connectedWallets;
    }, [walletProviders, networkId, purpose]);

    const unAvailableWallets = useMemo(() => {
        return wallets.filter(wallet => wallet.isNotAvailable)
    }, [wallets])

    const availableWallets = useMemo(() => {
        return wallets.filter(wallet => !wallet.isNotAvailable)
    }, [wallets])

    const getProvider = useCallback((network: TNetwork, purpose: WalletPurpose) => {
        return network && resolveProvider(getNetworkId(network), walletProviders, purpose)
    }, [walletProviders, getNetworkId]);

    const res = useMemo(() => ({
        wallets: availableWallets,
        unAvailableWallets,
        provider,
        providers: walletProviders,
        getProvider
    }), [availableWallets, unAvailableWallets, provider, walletProviders, getProvider])

    return res
}

const defaultGetNetworkId = (network: { name: string }) => network.name

// When `isNotAvailableCondition` is set, `resolveProvider` builds a fresh
// wrapper object (and a fresh `requestAdditionalConnectors` closure) on every
// call. Because `useWallet` recomputes whenever ANY provider's snapshot moves
// (the snapshot array changes identity even if the resolved provider didn't),
// that would hand every consumer a new `provider` reference on unrelated
// updates and cascade re-renders. Cache the wrapper keyed weakly by the base
// snapshot object so the same (snapshot, networkId, purpose) returns a stable
// reference; a real state change produces a new snapshot → new cache entry.
const resolvedProviderCache = new WeakMap<WalletConnectionProvider, Map<string, WalletConnectionProvider>>()

const resolveProvider = (networkId: string | undefined, walletProviders: WalletConnectionProvider[], purpose?: WalletPurpose) => {
    if (!purpose || !networkId) return

    let provider: WalletConnectionProvider | undefined = undefined
    switch (purpose) {
        case "withdrawal":
            provider = walletProviders.find(provider => provider.withdrawalSupportedNetworks?.includes(networkId))
            break;
        case "autofill":
            provider = walletProviders.find(provider => provider.autofillSupportedNetworks?.includes(networkId))
            break;
        case "asSource":
            provider = walletProviders.find(provider => provider.asSourceSupportedNetworks?.includes(networkId))
            break;
    }

    if (provider?.isNotAvailableCondition && purpose) {
        const cacheKey = `${networkId}|${purpose}`
        const cachedByKey = resolvedProviderCache.get(provider)
        const cached = cachedByKey?.get(cacheKey)
        if (cached) return cached

        const availableConnectors = provider.availableConnectors?.filter(connector => (provider.isNotAvailableCondition && networkId) ? !provider.isNotAvailableCondition(connector.id, networkId, purpose) : true)
        const additionalConnectors = provider.additionalConnectors?.filter(connector => (provider.isNotAvailableCondition && networkId) ? !provider.isNotAvailableCondition(connector.id, networkId, purpose) : true)
        const requestAdditionalConnectors = provider.requestAdditionalConnectors
            ? async (params) => {
                const result = await provider.requestAdditionalConnectors?.(params)
                if (!result) {
                    return { connectors: [], nextPage: null, totalCount: 0 }
                }

                return {
                    ...result,
                    connectors: result.connectors.filter(connector => (provider.isNotAvailableCondition && networkId) ? !provider.isNotAvailableCondition(connector.id, networkId, purpose) : true)
                }
            }
            : undefined
        const resolvedProvider = {
            ...provider,
            connectedWallets: provider.connectedWallets?.map(wallet => {
                const connectorId = wallet.internalId ?? wallet.id
                return {
                    ...wallet,
                    isNotAvailable: (provider.isNotAvailableCondition && networkId && connectorId) ? provider.isNotAvailableCondition(connectorId, networkId, purpose) : false,
                }
            }),
            activeWallet: provider.activeWallet ? {
                ...provider.activeWallet,
                isNotAvailable: networkId ? provider.isNotAvailableCondition(provider.activeWallet.id, networkId, purpose) : false,
            } : undefined,
            availableConnectors: availableConnectors,
            additionalConnectors,
            requestAdditionalConnectors,
        }
        const byKey = cachedByKey ?? new Map<string, WalletConnectionProvider>()
        byKey.set(cacheKey, resolvedProvider)
        if (!cachedByKey) resolvedProviderCache.set(provider, byKey)
        return resolvedProvider
    }

    return provider
}

const resolveWallet = (wallet: Wallet, networkId: string | undefined, provider: WalletConnectionProvider, purpose?: WalletPurpose) => {

    if (provider.isNotAvailableCondition && networkId && wallet.internalId && !purpose) {
        return {
            ...wallet,
            isNotAvailable: provider.isNotAvailableCondition(wallet.internalId, networkId),
        }
    }

    if (purpose === "autofill") {
        return {
            ...wallet,
            isNotAvailable: !wallet.autofillSupportedNetworks?.some(n => n.toLowerCase() === networkId?.toLowerCase()),
        }
    } else if (purpose === "withdrawal") {
        return {
            ...wallet,
            isNotAvailable: !wallet.withdrawalSupportedNetworks?.some(n => n.toLowerCase() === networkId?.toLowerCase()),
        }
    } else if (purpose === "asSource") {
        return {
            ...wallet,
            isNotAvailable: !wallet.asSourceSupportedNetworks?.some(n => n.toLowerCase() === networkId?.toLowerCase()),
        }
    }

    return {
        ...wallet,
        isNotAvailable: false,
    }
}
