import { Network } from "@layerswap/widget-types";
import { TransferProvider, TransferProps } from "@layerswap/widget-types";
import { sendTransaction, Config } from '@wagmi/core'
import { toTransferError } from "./toTransferError"
import { resolveWalletConnector } from '../service/resolveWalletConnector'

type TransactionBuilder = (params: TransferProps) => Promise<any>

export function createEVMTransferProvider(
    config: Config,
    supportsNetwork: (network: Network) => boolean,
    buildTransaction: TransactionBuilder
): TransferProvider {
    return {
        supportsNetwork,

        async executeTransfer(params: TransferProps): Promise<string> {
            const { selectedWallet } = params

            try {
                const tx = await buildTransaction(params)
                const connector = resolveWalletConnector(config, selectedWallet)
                const hash = await sendTransaction(config, { ...tx, connector })

                if (hash) {
                    return hash
                }

                throw new Error("No transaction hash returned")
            } catch (error) {
                throw toTransferError(error)
            }
        }
    }
}
