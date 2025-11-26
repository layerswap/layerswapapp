import { TransferProvider, TransferProps, Network, ActionMessageType } from "@layerswap/widget/types"
import ImtblClient from "./client"
import { KnownInternalNames } from "@layerswap/widget/internal"

const supportedNetworks = [
    KnownInternalNames.Networks.ImmutableXMainnet,
    KnownInternalNames.Networks.ImmutableXGoerli,
    KnownInternalNames.Networks.ImmutableXSepolia,
]

export function useImmutableXTransfer(): TransferProvider {
    return {
        supportsNetwork(network: Network): boolean {
            return supportedNetworks.includes(network.name)
        },

        async executeTransfer(params: TransferProps): Promise<string> {
            const { network, token, amount, depositAddress, swapId } = params

            try {
                const imtblClient = new ImtblClient(network?.name)

                if (!token) {
                    throw new Error("No source currency could be found")
                }
                if (!depositAddress) {
                    throw new Error("Deposit address not found")
                }

                const res = await imtblClient.Transfer(amount.toString(), token, depositAddress)
                const transactionRes = res?.result?.[0]

                if (!transactionRes) {
                    const e = new Error("Transaction failed")
                    e.name = ActionMessageType.TransactionFailed
                    throw e
                } else if (transactionRes.status == "error") {
                    const e = new Error(transactionRes.message)
                    e.name = ActionMessageType.TransactionFailed
                    throw e
                } else if (transactionRes && swapId) {
                    return transactionRes.txId.toString()
                }

                throw new Error("No transaction ID returned")
            } catch (error) {
                // If error already has a name (ActionMessageType), rethrow it
                if (error.name && Object.values(ActionMessageType).includes(error.name as ActionMessageType)) {
                    throw error
                }

                const e = new Error()
                e.message = error.message

                if (error.message.includes('User rejected') || error.message.includes('user denied')) {
                    e.name = ActionMessageType.TransactionRejected
                    throw e
                } else if (error.message.includes('Insufficient')) {
                    e.name = ActionMessageType.InsufficientFunds
                    throw e
                } else {
                    e.name = ActionMessageType.UnexpectedErrorMessage
                    throw e
                }
            }
        }
    }
}
