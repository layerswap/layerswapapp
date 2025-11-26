import { TransferProvider, TransferProps, Network, ActionMessageType } from "@layerswap/widget/types"
import { useFuel } from '@fuels/react'
import { Provider } from '@fuel-ts/account'
import { transactionBuilder } from "./transactionBuilder"

export function useFuelTransfer(): TransferProvider {
    const { fuel } = useFuel()

    return {
        supportsNetwork(network: Network): boolean {
            return network.name.toLowerCase().includes('fuel')
        },

        async executeTransfer(params: TransferProps): Promise<string> {
            if (!fuel) {
                throw new Error("Fuel not initialized")
            }

            const { callData, network, selectedWallet, swapId } = params

            const fuelProvider = new Provider(network.node_url)
            const fuelWallet = await fuel.getWallet(selectedWallet.address, fuelProvider)

            if (!fuelWallet) {
                throw new Error("Fuel wallet not found")
            }

            try {
                const scriptTransaction = await transactionBuilder({ fuelWallet, callData })
                await fuelProvider.simulate(scriptTransaction)

                const transactionResponse = await fuelWallet.sendTransaction(scriptTransaction)

                if (swapId && transactionResponse) {
                    return transactionResponse.id
                }

                throw new Error("No transaction ID returned")
            } catch (error) {
                const e = new Error()
                e.message = error.message

                if (error.message === "The account(s) sending the transaction don't have enough funds to cover the transaction."
                    || error.message === "the target cannot be met due to no coins available or exceeding the 255 coin limit."
                ) {
                    e.name = ActionMessageType.InsufficientFunds
                    throw e
                } else if (error.message === "Request cancelled without user response!"
                    || error.message === "User rejected the transaction!"
                    || error.message === "User canceled sending transaction") {
                    e.name = ActionMessageType.TransactionRejected
                    throw e
                } else {
                    e.name = ActionMessageType.UnexpectedErrorMessage
                    throw e
                }
            }
        }
    }
}
