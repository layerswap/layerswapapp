import { NetworkType, ActionMessageType } from '@layerswap/widget-types';
import { Network } from "@layerswap/widget-types";
import { TransferProvider, TransferProps } from "@layerswap/widget-types";
import { foregroundWalletApp } from "@layerswap/wallet-core"
import type { Connection, Transaction } from "@solana/web3.js"
import { configureAndSendCurrentTransaction } from "./transactionSender"
import { svmAdapterManager } from "../service/svmAdapterManager"

export function createSvmTransfer(): TransferProvider {
    return {
        supportsNetwork(network: Network): boolean {
            return network.type === NetworkType.Solana
        },

        async executeTransfer(params: TransferProps): Promise<string> {
            const signer = svmAdapterManager.getActiveSignerAdapter()
            if (!signer) {
                throw new Error('Solana wallet not connected or does not support signing')
            }
            const signTransaction = signer.signTransaction.bind(signer)

            const { Connection, LAMPORTS_PER_SOL } = await import("@solana/web3.js")
            const connection = new Connection(params.network.node_url, "confirmed")

            try {
                const transaction = await deserializeTransaction(params.callData)

                await validateTransferBalances(
                    params,
                    transaction,
                    connection,
                    LAMPORTS_PER_SOL,
                )

                await foregroundWalletApp(params.selectedWallet?.metadata?.deepLink)

                const signature = await configureAndSendCurrentTransaction(
                    transaction,
                    connection,
                    signTransaction,
                )

                if (!signature) {
                    throw new Error('No transaction signature returned')
                }

                return signature
            } catch (error) {
                throw toTransferError(error)
            }
        }
    }
}

const validateTransferBalances = async (
    params: TransferProps,
    transaction: Transaction,
    connection: Connection,
    lamportsPerSol: number,
) => {
    const { amount, balances, network, token } = params
    const feeInLamports = await transaction.getEstimatedFee(connection)
    const feeInSol = (feeInLamports || 0) / lamportsPerSol

    const nativeTokenBalance = balances?.find(
        balance => balance.token === network.token?.symbol
    )?.amount
    const selectedTokenBalance = balances?.find(
        balance => balance.token === token.symbol
    )?.amount
    const insufficientTokens: string[] = []

    if (
        network.token
        && (
            Number(nativeTokenBalance) < feeInSol
            || Number.isNaN(Number(nativeTokenBalance))
        )
    ) {
        insufficientTokens.push(network.token.symbol)
    }
    if (
        network.token?.symbol !== token.symbol
        && amount
        && Number(selectedTokenBalance) < amount
    ) {
        insufficientTokens.push(token.symbol)
    }

    if (insufficientTokens.length > 0) {
        const error = new Error(`Insufficient balance for: ${insufficientTokens.join(', ')}`)
        error.name = ActionMessageType.InsufficientFunds
        throw error
    }
}

const toTransferError = (error: unknown): Error => {
    const message = error instanceof Error ? error.message : String(error)
    const transferError = new Error(message)

    if (error instanceof Error && error.name === ActionMessageType.InsufficientFunds) {
        transferError.name = ActionMessageType.InsufficientFunds
    } else if (message === "User rejected the request.") {
        transferError.name = ActionMessageType.TransactionRejected
    } else {
        transferError.name = ActionMessageType.UnexpectedErrorMessage
    }

    return transferError
}

const deserializeTransaction = async (callData: string): Promise<Transaction> => {
    const { Transaction } = await import("@solana/web3.js");
    const bytes = Uint8Array.from(atob(callData), character => character.charCodeAt(0));
    return Transaction.from(bytes);
};
