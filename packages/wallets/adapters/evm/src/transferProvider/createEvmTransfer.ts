import { NetworkType } from '@layerswap/widget-types';
import type { TransferProvider } from "@layerswap/widget-types";
import { getEvmConfig } from '../service/getEvmConfig'
import { createEVMTransferProvider } from './createEVMTransferProvider'
import { transactionBuilder } from './transactionBuilder'
import { createEvmAtomicBatch } from './createEvmAtomicBatch'

export function createEvmTransfer(): TransferProvider {
    const supportsNetwork = (network: Parameters<TransferProvider['supportsNetwork']>[0]) =>
        network.type === NetworkType.EVM && !!network.token

    return {
        supportsNetwork,
        atomicBatch: {
            getCapabilities: context => createEvmAtomicBatch(getEvmConfig()).getCapabilities(context),
            sendCalls: context => createEvmAtomicBatch(getEvmConfig()).sendCalls(context),
            getCallsStatus: context => createEvmAtomicBatch(getEvmConfig()).getCallsStatus(context),
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
