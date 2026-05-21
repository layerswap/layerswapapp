import { NetworkType, type TransferProvider } from '@layerswap/widget/types'
import { getEvmConfig } from '../service/getEvmConfig'
import { createEVMTransferProvider } from './createEVMTransferProvider'
import { transactionBuilder } from './transactionBuilder'

export function createEvmTransfer(): TransferProvider {
    return createEVMTransferProvider(
        getEvmConfig(),
        (network) => network.type === NetworkType.EVM && !!network.token,
        transactionBuilder,
    )
}
