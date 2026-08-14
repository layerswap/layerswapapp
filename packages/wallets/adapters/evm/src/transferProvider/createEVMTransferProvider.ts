import { ActionMessageType } from '@layerswap/widget-types';
import { Network } from "@layerswap/widget-types";
import { TransferProvider, TransferProps } from "@layerswap/widget-types";
import { sendTransaction, Config } from '@wagmi/core'
import { BaseError } from "viem"
import { foregroundWalletApp } from "@layerswap/wallet-core"
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

                await foregroundWalletApp(selectedWallet?.metadata?.deepLink)

                const hash = await sendTransaction(config, tx)

                if (hash) {
                    return hash
                }

                throw new Error("No transaction hash returned")
            } catch (error) {
                const transactionResolvedError = resolveError(error as BaseError)
                const e = new Error()
                e.message = error instanceof Error ? error.message : String(error)

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
