import toast from "react-hot-toast"
import { NetworkType } from "../Models/CryptoNetwork"
import { Layer } from "../Models/Layer"
import KnownInternalNames from "../lib/knownIds"
import LayerSwapApiClient, { SwapItem } from "../lib/layerSwapApiClient"
import { useCallback } from "react"
import { StarknetWindowObject, connect as starknetConnect, disconnect as starknetDisconnect } from "get-starknet"
import ImtblClient from "../lib/imtbl"
import { useConnectModal } from "@rainbow-me/rainbowkit"
import { useSwapDataUpdate } from "../context/swap"
import { disconnect as wagmiDisconnect } from '@wagmi/core'
import { useWalletStore } from "../stores/walletStore"
import { LinkResults } from "@imtbl/imx-sdk"
import { useSettingsState } from "../context/settings"
import { useAccount, useNetwork } from "wagmi"

export default function useWallet() {
    const { openConnectModal } = useConnectModal()
    const { mutateSwap } = useSwapDataUpdate()
    const { layers } = useSettingsState()
    const { chain } = useNetwork()

    const wallets = useWalletStore((state) => state.connectedWallets)
    const addWallet = useWalletStore((state) => state.connectWallet)
    const removeWallet = useWalletStore((state) => state.disconnectWallet)

    async function connectStarknet(network: Layer) {
        try {
            const res = await starknetConnect()
            if (res && res.account && res.chainId) {
                addWallet({
                    address: res.account.address,
                    chainId: res.chainId,
                    network: network,
                    isConnected: res.isConnected,
                    icon: res.icon,
                    connector: res.name,
                    metadata: {
                        starknetAccount: res.account
                    }
                })
            }
            return res
        }
        catch (e) {
            throw new Error(e)
        }
    }

    async function connectImx(network: Layer): Promise<LinkResults.Setup | undefined> {
        if (network.isExchange === true) return
        try {
            const imtblClient = new ImtblClient(network.internal_name)
            const res = await imtblClient.ConnectWallet();
            if (network) {
                addWallet({
                    address: res.address,
                    chainId: Number(network.chain_id),
                    network: network,
                    isConnected: true,
                    connector: res.providerPreference
                });
            }
            return res
        }
        catch (e) {
            console.log(e)
        }
    }

    async function handleConnect(layer: Layer & { isExchange: false, type: NetworkType.Starknet }): Promise<StarknetWindowObject>
    async function handleConnect(layer: Layer & { isExchange: false, type: NetworkType.StarkEx }): Promise<LinkResults.Setup>
    async function handleConnect(layer: Layer & { isExchange: false, type: NetworkType.EVM }): Promise<void>
    async function handleConnect(layer: Layer & { isExchange: false, type: NetworkType }): Promise<void>
    async function handleConnect(layer: Layer & { isExchange: false, type: NetworkType }) {
        try {
            if (layer.isExchange == false && layer.type === NetworkType.Starknet) {
                const res = await connectStarknet(layer)
                return res
            }
            else if (layer.isExchange == false && layer.type === NetworkType.StarkEx) {
                const res = await connectImx(layer)
                return res
            }
            else if (layer.type === NetworkType.EVM) {
                return openConnectModal && openConnectModal()
            }
        }
        catch {
            toast.error("Couldn't connect the account")
        }
    }

    const handleDisconnectCoinbase = useCallback(async (swap: SwapItem) => {
        const apiClient = new LayerSwapApiClient()
        await apiClient.DisconnectExchangeAsync(swap.id, "coinbase")
        await mutateSwap()
    }, [])

    async function disconnectStarknet(network: Layer) {
        try {
            starknetDisconnect({ clearLastWallet: true })
            removeWallet(network)
        }
        catch (e) {
            console.log(e)
        }
    }

    function disconnectImx(network: Layer) {
        removeWallet(network)
    }

    const handleDisconnect = async (network: Layer, swap?: SwapItem) => {
        const networkType = network?.type
        try {
            if (swap?.source_exchange) {
                await handleDisconnectCoinbase(swap)
            }
            else if (networkType === NetworkType.EVM) {
                await wagmiDisconnect()
                removeWallet(network)
            }
            else if (networkType === NetworkType.Starknet) {
                await disconnectStarknet(network)
            }
            else if (networkType === NetworkType.StarkEx) {
                disconnectImx(network)
            }
        }
        catch {
            toast.error("Couldn't disconnect the account")
        }
    }

    const account = useAccount({
        onConnect({ address, connector }) {
            if (address && connector && chain) {
                addWallet({
                    address: address,
                    connector: connector.id,
                    isConnected: account.isConnected,
                    chainId: chain.id,
                    network: layers.find(l => l.isExchange === false && Number(l.chain_id) === chain.id && l.type === NetworkType.EVM) as Layer
                })
            }
        },
        onDisconnect() {
            handleDisconnect(layers.find(l => l.isExchange === false && Number(l.chain_id) === chain?.id && l.type === NetworkType.EVM) as Layer)
        }
    })

    return {
        wallets: wallets,
        connectWallet: handleConnect,
        disconnectWallet: handleDisconnect,
    }
}