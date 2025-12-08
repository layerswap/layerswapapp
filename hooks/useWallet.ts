import { Network } from "../Models/Network"
import { Wallet, WalletProvider } from "../Models/WalletProvider";
import { useCallback, useMemo } from "react";
import { useWalletProviders } from "../context/walletProviders";

export type WalletPurpose = "autofill" | "withdrawal" | "asSource"

export default function useWallet(network?: Network | undefined, purpose?: WalletPurpose) {
    const walletProviders = useWalletProviders()

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
    }, [walletProviders, purpose]);

    const res = useMemo(() => ({
        wallets: availableWallets,
        unAvailableWallets,
        provider,
        providers: walletProviders,
        getProvider
    }), [wallets, provider, walletProviders, getProvider])

    return res
}

const resolveProvider = (network: Network | undefined, walletProviders: WalletProvider[], purpose?: WalletPurpose) => {
    if (!purpose || !network) return

    let provider: WalletProvider | undefined = undefined
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
        const availableWalletsForConnect = provider.availableWalletsForConnect?.filter(connector => (provider.isNotAvailableCondition && network?.name) ? !provider.isNotAvailableCondition(connector.id, network?.name, purpose) : true)
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
            availableWalletsForConnect
        }
        return resolvedProvider
    }

    return provider
}

const resolveWallet = (wallet: Wallet, network: Network | undefined, provider: WalletProvider, purpose?: WalletPurpose) => {

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