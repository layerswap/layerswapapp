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

export default function useWallet() {
    const { openConnectModal } = useConnectModal()
    const { mutateSwap } = useSwapDataUpdate()

    const wallet = useWalletStore((state) => state.connectedWallet)
    const addWallet = useWalletStore((state) => state.connectWallet)
    const removeWallet = useWalletStore((state) => state.disconnectWallet)

    async function connectStarknet() {
        try {
            const res = await starknetConnect()
            addWallet({
                address: res.account.address,
                chainId: res.chainId,
                isConnected: res.isConnected,
                icon: res.icon,
                connector: res.name,
                metadata: {
                    starknetAccount: res.account
                }
            })
            return res
        }
        catch (e) {
            throw new Error(e)
        }
    }

    async function connectImx(network_internal_name: string, chain_id?: string | number): Promise<LinkResults.Setup> {
        try {
            const imtblClient = new ImtblClient(network_internal_name)
            const res = await imtblClient.ConnectWallet();
            addWallet({
                address: res.address,
                chainId: chain_id,
                isConnected: true,
                connector: res.providerPreference
            });
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
                const res = await connectStarknet() 
                return res
            }
            else if (layer.isExchange == false && layer.type === NetworkType.StarkEx) {
                const res = await connectImx(layer.internal_name, layer.chain_id)
                return res
            }
            else if (layer.type === NetworkType.EVM) {
                return openConnectModal()
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

    async function disconnectStarknet() {
        try {
            starknetDisconnect({ clearLastWallet: true })
            removeWallet()
        }
        catch (e) {
            console.log(e)
        }
    }

    function disconnectImx() {
        removeWallet()
    }

    const handleDisconnect = async (swap: SwapItem, network: Layer) => {
        const networkType = network?.type
        const isNetworkImmutableX = network?.internal_name?.toUpperCase() === KnownInternalNames.Networks.ImmutableXMainnet?.toUpperCase()
            || network?.internal_name?.toUpperCase() === KnownInternalNames.Networks.ImmutableXGoerli?.toUpperCase()
        try {
            if (swap?.source_exchange) {
                await handleDisconnectCoinbase(swap)
            }
            else if (networkType === NetworkType.EVM) {
                await wagmiDisconnect()
            }
            else if (networkType === NetworkType.Starknet) {
                await disconnectStarknet()
            }
            else if (isNetworkImmutableX) {
                disconnectImx()
            }
        }
        catch {
            toast.error("Couldn't disconnect the account")
        }
    }

    return {
        wallet: wallet,
        connectWallet: handleConnect,
        disconnectWallet: handleDisconnect
    }
}