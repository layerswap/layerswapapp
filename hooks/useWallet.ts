import toast from "react-hot-toast"
import { Layer } from "../Models/Layer"
import LayerSwapApiClient, { SwapItem } from "../lib/layerSwapApiClient"
import { useSwapDataUpdate } from "../context/swap"
import { Wallet } from "../stores/walletStore"
import useTON from "../lib/wallets/ton/useTON"
import useEVM from "../lib/wallets/evm/useEVM"
import useStarknet from "../lib/wallets/starknet/useStarknet"
import useImmutableX from "../lib/wallets/immutableX/useIMX"


export type WalletProvider = {
    connectWallet: (chain?: string | number | undefined) => Promise<void> | undefined | void,
    disconnectWallet: () => Promise<void> | undefined | void,
    getConnectedWallet: () => Wallet | undefined,
    SupportedNetworks: string[],
    name: string,
}

export default function useWallet() {

    const WalletProviders: WalletProvider[] = [
        useTON(),
        useEVM(),
        useStarknet(),
        useImmutableX(),
    ]

    async function handleConnect(providerName: string, chain?: string | number) {
        const provider = WalletProviders.find(provider => provider.name === providerName)
        try {
            await provider?.connectWallet(chain)
        }
        catch {
            toast.error("Couldn't connect the account")
        }
    }

    const handleDisconnect = async (providerName: string, swap?: SwapItem) => {
        const provider = WalletProviders.find(provider => provider.name === providerName)
        try {
            if (swap?.source_exchange) {
                const apiClient = new LayerSwapApiClient()
                await apiClient.DisconnectExchangeAsync(swap.id, "coinbase")
            }
            else {
                await provider?.disconnectWallet()
            }
        }
        catch {
            toast.error("Couldn't disconnect the account")
        }
    }

    const getConnectedWallets = () => {
        let connectedWallets: Wallet[] = []

        WalletProviders.forEach(wallet => {
            const w = wallet.getConnectedWallet()
            connectedWallets = w && [...connectedWallets, w] || [...connectedWallets]
        })

        return connectedWallets
    }

    const getProvider = (network: Layer) => {
        const provider = WalletProviders.find(provider => provider.SupportedNetworks.includes(network.internal_name))
        return provider
    }

    return {
        wallets: getConnectedWallets(),
        connectWallet: handleConnect,
        disconnectWallet: handleDisconnect,
        getProvider: getProvider
    }
}