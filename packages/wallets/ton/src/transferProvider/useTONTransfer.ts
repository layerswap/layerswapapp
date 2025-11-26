import { TransferProvider, TransferProps, Network, ActionMessageType, Wallet } from "@layerswap/widget/types"
import { useTonConnectUI } from "@tonconnect/ui-react"
import { transactionBuilder } from "./transactionBuilder"
import { useTonConfig } from "../index"

export function useTONTransfer(): TransferProvider {
    const [tonConnectUI] = useTonConnectUI()
    const tonConfig = useTonConfig()

    return {
        supportsNetwork(network: Network): boolean {
            return network.name.toLowerCase().includes('ton')
        },

        async executeTransfer(params: TransferProps, wallet?: Wallet): Promise<string> {
            if (!tonConnectUI) {
                throw new Error("TON Connect UI not initialized")
            }

            const { amount, callData, depositAddress, token } = params

            if (!wallet?.address) {
                throw new Error('Wallet address not found')
            }
            if (!depositAddress) {
                throw new Error('Deposit address not found')
            }

            try {
                const transaction = await transactionBuilder(
                    amount,
                    token,
                    depositAddress,
                    wallet.address,
                    callData,
                    tonConfig?.tonApiKey
                )

                const res = await tonConnectUI.sendTransaction(transaction)

                if (res) {
                    return res.boc
                }

                throw new Error("No transaction BOC returned")
            } catch (error) {
                const e = new Error()
                e.message = error.message

                if (error && error.includes('Reject request')) {
                    e.name = ActionMessageType.TransactionRejected
                    throw e
                } else if (error && error.includes('Transaction was not sent')) {
                    e.name = ActionMessageType.TransactionFailed
                    throw e
                } else {
                    e.name = ActionMessageType.UnexpectedErrorMessage
                    throw e
                }
            }
        }
    }
}
