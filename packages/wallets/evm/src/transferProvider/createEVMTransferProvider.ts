import { TransferProvider, TransferProps, Network, ActionMessageType } from "@layerswap/widget/types"
import { sendTransaction, Config } from '@wagmi/core'
import { BaseError } from "viem"
import { isMobile } from "@layerswap/widget/internal"
import { resolveError } from "../evmUtils/resolveError"

type TransactionBuilder = (params: TransferProps) => Promise<any>

export function createEVMTransferProvider(
    config: Config,
    supportsNetwork: (network: Network) => boolean,
    buildTransaction: TransactionBuilder
): TransferProvider {
    return {
        supportsNetwork,

        async executeTransfer(params: TransferProps): Promise<string> {
            const { selectedWallet } = params

            try {
                const tx = await buildTransaction(params)

                if (isMobile() && selectedWallet?.metadata?.deepLink) {
                    window.location.href = selectedWallet.metadata.deepLink
                    await new Promise(resolve => setTimeout(resolve, 100))
                }

                const hash = await sendTransaction(config, tx)

                if (hash) {
                    return hash
                }

                throw new Error("No transaction hash returned")
            } catch (error) {
                const transactionResolvedError = resolveError(error as BaseError)
                const e = new Error()
                e.message = error.message

                if (transactionResolvedError && transactionResolvedError === "insufficient_funds") {
                    e.name = ActionMessageType.InsufficientFunds
                    throw e
                }
                else if (transactionResolvedError && transactionResolvedError === "transaction_rejected") {
                    e.name = ActionMessageType.TransactionRejected
                    throw e
                }
                else {
                    e.name = ActionMessageType.UnexpectedErrorMessage
                    throw e
                }
            }
        }
    }
}
