import { Network } from "@layerswap/widget-types";
import { TransferProvider, TransferProps } from "@layerswap/widget-types";
import { Provider } from '@fuel-ts/account'
import { transactionBuilder } from "./transactionBuilder"
import { toTransferError } from "./toTransferError"
import { KnownInternalNames } from "@layerswap/utils";
import { getFuelInstance, hasFuelInstance } from "../service/getFuel"

const supportedNetworks = [
    KnownInternalNames.Networks.FuelTestnet,
    KnownInternalNames.Networks.FuelDevnet,
    KnownInternalNames.Networks.FuelMainnet
]

export function createFuelTransfer(): TransferProvider {
    return {
        supportsNetwork(network: Network): boolean {
            return supportedNetworks.includes(network.name)
        },

        async executeTransfer(params: TransferProps): Promise<string> {
            if (!hasFuelInstance()) {
                throw new Error("Fuel not initialized")
            }
            const fuel = getFuelInstance()

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
                throw toTransferError(error)
            }
        }
    }
}
