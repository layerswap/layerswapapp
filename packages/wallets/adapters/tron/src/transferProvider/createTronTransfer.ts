import { Network } from "@layerswap/widget-types";
import { TransferProvider, TransferProps } from "@layerswap/widget-types";
import { TronWeb } from 'tronweb'
import { buildInitialTransaction } from "./transactionBuilder"
import { toTransferError } from "./toTransferError"
import { TronGasProvider } from "../tronGasProvider"
import { KnownInternalNames } from "@layerswap/utils";
import { tronAdapterManager } from "../service/tronAdapterManager"
import { isDuplicateBroadcast, textToHex, TronBroadcastError } from "./tronBroadcast.js"

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
                    token,
                    amount
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

                const data = textToHex(callData)
                // The memo only changes raw_data; recompute the transaction id locally.
                // The default path posts the transaction to the node (getsignweight) and
                // reports any RPC failure there as a generic transaction-id error.
                const transaction = await tronWeb.transactionBuilder.addUpdateData(initialTransaction, data, "hex", { txLocal: true })
                const signature = await tronAdapterManager.signTransaction(transaction)
                if (!signature?.txID) throw new Error("The wallet returned no signed transaction")
                const res = await tronWeb.trx.sendRawTransaction(signature)
                if (res.result) return signature.txID
                // The network already knows this signed transaction under the same id (a
                // wallet that broadcasts on its own, a repeated broadcast): it is submitted.
                if (isDuplicateBroadcast(res, signature.txID)) return signature.txID
                // The node's code and reason are the failure; the widget's label wraps them.
                throw new TronBroadcastError(res)
            } catch (error) {
                throw toTransferError(error)
            }
        }
    }
}
