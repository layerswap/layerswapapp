import { normalizeWalletErrorCode } from '@layerswap/wallet-core/errors'
import { NetworkType } from '@layerswap/widget-types'
import type { TransferProvider } from '@layerswap/widget-types'
import { getEvmConfig } from '../service/getEvmConfig'
import { createEVMTransferProvider } from './createEVMTransferProvider'
import { transactionBuilder } from './transactionBuilder'
import { recoverTransferFee } from './recoverTransferFee'

export function createEvmTransfer(): TransferProvider {
    const supportsNetwork = (network: Parameters<TransferProvider['supportsNetwork']>[0]) =>
        network.type === NetworkType.EVM && !!network.token
    let attempt = 0

    return {
        supportsNetwork,
        async executeTransfer(params) {
            const currentAttempt = ++attempt
            try {
                return await createEVMTransferProvider(
                    getEvmConfig(), supportsNetwork, transactionBuilder,
                ).executeTransfer(params)
            } catch (error) {
                if (attempt === currentAttempt && params.onFeeEstimate && !params.token.contract && params.network.token
                    && normalizeWalletErrorCode(error) === 'insufficient_funds') {
                    // Return the wallet failure immediately. Recovery may later make
                    // Adjust amount available, but cannot block the next wallet request.
                    void recoverTransferFee(params, () => attempt === currentAttempt)
                }
                throw error
            }
        },
    }
}
