import { Network, RouteNetwork } from "../Models/Network"
import useEVM from "../lib/wallets/evm/useEVM";
import { Wallet } from "../stores/walletStore";

export type WalletProvider = {
    connectWallet: (props?: { chain?: string | number | undefined | null, destination?: RouteNetwork }) => Promise<void> | undefined | void,
    disconnectWallets: () => Promise<void> | undefined | void,
    reconnectWallet: (props?: { chain?: string | number | undefined | null }) => Promise<void> | undefined | void,
    connectedWallets: Wallet[] | undefined,
    activeWallet: Wallet | undefined,
    autofillSupportedNetworks?: string[],
    withdrawalSupportedNetworks: string[],
    asSourceSupportedNetworks?: string[],
    name: string,
    id: string
}

type WalletPurpose = "autofil" | "withdrawal" | "asSource"

export default function useWallet(network?: Network | undefined, purpose?: WalletPurpose) {

    const walletProviders: WalletProvider[] = [
        useEVM(),
    ]
    const provider = network && resolveProvider(network, walletProviders, purpose)

    //if available wallets count is 0, then connect function is undefined

    //implement provider available and connected wallets


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
            return walletProviders.find(provider => provider.withdrawalSupportedNetworks.includes(network.name))
        case "autofil":
            return walletProviders.find(provider => provider.autofillSupportedNetworks?.includes(network.name))
        case "asSource":
            return walletProviders.find(provider => provider.asSourceSupportedNetworks?.includes(network.name))
    }
}