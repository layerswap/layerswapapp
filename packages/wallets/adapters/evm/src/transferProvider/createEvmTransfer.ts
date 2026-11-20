import { NetworkType } from '@layerswap/widget-types';
import type { TransferProps, TransferProvider } from "@layerswap/widget-types";
import { getEvmConfig } from '../service/getEvmConfig'
import { createEVMTransferProvider } from './createEVMTransferProvider'
import { transactionBuilder } from './transactionBuilder'
import { createAtomicBatchProvider } from './atomicBatch'
import { capabilitiesForChain, getWalletCapabilityService } from './walletCapabilities'

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
                transferParams => transactionBuilder(transferParams, {
                    hasAlternateGasFees: () => hasAlternateGasFees(transferParams),
                }),
            )
            return provider.executeTransfer(params)
        },
    }
}

async function hasAlternateGasFees({ network, selectedWallet }: TransferProps): Promise<boolean> {
    const account = selectedWallet.address
    const stored = selectedWallet.metadata?.capabilities?.[account.toLowerCase()]
    const known = capabilitiesForChain(stored, Number(network.chain_id))
    if (known) return known.alternateGasFees
    const capabilities = await getWalletCapabilityService(getEvmConfig()).getCapabilities({ network, wallet: selectedWallet, account })
    return capabilities.alternateGasFees
}
