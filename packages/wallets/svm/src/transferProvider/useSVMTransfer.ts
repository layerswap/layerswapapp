import { TransferProvider, TransferProps, NetworkType, Network, ActionMessageType } from "@layerswap/widget/types"
import { useWallet } from "@solana/wallet-adapter-react"
import { configureAndSendCurrentTransaction } from "./transactionSender"

export function useSVMTransfer(): TransferProvider {
    const { signTransaction } = useWallet()

    return {
        supportsNetwork(network: Network): boolean {
            return network.type === NetworkType.Solana
        },

        async executeTransfer(params: TransferProps): Promise<string> {
            if (!signTransaction) {
                throw new Error('Solana wallet not connected or does not support signing')
            }

            const { callData, network, token, amount, balances } = params

            const { Connection, Transaction, LAMPORTS_PER_SOL } = await import("@solana/web3.js")

            const connection = new Connection(network.node_url, "confirmed")
            const arrayBufferCallData = Uint8Array.from(atob(callData), c => c.charCodeAt(0))
            const transaction = Transaction.from(arrayBufferCallData)

            try {
                // Validate sufficient balance for fees
                const feeInLamports = await transaction.getEstimatedFee(connection)
                const feeInSol = feeInLamports / LAMPORTS_PER_SOL

                const nativeTokenBalance = balances?.find(b => b.token == network?.token?.symbol)
                const tokenbalanceData = balances?.find(b => b.token == token?.symbol)
                const tokenBalanceAmount = tokenbalanceData?.amount
                const nativeTokenBalanceAmount = nativeTokenBalance?.amount

                const insufficientTokensArr: string[] = []

                if (network?.token && (Number(nativeTokenBalanceAmount) < feeInSol || isNaN(Number(nativeTokenBalanceAmount)))) {
                    insufficientTokensArr.push(network.token?.symbol)
                }
                if (network?.token?.symbol !== token?.symbol && amount && token?.symbol && Number(tokenBalanceAmount) < amount) {
                    insufficientTokensArr.push(token?.symbol)
                }

                if (insufficientTokensArr.length > 0) {
                    const e = new Error(`Insufficient balance for: ${insufficientTokensArr.join(', ')}`)
                    e.name = ActionMessageType.InsufficientFunds
                    throw e
                }

                const signature = await configureAndSendCurrentTransaction(
                    transaction,
                    connection,
                    signTransaction
                )

                if(!signature) {
                    throw new Error('No transaction signature returned')
                }

                return signature
            } catch (error) {
                const e = new Error()
                e.message = error.message

                if (error.name === ActionMessageType.InsufficientFunds) {
                    e.name = ActionMessageType.InsufficientFunds
                    throw e
                } else if (error.message === "User rejected the request.") {
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
