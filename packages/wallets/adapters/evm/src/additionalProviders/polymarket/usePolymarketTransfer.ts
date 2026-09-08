import { KnownInternalNames } from "@layerswap/utils";
import { Network } from "@layerswap/widget-types";
import { TransferProvider } from "@layerswap/widget-types";
import { useConfig } from "wagmi"
import { createPolymarketTransferProvider } from "./createPolymarketTransferProvider"

const isPolymarketNetwork = (network: Network): boolean =>
    network.name === KnownInternalNames.Networks.PolymarketMainnet

export function usePolymarketTransfer(): TransferProvider {
    const config = useConfig()
    return createPolymarketTransferProvider(config, isPolymarketNetwork)
}
