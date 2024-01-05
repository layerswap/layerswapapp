import { useSettingsState } from "../context/settings"
import { useSwapDataState } from "../context/swap"
import { NetworkType } from "../Models/CryptoNetwork"
import useWallet from "./useWallet"
import { useEffect, useMemo, useState } from "react"
import { ContractWalletStorage, useContractWalletsStore } from "../stores/contractWalletsStore"
import resolveChain from "../lib/resolveChain"
import { createPublicClient, http } from "viem"

type ContractWallet = ContractWalletStorage & { ready: boolean };

let checkContractWallet = async (address, network) => {
    if (!network || !address) throw new Error('Arguments are required')
    let isContractWallet: boolean = false
    let isReady: boolean = false

    if (network.type != NetworkType.EVM) {
        isReady = true;
        isContractWallet = false;
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
            isContractWallet = !!bytecode
            isReady = true;
        } catch (error) {
            console.log(error)
        }
    }

    return { isReady, isContractWallet }

}

export default function useWalletTransferOptions() {

    const { swap } = useSwapDataState()
    const { addContractWallet, contractWallets } = useContractWalletsStore()
    const { getWithdrawalProvider: getProvider } = useWallet()
    const { layers, networks } = useSettingsState()
    const source_layer = layers.find(n => n.internal_name === swap?.source_network)
    const source_network = networks.find(n => n.internal_name === swap?.source_network)
    const provider = useMemo(() => {
        return source_layer && getProvider(source_layer)
    }, [source_layer, getProvider])

    const wallet = provider?.getConnectedWallet()
    useEffect(() => {
        if (wallet?.address == undefined || source_layer == undefined) return;
        let contractWallet = contractWallets.find(w => w.address === wallet?.address && w.network === source_layer?.internal_name)
        if (!contractWallet) {
            //now this does get code 3 times 
            checkContractWallet(wallet.address, source_network).then(
                r => {
                    if (r.isReady) {
                        addContractWallet(wallet.address, source_layer.internal_name, r.isContractWallet)
                    }
                }
            )
        }

    }, [wallet?.address])

    let contractWalletResolved = contractWallets.find(w => w.address === wallet?.address && w.network === source_layer?.internal_name)
    const canDoSweepless = source_layer?.isExchange == false
        && ((source_layer.type == NetworkType.EVM && !(contractWalletResolved?.network === source_layer.internal_name && contractWalletResolved?.isContract)) || source_layer.type == NetworkType.Starknet)
        || wallet?.address?.toLowerCase() === swap?.destination_address.toLowerCase()

    var result: ContractWallet =
        { ready: !!contractWalletResolved, ...contractWalletResolved }

    return { canDoSweepless, isContractWallet: result }
}
