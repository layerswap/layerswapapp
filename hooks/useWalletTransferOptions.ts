import { useSwapDataState } from "../context/swap"
import { NetworkType } from "../Models/Network"
import { useEffect } from "react"
import { useContractWalletsStore } from "../stores/contractWalletsStore"
import resolveChain from "../lib/resolveChain"
import { createPublicClient, http } from "viem"
import { useSettingsState } from "../context/settings"
import { useSelectedAccount } from "@/context/balanceAccounts"

export default function useWalletTransferOptions() {
    const { swapBasicData } = useSwapDataState()
    const { networks } = useSettingsState()
    const { source_network } = swapBasicData || {}
    const { addContractWallet, getContractWallet, updateContractWallet } = useContractWalletsStore()

    const selectedSourceAccount = useSelectedAccount("from", source_network?.name);
    useEffect(() => {
        if (selectedSourceAccount?.address == undefined || source_network == undefined) return;
        let contractWallet = getContractWallet(selectedSourceAccount.address, source_network.name);
        if (!contractWallet) {
            // add before checking to check only once
            addContractWallet(selectedSourceAccount.address, source_network.name);

            const sourceNetworkFromSettings = networks.find(n => n.name === source_network.name);
            checkContractWallet(selectedSourceAccount.address, sourceNetworkFromSettings).then(
                result => {
                    updateContractWallet(selectedSourceAccount.address, sourceNetworkFromSettings?.name, result)
                }
            )
        }
    }, [selectedSourceAccount?.address])

    const walletAddressType = getContractWallet(selectedSourceAccount?.address, source_network?.name)

    const canDoSweepless = source_network && ((source_network.type == NetworkType.EVM
        && (walletAddressType?.ready && !walletAddressType?.isContract))
        || source_network.type == NetworkType.Starknet || source_network.type == NetworkType.ZkSyncLite)
        || selectedSourceAccount?.address?.toLowerCase() === swapBasicData?.destination_address.toLowerCase()
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
            const bytecode = await publicClient.getCode({
                address: address as `0x${string}`
            });

            return !!bytecode;
        } catch (error) {
            console.log(error)
        }
    }
}