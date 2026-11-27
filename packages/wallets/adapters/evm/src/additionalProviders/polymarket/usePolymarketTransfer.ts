import { TransferProvider, NetworkType, LayerswapNetwork } from "@layerswap/widget-types";
import { useConfig } from "wagmi"
import { createPolymarketTransferProvider } from "./createPolymarketTransferProvider"

const isPolymarketNetwork = (network: LayerswapNetwork): boolean =>
    network.type === NetworkType.Polymarket

export function usePolymarketTransfer(): TransferProvider {
    const config = useConfig()
    return createPolymarketTransferProvider(config, isPolymarketNetwork)
}
