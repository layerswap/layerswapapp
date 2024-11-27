import { Network } from "../Models/Network"
import useEVM from "../lib/wallets/evm/useEVM";
import useImtblX from "../lib/wallets/imtblX/useImtblX";
import useSolana from "../lib/wallets/solana/useSolana";
import useStarknet from "../lib/wallets/starknet/useStarknet";
import useTON from "../lib/wallets/ton/useTON";
import useFuel from "../lib/wallets/fuel/useFuel"
import { Wallet, WalletProvider } from "../Models/WalletProvider";

export type WalletPurpose = "autofil" | "withdrawal" | "asSource"

export default function useWallet(network?: Network | undefined, purpose?: WalletPurpose) {

    const walletProviders: WalletProvider[] = [
        useEVM({ network }),
        useStarknet(),
        useImtblX(),
        useSolana({ network }),
        useTON(),
        useFuel(),
    ]

    const provider = network && resolveProvider(network, walletProviders, purpose)

    const resolveConnectedWallets = () => {
        let connectedWallets: Wallet[] = []

        walletProviders.forEach(wallet => {
            const w = wallet.connectedWallets
            connectedWallets = w && [...connectedWallets, ...w] || [...connectedWallets]
        })

        return connectedWallets
    }

    const wallets = resolveConnectedWallets()
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

const resolveProvider = (network: Network, walletProviders: WalletProvider[], purpose?: WalletPurpose) => {
    if (!purpose) return
    switch (purpose) {
        case "withdrawal":
            return walletProviders.find(provider => provider.withdrawalSupportedNetworks?.includes(network.name))
        case "autofil":
            return walletProviders.find(provider => provider.autofillSupportedNetworks?.includes(network.name))
        case "asSource":
            return walletProviders.find(provider => provider.asSourceSupportedNetworks?.includes(network.name))
    }
}