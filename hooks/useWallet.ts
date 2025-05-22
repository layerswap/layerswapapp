import { Network } from "../Models/Network"
import { Wallet, WalletProvider } from "../Models/WalletProvider";
import { useMemo } from "react";
import { useWalletProviders } from "../context/walletProviders";

export type WalletPurpose = "autofil" | "withdrawal" | "asSource"

export default function useWallet(network?: Network | undefined, purpose?: WalletPurpose) {
    const walletProviders = useWalletProviders()

    const provider = network && resolveProvider(network, walletProviders, purpose)

    const wallets = useMemo(() => {
        let connectedWallets: Wallet[] = [];
        walletProviders.forEach((provider) => {
            const w = provider.connectedWallets?.map(wallet => {
                return {
                    ...wallet,
                    isNotAvailable: (provider.isNotAvailableCondition && network?.name && wallet.internalId) ? provider.isNotAvailableCondition(wallet.internalId, network?.name) : false,
                }
            });
            connectedWallets = w ? [...connectedWallets, ...w] : [...connectedWallets];
        });
        return connectedWallets;
    }, [walletProviders, network]);

    const getProvider = (network: Network, purpose: WalletPurpose) => {
        return network && resolveProvider(network, walletProviders, purpose)
    }

    return {
        wallets,
        provider,
        providers: walletProviders,
        getProvider
    }
}

const resolveProvider = (network: Network | undefined, walletProviders: WalletProvider[], purpose?: WalletPurpose) => {
    if (!purpose || !network) return

    let provider: WalletProvider | undefined = undefined
    switch (purpose) {
        case "withdrawal":
            provider = walletProviders.find(provider => provider.withdrawalSupportedNetworks?.includes(network.name))
            break;
        case "autofil":
            provider = walletProviders.find(provider => provider.autofillSupportedNetworks?.includes(network.name))
            break;
        case "asSource":
            provider = walletProviders.find(provider => provider.asSourceSupportedNetworks?.includes(network.name))
            break;
    }

    if (provider?.isNotAvailableCondition) {

        const resolvedProvider = {
            ...provider,
            connectedWallets: provider.connectedWallets?.map(wallet => {
                return {
                    ...wallet,
                    isNotAvailable: (provider.isNotAvailableCondition && network?.name && wallet.internalId) ? provider.isNotAvailableCondition(wallet.internalId, network?.name) : false,
                }
            }),
            activeWallet: provider.activeWallet ? {
                ...provider.activeWallet,
                isNotAvailable: (network?.name) ? provider.isNotAvailableCondition(provider.activeWallet.id, network?.name) : false,
            } : undefined,
            availableWalletsForConnect: provider.availableWalletsForConnect?.filter(connector => (provider.isNotAvailableCondition && network?.name) ? !provider.isNotAvailableCondition(connector.id, network?.name) : true)
        }
        return resolvedProvider

    }

    return provider
}