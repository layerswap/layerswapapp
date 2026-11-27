import { NetworkType, LayerswapNetwork, type Wallet } from '@layerswap/widget-types';
import { TransferProvider, TransferProps } from "@layerswap/widget-types";
import { toTransferError } from "./toTransferError"

export function createStarknetTransfer(): TransferProvider {
    return {
        supportsNetwork(network: LayerswapNetwork): boolean {
            return network.type === NetworkType.Starknet
        },

        async executeTransfer(params: TransferProps, wallet?: Wallet): Promise<string> {
            const { callData } = params

            if (!wallet?.metadata?.starknetAccount) {
                throw new Error("Starknet account not found in wallet metadata")
            }

            try {
                const { transaction_hash } = await wallet.metadata.starknetAccount.execute(
                    JSON.parse(callData || "")
                ) || {}

                if (!transaction_hash) {
                    throw new Error("No transaction hash returned")
                }

                return transaction_hash
            } catch (error) {
                throw toTransferError(error)
            }
        }
    }
}
