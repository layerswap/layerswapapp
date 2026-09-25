import { Network } from "@layerswap/widget-types";
import { TransferProvider, TransferProps } from "@layerswap/widget-types";
import { sendTransaction, Config } from '@wagmi/core'
import { foregroundWalletApp } from "@layerswap/wallet-core"
import { toTransferError } from "./toTransferError"

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

                await foregroundWalletApp(selectedWallet?.metadata?.deepLink)

                const hash = await sendTransaction(config, tx)

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
