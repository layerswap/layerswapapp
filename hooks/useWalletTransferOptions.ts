import { useSettingsState } from "../context/settings"
import { useSwapDataState } from "../context/swap"
import KnownInternalNames from "../lib/knownIds"
import { useWalletState } from "../context/wallet"
import { useAccount } from "wagmi"
import { Layer } from "../Models/Layer"
import { NetworkType } from "../Models/CryptoNetwork"

export default function useWalletTransferOptions() {

    const { swap } = useSwapDataState()
    const { starknetAccount, imxAccount, isContractWallet: isEVMContractWallet } = useWalletState();
    const { address: evmAddress } = useAccount()

    const sourceIsImmutableX = swap?.source_network?.toUpperCase() === KnownInternalNames.Networks.ImmutableXMainnet?.toUpperCase() || swap?.source_network === KnownInternalNames.Networks.ImmutableXGoerli?.toUpperCase()
    const sourceIsStarknet = swap?.source_network?.toUpperCase() === KnownInternalNames.Networks.StarkNetMainnet?.toUpperCase() || swap?.source_network === KnownInternalNames.Networks.StarkNetGoerli?.toUpperCase()
    let connectedWalletAddress = sourceIsImmutableX ? imxAccount : sourceIsStarknet ? starknetAccount?.account?.address : evmAddress;

    const { layers } = useSettingsState()

    const source_layer = layers.find(n => n.internal_name === swap?.source_network) as (Layer & { isExchange: false })

    const canDoSweepless = source_layer?.isExchange == false
        && ((source_layer.type == NetworkType.EVM && !isEVMContractWallet?.value) || source_layer.type == NetworkType.Starknet)
        || connectedWalletAddress?.toLowerCase() === swap?.destination_address.toLowerCase()


    return { canDoSweepless, ready: isEVMContractWallet?.ready }
}
