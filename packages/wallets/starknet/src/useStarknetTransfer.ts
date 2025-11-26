import { KnownInternalNames } from "@layerswap/widget/internal"
import { TransferProvider, TransferProps, Network, ActionMessageType, Wallet } from "@layerswap/widget/types"

const supportedNetworks = [
    KnownInternalNames.Networks.StarkNetMainnet,
    KnownInternalNames.Networks.StarkNetGoerli,
    KnownInternalNames.Networks.StarkNetSepolia
]

export function useStarknetTransfer(): TransferProvider {
    return {
        supportsNetwork(network: Network): boolean {
            return supportedNetworks.includes(network.name)
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
                const e = new Error(error)
                e.message = error

                if (error === "An error occurred (USER_REFUSED_OP)" || error === "Execute failed") {
                    e.name = ActionMessageType.TransactionRejected
                    throw e
                } else if (error === "failedTransfer") {
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
