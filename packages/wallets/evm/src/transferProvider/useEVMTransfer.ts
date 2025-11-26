import { TransferProvider, TransferProps, NetworkType, Network, ActionMessageType } from "@layerswap/widget/types"
import { sendTransaction } from '@wagmi/core'
import { BaseError } from "viem"
import { isMobile } from "@layerswap/widget/internal"
import { transactionBuilder } from "./transactionBuilder"
import { resolveError } from "../evmUtils/resolveError"
import { useConfig } from "wagmi"

export function useEVMTransfer(): TransferProvider {
    const config = useConfig()

    return {
        supportsNetwork(network: Network): boolean {
            return network.type === NetworkType.EVM && !!network.token
        },

        async executeTransfer(params: TransferProps): Promise<string> {
            const { selectedWallet } = params

            try {
                const tx = await transactionBuilder(params)

                // Mobile deep link handling - redirect user to their wallet app
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
