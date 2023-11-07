import { useSettingsState } from "../context/settings"
import { useSwapDataState } from "../context/swap"
import { Layer } from "../Models/Layer"
import { NetworkType } from "../Models/CryptoNetwork"
import { useBalancesState } from "../context/balances"
import useWallet from "./useWallet"
import { useMemo } from "react"

export default function useWalletTransferOptions() {

    const { swap } = useSwapDataState()
    const { isContractWallet: isEVMContractWallet } = useBalancesState();
    const { getProvider } = useWallet()
    const { layers } = useSettingsState()
    const source_layer = layers.find(n => n.internal_name === swap?.source_network) as (Layer & { isExchange: false })
    const provider = useMemo(() => {
        return source_layer && getProvider(source_layer)
    }, [source_layer, getProvider])

    const wallet = provider?.getConnectedWallet()

    const canDoSweepless = source_layer?.isExchange == false
        && ((source_layer.type == NetworkType.EVM && !isEVMContractWallet?.value) || source_layer.type == NetworkType.Starknet)
        || wallet?.address?.toLowerCase() === swap?.destination_address.toLowerCase()

    return { canDoSweepless, ready: isEVMContractWallet?.ready }
}
