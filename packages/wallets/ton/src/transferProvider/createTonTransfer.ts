import { Network } from "@layerswap/utils"
import { Wallet } from "@layerswap/wallet-core/types"
import { TransferProvider, TransferProps, ActionMessageType } from "@layerswap/wallet-core/types"
import { transactionBuilder } from "./transactionBuilder"
import { waitForTransaction } from "./waitForTransaction"
import { createTonClient } from "../client"
import { getTonApiKey, getTonConnect } from "../service/getTonConnect"

export function createTonTransfer(): TransferProvider {
    return {
        supportsNetwork(network: Network): boolean {
            return network.name.toLowerCase().includes('ton')
        },

        async executeTransfer(params: TransferProps, wallet?: Wallet): Promise<string> {
            const tonConnect = getTonConnect()
            const tonApiKey = getTonApiKey()

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
                    tonApiKey,
                )

                const res = await tonConnect.sendTransaction(transaction)
                const tonClient = createTonClient(tonApiKey)

                const tx = await waitForTransaction(res.boc, tonClient)

                if (tx?.hash) {
                    return tx.hash.toString()
                }

                throw new Error("No transaction BOC returned")
            } catch (error) {
                const e = new Error()
                e.message = error instanceof Error ? error.message : String(error)

                if (typeof error === 'string' && error?.includes('Reject request')) {
                    e.name = ActionMessageType.TransactionRejected
                    throw e
                } else if (typeof error === 'string' && error?.includes('Transaction was not sent')) {
                    e.name = ActionMessageType.TransactionFailed
                    throw e
                } else {
                    e.name = ActionMessageType.UnexpectedErrorMessage
                    throw e
                }
            }
        },
    }
}
