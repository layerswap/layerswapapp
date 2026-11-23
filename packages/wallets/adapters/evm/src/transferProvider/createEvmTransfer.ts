import { NetworkType } from '@layerswap/widget-types';
import type { TransferProvider } from "@layerswap/widget-types";
import { getEvmConfig } from '../service/getEvmConfig'
import { createEVMTransferProvider } from './createEVMTransferProvider'
import { transactionBuilder } from './transactionBuilder'
import { createAtomicBatchProvider } from './atomicBatch'

export function createEvmTransfer(): TransferProvider {
    const supportsNetwork = (network: Parameters<TransferProvider['supportsNetwork']>[0]) =>
        network.type === NetworkType.EVM && !!network.token

    return {
        supportsNetwork,
        atomicBatch: {
            getCapabilities: (context, options) => createAtomicBatchProvider(getEvmConfig()).getCapabilities(context, options),
            submit: context => createAtomicBatchProvider(getEvmConfig()).submit(context),
            getStatus: (context, id) => createAtomicBatchProvider(getEvmConfig()).getStatus(context, id),
        },
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
