import { TransferProvider } from "@layerswap/widget/types"
import { KnownInternalNames } from "@layerswap/widget/internal"
import { useConfig } from "wagmi"
import { tempoTransactionBuilder } from "./tempoTransactionBuilder"
import { createEVMTransferProvider } from "./createEVMTransferProvider"

const TEMPO_NETWORKS = [
    KnownInternalNames.Networks.TempoMainnet,
    KnownInternalNames.Networks.TempoTestnet
]

export function useTempoTransfer(): TransferProvider {
    const config = useConfig()

    return createEVMTransferProvider(
        config,
        (network) => TEMPO_NETWORKS.includes(network.name),
        tempoTransactionBuilder
    )
}
