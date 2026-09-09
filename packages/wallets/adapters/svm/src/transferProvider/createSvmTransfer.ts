import { NetworkType, ActionMessageType } from '@layerswap/widget-types';
import { Network } from "@layerswap/widget-types";
import { TransferProvider, TransferProps } from "@layerswap/widget-types";
import { foregroundWalletApp } from "@layerswap/wallet-core"
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
            try {
                const [{ Connection, LAMPORTS_PER_SOL }, transactionUtils, { getSvmTransactionSigner }, { configureAndSendCurrentTransaction }] = await Promise.all([
                    import('@solana/web3.js'),
                    import('./svmTransaction'),
                    import('./signSvmTransaction'),
                    import('./transactionSender'),
                ])
                const connection = new Connection(params.network.node_url, 'confirmed')
                const decoded = transactionUtils.deserializeSvmTransaction(params.callData)
                const signTransaction = getSvmTransactionSigner(signer, decoded)
                const { transaction, lifetime } = await transactionUtils.prepareSvmTransaction(decoded, connection)
                const feeInLamports = await transactionUtils.getSvmTransactionFee(transaction, params.network.node_url)

                validateTransferBalances(
                    params,
                    feeInLamports,
                    LAMPORTS_PER_SOL,
                )

                await foregroundWalletApp(params.selectedWallet?.metadata?.deepLink)

                const signature = await configureAndSendCurrentTransaction(
                    transaction,
                    connection,
                    signTransaction,
                    lifetime,
                    fee => validateTransferBalances(params, fee, LAMPORTS_PER_SOL),
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

const validateTransferBalances = (
    params: TransferProps,
    feeInLamports: bigint,
    lamportsPerSol: number,
) => {
    const { amount, balances, network, token } = params
    const feeInSol = Number(feeInLamports) / lamportsPerSol

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
