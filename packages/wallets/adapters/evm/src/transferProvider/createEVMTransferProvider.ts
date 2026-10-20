import { Network } from "@layerswap/widget-types";
import { TransferProvider, TransferProps } from "@layerswap/widget-types";
import { sendTransaction, Config } from '@wagmi/core'
import { toTransferError } from "./toTransferError"
import { resolveWalletConnector } from '../service/resolveWalletConnector'

type TransactionBuilder = (params: TransferProps, connector: ReturnType<typeof resolveWalletConnector>) => Promise<any>

export function createEVMTransferProvider(
    config: Config,
    supportsNetwork: (network: Network) => boolean,
    buildTransaction: TransactionBuilder
): TransferProvider {
    return {
        supportsNetwork,

        async executeTransfer(params: TransferProps): Promise<string> {
            const { selectedWallet } = params

            let tx: Awaited<ReturnType<TransactionBuilder>> | undefined
            try {
                params.onSubmissionStateChange?.('preparing')
                const connector = resolveWalletConnector(config, selectedWallet)
                tx = await buildTransaction(params, connector)
                params.onSubmissionStateChange?.('submitting')
                const hash = await sendTransaction(config, { ...tx, connector })

                if (hash) {
                    return hash
                }

                throw new Error("No transaction hash returned")
            } catch (error) {
                const failure = toTransferError(error)
                if (tx) {
                    failure.cause = Object.assign(new Error('EVM transfer failed after preparation', { cause: error }), {
                        details: JSON.stringify({
                            chainId: tx.chainId, valueWei: tx.value?.toString(),
                            gasUnits: tx.gas?.toString(), gasPriceWei: tx.gasPrice?.toString(),
                            maxFeePerGasWei: tx.maxFeePerGas?.toString(),
                            maxPriorityFeePerGasWei: tx.maxPriorityFeePerGas?.toString(),
                        }),
                    })
                }
                throw failure
            }
        }
    }
}
