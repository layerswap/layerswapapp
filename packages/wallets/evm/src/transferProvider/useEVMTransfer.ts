import { TransferProvider, NetworkType } from "@layerswap/widget/types"
import { useConfig } from "wagmi"
import { transactionBuilder } from "./transactionBuilder"
import { createEVMTransferProvider } from "./createEVMTransferProvider"

export function useEVMTransfer(): TransferProvider {
    const config = useConfig()

    return createEVMTransferProvider(
        config,
        (network) => network.type === NetworkType.EVM && !!network.token,
        transactionBuilder
    )
}
