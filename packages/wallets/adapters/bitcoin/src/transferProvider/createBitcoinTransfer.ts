import { NetworkType, TransferFeeReviewRequired } from '@layerswap/widget-types';
import { Network } from "@layerswap/widget-types";
import { TransferProvider, TransferProps } from "@layerswap/widget-types";
import { getAccount } from '@bigmi/client'
import { JsonRpcClient, KnownInternalNames } from "@layerswap/utils";
import { sendTransaction } from "./sendTransaction"
import { toTransferError } from "./toTransferError"
import { getBitcoinConfig } from "../service/getBitcoinConfig"

export function createBitcoinTransfer(): TransferProvider {
    return {
        supportsNetwork(network: Network): boolean {
            return network.type === NetworkType.Bitcoin
        },

        async executeTransfer(params: TransferProps): Promise<string> {
            const { amount, callData, depositAddress, network, reviewFee, onWalletPrompt } = params

            if (!depositAddress) {
                throw new Error("Deposit address not provided")
            }

            const config = getBitcoinConfig()
            const account = getAccount(config)
            const connector = account.connector
            if (!connector) {
                throw new Error("No Bitcoin connector found")
            }

            const rpcClient = new JsonRpcClient(network.node_url)
            const isTestnet = network?.name === KnownInternalNames.Networks.BitcoinTestnet
            const publicClient = config.getClient()

            const feeToken = network.token ?? params.token

            try {
                const txHash = await sendTransaction({
                    amount,
                    onWalletPrompt,
                    reviewFee: reviewFee ? (fee, requiredFee) => reviewFee({
                        token: feeToken, gas: Number(fee) / 1e8, requiredFee: Number(requiredFee) / 1e8,
                    }) : undefined,
                    depositAddress,
                    userAddress: params.selectedWallet.address,
                    isTestnet,
                    rpcClient,
                    callData,
                    connector,
                    publicClient
                })

                return txHash
            } catch (error) {
                if (error instanceof TransferFeeReviewRequired) throw error
                throw toTransferError(error)
            }
        }
    }
}
