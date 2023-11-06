import toast from "react-hot-toast"
import { Layer } from "../Models/Layer"
import LayerSwapApiClient, { SwapItem } from "../lib/layerSwapApiClient"
import { useSwapDataUpdate } from "../context/swap"
import { Wallet } from "../stores/walletStore"
import useStarknet from "../lib/wallets/starknet/useStarknet"
import useImmutableX from "../lib/wallets/immutableX/useIMX"
import useEVM from "../lib/wallets/evm/useEVM"
import useTON from "../lib/wallets/ton/useTON"
import useZkSyncLite from "../lib/wallets/zksync_lite/useZkSyncLite"

export type WalletProvider = {
    connectWallet: (layer: Layer) => Promise<void> | undefined | void,
    disconnectWallet: (layer: Layer) => Promise<void> | undefined | void,
    getWallet: () => Wallet | undefined,
    SupportedNetworks: string[]
}

export default function useWallet() {
    const { mutateSwap } = useSwapDataUpdate()

    const WalletProviders: WalletProvider[] = [
        useTON(),
        useEVM(),
        useStarknet(),
        useImmutableX(),
        useZkSyncLite()
    ]

    async function handleConnect(layer: Layer) {
        const provider = WalletProviders.find(provider => provider.SupportedNetworks.includes(layer.internal_name))
        try {
            await provider?.connectWallet(layer)
        }
        catch {
            toast.error("Couldn't connect the account")
        }
    }

    const handleDisconnect = async (layer: Layer, swap?: SwapItem) => {
        const provider = WalletProviders.find(provider => provider.SupportedNetworks.includes(layer.internal_name))
        try {
            if (swap?.source_exchange) {
                const apiClient = new LayerSwapApiClient()
                await apiClient.DisconnectExchangeAsync(swap.id, "coinbase")
                await mutateSwap()
            }
            else {
                await provider?.disconnectWallet(layer)
            }
        }
        catch {
            toast.error("Couldn't disconnect the account")
        }
    }

    const getConnectedWallets = () => {
        let connectedWallets: Wallet[] = []

        WalletProviders.forEach(wallet => {
            const w = wallet.getWallet()
            connectedWallets = w && [...connectedWallets, w] || [...connectedWallets]
        })

        return connectedWallets
    }

    return {
        wallets: getConnectedWallets(),
        connectWallet: handleConnect,
        disconnectWallet: handleDisconnect,
    }
}