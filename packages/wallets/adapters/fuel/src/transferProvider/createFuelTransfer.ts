import { Network } from "@layerswap/widget-types";
import { TransferProvider, TransferProps } from "@layerswap/widget-types";
import { Account, Provider } from '@fuel-ts/account'
import { Address } from '@fuel-ts/address'
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

            const { callData, network, selectedWallet, sourceAddress, swapId } = params

            try {
                const connector = fuel.getConnector(selectedWallet.id)
                if (!connector) throw new Error("Fuel wallet not found")

                const sender = new Address(sourceAddress ?? selectedWallet.address).toB256()
                const assertAuthorized = async () => {
                    const connected = await connector.isConnected()
                    const accounts = connected ? await connector.accounts() : []
                    if (!accounts.some(address => new Address(address).toB256().toLowerCase() === sender.toLowerCase())) {
                        throw new Error("address is not authorized for this connection.")
                    }
                }
                await assertAuthorized()

                const fuelProvider = new Provider(network.node_url)
                // Bind to the selected connector. Fuel.getWallet binds to the SDK's
                // mutable current connector, which may change during preparation.
                const fuelWallet = new Account(sender, fuelProvider, connector)
                const scriptTransaction = await transactionBuilder({ fuelWallet, callData })
                await fuelProvider.simulate(scriptTransaction)

                await assertAuthorized()
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
