import { Network } from "@layerswap/widget-types";
import { TransferProvider, TransferProps } from "@layerswap/widget-types";
import { TronWeb } from 'tronweb'
import { buildInitialTransaction } from "./transactionBuilder"
import { toTransferError } from "./toTransferError"
import { TronGasProvider } from "../tronGasProvider"
import { KnownInternalNames } from "@layerswap/utils";
import { tronAdapterManager } from "../service/tronAdapterManager"

const supportedNetworks = [
    KnownInternalNames.Networks.TronMainnet,
    KnownInternalNames.Networks.TronTestnet
]

export function createTronTransfer(): TransferProvider {
    return {
        supportsNetwork(network: Network): boolean {
            return supportedNetworks.includes(network.name)
        },

        async executeTransfer(params: TransferProps): Promise<string> {
            const { callData, amount, depositAddress, token, network, selectedWallet } = params

            if (!selectedWallet?.address) {
                throw new Error('Wallet address not found')
            }
            if (!depositAddress) {
                throw new Error('Deposit address not found')
            }

            const activeAdapter = tronAdapterManager.getActiveAdapter()
            if (!activeAdapter) {
                throw new Error("Tron wallet not connected or does not support signing")
            }

            const tronWeb = new TronWeb({
                fullNode: network.node_url,
                solidityNode: network.node_url
            })

            try {
                const gasData = await new TronGasProvider().getGas({
                    address: selectedWallet.address,
                    network,
                    token
                })

                const amountInWei = Math.pow(10, token.decimals) * amount

                const initialTransaction = await buildInitialTransaction({
                    tronWeb,
                    token,
                    depositAddress,
                    amountInWei,
                    gas: gasData?.gas,
                    issuerAddress: selectedWallet.address
                })

                const data = Buffer.from(callData).toString('hex')
                const transaction = await tronWeb.transactionBuilder.addUpdateData(initialTransaction, data, "hex")
                const signature = await tronAdapterManager.signTransaction(transaction)
                const res = await tronWeb.trx.sendRawTransaction(signature)

                if (signature && res.result) {
                    return signature.txID
                }

                throw new Error("Transaction failed")
            } catch (error) {
                throw toTransferError(error)
            }
        }
    }
}
