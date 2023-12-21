import { useSettingsState } from "../context/settings"
import { useSwapDataState } from "../context/swap"
import { NetworkType } from "../Models/CryptoNetwork"
import useWallet from "./useWallet"
import { useEffect, useMemo, useState } from "react"
import { ContractWallet, useContractWalletsStore } from "../stores/contractWalletsStore"

export default function useWalletTransferOptions() {

    const { swap } = useSwapDataState()
    const { checkContractWallet, contractWallets } = useContractWalletsStore()
    const [isContractWallet, setIsContractWallet] = useState<ContractWallet | null>()
    const { getWithdrawalProvider: getProvider } = useWallet()
    const { layers } = useSettingsState()
    const source_layer = layers.find(n => n.internal_name === swap?.source_network)
    const provider = useMemo(() => {
        return source_layer && getProvider(source_layer)
    }, [source_layer, getProvider])

    const wallet = provider?.getConnectedWallet()

    useEffect(() => {
        setIsContractWallet(contractWallets.find(w => w.address === wallet?.address && w.network === source_layer?.internal_name) ?? checkContractWallet(wallet?.address, source_layer))
    }, [])

    const canDoSweepless = ((source_layer?.type == NetworkType.EVM && !(isContractWallet?.network === source_layer.internal_name && isContractWallet?.isContract)) || source_layer?.type == NetworkType.Starknet)
        || wallet?.address?.toLowerCase() === swap?.destination_address.toLowerCase()

    return { canDoSweepless, isContractWallet }
}
