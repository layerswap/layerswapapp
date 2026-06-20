import { TransferProvider, Network } from "@layerswap/widget/types"
import { KnownInternalNames } from "@layerswap/widget/internal"
import { useConfig } from "wagmi"
import { createHyperliquidTransferProvider } from "./createHyperliquidTransferProvider"

const isHyperliquidNetwork = (network: Network): boolean =>
    network.name === KnownInternalNames.Networks.HyperliquidMainnet
    || network.name === KnownInternalNames.Networks.HyperliquidTestnet

export function useHyperliquidTransfer(): TransferProvider {
    const config = useConfig()
    return createHyperliquidTransferProvider(config, isHyperliquidNetwork)
}
