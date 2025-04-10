import { Network } from "../Models/Network"
import useEVM from "../lib/wallets/evm/useEVM";
import useImtblX from "../lib/wallets/imtblX/useImtblX";
import useSVM from "../lib/wallets/solana/useSVM";
import useStarknet from "../lib/wallets/starknet/useStarknet";
import useTON from "../lib/wallets/ton/useTON";
import useFuel from "../lib/wallets/fuel/useFuel"
import { Wallet, WalletProvider } from "../Models/WalletProvider";
import useTron from "../lib/wallets/tron/useTron";
import { useMemo } from "react";
import useParadex from "../lib/wallets/paradex/useParadex";
import { useSettingsState } from "../context/settings";

export type WalletPurpose = "autofil" | "withdrawal" | "asSource"

export default function useWallet(network?: Network | undefined, purpose?: WalletPurpose) {
    const { networks } = useSettingsState()

    const walletProviders: WalletProvider[] = [
        useEVM({ network }),
        useStarknet(),
        useImtblX(),
        useSVM({ network }),
        useTON(),
        useFuel(),
        useTron(),
        useParadex({ network })
    ].filter(provider => networks.some(obj => provider?.autofillSupportedNetworks?.includes(obj.name)))

    const provider = network && resolveProvider(network, walletProviders, purpose)

    const wallets = useMemo(() => {
        let connectedWallets: Wallet[] = [];
        walletProviders.forEach((wallet) => {
            const w = wallet.connectedWallets;
            connectedWallets = w ? [...connectedWallets, ...w] : [...connectedWallets];
        });
        return connectedWallets;
    }, [walletProviders]);

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
    switch (purpose) {
        case "withdrawal":
            return walletProviders.find(provider => provider.withdrawalSupportedNetworks?.includes(network.name))
        case "autofil":
            return walletProviders.find(provider => provider.autofillSupportedNetworks?.includes(network.name))
        case "asSource":
            return walletProviders.find(provider => provider.asSourceSupportedNetworks?.includes(network.name))
    }
}