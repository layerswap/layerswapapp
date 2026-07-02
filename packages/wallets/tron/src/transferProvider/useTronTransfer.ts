import { TransferProvider, TransferProps, Network, ActionMessageType } from "@layerswap/widget/types"
import { useWallet } from '@tronweb3/tronwallet-adapter-react-hooks'
import { TronWeb } from 'tronweb'
import { buildInitialTransaction } from "./transactionBuilder"
import { TronGasProvider } from "../tronGasProvider"
import { KnownInternalNames } from "@layerswap/widget/internal"

const supportedNetworks = [
    KnownInternalNames.Networks.TronMainnet,
    KnownInternalNames.Networks.TronTestnet
]

export function useTronTransfer(): TransferProvider {
    const { signTransaction } = useWallet()

    return {
        supportsNetwork(network: Network): boolean {
            return supportedNetworks.includes(network.name)
        },

        async executeTransfer(params: TransferProps): Promise<string> {
            if (!signTransaction) {
                throw new Error("Tron wallet not connected or does not support signing")
            }

            const { callData, amount, depositAddress, token, network, selectedWallet } = params

            if (!selectedWallet?.address) {
                throw new Error('Wallet address not found')
            }
            if (!depositAddress) {
                throw new Error('Deposit address not found')
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
                const signature = await signTransaction(transaction)
                const res = await tronWeb.trx.sendRawTransaction(signature)

                if (signature && res.result) {
                    return signature.txID
                }

                throw new Error("Transaction failed")
            } catch (error) {
                const e = new Error()
                e.message = error.message

                if (error.message === "BANDWITH_ERROR") {
                    e.name = ActionMessageType.InsufficientFunds
                    throw e
                } else if (error.message === "user reject this request") {
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
