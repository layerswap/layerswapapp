import { useSettingsState } from "../context/settings"
import { useSwapDataState } from "../context/swap"
import KnownInternalNames from "../lib/knownIds"
import { useAccount } from "wagmi"
import { Layer } from "../Models/Layer"
import { NetworkType } from "../Models/CryptoNetwork"
import { useBalancesState } from "../context/balances"
import useWallet from "./useWallet"

export default function useWalletTransferOptions() {

    const { swap } = useSwapDataState()
    const { isContractWallet: isEVMContractWallet } = useBalancesState();
    const { wallets } = useWallet()
    const wallet = wallets.find(wallet => wallet.network.internal_name === swap?.source_network)

    const { layers } = useSettingsState()

    const source_layer = layers.find(n => n.internal_name === swap?.source_network) as (Layer & { isExchange: false })

    const canDoSweepless = source_layer?.isExchange == false
        && ((source_layer.type == NetworkType.EVM && !isEVMContractWallet?.value) || source_layer.type == NetworkType.Starknet)
        || wallet?.address?.toLowerCase() === swap?.destination_address.toLowerCase()


    return { canDoSweepless, ready: isEVMContractWallet?.ready }
}
