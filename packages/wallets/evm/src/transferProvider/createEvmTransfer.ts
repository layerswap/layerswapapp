import { NetworkType } from "@layerswap/utils"
import type { TransferProvider } from "@layerswap/wallet-core/types"
import { getEvmConfig } from '../service/getEvmConfig'
import { createEVMTransferProvider } from './createEVMTransferProvider'
import { transactionBuilder } from './transactionBuilder'

export function createEvmTransfer(): TransferProvider {
    const supportsNetwork = (network: Parameters<TransferProvider['supportsNetwork']>[0]) =>
        network.type === NetworkType.EVM && !!network.token

    return {
        supportsNetwork,
        executeTransfer(params) {
            const provider = createEVMTransferProvider(
                getEvmConfig(),
                supportsNetwork,
                transactionBuilder,
            )
            return provider.executeTransfer(params)
        },
    }
}
