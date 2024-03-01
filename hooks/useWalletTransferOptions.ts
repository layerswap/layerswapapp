import { useSettingsState } from "../context/settings"
import { useSwapDataState } from "../context/swap"
import { NetworkType } from "../Models/CryptoNetwork"
import useWallet from "./useWallet"
import { useEffect, useMemo } from "react"
import { useContractWalletsStore } from "../stores/contractWalletsStore"
import resolveChain from "../lib/resolveChain"
import { createPublicClient, http } from "viem"

export default function useWalletTransferOptions() {
    const { swap } = useSwapDataState()
    const { addContractWallet, getContractWallet, updateContractWallet, contractWallets } = useContractWalletsStore()
    const { getWithdrawalProvider: getProvider } = useWallet()
    const { layers } = useSettingsState()
    const source_layer = layers.find(n => n.internal_name === swap?.source_network)
    const provider = useMemo(() => {
        return source_layer && getProvider(source_layer)
    }, [source_layer, getProvider])

    const wallet = provider?.getConnectedWallet()
    useEffect(() => {
        if (wallet?.address == undefined || source_layer == undefined) return;
        let contractWallet = getContractWallet(wallet.address, source_layer.internal_name);
        if (!contractWallet) {
            // add before checking to check only once
            addContractWallet(wallet.address, source_layer.internal_name);
            checkContractWallet(wallet.address, source_layer).then(
                result => {
                    updateContractWallet(wallet.address, source_layer.internal_name, result)
                }
            )
        }
    }, [wallet?.address])

    const walletAddressType = getContractWallet(wallet?.address, source_layer?.internal_name)

    const canDoSweepless = source_layer && ((source_layer.type == NetworkType.EVM
        && (walletAddressType?.ready && !walletAddressType?.isContract))
        || source_layer.type == NetworkType.Starknet)
        || wallet?.address?.toLowerCase() === swap?.destination_address.toLowerCase()

    return { canDoSweepless, isContractWallet: walletAddressType }
}

let checkContractWallet = async (address, network) => {
    if (!network || !address) throw new Error('Arguments are required')

    if (network.type != NetworkType.EVM) {
        return false;
    }
    else {
        const chain = resolveChain(network)
        const publicClient = createPublicClient({
            chain,
            transport: http()
        })
        try {
            const bytecode = await publicClient.getBytecode({
                address: address as `0x${string}`
            });

            return !!bytecode;
        } catch (error) {
            console.log(error)
        }
    }
}